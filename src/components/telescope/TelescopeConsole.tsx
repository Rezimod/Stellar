'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CircleHelp } from 'lucide-react';
import LiveView, { type MountSample } from '@/components/observatory/LiveView';
import TelemetryPanel from '@/components/observatory/TelemetryPanel';
import { getSunAltitude } from '@/lib/dark-window';
import { acquisitionStateAt, planAcquisition, pointingAt, slewMs, type Acquisition } from '@/lib/observatory/mission';
import { ALT_TRAVEL, MountDrive, SPIN_DOWN_S, SPIN_UP_S, type Axis } from '@/lib/observatory/mount-drive';
import { DEFAULT_SEEING_ARCSEC, ROI_BY_ID, TRAIN_BY_ID, effectiveFocalLength, fieldOfView, fieldRotationDegPerHour, resolvingPowerArcsec } from '@/lib/observatory/optics';
import { effectiveBlurArcsec } from '@/lib/observatory/render';
import { LIMITS, angularSeparation, evaluateSafety, sunPosition, type AltAz } from '@/lib/observatory/safety';
import { SESSION_MINUTES, type Station } from '@/lib/observatory/sim-stations';
import { hourAngle, localSiderealHours } from '@/lib/observatory/site-time';
import { skyObjectsNear } from '@/lib/observatory/sky-field';
import { formatDec, formatRa, manualTarget, parseDec, parseRa, targetPosition, targetTitle, type TelescopeTarget } from '@/lib/observatory/telescope-targets';
import CaptureStrip, { type Capture } from './CaptureStrip';
import ControlsPanel, { type GotoState, type ObsMode, type RunState } from './ControlsPanel';
import EmptyStage from './EmptyStage';
import GuideModal from './GuideModal';
import Modal from './Modal';
import TargetModal from './TargetModal';
import TelescopeToolbar from './TelescopeToolbar';
import WelcomeModal from './WelcomeModal';

/** What each observation mode puts in the optical train, and how long a sub runs. */
const MODES: Record<ObsMode, { train: string; roi: string; exposureSec: number }> = {
  astrophoto: { train: 'native', roi: 'full', exposureSec: 8 },
  planetary: { train: 'barlow2', roi: '640', exposureSec: 0.02 },
  lunar: { train: 'reducer', roi: 'full', exposureSec: 0.01 },
};

/** Where a freshly connected instrument happens to be pointing. */
const HANDOVER: AltAz = { altitude: 55, azimuth: 200 };
/** An aligned fork lands a few arcminutes off; centring walks the rest. */
const LANDING_ERROR: AltAz = { altitude: 0.04, azimuth: 0.11 };
const SETTLE_MS = 3_000;
const CALIBRATE_MS = 6_000;
const START_MS = 2_000;
const CAPTURE_MS = 1_400;
const OBJECT_RADIUS_DEG = 1.5;
const TICK_MS = 250;
const WELCOMED_KEY = 'stellar.telescope.welcomed';

type Slew = { from: AltAz; to: AltAz; startedAtMs: number; endsAtMs: number };

const wrapDelta = (deg: number) => (deg > 180 ? deg - 360 : deg < -180 ? deg + 360 : deg);
const pad = (n: number) => String(n).padStart(2, '0');

export default function TelescopeConsole() {
  const t = useTranslations('observatory.telescope');
  const [clock, setClock] = useState<number | null>(null);
  const now = clock ?? 0;

  const [station, setStation] = useState<Station | null>(null);
  const [connectedAtMs, setConnectedAtMs] = useState(0);
  const [controlsOpen, setControlsOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const [guide, setGuide] = useState(false);
  const [picker, setPicker] = useState(false);
  const [viewing, setViewing] = useState<Capture | null>(null);

  const [park, setPark] = useState<RunState>('todo');
  const [cal, setCal] = useState<RunState>('todo');
  const [calEndsAtMs, setCalEndsAtMs] = useState(0);
  const [view, setView] = useState<'explore' | 'data'>('explore');
  const [target, setTarget] = useState<TelescopeTarget | null>(null);
  const [manual, setManual] = useState(false);
  const [manualRa, setManualRa] = useState('');
  const [manualDec, setManualDec] = useState('');
  const [acquisition, setAcquisition] = useState<Acquisition | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [fine, setFine] = useState(false);
  const [obsMode, setObsMode] = useState<ObsMode>('astrophoto');
  const [observation, setObservation] = useState<{ startsAtMs: number } | null>(null);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [pointing, setPointing] = useState<AltAz>(HANDOVER);

  const driveRef = useRef<MountDrive | null>(null);
  if (driveRef.current === null) driveRef.current = new MountDrive();
  const parkSlewRef = useRef<Slew | null>(null);
  const acquisitionRef = useRef(acquisition);
  acquisitionRef.current = acquisition;
  const sampleRef = useRef<MountSample>({ pointing: HANDOVER, azRate: 0, altRate: 0 });
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setClock(Date.now());
    try {
      if (localStorage.getItem(WELCOMED_KEY) !== '1') setWelcome(true);
    } catch {
      setWelcome(true);
    }
    const id = setInterval(() => setClock(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const date = useMemo(() => new Date(now), [now]);
  const lstHours = useMemo(() => (station ? localSiderealHours(station.lon, date) : 0), [station, date]);
  const sunAltitude = useMemo(() => (station ? getSunAltitude(station.lat, station.lon, date) : 0), [station, date]);
  const sun = useMemo(() => (station ? sunPosition(station, date) : null), [station, date]);
  const sunRef = useRef(sun);
  sunRef.current = sun;

  const mode = MODES[obsMode];
  const train = TRAIN_BY_ID.get(mode.train)!;
  const roi = ROI_BY_ID.get(mode.roi)!;
  const fov = useMemo(() => (station ? fieldOfView(station.instrument, train, roi) : null), [station, train, roi]);
  const diffractionArcsec = station ? resolvingPowerArcsec(station.instrument) : 1;

  const status = acquisition ? acquisitionStateAt(acquisition, now) : null;
  const gotoState: GotoState = !status
    ? 'idle'
    : status.state === 'SLEWING' ? 'slewing'
    : status.state === 'VERIFYING' ? 'solving'
    : status.state === 'CENTERING' ? 'centring'
    : 'tracking';
  const tracking = gotoState === 'tracking';
  const inGoto = gotoState === 'slewing' || gotoState === 'solving' || gotoState === 'centring';

  const targetNow = useMemo(
    () => (station && target ? targetPosition(target, station, date) : null),
    [station, target, date],
  );
  const targetNowRef = useRef(targetNow);
  targetNowRef.current = targetNow;
  const trackedRef = useRef<AltAz | null>(null);

  const objects = useMemo(
    () => (station && cal !== 'todo' ? skyObjectsNear(station, date, pointing, OBJECT_RADIUS_DEG, lstHours) : []),
    [station, cal, date, pointing, lstHours],
  );

  const running = observation !== null && now >= observation.startsAtMs;
  const subs = running ? Math.max(1, Math.floor((now - observation.startsAtMs) / (mode.exposureSec * 1000))) : 1;
  const cameraOn = cal !== 'todo';
  const timeLeftMs = station ? connectedAtMs + SESSION_MINUTES * 60_000 - now : null;

  /* --- the mount, once per animation frame --------------------------- */

  const stepMount = useCallback((perfNow: number) => {
    const drive = driveRef.current!;
    const simNow = Date.now();
    const acq = acquisitionRef.current;
    const st = acq ? acquisitionStateAt(acq, simNow) : null;
    const parkSlew = parkSlewRef.current;
    let azRate = 0;
    let altRate = 0;

    const envelope = (startedAtMs: number, endsAtMs: number) => {
      const seconds = (endsAtMs - startedAtMs) / 1000;
      const s = (simNow - startedAtMs) / 1000;
      return Math.max(0, Math.min(1, s / SPIN_UP_S, (seconds - s) / SPIN_DOWN_S));
    };

    if (parkSlew && simNow < parkSlew.endsAtMs) {
      const t01 = Math.min(1, (simNow - parkSlew.startedAtMs) / Math.max(1, parkSlew.endsAtMs - SETTLE_MS - parkSlew.startedAtMs));
      drive.setPointing({
        altitude: parkSlew.from.altitude + (parkSlew.to.altitude - parkSlew.from.altitude) * t01,
        azimuth: parkSlew.from.azimuth,
      });
      drive.halt();
      const seconds = (parkSlew.endsAtMs - SETTLE_MS - parkSlew.startedAtMs) / 1000;
      altRate = seconds > 0 ? (Math.abs(parkSlew.to.altitude - parkSlew.from.altitude) / seconds) * envelope(parkSlew.startedAtMs, parkSlew.endsAtMs) : 0;
    } else if (acq && st && st.state !== 'OBSERVING') {
      const targetAt = targetNowRef.current ?? acq.to;
      const landed = { altitude: acq.to.altitude + LANDING_ERROR.altitude, azimuth: acq.to.azimuth + LANDING_ERROR.azimuth };
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
        const e = envelope(slew.startsAtMs, slew.endsAtMs);
        azRate = (Math.abs(wrapDelta(acq.to.azimuth - acq.from.azimuth)) / seconds) * e;
        altRate = (Math.abs(acq.to.altitude - acq.from.altitude) / seconds) * e;
      }
    } else {
      if (acq && st) {
        // On target: the tracking drive follows the sky; the hand control adds to it.
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
      if (drive.moving && sunRef.current && angularSeparation(drive.pointing, sunRef.current) < LIMITS.sunAvoidanceDeg) {
        drive.setPointing(before);
        drive.halt();
      }
      azRate = drive.rates.az;
      altRate = drive.rates.alt;
    }

    sampleRef.current = { pointing: drive.pointing, azRate, altRate };
  }, []);

  useEffect(() => {
    let handle = 0;
    let live = true;
    const loop = (t: number) => {
      if (!live) return;
      stepMount(t);
      handle = requestAnimationFrame(loop);
    };
    handle = requestAnimationFrame(loop);
    return () => {
      live = false;
      cancelAnimationFrame(handle);
    };
  }, [stepMount]);

  const disconnect = useCallback(() => {
    driveRef.current!.halt();
    driveRef.current!.setPointing(HANDOVER);
    parkSlewRef.current = null;
    trackedRef.current = null;
    setStation(null);
    setPark('todo');
    setCal('todo');
    setView('explore');
    setTarget(null);
    setManual(false);
    setAcquisition(null);
    setRefusal(null);
    setObservation(null);
    setCaptures([]);
    setCapturing(false);
  }, []);

  // Copy the drive out once a tick, and retire timed steps that have run their course.
  useEffect(() => {
    const p = sampleRef.current.pointing;
    setPointing((prev) => (Math.abs(prev.altitude - p.altitude) < 1e-4 && Math.abs(prev.azimuth - p.azimuth) < 1e-4 ? prev : p));
    if (park === 'running' && parkSlewRef.current && now >= parkSlewRef.current.endsAtMs) {
      parkSlewRef.current = null;
      setPark('done');
    }
    if (cal === 'running' && now >= calEndsAtMs) setCal('done');
    if (timeLeftMs !== null && timeLeftMs <= 0) disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  /* --- commands ------------------------------------------------------ */

  const connect = useCallback((s: Station) => {
    disconnect();
    driveRef.current!.setPointing(HANDOVER);
    setStation(s);
    setConnectedAtMs(Date.now());
    setControlsOpen(true);
  }, [disconnect]);

  const parkAtZenith = useCallback(() => {
    const drive = driveRef.current!;
    drive.halt();
    setAcquisition(null);
    setObservation(null);
    const from = drive.pointing;
    const to = { altitude: ALT_TRAVEL.max, azimuth: from.azimuth };
    const startedAtMs = Date.now();
    parkSlewRef.current = { from, to, startedAtMs, endsAtMs: startedAtMs + slewMs(from, to) + SETTLE_MS };
    setPark('running');
  }, []);

  const calibrate = useCallback(() => {
    setCalEndsAtMs(Date.now() + CALIBRATE_MS);
    setCal('running');
  }, []);

  const chooseTarget = useCallback((next: TelescopeTarget) => {
    setTarget(next);
    setRefusal(null);
    setObsMode(next.kind === 'moon' ? 'lunar' : next.kind === 'planet' ? 'planetary' : 'astrophoto');
    setPicker(false);
  }, []);

  const point = useCallback(() => {
    if (!station) return;
    let next = target;
    if (manual) {
      const ra = parseRa(manualRa);
      const dec = parseDec(manualDec);
      if (ra === null || dec === null) {
        setRefusal(t('badCoords'));
        return;
      }
      next = manualTarget(ra, dec);
      setTarget(next);
    }
    if (!next) return;
    const at = new Date();
    const to = targetPosition(next, station, at);
    const verdict = evaluateSafety(station, to, at);
    if (!verdict.ok) {
      setRefusal(t('refused', { reason: verdict.reason }));
      return;
    }
    const drive = driveRef.current!;
    drive.halt();
    setRefusal(null);
    setObservation(null);
    setAcquisition(planAcquisition({ targetId: next.id, targetName: targetTitle(next), from: drive.pointing, to, startedAtMs: at.getTime(), warm: true }));
  }, [station, target, manual, manualRa, manualDec, t]);

  const cancelGoto = useCallback(() => {
    driveRef.current!.halt();
    setAcquisition(null);
  }, []);

  const press = useCallback((axis: Axis, dir: 1 | -1) => {
    if (acquisitionRef.current && acquisitionStateAt(acquisitionRef.current, Date.now()).state !== 'OBSERVING') {
      acquisitionRef.current = null;
      setAcquisition(null);
    }
    driveRef.current!.press(axis, dir, fine ? 4 : 8);
  }, [fine]);

  const release = useCallback((axis: Axis) => driveRef.current!.release(axis), []);

  const capture = useCallback(async () => {
    const canvas = stageRef.current?.querySelector('canvas');
    if (!canvas || !target) return;
    setCapturing(true);
    try {
      await new Promise((r) => setTimeout(r, CAPTURE_MS));
      // The bytes come straight off the canvas: fetching the data URL back
      // would be a network request, and the site's CSP refuses those.
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
      if (!blob) return;
      const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
      const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const dataUrl = canvas.toDataURL('image/png');
      setCaptures((prev) => [
        { id: `${stamp}-${prev.length}`, dataUrl, filename: `stellar_${stamp}_${target.id}.png`, hash, targetName: targetTitle(target), subs, exposureSec: mode.exposureSec },
        ...prev,
      ]);
    } finally {
      setCapturing(false);
    }
  }, [target, subs, mode.exposureSec]);

  const closeWelcome = useCallback(() => {
    setWelcome(false);
    try {
      localStorage.setItem(WELCOMED_KEY, '1');
    } catch {
      /* private mode: shown again next time, which is fine */
    }
  }, []);

  const sample = useCallback(() => sampleRef.current, []);

  if (clock === null) {
    return <div className="tel tel--shell" aria-busy="true" />;
  }

  const coords = manual
    ? null
    : targetNow
      ? { ra: formatRa(targetNow.raHours), dec: formatDec(targetNow.decDeg) }
      : null;
  const elapsedMs = running ? now - observation!.startsAtMs : 0;
  const elapsed = `${pad(Math.floor(elapsedMs / 60_000))}:${pad(Math.floor((elapsedMs / 1000) % 60))}`;
  const battery = Math.max(5, 100 - Math.floor(((now - connectedAtMs) / 60_000) * 0.3));
  const toolbarStatus = !station
    ? null
    : running ? t('statusObserving')
    : observation ? t('starting')
    : inGoto ? t('statusSlewing')
    : null;

  return (
    <div className="tel">
      <TelescopeToolbar
        controlsOpen={controlsOpen}
        onControls={() => setControlsOpen((o) => !o)}
        station={station}
        now={now}
        menuOpen={menuOpen}
        onMenu={setMenuOpen}
        onSelect={connect}
        onDisconnect={disconnect}
        status={toolbarStatus}
        captures={captures.length}
        timeLeftMs={timeLeftMs}
      />

      <div className={`tel__body${station && controlsOpen ? ' tel__body--rail' : ''}`}>
        {station && controlsOpen && (
          <ControlsPanel
            station={station}
            battery={battery}
            park={park}
            onPark={parkAtZenith}
            cal={cal}
            onCalibrate={calibrate}
            view={view}
            onView={setView}
            target={manual ? null : target}
            coords={coords}
            onChooseTarget={() => setPicker(true)}
            manual={manual}
            onManual={(on) => { setManual(on); setRefusal(null); }}
            manualRa={manualRa}
            manualDec={manualDec}
            onManualRa={setManualRa}
            onManualDec={setManualDec}
            goto={gotoState}
            canPoint={cal === 'done' && park !== 'running' && !inGoto && (manual ? manualRa.trim() !== '' && manualDec.trim() !== '' : target !== null)}
            refusal={refusal}
            onPoint={point}
            onCancelGoto={cancelGoto}
            fine={fine}
            onFine={setFine}
            padEnabled={cal === 'done' && park !== 'running'}
            onPress={press}
            onRelease={release}
            obsMode={obsMode}
            onObsMode={setObsMode}
            observing={observation === null ? 'idle' : running ? 'running' : 'starting'}
            elapsed={elapsed}
            canStart={tracking}
            onStart={() => setObservation({ startsAtMs: Date.now() + START_MS })}
            onStop={() => setObservation(null)}
            canCapture={tracking && cameraOn}
            capturing={capturing}
            onCapture={() => void capture()}
          />
        )}

        <div className="tel__stage" ref={stageRef}>
          {!station || !fov ? (
            <EmptyStage onSelect={() => setMenuOpen(true)} onGuide={() => setGuide(true)} />
          ) : (
            <>
              <div className={`tel-frame${captures.length > 0 ? ' tel-frame--compact' : ''}`}>
                {cameraOn ? (
                  <LiveView
                    sample={sample}
                    objects={objects}
                    latDeg={station.lat}
                    lstHours={lstHours}
                    sunAltitudeDeg={sunAltitude}
                    exposureSec={mode.exposureSec}
                    fovArcmin={fov.widthArcmin}
                    seeingArcsec={DEFAULT_SEEING_ARCSEC}
                    diffractionArcsec={diffractionArcsec}
                    plateScaleArcsecPx={fov.plateScaleArcsecPx}
                    bortle={station.bortle}
                    subs={subs}
                    gain={40}
                    splitAt={null}
                  />
                ) : (
                  <div className="tel-frame__idle"><p>{t('cameraIdle')}</p></div>
                )}
                <span className="tel-frame__live"><span className="obs-led obs-led--nominal" aria-hidden="true" />{t('live')}</span>
                <span className="tel-frame__sim">{t('simulated')}</span>
                {target && tracking && (
                  <span className="tel-frame__target">
                    {targetTitle(target)}
                    <span>{running ? t('stackedLine', { count: subs }) : t('onTarget')}</span>
                  </span>
                )}
              </div>

              {view === 'data' && cameraOn && (
                <TelemetryPanel
                  t={{
                    altitude: pointing.altitude,
                    azimuth: pointing.azimuth,
                    hourAngle: targetNow ? hourAngle(targetNow.raHours, station.lon, date) : null,
                    siderealHours: lstHours,
                    fovArcmin: fov.widthArcmin,
                    targetArcmin: targetNow?.sizeArcmin ?? null,
                    subs,
                    exposureSec: mode.exposureSec,
                    gain: 40,
                    seeingArcsec: DEFAULT_SEEING_ARCSEC,
                    resolvedArcsec: effectiveBlurArcsec({ seeingArcsec: DEFAULT_SEEING_ARCSEC, diffractionArcsec, subs }),
                    focalLengthMm: effectiveFocalLength(station.instrument, train),
                    plateScaleArcsecPx: fov.plateScaleArcsecPx,
                    rotationDegPerHour: fieldRotationDegPerHour(station.lat, pointing.altitude, pointing.azimuth),
                    cloudCover: null,
                  }}
                />
              )}

              <CaptureStrip captures={captures} onOpen={setViewing} />
            </>
          )}
        </div>
      </div>

      <div className="tel-foot">
        <button type="button" className="tel-foot__help" onClick={() => setGuide(true)}>
          <CircleHelp size={18} aria-hidden="true" />
          {t('help')}
        </button>
        <span className="tel-foot__systems"><span className="obs-led obs-led--nominal" aria-hidden="true" />{t('systems')}</span>
      </div>

      {welcome && <WelcomeModal onClose={closeWelcome} />}
      {guide && <GuideModal onClose={() => setGuide(false)} />}
      {picker && station && (
        <TargetModal station={station} now={now} current={target} onDone={chooseTarget} onClose={() => setPicker(false)} />
      )}
      {viewing && (
        <Modal title={viewing.filename} closeLabel={t('close')} onClose={() => setViewing(null)} wide>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewing.dataUrl} alt={viewing.targetName} className="tel-viewer" />
          <p className="tel-viewer__name">{viewing.filename}</p>
        </Modal>
      )}
    </div>
  );
}
