'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useTranslations } from 'next-intl';
import LiveView, { type MountSample } from './LiveView';
import TelemetryPanel from './TelemetryPanel';
import ControlPanel from './ControlPanel';
import HandControl from './HandControl';
import MissionLog, { type LogEntry } from './MissionLog';
import CompareControl from './CompareControl';
import TimeControl from './TimeControl';
import ConsoleTabs from './ConsoleTabs';
import CornerClock from './CornerClock';
import LiveDock from './LiveDock';
import StagePanel from './StagePanel';
import {
  acquisitionStateAt,
  planAcquisition,
  pointingAt,
  type Acquisition,
} from '@/lib/observatory/mission';
import {
  LIMITS,
  angularSeparation,
  evaluateSafety,
  sunPosition,
  type AltAz,
  type SafetyVerdict,
} from '@/lib/observatory/safety';
import {
  DEFAULT_SEEING_ARCSEC,
  ROIS,
  ROI_BY_ID,
  TRAINS,
  TRAIN_BY_ID,
  fieldOfView,
  effectiveFocalLength,
  fieldRotationDegPerHour,
  resolvingPowerArcsec,
} from '@/lib/observatory/optics';
import {
  SIM_TARGETS,
  SIM_TARGET_BY_ID,
  targetAltAz,
  targetSizeArcmin,
  targetRaHours,
  type SimTarget,
} from '@/lib/observatory/sim-targets';
import { effectiveBlurArcsec } from '@/lib/observatory/render';
import { MotorAudio } from '@/lib/observatory/motor-audio';
import { MountDrive, SPIN_DOWN_S, SPIN_UP_S, type Axis } from '@/lib/observatory/mount-drive';
import { altAzToRaDec, skyObjectsNear, tangentOffsetDeg } from '@/lib/observatory/sky-field';
import { hourAngle, localSiderealHours } from '@/lib/observatory/site-time';
import EventsPanel from './EventsPanel';
import { getSunAltitude, getTonightDarkWindow } from '@/lib/dark-window';
import type { ObservatoryNode } from '@/lib/observatory/types';

/**
 * What an observer would actually put in the train for each target.
 *
 * Planets get a Barlow and a cropped read-out, because 2.9 um pixels
 * undersample this scope at f/10 and a small ROI is what lifts the frame rate
 * into lucky-imaging territory. The Moon gets the reducer so the disc fits.
 * Deep sky stays native and full-frame.
 */
const RECOMMENDED_SETUP: Record<string, { train: string; roi: string; exposureSec: number }> = {
  moon: { train: 'reducer', roi: 'full', exposureSec: 0.01 },
  jupiter: { train: 'barlow2', roi: '640', exposureSec: 0.02 },
  saturn: { train: 'barlow3', roi: '640', exposureSec: 0.05 },
  mars: { train: 'barlow3', roi: '400', exposureSec: 0.02 },
  venus: { train: 'barlow2', roi: '640', exposureSec: 0.005 },
  m42: { train: 'native', roi: 'full', exposureSec: 8 },
  m31: { train: 'reducer', roi: 'full', exposureSec: 30 },
  m57: { train: 'native', roi: 'full', exposureSec: 8 },
};

/** Where the mount sits when it is not working. */
const PARKED: AltAz = { altitude: 0, azimuth: 0 };

/**
 * Where a GoTo actually lands. An aligned NexStar puts the target a few
 * arcminutes off centre, not dead on it, and the centring phase is what walks
 * it the rest of the way. A tenth of a degree is a typical pointing error.
 */
const LANDING_ERROR: AltAz = { altitude: 0.04, azimuth: 0.11 };

/** How far around the pointing the object list is kept fresh. Covers the widest field plus a tick of rate-9 slewing. */
const OBJECT_RADIUS_DEG = 1.5;

/**
 * The middle of the next dark window that has not happened yet.
 *
 * getTonightDarkWindow anchors at noon *yesterday* whenever it is asked before
 * midday, which is the right answer for "was last night dark" and the wrong one
 * here: at 11:00 it returns a midpoint around 01:00 this morning, already in the
 * past, and jumping to it moves the clock nowhere. Asking again from twelve
 * hours ahead moves the anchor to today's noon and yields tonight instead.
 */
function nextDarkMidpoint(lat: number, lon: number, from: Date): Date | null {
  for (const hoursAhead of [0, 12, 24]) {
    const reference = new Date(from.getTime() + hoursAhead * 3_600_000);
    const midpoint = getTonightDarkWindow(lat, lon, reference).midpoint;
    if (midpoint && midpoint.getTime() > from.getTime()) return midpoint;
  }
  return null;
}
const SEEING_ARCSEC = DEFAULT_SEEING_ARCSEC;
const TICK_MS = 250;

const wrapDelta = (deg: number) => (deg > 180 ? deg - 360 : deg < -180 ? deg + 360 : deg);

export default function SessionConsole({
  node,
  cloudCover,
  session,
}: {
  node: ObservatoryNode;
  cloudCover: number | null;
  /**
   * A booked slot. The console runs on the real clock inside it — there is no
   * moving time when the instrument is somebody else's for twenty minutes.
   */
  session?: { id: string; startsAtMs: number; endsAtMs: number };
}) {
  const t = useTranslations('observatory.console');
  const { getAccessToken } = usePrivy();
  const [clock, setClock] = useState<number | null>(null);
  // Simulated time runs forward from the real clock plus an offset, so the
  // console keeps ticking wherever the visitor moved it to.
  const [offsetMs, setOffsetMs] = useState(0);
  const now = (clock ?? 0) + offsetMs;
  const [acquisition, setAcquisition] = useState<Acquisition | null>(null);
  // Unparked. A mount that has been steered by hand is awake without a target.
  const [awake, setAwake] = useState(false);
  const [rate, setRate] = useState(9);
  const [exposureSec, setExposureSec] = useState(2);
  const [trainId, setTrainId] = useState('native');
  const [roiId, setRoiId] = useState('full');
  const [gain, setGain] = useState(40);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [captures, setCaptures] = useState(0);
  // The last frame taken, for the dock's thumbnail.
  const [last, setLast] = useState<{ targetId: string; at: string } | null>(null);
  const [splitAt, setSplitAt] = useState<number | null>(null);
  const [audioOn, setAudioOn] = useState(false);
  // The drive's pointing, copied out once a tick for everything React renders.
  const [pointing, setPointing] = useState<AltAz>(PARKED);

  const audioRef = useRef<MotorAudio | null>(null);
  if (audioRef.current === null && typeof window !== 'undefined') audioRef.current = new MotorAudio();
  const driveRef = useRef<MountDrive | null>(null);
  if (driveRef.current === null) driveRef.current = new MountDrive();

  useEffect(() => {
    const real = Date.now();
    setClock(real);

    // Opening the console in daylight refuses all eight targets for the same
    // reason, which teaches a visitor nothing and reads as a broken page. The
    // simulator is the one thing here anyone can touch without an account, so
    // it starts in tonight's dark window whenever the Sun is up. A booked
    // session never moves: the instrument is somebody else's for those twenty
    // minutes and the clock is the real one.
    if (!session && getSunAltitude(node.lat, node.lon, new Date(real)) > LIMITS.sunAltitudeCeilingDeg) {
      const midpoint = nextDarkMidpoint(node.lat, node.lon, new Date(real));
      if (midpoint) setOffsetMs(midpoint.getTime() - real);
    }

    const id = setInterval(() => setClock(Date.now()), TICK_MS);
    return () => clearInterval(id);
    // Mount only: this picks a starting clock, it does not track the Sun.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const date = useMemo(() => new Date(now), [now]);
  // Commands must be evaluated on the same clock the buttons were graded on.
  // Reading Date.now() inside a handler instead let a target be offered at the
  // simulated hour and then refused at the real one.
  const nowRef = useRef(now);
  nowRef.current = now;
  const offsetRef = useRef(offsetMs);
  offsetRef.current = offsetMs;
  const acquisitionRef = useRef(acquisition);
  acquisitionRef.current = acquisition;
  const rateRef = useRef(rate);
  rateRef.current = rate;
  const audioOnRef = useRef(audioOn);
  audioOnRef.current = audioOn;

  const train = TRAIN_BY_ID.get(trainId) ?? TRAINS[1];
  const roi = ROI_BY_ID.get(roiId) ?? ROIS[0];
  const fov = useMemo(
    () => fieldOfView(node.instrument, train, roi),
    [node.instrument, train, roi],
  );
  const diffractionArcsec = useMemo(
    () => resolvingPowerArcsec(node.instrument),
    [node.instrument],
  );

  // Recomputed each tick: a target that is safe now can set below the limit
  // twenty minutes later, and the buttons must say so before they are pressed.
  const verdicts = useMemo(() => {
    const out: Record<string, SafetyVerdict> = {};
    for (const target of SIM_TARGETS) {
      out[target.id] = evaluateSafety(node, targetAltAz(target, node, date), date);
    }
    return out;
  }, [node, date]);

  const status = acquisition ? acquisitionStateAt(acquisition, now) : null;
  const target = acquisition ? SIM_TARGET_BY_ID.get(acquisition.targetId) ?? null : null;
  const targetNow = useMemo(
    () => (target ? targetAltAz(target, node, date) : null),
    [target, node, date],
  );
  const lstHours = useMemo(() => localSiderealHours(node.lon, date), [node.lon, date]);
  const sunAltitude = useMemo(() => getSunAltitude(node.lat, node.lon, date), [node.lat, node.lon, date]);
  const sun = useMemo(() => sunPosition(node, date), [node, date]);
  // Everything real within reach of the frame, positioned for this instant.
  const objects = useMemo(
    () => skyObjectsNear(node, date, pointing, OBJECT_RADIUS_DEG, lstHours),
    [node, date, pointing, lstHours],
  );

  const settledMs = acquisition && status?.state === 'OBSERVING' ? now - acquisition.settledAtMs : 0;
  const subs = Math.floor(settledMs / (exposureSec * 1000));
  const rotationRate = fieldRotationDegPerHour(node.lat, pointing.altitude, pointing.azimuth);

  const observing = status?.state === 'OBSERVING';
  const offTarget = observing && targetNow ? tangentOffsetDeg(targetNow, pointing) : null;
  const offTargetArcmin = offTarget ? Math.hypot(offTarget.x, offTarget.y) * 60 : null;

  const targetNowRef = useRef(targetNow);
  targetNowRef.current = targetNow;
  const sunRef = useRef(sun);
  sunRef.current = sun;
  // The last target position the tracking drive was moved to follow.
  const trackedRef = useRef<AltAz | null>(null);
  const sampleRef = useRef<MountSample>({ pointing: PARKED, azRate: 0, altRate: 0 });
  const sunRefusedRef = useRef(false);

  const append = useCallback((text: string, refused = false) => {
    setLog((prev) => [...prev, { at: nowRef.current, text, refused }].slice(-60));
  }, []);

  /**
   * One frame of the mount. A GoTo in flight owns the axes and the drive is a
   * passenger; on target, the drive follows the sky and takes nudges on top;
   * awake without a target, it goes wherever the keys send it, untracked.
   */
  const stepMount = useCallback(
    (perfNow: number) => {
      const drive = driveRef.current!;
      const audio = audioRef.current;
      const simNow = Date.now() + offsetRef.current;
      const acq = acquisitionRef.current;
      const st = acq ? acquisitionStateAt(acq, simNow) : null;
      let azRate = 0;
      let altRate = 0;

      if (acq && st && st.state !== 'OBSERVING') {
        const targetAt = targetNowRef.current ?? acq.to;
        const landed = {
          altitude: acq.to.altitude + LANDING_ERROR.altitude,
          azimuth: acq.to.azimuth + LANDING_ERROR.azimuth,
        };
        let p: AltAz;
        if (st.state === 'CENTERING') {
          p = {
            altitude: landed.altitude + (targetAt.altitude - landed.altitude) * st.progress,
            azimuth: landed.azimuth + wrapDelta(targetAt.azimuth - landed.azimuth) * st.progress,
          };
        } else if (st.state === 'VERIFYING') {
          p = landed;
        } else {
          p = pointingAt(acq, simNow);
        }
        drive.setPointing(p);
        drive.halt();
        trackedRef.current = null;

        if (st.state === 'SLEWING') {
          const slew = acq.phases.find((ph) => ph.state === 'SLEWING')!;
          const seconds = (slew.endsAtMs - slew.startsAtMs) / 1000;
          const t = (simNow - slew.startsAtMs) / 1000;
          // Both axes run for the whole phase at whatever rate covers their
          // distance, spinning up at the start and down at the end.
          const envelope = Math.min(1, t / SPIN_UP_S, (seconds - t) / SPIN_DOWN_S);
          azRate = (Math.abs(wrapDelta(acq.to.azimuth - acq.from.azimuth)) / seconds) * Math.max(0, envelope);
          altRate = (Math.abs(acq.to.altitude - acq.from.altitude) / seconds) * Math.max(0, envelope);
        }
      } else {
        if (acq && st) {
          // On target: the tracking drive moves the axes by exactly what the
          // sky did since the last tick, and the hand control adds to that.
          const targetAt = targetNowRef.current ?? acq.to;
          const last = trackedRef.current;
          if (!last) {
            drive.setPointing(targetAt);
            drive.halt();
          } else if (last !== targetAt) {
            drive.setPointing({
              altitude: drive.altitude + (targetAt.altitude - last.altitude),
              azimuth: drive.azimuth + wrapDelta(targetAt.azimuth - last.azimuth),
            });
          }
          trackedRef.current = targetAt;
        } else {
          trackedRef.current = null;
        }

        const before = drive.pointing;
        drive.step(perfNow);
        if (drive.moving && angularSeparation(drive.pointing, sunRef.current) < LIMITS.sunAvoidanceDeg) {
          // The envelope holds by hand as well as by GoTo.
          drive.setPointing(before);
          drive.halt();
          if (!sunRefusedRef.current) {
            sunRefusedRef.current = true;
            append(`Slew refused — inside the ${LIMITS.sunAvoidanceDeg}° solar exclusion.`, true);
          }
        }
        const rates = drive.rates;
        azRate = rates.az;
        altRate = rates.alt;
      }

      sampleRef.current = { pointing: drive.pointing, azRate, altRate };
      if (audio && audioOnRef.current) {
        audio.setAxisRates(azRate, altRate);
        audio.setTracking(st?.state === 'OBSERVING');
      }
    },
    [append],
  );

  useEffect(() => {
    let handle = 0;
    let running = true;
    const loop = (t: number) => {
      if (!running) return;
      stepMount(t);
      handle = requestAnimationFrame(loop);
    };
    handle = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(handle);
    };
  }, [stepMount]);

  // Copy the drive out once a tick so telemetry and the object list follow it.
  useEffect(() => {
    const p = sampleRef.current.pointing;
    setPointing((prev) =>
      Math.abs(prev.altitude - p.altitude) < 1e-4 && Math.abs(prev.azimuth - p.azimuth) < 1e-4 ? prev : p,
    );
  }, [now]);

  useEffect(() => () => audioRef.current?.stop(), []);

  const toggleAudio = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audioOn) {
      audio.setAxisRates(0, 0);
      audio.setTracking(false);
      setAudioOn(false);
      return;
    }
    // Browsers only allow an audio context to start inside a user gesture.
    setAudioOn(await audio.start());
  }, [audioOn]);

  const goTo = useCallback(
    (next: SimTarget) => {
      const atMs = nowRef.current;
      const at = new Date(atMs);
      const to = targetAltAz(next, node, at);
      const verdict = evaluateSafety(node, to, at);

      if (!verdict.ok) {
        append(`GoTo ${next.name} refused — ${verdict.reason}`, true);
        return;
      }

      const drive = driveRef.current!;
      drive.halt();
      setAcquisition(
        planAcquisition({
          targetId: next.id,
          targetName: next.name,
          from: drive.pointing,
          to,
          startedAtMs: atMs,
          warm: awake,
        }),
      );
      setAwake(true);
      const setup = RECOMMENDED_SETUP[next.id] ?? { train: 'native', roi: 'full', exposureSec: 2 };
      setTrainId(setup.train);
      setRoiId(setup.roi);
      setExposureSec(setup.exposureSec);
      setCaptures(0);
      append(`GoTo ${next.name} — ${to.altitude.toFixed(1)}° altitude, ${to.azimuth.toFixed(1)}° azimuth`);
    },
    [append, awake, node],
  );

  const press = useCallback(
    (axis: Axis, direction: 1 | -1) => {
      const drive = driveRef.current!;
      const acq = acquisitionRef.current;
      const st = acq ? acquisitionStateAt(acq, nowRef.current) : null;
      if (acq && st && st.state !== 'OBSERVING') {
        // A direction key during a GoTo aborts it, as on the real hand control.
        const name = SIM_TARGET_BY_ID.get(acq.targetId)?.name ?? acq.targetId;
        acquisitionRef.current = null;
        setAcquisition(null);
        append(`GoTo ${name} aborted — hand control.`);
      }
      if (!awake) {
        setAwake(true);
        append('Hand control — mount awake, tracking off.');
      }
      sunRefusedRef.current = false;
      drive.press(axis, direction, rateRef.current);
    },
    [append, awake],
  );

  const release = useCallback((axis: Axis) => {
    driveRef.current!.release(axis);
  }, []);

  const capture = useCallback(async () => {
    if (!target) return;
    if (audioOn) audioRef.current?.click();
    setCaptures((c) => c + 1);
    setLast({
      targetId: target.id,
      at: new Intl.DateTimeFormat('en-GB', {
        timeZone: node.timezone,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(new Date(nowRef.current)),
    });
    append(`Captured ${target.name} — ${subs} subs, ${(subs * exposureSec).toFixed(0)}s integration`);

    // The sandbox keeps its frames in the browser. A booked session files them,
    // and the server decides what they are worth — the log says which.
    if (!session) return;
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/observatory/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sessionId: session.id,
          targetId: target.id,
          targetName: target.name,
          exposureSec,
          subs,
          opticalTrain: trainId,
          roi: roiId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        append(`Frame not filed — ${data.error ?? 'the store refused it'}.`);
        return;
      }
      append(data.admitted ? 'Filed to your Collection.' : data.reason);
    } catch {
      append('Frame not filed — network error.');
    }
  }, [append, audioOn, exposureSec, getAccessToken, node.timezone, roiId, session, subs, target, trainId]);

  const jumpToNight = useCallback(() => {
    const real = Date.now();
    const midpoint = nextDarkMidpoint(node.lat, node.lon, new Date(real));
    if (!midpoint) return;

    const nextOffset = midpoint.getTime() - real;
    setOffsetMs(nextOffset);
    nowRef.current = real + nextOffset;
    setAcquisition(null);
    append('Clock moved to tonight’s dark window.');
  }, [append, node.lat, node.lon]);

  const returnToNow = useCallback(() => {
    setOffsetMs(0);
    nowRef.current = Date.now();
    setAcquisition(null);
    append('Clock returned to now.');
  }, [append]);

  const park = useCallback(() => {
    const drive = driveRef.current!;
    drive.halt();
    drive.setPointing(PARKED);
    setAcquisition(null);
    setAwake(false);
    append('Parked. Mount at home, camera idle.');
  }, [append]);

  const sample = useCallback(() => sampleRef.current, []);

  /**
   * The simulator opens on something, already settled.
   *
   * A parked mount over an empty frame is honest and teaches nothing, and a
   * ninety-second slew before the first photon is worse: the visitor waits at
   * a dark rectangle wondering whether the page is broken. So the sandbox
   * arrives mid-session — the acquisition is planned as though it began long
   * enough ago to have finished, which is exactly what an observer who had
   * been at the eyepiece for a minute would be looking at. Every slew after
   * this one runs at the instrument's real speed.
   *
   * A booked session never does this. That telescope is somebody else's for
   * twenty minutes and it moves when its operator says so.
   */
  const opened = useRef(false);
  useEffect(() => {
    if (session || clock === null || opened.current) return;
    const first = SIM_TARGETS.find((target) => verdicts[target.id]?.ok);
    if (!first) return;
    opened.current = true;

    const atMs = nowRef.current;
    const to = targetAltAz(first, node, new Date(atMs));
    // Backdated by exactly its own length plus a few seconds: settled on
    // arrival, with a stack that is seconds old rather than minutes. A deep
    // backdate would open on thousands of stacked subs — the theoretical best
    // this instrument can ever do, handed over before anything was earned.
    const plan = { targetId: first.id, targetName: first.name, from: PARKED, to, warm: false };
    const dry = planAcquisition({ ...plan, startedAtMs: atMs });
    setAcquisition(
      planAcquisition({ ...plan, startedAtMs: atMs - (dry.settledAtMs - atMs) - 8_000 }),
    );
    setAwake(true);
    const setup = RECOMMENDED_SETUP[first.id] ?? { train: 'native', roi: 'full', exposureSec: 2 };
    setTrainId(setup.train);
    setRoiId(setup.roi);
    setExposureSec(setup.exposureSec);
    append(`Session opened on ${first.name} — mount already tracking.`);
    // Once, on the first tick that has both a clock and graded targets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clock, session]);

  // Every number on this console comes from a clock, and the server's clock is
  // not the visitor's — rendering any of it before mount is a guaranteed
  // hydration mismatch. The shell holds the layout until the browser takes over.
  if (clock === null) {
    return (
      <div className="obs-panel" style={{ minHeight: '28rem' }}>
        <div className="obs-panel__bar">
          <span className="flex items-center gap-2">
            <span className="obs-led" aria-hidden="true" />
            <span className="obs-panel__title">Standby</span>
          </span>
          <span className="obs-panel__title">Acquiring site clock</span>
        </div>
      </div>
    );
  }

  const stateLabel = status?.state ?? (awake ? 'MANUAL' : 'PARKED');
  const stateDetail = status ? status.detail : awake ? t('manualLine') : t('parkedLine');

  return (
    <div className="obs-live">
      {/* The frame is the page. Everything else floats on it. */}
      <div className="obs-live__sky">
        <LiveView
          sample={sample}
          objects={objects}
          latDeg={node.lat}
          lstHours={lstHours}
          sunAltitudeDeg={sunAltitude}
          exposureSec={exposureSec}
          fovArcmin={fov.widthArcmin}
          seeingArcsec={SEEING_ARCSEC}
          diffractionArcsec={diffractionArcsec}
          plateScaleArcsecPx={fov.plateScaleArcsecPx}
          bortle={node.bortle}
          subs={Math.max(1, subs)}
          gain={gain}
          splitAt={observing ? splitAt : null}
        />
      </div>

      <span className="obs-live__tag">{t('simulated')}</span>

      {splitAt !== null && observing && (
        <>
          <span className="obs-live__split obs-live__split--left">{t('rawSub')}</span>
          <span className="obs-live__split obs-live__split--right">
            {t('stacked', { count: subs.toLocaleString() })}
          </span>
        </>
      )}

      <CornerClock timezone={node.timezone} zoneLabel={`${node.site} · ${t('siteTime')}`}>
        {status && !observing && (
          <span className="obs-pill obs-pill--busy">
            <span className="obs-led" aria-hidden="true" />
            {Math.round(status.progress * 100)}%
            {status.msToSettled > 0 && ` · T-${Math.ceil(status.msToSettled / 1000)}s`}
          </span>
        )}
      </CornerClock>

      <div className="obs-live__body">
        <StagePanel
          node={node}
          target={target}
          state={stateLabel}
          stateLine={stateDetail}
          tracking={observing}
          cloudCover={cloudCover}
          verdicts={verdicts}
          onGoTo={goTo}
          session={
            session
              ? {
                  startsAtMs: session.startsAtMs,
                  endsAtMs: session.endsAtMs,
                  now,
                  timezone: node.timezone,
                }
              : undefined
          }
        >
          {!session && (
            <TimeControl
              now={now}
              timezone={node.timezone}
              offsetMs={offsetMs}
              onJumpToNight={jumpToNight}
              onReturnToNow={returnToNow}
            />
          )}
        </StagePanel>

        <div className="obs-live__spacer" aria-hidden="true" />

        <ConsoleTabs
          label={t('tabs')}
          tabs={[
            {
              id: 'hand',
              label: t('handControl'),
              panel: (
                <>
                  <HandControl
                    rate={rate}
                    onRate={setRate}
                    onPress={press}
                    onRelease={release}
                    tracking={observing}
                    offTargetArcmin={offTargetArcmin}
                  />
                </>
              ),
            },
            {
              id: 'camera',
              label: t('camera'),
              panel: (
                <ControlPanel
                  exposureSec={exposureSec}
                  brightness={target?.brightness ?? 'faint'}
                  onExposure={setExposureSec}
                  trainId={trainId}
                  onTrain={setTrainId}
                  roiId={roiId}
                  onRoi={setRoiId}
                  gain={gain}
                  onGain={setGain}
                  parked={!awake}
                />
              ),
            },
            {
              id: 'telemetry',
              label: t('telemetry'),
              panel: (
                <>
                  <TelemetryPanel
                    t={{
                      altitude: pointing.altitude,
                      hourAngle: target
                        ? hourAngle(targetRaHours(target, date), node.lon, date)
                        : awake
                          ? hourAngle(altAzToRaDec(pointing, node.lat, lstHours).raHours, node.lon, date)
                          : null,
                      siderealHours: lstHours,
                      azimuth: pointing.azimuth,
                      fovArcmin: fov.widthArcmin,
                      targetArcmin: target ? targetSizeArcmin(target, date) : null,
                      subs,
                      exposureSec,
                      gain,
                      seeingArcsec: SEEING_ARCSEC,
                      resolvedArcsec: effectiveBlurArcsec({
                        seeingArcsec: SEEING_ARCSEC,
                        diffractionArcsec,
                        subs: Math.max(1, subs),
                      }),
                      focalLengthMm: effectiveFocalLength(node.instrument, train),
                      plateScaleArcsecPx: fov.plateScaleArcsecPx,
                      rotationDegPerHour: awake ? rotationRate : null,
                      cloudCover,
                    }}
                  />
                  <CompareControl splitAt={splitAt} onSplit={setSplitAt} disabled={!observing} />
                </>
              ),
            },
            {
              id: 'events',
              label: t('events'),
              panel: <EventsPanel lat={node.lat} lon={node.lon} now={now} timezone={node.timezone} />,
            },
            {
              id: 'log',
              label: t('log'),
              panel: (
                <>
                  <MissionLog entries={log} timezone={node.timezone} />
                  {captures > 0 && (
                    <p className="obs-label mt-2">{t('capturesNote', { count: captures })}</p>
                  )}
                </>
              ),
            },
          ]}
        />
      </div>

      <LiveDock
        targetId={target?.id ?? null}
        verdicts={verdicts}
        onGoTo={(id) => {
          const next = SIM_TARGET_BY_ID.get(id);
          if (next) goTo(next);
        }}
        trainId={trainId}
        onTrain={setTrainId}
        exposureSec={exposureSec}
        brightness={target?.brightness ?? 'faint'}
        onExposure={setExposureSec}
        audioOn={audioOn}
        onAudio={() => void toggleAudio()}
        onCapture={capture}
        canCapture={observing}
        onPark={park}
        parked={!awake}
        last={last}
        labels={{
          target: t('target'),
          zoom: t('zoom'),
          exposure: t('exposure'),
          audio: t('audio'),
          capture: t('capture'),
          park: t('park'),
          lastCapture: t('lastCapture'),
        }}
      />
    </div>
  );
}
