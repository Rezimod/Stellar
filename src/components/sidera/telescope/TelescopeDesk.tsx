'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import LiveView, { type MountSample } from '@/components/observatory/LiveView';
import TelemetryPanel from '@/components/observatory/TelemetryPanel';
import type { Capture } from './Frames';
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
import DeskBar from './DeskBar';
import DeskHud from './DeskHud';
import DeskModal from './DeskModal';
import DeskPanel, { type GotoState, type ObsMode, type RunState } from './DeskPanel';
import EmptyView from './EmptyView';
import StationList from './StationList';
import GuideDialog from './GuideDialog';
import TargetPicker from './TargetPicker';
import WelcomeDialog from './WelcomeDialog';
import { stationName } from './stations';

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
const WELCOMED_KEY = 'sidera.telescope.welcomed';

const ARROWS: Record<string, { axis: Axis; dir: 1 | -1 }> = {
  ArrowLeft: { axis: 'az', dir: -1 },
  ArrowRight: { axis: 'az', dir: 1 },
  ArrowUp: { axis: 'alt', dir: 1 },
  ArrowDown: { axis: 'alt', dir: -1 },
};

type Slew = { from: AltAz; to: AltAz; startedAtMs: number; endsAtMs: number };

const wrapDelta = (deg: number) => (deg > 180 ? deg - 360 : deg < -180 ? deg + 360 : deg);
const pad = (n: number) => String(n).padStart(2, '0');
const typing = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName));

/**
 * The telescope console: connect to a station, park, calibrate, choose a
 * target, point, observe, capture. The view holds the left of the desk and can
 * fill the screen; every control sits in the panel on the right. Every frame
 * is drawn by the sky model and says so.
 */
export default function TelescopeDesk() {
  const [clock, setClock] = useState<number | null>(null);
  const now = clock ?? 0;

  const [station, setStation] = useState<Station | null>(null);
  const [connectedAtMs, setConnectedAtMs] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
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
  const viewRef = useRef<HTMLDivElement>(null);

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
  const padEnabled = cal === 'done' && park !== 'running';
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

  /* --- full view ------------------------------------------------------ */

  const setFull = useCallback((on: boolean) => {
    setExpanded(on);
    // The whole document goes full screen, not the view alone, so the target
    // picker and the frame viewer — portalled to the body — still show over it.
    if (on && !document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => undefined);
    if (!on && document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  }, []);

  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setExpanded(false);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [expanded]);

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
    setFull(false);
  }, [setFull]);

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
    setPanelOpen(true);
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
        setRefusal('Enter a right ascension as hh:mm:ss and a declination as ±dd:mm:ss.');
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
      setRefusal(`Refused — ${verdict.reason}`);
      return;
    }
    const drive = driveRef.current!;
    drive.halt();
    setRefusal(null);
    setObservation(null);
    setAcquisition(planAcquisition({ targetId: next.id, targetName: targetTitle(next), from: drive.pointing, to, startedAtMs: at.getTime(), warm: true }));
  }, [station, target, manual, manualRa, manualDec]);

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

  const startObservation = useCallback(() => setObservation({ startsAtMs: Date.now() + START_MS }), []);
  const stopObservation = useCallback(() => setObservation(null), []);

  const capture = useCallback(async () => {
    const canvas = viewRef.current?.querySelector('canvas');
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
        { id: `${stamp}-${prev.length}`, dataUrl, filename: `sidera_${stamp}_${target.id}.png`, hash, targetName: targetTitle(target), subs, exposureSec: mode.exposureSec },
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

  /* --- the keyboard: arrows slew, F fills the screen ------------------ */

  const dialogOpen = welcome || guide || picker || viewing !== null;
  const keysRef = useRef({ padEnabled, station, dialogOpen, expanded, press, release, setFull });
  keysRef.current = { padEnabled, station, dialogOpen, expanded, press, release, setFull };

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const k = keysRef.current;
      if (k.dialogOpen || !k.station || e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      const arrow = ARROWS[e.key];
      if (arrow) {
        if (!k.padEnabled) return;
        e.preventDefault();
        if (!e.repeat) k.press(arrow.axis, arrow.dir);
      } else if (e.key === 'f' || e.key === 'F') {
        k.setFull(!k.expanded);
      } else if (e.key === 'Escape' && k.expanded) {
        k.setFull(false);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      const arrow = ARROWS[e.key];
      if (arrow) keysRef.current.release(arrow.axis);
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  const sample = useCallback(() => sampleRef.current, []);

  if (clock === null) {
    return <div className="sdt sdt--shell" aria-busy="true" />;
  }

  const coords = manual
    ? null
    : targetNow
      ? { ra: formatRa(targetNow.raHours), dec: formatDec(targetNow.decDeg) }
      : null;
  const elapsedMs = running ? now - observation!.startsAtMs : 0;
  const elapsed = `${pad(Math.floor(elapsedMs / 60_000))}:${pad(Math.floor((elapsedMs / 1000) % 60))}`;
  const battery = Math.max(5, 100 - Math.floor(((now - connectedAtMs) / 60_000) * 0.3));
  const observing = observation === null ? 'idle' : running ? 'running' : 'starting';
  const statusLine = !station
    ? null
    : running ? 'Observing'
    : observation ? 'Starting'
    : gotoState === 'slewing' ? 'Slewing'
    : gotoState === 'solving' ? 'Plate-solving'
    : gotoState === 'centring' ? 'Centring'
    : park === 'running' ? 'Parking'
    : cal === 'running' ? 'Calibrating'
    : tracking ? 'Tracking'
    : null;
  const canCapture = tracking && cameraOn;

  return (
    <div className={`sdt${!station || panelOpen ? ' sdt--panel' : ''}`}>
      <DeskBar
        station={station}
        now={now}
        menuOpen={menuOpen}
        onMenu={setMenuOpen}
        onSelect={connect}
        onDisconnect={disconnect}
        status={statusLine}
        frames={captures.length}
        timeLeftMs={timeLeftMs}
        panelOpen={panelOpen}
        onPanel={() => setPanelOpen((o) => !o)}
        onGuide={() => setGuide(true)}
      />

      <div className="sdt-desk">
        <section className={`sdt-stage${expanded ? ' is-expanded' : ''}`} aria-label="Telescope view">
          <div className="sdt-fit">
            <div className="sdt-view" ref={viewRef}>
              {!station || !fov ? (
                <EmptyView onSelect={() => setMenuOpen(true)} onGuide={() => setGuide(true)} />
              ) : (
                <>
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
                    <div className="sdt-view__idle">
                      <p>{park === 'done' ? 'Camera idle. Calibrate to start the feed.' : 'Camera idle. Park at zenith, then calibrate, to start the feed.'}</p>
                    </div>
                  )}
                  <span className="sdt-view__tag sdt-view__tag--sim">Simulated</span>
                  <span className="sdt-view__tag sdt-view__tag--live">
                    <span className={`sdt-led${cameraOn ? ' is-on' : ''}`} aria-hidden="true" />
                    {cameraOn ? 'Live' : 'Standby'}
                  </span>
                  <button
                    type="button"
                    className="sdt-view__full"
                    onClick={() => setFull(!expanded)}
                    aria-pressed={expanded}
                    title={expanded ? 'Exit full view (Esc)' : 'Full view (F)'}
                  >
                    {expanded ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
                    <span>{expanded ? 'Exit full view' : 'Full view'}</span>
                  </button>
                  {target && (tracking || inGoto) && (
                    <span className="sdt-view__target">
                      <strong>{targetTitle(target)}</strong>
                      <span>
                        {inGoto
                          ? statusLine
                          : running ? `${subs} ${subs === 1 ? 'sub' : 'subs'} stacked`
                          : 'On target · tracking'}
                      </span>
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {station && fov && view === 'data' && cameraOn && (
            <div className="sdt-telemetry">
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
            </div>
          )}

          {expanded && station && (
            <DeskHud
              name={stationName(station)}
              status={statusLine}
              elapsed={running ? elapsed : null}
              padEnabled={padEnabled}
              onPress={press}
              onRelease={release}
              observing={observing}
              canStart={tracking}
              onStart={startObservation}
              onStop={stopObservation}
              canCapture={canCapture}
              capturing={capturing}
              onCapture={() => void capture()}
              frames={captures.length}
              onExit={() => setFull(false)}
            />
          )}
        </section>

        {!station && (
          <aside className="sdt-panel" aria-label="Telescopes">
            <section className="sdt-card">
              <p className="sd-label">Connect</p>
              <h2 className="sdt-site__name">Choose a telescope</h2>
              <p className="sdt-hint">A lit dot means it is dark there now. Each station holds the line for {SESSION_MINUTES / 60} hours.</p>
              <StationList current={null} now={now} onSelect={connect} />
            </section>
          </aside>
        )}

        {station && panelOpen && (
          <DeskPanel
            station={station}
            battery={battery}
            onDisconnect={disconnect}
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
            padEnabled={padEnabled}
            onPress={press}
            onRelease={release}
            obsMode={obsMode}
            onObsMode={setObsMode}
            observing={observing}
            elapsed={elapsed}
            canStart={tracking}
            onStart={startObservation}
            onStop={stopObservation}
            canCapture={canCapture}
            capturing={capturing}
            onCapture={() => void capture()}
            captures={captures}
            onOpenCapture={setViewing}
          />
        )}
      </div>

      {welcome && <WelcomeDialog onClose={closeWelcome} />}
      {guide && <GuideDialog onClose={() => setGuide(false)} />}
      {picker && station && (
        <TargetPicker station={station} now={now} current={target} onDone={chooseTarget} onClose={() => setPicker(false)} />
      )}
      {viewing && (
        <DeskModal
          title={viewing.filename}
          onClose={() => setViewing(null)}
          wide
          footer={
            <>
              <div className="sdt-viewer__id">
                <p className="sdt-viewer__name">{viewing.filename}</p>
                <p className="sdt-viewer__hash">SHA-256 {viewing.hash}</p>
              </div>
              <a className="sd-btn sd-btn--primary" href={viewing.dataUrl} download={viewing.filename}>
                Download PNG
              </a>
            </>
          }
        >
          <p className="sd-label">{viewing.targetName} · Simulated · not filed</p>
          {/* A data: URL from this session's own canvas — next/image has nothing to optimise. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewing.dataUrl} alt={viewing.targetName} className="sdt-viewer__img" />
        </DeskModal>
      )}
    </div>
  );
}
