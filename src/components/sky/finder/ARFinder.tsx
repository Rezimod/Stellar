'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslations } from 'next-intl';
import { Camera, CameraOff, ChevronDown, RefreshCcw, SlidersHorizontal, X } from 'lucide-react';
import { PlanetIcon } from './PlanetIcon';
import {
  azimuthToCardinal,
  effectiveFov,
  shortestAzDelta,
} from '@/lib/sky/ar';
import { projectBodyToScreen } from '@/lib/sky/projection';
import { useCamera } from '@/hooks/useCamera';
import {
  angularSeparation,
  type HeadingStatus,
} from '@/lib/sky/use-device-heading';
import {
  CONSTELLATION_LINES,
  STAR_TO_CONSTELLATION,
  positionStars,
  type PositionedStar,
} from '@/lib/sky/stars';
import type { ObjectId, SkyObject } from './types';
import './ARFinder.css';

interface ARFinderProps {
  objects: SkyObject[];
  observerLat: number;
  observerLon: number;
  /** Live compass heading from the parent's useDeviceHeading() — sharing
   *  the instance avoids a second iOS permission prompt and ensures the
   *  immersive view picks up wherever the dome left off. */
  heading: number | null;
  altitude: number | null;
  accuracy: number | null;
  headingStatus: HeadingStatus;
  /** When set, the view leads the user to this body — edge arrow when
   *  off-screen, hold-to-lock when centered. */
  activeId: ObjectId | null;
  /** Called when the user picks a different target from the in-view picker. */
  onSelectActive: (id: ObjectId | null) => void;
  onClose: () => void;
}

const COMPASS_TICKS = [
  { deg: 0,   label: 'N',  cardinal: true },
  { deg: 30,  label: '30', cardinal: false },
  { deg: 45,  label: 'NE', cardinal: false },
  { deg: 60,  label: '60', cardinal: false },
  { deg: 90,  label: 'E',  cardinal: true },
  { deg: 120, label: '120',cardinal: false },
  { deg: 135, label: 'SE', cardinal: false },
  { deg: 150, label: '150',cardinal: false },
  { deg: 180, label: 'S',  cardinal: true },
  { deg: 210, label: '210',cardinal: false },
  { deg: 225, label: 'SW', cardinal: false },
  { deg: 240, label: '240',cardinal: false },
  { deg: 270, label: 'W',  cardinal: true },
  { deg: 300, label: '300',cardinal: false },
  { deg: 315, label: 'NW', cardinal: false },
  { deg: 330, label: '330',cardinal: false },
];

const COMPASS_VISIBLE_DEG = 80;
const HOLD_TO_LOCK_MS = 800;
const POOR_ACCURACY_DEG = 15;
const STAR_LABEL_LIMIT = 14;
const DISPLAY_DEADBAND_AZ = 0.14;
const DISPLAY_DEADBAND_ALT = 0.10;
const DISPLAY_ALPHA_STILL = 0.08;
const DISPLAY_ALPHA_MOVE = 0.18;
const DISPLAY_ALPHA_FAST = 0.3;
const DISPLAY_SNAP_AZ = 22;
const DISPLAY_SNAP_ALT = 16;
const AR_ALIGNMENT_KEY = 'stellar.sky.ar.alignment.v1';
const MAX_ALIGNMENT_YAW = 24;
const MAX_ALIGNMENT_PITCH = 18;
const ALIGNMENT_STEP = 0.5;

const CONSTELLATION_NAMES: Record<string, string> = {
  orion: 'ORION',
  ursaMajor: 'URSA MAJOR',
  cassiopeia: 'CASSIOPEIA',
  cygnus: 'CYGNUS',
  andromeda: 'ANDROMEDA',
  lyra: 'LYRA',
};

const STAR_TINT: Record<string, string> = {
  sirius: '#d9e8ff',
  vega: '#d4e4ff',
  rigel: '#cee0ff',
  spica: '#cfe0ff',
  regulus: '#d8e4f6',
  bellatrix: '#d6e2f4',
  alnilam: '#d4e0f4',
  alnitak: '#d4e0f4',
  mintaka: '#d4e0f4',
  altair: '#f4f1e6',
  deneb: '#f0eee0',
  procyon: '#f8f4ec',
  castor: '#ecedf0',
  capella: '#fbe9ad',
  pollux: '#f3c98a',
  arcturus: '#f0a55c',
  aldebaran: '#ec8b56',
  betelgeuse: '#e87454',
  antares: '#e36c4a',
};

function starTint(id: string, mag: number): string {
  if (STAR_TINT[id]) return STAR_TINT[id];
  if (mag <= -1) return '#cfe7ff';
  if (mag <= 0) return '#f8f4ec';
  if (mag <= 1) return '#ffd39b';
  return '#e8d8b6';
}

function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.replace('#', '');
  const normalized = raw.length === 3
    ? raw.split('').map((ch) => ch + ch).join('')
    : raw;
  const value = Number.parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function pickerPriority(obj: SkyObject): number {
  if (obj.id === 'sun') return 0;
  if (obj.id === 'moon') return 1;
  if (obj.type === 'planet') return 2;
  if (obj.type === 'star' || obj.type === 'double') return 3;
  return 4;
}

function wrap360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampAltitude(altitude: number): number {
  return clamp(altitude, -89, 89);
}

interface AlignmentState {
  yaw: number;
  pitch: number;
}

function loadAlignment(): AlignmentState {
  if (typeof window === 'undefined') return { yaw: 0, pitch: 0 };
  try {
    const raw = window.localStorage.getItem(AR_ALIGNMENT_KEY);
    if (!raw) return { yaw: 0, pitch: 0 };
    const parsed = JSON.parse(raw) as Partial<AlignmentState>;
    const yaw = typeof parsed.yaw === 'number' ? clamp(parsed.yaw, -MAX_ALIGNMENT_YAW, MAX_ALIGNMENT_YAW) : 0;
    const pitch = typeof parsed.pitch === 'number' ? clamp(parsed.pitch, -MAX_ALIGNMENT_PITCH, MAX_ALIGNMENT_PITCH) : 0;
    return { yaw, pitch };
  } catch {
    return { yaw: 0, pitch: 0 };
  }
}

function displayAlpha(azDelta: number, altDelta: number): number {
  const maxDelta = Math.max(Math.abs(azDelta), Math.abs(altDelta));
  if (maxDelta >= 8) return DISPLAY_ALPHA_FAST;
  if (maxDelta >= 2.5) return DISPLAY_ALPHA_MOVE;
  return DISPLAY_ALPHA_STILL;
}

/** Per-target lock radius (degrees). Mirrors SkyMap's tolerance ladder. */
function lockRadiusDeg(obj: SkyObject): number {
  if (obj.instrument === 'telescope') return 3;
  if (obj.instrument === 'binoculars') return 5;
  return 8;
}

export function ARFinder({
  objects,
  observerLat,
  observerLon,
  heading,
  altitude,
  accuracy,
  headingStatus,
  activeId,
  onSelectActive,
  onClose,
}: ARFinderProps) {
  const t = useTranslations('sky.ar');

  const [viewport, setViewport] = useState({
    w: typeof window !== 'undefined' ? window.innerWidth : 360,
    h: typeof window !== 'undefined' ? window.innerHeight : 640,
  });
  const [alignment, setAlignment] = useState<AlignmentState>(() => loadAlignment());
  const [alignmentOpen, setAlignmentOpen] = useState(false);

  // Live rear-camera feed. The AR experience auto-starts the camera when the
  // overlay opens — that's what the user means by "point my phone's back
  // camera and see exact positions". The camera layer sits underneath every
  // marker, so projected bodies overlay the real sky.
  const { videoRef, stream, error: cameraError, startCamera, stopCamera } = useCamera();
  const cameraOn = stream != null;
  const [cameraAllowed, setCameraAllowed] = useState(true);

  useEffect(() => {
    if (!cameraAllowed) return;
    void startCamera('environment');
    return () => {
      stopCamera();
    };
    // We deliberately only start once on mount — restarting the stream on
    // every render causes the iOS permission dialog to re-fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCamera = useCallback(() => {
    if (cameraOn) {
      stopCamera();
      setCameraAllowed(false);
    } else {
      setCameraAllowed(true);
      void startCamera('environment');
    }
  }, [cameraOn, startCamera, stopCamera]);

  // Stars are computed once when the immersive view opens. They drift
  // ~0.25°/min — plenty accurate for a session lasting a few minutes.
  const stars = useMemo<PositionedStar[]>(() => {
    return positionStars(observerLat, observerLon, new Date());
  }, [observerLat, observerLon]);

  const starById = useMemo(() => {
    const map = new Map<string, PositionedStar>();
    stars.forEach((s) => map.set(s.id, s));
    return map;
  }, [stars]);

  // Lock body scroll while overlay is open.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Track viewport for FOV → pixel math.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(AR_ALIGNMENT_KEY, JSON.stringify(alignment));
    } catch {
      // Ignore private-mode/localStorage failures.
    }
  }, [alignment]);

  const [renderAim, setRenderAim] = useState(() => ({
    azimuth: heading ?? 0,
    altitude: altitude ?? 0,
  }));
  const renderAimRef = useRef(renderAim);
  const targetAimRef = useRef(renderAim);

  const { horizontal: hFov, vertical: vFov } = useMemo(
    () => effectiveFov(viewport.w, viewport.h),
    [viewport],
  );

  useEffect(() => {
    renderAimRef.current = renderAim;
  }, [renderAim]);

  useEffect(() => {
    targetAimRef.current = {
      azimuth: heading ?? renderAimRef.current.azimuth,
      altitude: altitude ?? renderAimRef.current.altitude,
    };
    if (heading == null || altitude == null) {
      const fallbackAim = targetAimRef.current;
      renderAimRef.current = fallbackAim;
      setRenderAim(fallbackAim);
    }
  }, [heading, altitude]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let raf = 0;
    const tick = () => {
      const current = renderAimRef.current;
      const target = targetAimRef.current;
      const azDelta = shortestAzDelta(target.azimuth, current.azimuth);
      const altDelta = target.altitude - current.altitude;
      const absAz = Math.abs(azDelta);
      const absAlt = Math.abs(altDelta);

      let nextAz = current.azimuth;
      let nextAlt = current.altitude;

      if (absAz >= DISPLAY_SNAP_AZ || absAlt >= DISPLAY_SNAP_ALT) {
        nextAz = target.azimuth;
        nextAlt = target.altitude;
      } else {
        const alpha = displayAlpha(azDelta, altDelta);
        if (absAz >= DISPLAY_DEADBAND_AZ) nextAz = wrap360(current.azimuth + azDelta * alpha);
        if (absAlt >= DISPLAY_DEADBAND_ALT) nextAlt = current.altitude + altDelta * alpha;
      }

      if (
        Math.abs(shortestAzDelta(nextAz, current.azimuth)) >= 0.01 ||
        Math.abs(nextAlt - current.altitude) >= 0.01
      ) {
        const nextAim = { azimuth: nextAz, altitude: nextAlt };
        renderAimRef.current = nextAim;
        setRenderAim(nextAim);
      }

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const phoneAim = useMemo(
    () => ({
      azimuth: wrap360(renderAim.azimuth + alignment.yaw),
      altitude: clampAltitude(renderAim.altitude + alignment.pitch),
    }),
    [renderAim, alignment],
  );

  const nudgeAlignment = useCallback((axis: 'yaw' | 'pitch', delta: number) => {
    setAlignment((prev) => {
      if (axis === 'yaw') {
        return { ...prev, yaw: clamp(prev.yaw + delta, -MAX_ALIGNMENT_YAW, MAX_ALIGNMENT_YAW) };
      }
      return { ...prev, pitch: clamp(prev.pitch + delta, -MAX_ALIGNMENT_PITCH, MAX_ALIGNMENT_PITCH) };
    });
  }, []);

  const project = useCallback(
    (az: number, alt: number) => {
      const p = projectBodyToScreen(
        { altitude: alt, azimuth: az },
        { altitude: phoneAim.altitude, azimuth: phoneAim.azimuth },
        hFov,
        vFov,
        viewport.w,
        viewport.h,
      );
      return {
        dAz: p.dAz,
        dAlt: p.dAlt,
        screenX: p.screenX,
        screenY: p.screenY,
        inFront: p.inFront,
        sep: p.sep,
      };
    },
    [phoneAim, hFov, vFov, viewport],
  );

  const activeBody = useMemo(() => {
    if (!activeId) return null;
    return objects.find((o) => o.id === activeId) ?? null;
  }, [objects, activeId]);

  const bodies = useMemo(() => {
    return objects.map((o) => {
      const { dAz, dAlt, screenX, screenY, inFront } = project(o.azimuth, o.altitude);
      const onScreen =
        inFront &&
        screenX >= -8 && screenX <= viewport.w + 8 &&
        screenY >= -8 && screenY <= viewport.h + 8;
      const sep = angularSeparation(o.altitude, o.azimuth, phoneAim.altitude, phoneAim.azimuth);
      return { obj: o, screenX, screenY, dAz, dAlt, sep, onScreen };
    });
  }, [objects, project, viewport, phoneAim]);

  const bodiesSortedForRender = useMemo(() => {
    return bodies.slice().sort((a, b) => {
      if (a.obj.id === activeId) return 1;
      if (b.obj.id === activeId) return -1;
      return b.sep - a.sep;
    });
  }, [bodies, activeId]);

  const positionedStars = useMemo(() => {
    return stars
      .filter((s) => s.altitude > -2)
      .map((s) => {
        const skyStar = { ...s, constellation: STAR_TO_CONSTELLATION[s.id] };
        const { screenX, screenY, inFront } = project(s.azimuth, s.altitude);
        const onScreen =
          inFront &&
          screenX >= -4 && screenX <= viewport.w + 4 &&
          screenY >= -4 && screenY <= viewport.h + 4;
        return { star: skyStar, screenX, screenY, onScreen };
      });
  }, [stars, project, viewport]);

  const activeConstellation = useMemo(() => {
    if (!activeBody) return null;
    return STAR_TO_CONSTELLATION[activeBody.id] ?? null;
  }, [activeBody]);

  const constellationLabels = useMemo(() => {
    const buckets = new Map<string, { x: number; y: number; n: number }>();
    for (const row of positionedStars) {
      if (!row.onScreen) continue;
      const key = row.star.constellation;
      if (!key || !CONSTELLATION_NAMES[key]) continue;
      const bucket = buckets.get(key) ?? { x: 0, y: 0, n: 0 };
      bucket.x += row.screenX;
      bucket.y += row.screenY;
      bucket.n += 1;
      buckets.set(key, bucket);
    }
    const out: { key: string; x: number; y: number }[] = [];
    buckets.forEach((bucket, key) => {
      if (bucket.n < 2) return;
      out.push({
        key,
        x: bucket.x / bucket.n,
        y: bucket.y / bucket.n,
      });
    });
    return out;
  }, [positionedStars]);

  const labeledStars = useMemo(() => {
    return positionedStars
      .filter(({ star, onScreen }) => {
        if (!onScreen) return false;
        if (star.mag <= 0.9) return true;
        return !!activeConstellation && star.constellation === activeConstellation;
      })
      .sort((a, b) => a.star.mag - b.star.mag)
      .slice(0, STAR_LABEL_LIMIT);
  }, [positionedStars, activeConstellation]);

  const activeRow = useMemo(() => {
    if (!activeBody) return null;
    return bodies.find((b) => b.obj.id === activeBody.id) ?? null;
  }, [bodies, activeBody]);

  const matchActiveTarget = useCallback(() => {
    if (!activeRow) return;
    setAlignment((prev) => ({
      yaw: clamp(prev.yaw + activeRow.dAz, -MAX_ALIGNMENT_YAW, MAX_ALIGNMENT_YAW),
      pitch: clamp(prev.pitch + activeRow.dAlt, -MAX_ALIGNMENT_PITCH, MAX_ALIGNMENT_PITCH),
    }));
  }, [activeRow]);

  const resetAlignment = useCallback(() => {
    setAlignment({ yaw: 0, pitch: 0 });
  }, []);

  const lockRadius = activeBody ? lockRadiusDeg(activeBody) : 8;
  const insideLockCone = activeRow != null && heading != null && altitude != null && activeRow.sep <= lockRadius;
  const [holdProgress, setHoldProgress] = useState(0);
  const [confirmedLock, setConfirmedLock] = useState(false);
  const holdStartRef = useRef<number | null>(null);
  const lastActiveIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (activeBody?.id !== lastActiveIdRef.current) {
      lastActiveIdRef.current = activeBody?.id ?? null;
      holdStartRef.current = null;
      setHoldProgress(0);
      setConfirmedLock(false);
    }
  }, [activeBody]);

  useEffect(() => {
    if (!insideLockCone) {
      holdStartRef.current = null;
      if (holdProgress !== 0) setHoldProgress(0);
      if (confirmedLock) setConfirmedLock(false);
      return;
    }
    if (holdStartRef.current == null) holdStartRef.current = performance.now();
    let raf = 0;
    const tick = () => {
      const start = holdStartRef.current;
      if (start == null) return;
      const elapsed = performance.now() - start;
      const tt = Math.min(1, elapsed / HOLD_TO_LOCK_MS);
      setHoldProgress(tt);
      if (tt >= 1) {
        if (!confirmedLock) {
          setConfirmedLock(true);
          if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            try { navigator.vibrate([12, 40, 12]); } catch { /* ignore */ }
          }
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [insideLockCone, confirmedLock, holdProgress]);

  // Edge arrow: when active body is off-screen, project it and clamp to a
  // position just inside the viewport so the user knows which way to swing.
  const edgeArrow = useMemo(() => {
    if (!activeRow || activeRow.onScreen) return null;
    const cx = viewport.w / 2;
    const cy = viewport.h / 2;
    let dx = activeRow.screenX - cx;
    let dy = activeRow.screenY - cy;
    if (Math.abs(activeRow.dAz) > 90) {
      dx = -dx;
      dy = -dy;
    }
    const norm = Math.hypot(dx, dy) || 1;
    const ux = dx / norm;
    const uy = dy / norm;
    const margin = 70;
    const halfW = cx - margin;
    const halfH = cy - margin;
    const tx = ux > 0 ? halfW / ux : -halfW / ux;
    const ty = uy > 0 ? halfH / uy : -halfH / uy;
    const tt = Math.min(Math.abs(tx), Math.abs(ty));
    const ax = cx + ux * tt;
    const ay = cy + uy * tt;
    const angleDeg = (Math.atan2(uy, ux) * 180) / Math.PI;
    return { x: ax, y: ay, angleDeg };
  }, [activeRow, viewport]);

  const horizonY = (phoneAim.altitude / vFov) * viewport.h + viewport.h / 2;
  const cardinal = azimuthToCardinal(phoneAim.azimuth);
  const compassPxPerDeg = viewport.w / COMPASS_VISIBLE_DEG;
  const headingActive = heading != null && altitude != null;
  const poorAccuracy = headingActive && (accuracy == null || accuracy > POOR_ACCURACY_DEG);
  const visibleBodyCount = useMemo(
    () => objects.filter((o) => o.visible).length,
    [objects],
  );

  const guidanceSteps = useMemo(() => {
    if (!activeRow) return [];
    const steps: string[] = [];
    const horizontal = Math.round(Math.abs(activeRow.dAz));
    const vertical = Math.round(Math.abs(activeRow.dAlt));
    if (horizontal >= 1) {
      steps.push(t(activeRow.dAz > 0 ? 'turnRight' : 'turnLeft', { deg: horizontal }));
    }
    if (vertical >= 1) {
      steps.push(t(activeRow.dAlt > 0 ? 'tiltUp' : 'tiltDown', { deg: vertical }));
    }
    return steps;
  }, [activeRow, t]);

  // Bottom hint is structured (primary cue + optional secondary) so the
  // mobile layout can render the angle as a big mono number with the
  // verbal direction as a quieter line beneath it.
  let hint: { primary: string; secondary?: string; tone?: 'normal' | 'lock' };
  if (!headingActive) {
    if (headingStatus === 'denied') {
      hint = { primary: t('denied.title'), secondary: t('denied.body') };
    } else if (headingStatus === 'unavailable') {
      hint = { primary: t('fallbacks.noSensors') };
    } else {
      hint = { primary: t('liftPhone') };
    }
  } else if (activeBody && activeRow) {
    if (confirmedLock) {
      hint = { primary: t('found', { object: activeBody.name }), tone: 'lock' };
    } else if (activeRow.onScreen) {
      hint = {
        primary: t('centerTarget', { object: activeBody.name }),
        secondary: guidanceSteps.join(' · ') || t('holdSteady'),
      };
    } else {
      hint = {
        primary: t('guideTo', { object: activeBody.name }),
        secondary: guidanceSteps.join(' · ') || t('panTo', { deg: Math.round(activeRow.sep), object: activeBody.name }),
      };
    }
  } else {
    hint = {
      primary: t('browseSky'),
      secondary: t('browseSkyBody'),
    };
  }

  const constellationSegments = useMemo(() => {
    const out: { aId: string; bId: string; x1: number; y1: number; x2: number; y2: number }[] = [];
    const pad = 12;
    for (const [aId, bId] of CONSTELLATION_LINES) {
      const a = starById.get(aId);
      const b = starById.get(bId);
      if (!a || !b) continue;
      if (a.altitude < -1 || b.altitude < -1) continue;
      const pa = project(a.azimuth, a.altitude);
      const pb = project(b.azimuth, b.altitude);
      if (!pa.inFront && !pb.inFront) continue;
      const aOn = pa.inFront && pa.screenX >= -pad && pa.screenX <= viewport.w + pad && pa.screenY >= -pad && pa.screenY <= viewport.h + pad;
      const bOn = pb.inFront && pb.screenX >= -pad && pb.screenX <= viewport.w + pad && pb.screenY >= -pad && pb.screenY <= viewport.h + pad;
      if (!aOn && !bOn) continue;
      out.push({ aId, bId, x1: pa.screenX, y1: pa.screenY, x2: pb.screenX, y2: pb.screenY });
    }
    return out;
  }, [starById, project, viewport]);

  // Picker lists every catalog object so the user can browse first, then
  // opt into guidance. Visible bodies float to the top.
  const pickerBodies = useMemo(() => {
    return objects
      .slice()
      .sort((a, b) => {
        if (a.visible !== b.visible) return a.visible ? -1 : 1;
        const priority = pickerPriority(a) - pickerPriority(b);
        if (priority !== 0) return priority;
        if (a.visible && b.visible) return a.magnitude - b.magnitude || b.altitude - a.altitude;
        return b.altitude - a.altitude;
      });
  }, [objects]);

  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div
      className={`ar-overlay${cameraOn ? ' ar-overlay--camera-on' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={t('title')}
    >
      <video
        ref={videoRef}
        className="ar-overlay__camera"
        autoPlay
        playsInline
        muted
        aria-hidden="true"
      />
      <div className="ar-overlay__starfield" aria-hidden="true">
        <div className="ar-overlay__starfield-haze" />
        <div className="ar-overlay__starfield-milkyway" />
        <div className="ar-overlay__starfield-dust" />
        <div className="ar-overlay__starfield-comet ar-overlay__starfield-comet--a" />
        <div className="ar-overlay__starfield-comet ar-overlay__starfield-comet--b" />
      </div>

      <svg
        className="ar-constellations"
        width={viewport.w}
        height={viewport.h}
        viewBox={`0 0 ${viewport.w} ${viewport.h}`}
      >
        {constellationSegments.map((seg, i) => {
          const isActive =
            !!activeConstellation &&
            (STAR_TO_CONSTELLATION[seg.aId] === activeConstellation ||
              STAR_TO_CONSTELLATION[seg.bId] === activeConstellation);
          return (
            <line
              key={i}
              x1={seg.x1}
              y1={seg.y1}
              x2={seg.x2}
              y2={seg.y2}
              stroke={isActive ? 'rgba(255,224,174,0.42)' : 'rgba(248,244,236,0.14)'}
              strokeWidth={isActive ? 1.15 : 0.9}
              strokeLinecap="round"
            />
          );
        })}
        {constellationLabels.map((label) => {
          const isActive = activeConstellation === label.key;
          return (
            <text
              key={label.key}
              x={label.x}
              y={label.y}
              className={`ar-constellation-label${isActive ? ' is-active' : ''}`}
              textAnchor="middle"
            >
              {CONSTELLATION_NAMES[label.key]}
            </text>
          );
        })}
      </svg>

      <div className="ar-overlay__layer">
        {positionedStars.map(({ star, screenX, screenY, onScreen }) => {
          if (!onScreen) return null;
          const size = Math.max(1.7, 4.8 - star.mag * 0.62);
          const opacity = Math.max(0.56, 1 - star.mag * 0.16);
          const tint = starTint(star.id, star.mag);
          const glow = star.mag <= 0.6
            ? `0 0 12px ${hexToRgba(tint, 0.72)}, 0 0 28px ${hexToRgba(tint, 0.28)}`
            : `0 0 10px ${hexToRgba(tint, 0.42)}`;
          return (
            <div
              key={star.id}
              className="ar-star"
              style={{
                left: screenX,
                top: screenY,
                width: size,
                height: size,
                opacity,
                background: tint,
                boxShadow: glow,
              }}
              title={star.name}
            />
          );
        })}
        {labeledStars.map(({ star, screenX, screenY }) => (
          <div
            key={`label-${star.id}`}
            className={`ar-star-label${activeConstellation === star.constellation ? ' is-active' : ''}`}
            style={{ left: screenX + 10, top: screenY - 12 }}
          >
            {star.name}
          </div>
        ))}
      </div>

      <div
        className="ar-horizon-line"
        style={{ top: Math.max(-1, Math.min(viewport.h + 1, horizonY)) }}
      >
        <span className="ar-horizon-line__label">{t('horizon')}</span>
      </div>

      <div className="ar-overlay__layer">
        {bodiesSortedForRender.map(({ obj, screenX, screenY, onScreen }) => {
          // Render bodies a bit beyond the viewport so they fade in/out
          // smoothly as the user pans, instead of popping when they
          // cross the edge.
          const inFadeBand =
            screenX >= -120 && screenX <= viewport.w + 120 &&
            screenY >= -120 && screenY <= viewport.h + 120;
          if (!inFadeBand) return null;
          const isActive = obj.id === activeId;
          const baseOpacity = onScreen ? (isActive ? 1 : 0.94) : 0;
          return (
            <button
              type="button"
              key={obj.id}
              className={`ar-body ${isActive ? 'ar-body--focused' : ''} ${isActive && confirmedLock ? 'ar-body--locked' : ''}`}
              style={{
                left: screenX,
                top: screenY,
                opacity: baseOpacity,
              }}
              onClick={() => onSelectActive(obj.id)}
              aria-label={isActive ? t('centerTarget', { object: obj.name }) : obj.name}
              aria-pressed={isActive}
            >
              <div className="ar-body__icon">
                <PlanetIcon
                  id={obj.id}
                  type={obj.type}
                  magnitude={obj.magnitude}
                  size={isActive ? 56 : 40}
                  phase={obj.phase}
                  glow={true}
                />
                <div className="ar-body__crosshair" />
                {isActive && !confirmedLock && holdProgress > 0 && (
                  <HoldRing progress={holdProgress} size={isActive ? 70 : 54} />
                )}
              </div>
              <div className="ar-body__label">{obj.name}</div>
              {isActive && (
                <div className="ar-body__coords">
                  ALT {Math.round(obj.altitude)}° · AZ {Math.round(obj.azimuth)}°
                </div>
              )}
            </button>
          );
        })}
      </div>

      {edgeArrow && activeBody && (
        <div
          className="ar-edge-arrow"
          style={{ left: edgeArrow.x, top: edgeArrow.y, transform: `translate(-50%, -50%) rotate(${edgeArrow.angleDeg}deg)` }}
          aria-hidden="true"
        >
          <ArrowGlyph />
          <span className="ar-edge-arrow__label" style={{ transform: `rotate(${-edgeArrow.angleDeg}deg)` }}>
            {activeBody.name}
          </span>
        </div>
      )}

      <div
        className={`ar-center-reticle${activeBody ? ' is-guiding' : ''}${confirmedLock ? ' is-locked' : ''}`}
        aria-hidden="true"
      >
        <span className="ar-center-reticle__h" />
        <span className="ar-center-reticle__v" />
        <span className="ar-center-reticle__dot" />
      </div>

      <div className="ar-center-readout">
        <div className="ar-center-readout__line">
          <span>ALT</span>
          <strong>{phoneAim.altitude >= 0 ? '+' : ''}{phoneAim.altitude.toFixed(1)}°</strong>
          <span>·</span>
          <span>AZ</span>
          <strong>{phoneAim.azimuth.toFixed(1)}°</strong>
        </div>
      </div>

      <div className="ar-compass-strip" aria-hidden="true">
        <div className="ar-compass-strip__inner">
          <div className="ar-compass-strip__center" />
          {COMPASS_TICKS.flatMap((tick) => {
            return [-360, 0, 360].map((wrap) => {
              const delta = shortestAzDelta(tick.deg + wrap, phoneAim.azimuth);
              if (Math.abs(delta) > COMPASS_VISIBLE_DEG / 2 + 5) return null;
              const x = viewport.w / 2 + delta * compassPxPerDeg;
              return (
                <div
                  key={`${tick.label}-${wrap}`}
                  className={`ar-compass-tick ${tick.cardinal ? 'ar-compass-tick--cardinal' : ''}`}
                  style={{ left: x }}
                >
                  <span className="ar-compass-tick__mark" />
                  <span>{tick.label}</span>
                </div>
              );
            });
          })}
        </div>
      </div>

      <div className={`ar-bottom-hint${hint.tone === 'lock' ? ' is-locked' : ''}${hint.secondary ? ' has-secondary' : ''}`}>
        <span className="ar-bottom-hint__primary">{hint.primary}</span>
        {hint.secondary && (
          <span className="ar-bottom-hint__secondary">{hint.secondary}</span>
        )}
      </div>

      {poorAccuracy && (
        <div className="ar-accuracy-banner" role="status">
          {t('poorAccuracy')}
        </div>
      )}

      {/* In-AR target picker — chip in the top-left, tap to expand a list
          of currently-visible bodies. Lets the user switch from Jupiter to
          Saturn without dropping back to the dome. */}
      <ARTargetPicker
        bodies={pickerBodies}
        activeId={activeId}
        visibleCount={visibleBodyCount}
        open={pickerOpen}
        onToggle={() => setPickerOpen((v) => !v)}
        onSelect={(id) => {
          onSelectActive(id);
          setPickerOpen(false);
        }}
      />

      <ARAlignmentPanel
        open={alignmentOpen}
        yaw={alignment.yaw}
        pitch={alignment.pitch}
        activeBodyName={activeBody?.name ?? null}
        onToggle={() => setAlignmentOpen((value) => !value)}
        onNudge={nudgeAlignment}
        onMatchTarget={matchActiveTarget}
        onReset={resetAlignment}
      />

      <div className="ar-overlay__topbar">
        <div>
          <div className="ar-topbar__title">{t('title')}</div>
          <div className="ar-topbar__heading">
            {cardinal} · {Math.round(phoneAim.azimuth)}°
          </div>
        </div>
        <div className="ar-overlay__topbar-actions">
          <button
            type="button"
            className={`ar-topbar__btn${cameraOn ? ' is-active' : ''}`}
            aria-label={cameraOn ? 'Turn off camera' : 'Turn on camera'}
            aria-pressed={cameraOn}
            onClick={toggleCamera}
          >
            {cameraOn ? <Camera size={18} /> : <CameraOff size={18} />}
          </button>
          <button
            type="button"
            className="ar-topbar__btn"
            aria-label={t('close')}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {!cameraOn && cameraError === 'permission_denied' && (
        <div className="ar-camera-banner" role="status">
          Camera blocked — Stellar is showing simulated stars. Enable camera in browser settings, then tap the camera button.
        </div>
      )}
    </div>
  );
}

function HoldRing({ progress, size }: { progress: number; size: number }) {
  const r = size / 2;
  const C = 2 * Math.PI * r;
  return (
    <svg
      className="ar-hold-ring"
      width={size + 4}
      height={size + 4}
      viewBox={`-2 -2 ${size + 4} ${size + 4}`}
      aria-hidden="true"
    >
      <circle
        cx={r}
        cy={r}
        r={r}
        fill="none"
        stroke="var(--terracotta)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={`${C * progress} ${C}`}
        transform={`rotate(-90 ${r} ${r})`}
      />
    </svg>
  );
}

function ArrowGlyph() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 12h13M11 6l6 6-6 6"
        fill="none"
        stroke="var(--terracotta)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface PickerProps {
  bodies: SkyObject[];
  activeId: ObjectId | null;
  visibleCount: number;
  open: boolean;
  onToggle: () => void;
  onSelect: (id: ObjectId | null) => void;
}

function ARTargetPicker({ bodies, activeId, visibleCount, open, onToggle, onSelect }: PickerProps) {
  const t = useTranslations('sky.ar');
  const active = bodies.find((b) => b.id === activeId) ?? null;

  return (
    <div className={`ar-picker${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="ar-picker__chip"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="ar-picker__chip-label">{t('targetLabel')}</span>
        <strong className="ar-picker__chip-name">
          {active?.name ?? t('showAll')}
        </strong>
        <span className="ar-picker__chip-meta">{visibleCount} · {t('visibleNow')}</span>
        <ChevronDown size={14} className="ar-picker__chip-caret" aria-hidden="true" />
      </button>
      {open && (
        <ul className="ar-picker__list" role="listbox" aria-label={t('targetLabel')}>
          <li>
            <button
              type="button"
              className={`ar-picker__row ar-picker__row--all${activeId == null ? ' is-selected' : ''}`}
              role="option"
              aria-selected={activeId == null}
              onClick={() => onSelect(null)}
            >
              <span className="ar-picker__row-main">
                <span className="ar-picker__row-copy">
                  <span className="ar-picker__row-name">{t('showAll')}</span>
                  <span className="ar-picker__row-subtitle">{t('guidanceOff')}</span>
                </span>
              </span>
            </button>
          </li>
          {bodies.length === 0 && (
            <li className="ar-picker__empty">{t('noVisibleBodies')}</li>
          )}
          {bodies.map((b) => {
            const selected = b.id === activeId;
            return (
              <li key={b.id}>
                <button
                  type="button"
                  className={`ar-picker__row${selected ? ' is-selected' : ''}`}
                  role="option"
                  aria-selected={selected}
                  onClick={() => onSelect(b.id)}
                >
                  <span className="ar-picker__row-main">
                    <span className="ar-picker__row-icon" aria-hidden="true">
                      <PlanetIcon
                        id={b.id}
                        type={b.type}
                        magnitude={b.magnitude}
                        size={24}
                        phase={b.phase}
                        glow={selected || b.visible}
                      />
                    </span>
                    <span className="ar-picker__row-copy">
                      <span className="ar-picker__row-name">{b.name}</span>
                      <span className="ar-picker__row-subtitle">
                        {b.visible ? t('visibleNow') : t('belowHorizon')}
                      </span>
                    </span>
                  </span>
                  <span className="ar-picker__row-coords">
                    {b.visible
                      ? `${Math.round(b.altitude)}° · ${b.compassDirection}`
                      : `${Math.abs(Math.round(b.altitude))}°`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface AlignmentPanelProps {
  open: boolean;
  yaw: number;
  pitch: number;
  activeBodyName: string | null;
  onToggle: () => void;
  onNudge: (axis: 'yaw' | 'pitch', delta: number) => void;
  onMatchTarget: () => void;
  onReset: () => void;
}

function ARAlignmentPanel({
  open,
  yaw,
  pitch,
  activeBodyName,
  onToggle,
  onNudge,
  onMatchTarget,
  onReset,
}: AlignmentPanelProps) {
  const t = useTranslations('sky.ar');

  return (
    <div className={`ar-align${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="ar-align__chip"
        onClick={onToggle}
        aria-expanded={open}
      >
        <SlidersHorizontal size={14} aria-hidden="true" />
        <span>{t('align')}</span>
      </button>
      {open && (
        <div className="ar-align__panel">
          <div className="ar-align__title">{t('alignment')}</div>
          <p className="ar-align__body">{t('alignmentBody')}</p>
          {activeBodyName && (
            <button type="button" className="ar-align__action" onClick={onMatchTarget}>
              {t('setFromTarget', { object: activeBodyName })}
            </button>
          )}
          <div className="ar-align__axes">
            <div className="ar-align__axis">
              <div className="ar-align__axis-head">
                <span>{t('yaw')}</span>
                <strong>{yaw >= 0 ? '+' : ''}{yaw.toFixed(1)}°</strong>
              </div>
              <div className="ar-align__controls">
                <button type="button" className="ar-align__step" onClick={() => onNudge('yaw', -ALIGNMENT_STEP)}>
                  {t('left')}
                </button>
                <button type="button" className="ar-align__step" onClick={() => onNudge('yaw', ALIGNMENT_STEP)}>
                  {t('right')}
                </button>
              </div>
            </div>
            <div className="ar-align__axis">
              <div className="ar-align__axis-head">
                <span>{t('pitch')}</span>
                <strong>{pitch >= 0 ? '+' : ''}{pitch.toFixed(1)}°</strong>
              </div>
              <div className="ar-align__controls">
                <button type="button" className="ar-align__step" onClick={() => onNudge('pitch', ALIGNMENT_STEP)}>
                  {t('up')}
                </button>
                <button type="button" className="ar-align__step" onClick={() => onNudge('pitch', -ALIGNMENT_STEP)}>
                  {t('down')}
                </button>
              </div>
            </div>
          </div>
          <button type="button" className="ar-align__reset" onClick={onReset}>
            <RefreshCcw size={13} aria-hidden="true" />
            <span>{t('resetAlignment')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
