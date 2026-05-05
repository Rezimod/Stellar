'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslations } from 'next-intl';
import { Telescope, X } from 'lucide-react';
import { PlanetIcon } from './PlanetIcon';
import {
  DEFAULT_HORIZONTAL_FOV,
  DEFAULT_VERTICAL_FOV,
  azimuthToCardinal,
  shortestAzDelta,
} from '@/lib/sky/ar';
import {
  angularSeparation,
  useDeviceHeading,
  type HeadingStatus,
} from '@/lib/sky/use-device-heading';
import { CONSTELLATION_LINES, positionStars, type PositionedStar } from '@/lib/sky/stars';
import type { ObjectId, SkyObject } from './types';
import './ARFinder.css';

interface ARFinderProps {
  objects: SkyObject[];
  observerLat: number;
  observerLon: number;
  /** When set, the AR view leads the user to this body — edge arrow when
   *  off-screen, hold-to-lock when centered. Optional; without it the AR
   *  view just labels everything visible. */
  activeId?: ObjectId | null;
  onClose: () => void;
}

type Phase = 'permission' | 'denied' | 'ar' | 'noSensors';

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

/** Per-target lock radius (degrees). Mirrors SkyMap's tolerance ladder. */
function lockRadiusDeg(obj: SkyObject): number {
  if (obj.instrument === 'telescope') return 3;
  if (obj.instrument === 'binoculars') return 5;
  return 8;
}

export function ARFinder({ objects, observerLat, observerLon, activeId = null, onClose }: ARFinderProps) {
  const t = useTranslations('sky.ar');

  const [phase, setPhase] = useState<Phase>('permission');
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [viewport, setViewport] = useState({
    w: typeof window !== 'undefined' ? window.innerWidth : 360,
    h: typeof window !== 'undefined' ? window.innerHeight : 640,
  });

  const compass = useDeviceHeading();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stars are computed once when AR opens. They drift ~0.25°/min — plenty
  // accurate for a phone-AR session lasting a few minutes.
  const stars = useMemo<PositionedStar[]>(() => {
    if (phase !== 'ar') return [];
    return positionStars(observerLat, observerLon, new Date());
  }, [phase, observerLat, observerLon]);

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

  // Detect missing DeviceOrientationEvent up-front (desktop).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof DeviceOrientationEvent === 'undefined') {
      setPhase('noSensors');
    }
  }, []);

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

  // Stop camera + heading on unmount.
  useEffect(() => {
    return () => {
      const s = streamRef.current;
      if (s) s.getTracks().forEach((trk) => trk.stop());
      streamRef.current = null;
      compass.stop();
    };
    // We deliberately depend only on a stable ref, not on `compass`, so the
    // cleanup runs once on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the heading hook reports unavailable / denied, surface the right card.
  useEffect(() => {
    if (phase !== 'ar') return;
    if (compass.status === 'unavailable') setPhase('noSensors');
    else if (compass.status === 'denied') setPhase('denied');
  }, [compass.status, phase]);

  const startCamera = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setHasCamera(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        try { await v.play(); } catch { /* autoplay deferred */ }
      }
      setHasCamera(true);
    } catch {
      setHasCamera(false);
    }
  }, []);

  const handleEnable = useCallback(async () => {
    await compass.request();
    if (compass.status === 'denied') {
      setPhase('denied');
      return;
    }
    setPhase('ar');
    setTimeout(() => { void startCamera(); }, 0);
  }, [compass, startCamera]);

  const handleClose = useCallback(() => {
    const s = streamRef.current;
    if (s) s.getTracks().forEach((trk) => trk.stop());
    streamRef.current = null;
    compass.stop();
    onClose();
  }, [compass, onClose]);

  if (phase === 'permission') {
    return <PermissionCard t={t} onEnable={handleEnable} onClose={onClose} />;
  }
  if (phase === 'denied') {
    return <DeniedCard t={t} onRetry={() => setPhase('permission')} onClose={onClose} />;
  }
  if (phase === 'noSensors') {
    return <NoSensorsCard t={t} onClose={onClose} />;
  }

  return (
    <ARLive
      objects={objects}
      stars={stars}
      starById={starById}
      heading={compass.heading}
      altitude={compass.altitude}
      accuracy={compass.accuracy}
      headingStatus={compass.status}
      hasCamera={hasCamera}
      videoRef={videoRef}
      viewport={viewport}
      activeId={activeId}
      onClose={handleClose}
    />
  );
}

interface ARLiveProps {
  objects: SkyObject[];
  stars: PositionedStar[];
  starById: Map<string, PositionedStar>;
  heading: number | null;
  altitude: number | null;
  accuracy: number | null;
  headingStatus: HeadingStatus;
  hasCamera: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  viewport: { w: number; h: number };
  activeId: ObjectId | null;
  onClose: () => void;
}

function ARLive({
  objects,
  stars,
  starById,
  heading,
  altitude,
  hasCamera,
  videoRef,
  viewport,
  activeId,
  accuracy,
  onClose,
}: ARLiveProps) {
  const t = useTranslations('sky.ar');

  const phoneAim = useMemo(() => ({
    azimuth: heading ?? 0,
    altitude: altitude ?? 0,
  }), [heading, altitude]);

  const hFov = DEFAULT_HORIZONTAL_FOV;
  const vFov = DEFAULT_VERTICAL_FOV;

  /** Plane-projection of a sky direction onto the camera viewport. */
  const project = useCallback(
    (az: number, alt: number) => {
      const dAz = shortestAzDelta(az, phoneAim.azimuth);
      const dAlt = alt - phoneAim.altitude;
      const screenX = (dAz / hFov) * viewport.w + viewport.w / 2;
      const screenY = -(dAlt / vFov) * viewport.h + viewport.h / 2;
      return { dAz, dAlt, screenX, screenY };
    },
    [phoneAim, hFov, vFov, viewport],
  );

  const activeBody = useMemo(() => {
    if (!activeId) return null;
    return objects.find((o) => o.id === activeId) ?? null;
  }, [objects, activeId]);

  const bodies = useMemo(() => {
    return objects.map((o) => {
      const { dAz, dAlt, screenX, screenY } = project(o.azimuth, o.altitude);
      const onScreen = Math.abs(dAz) <= hFov * 0.6 && Math.abs(dAlt) <= vFov * 0.6;
      const sep = angularSeparation(o.altitude, o.azimuth, phoneAim.altitude, phoneAim.azimuth);
      return { obj: o, screenX, screenY, dAz, dAlt, sep, onScreen };
    });
  }, [objects, project, hFov, vFov, phoneAim]);

  // Sort so the active body — and otherwise the most-centered — renders last.
  const bodiesSortedForRender = useMemo(() => {
    return bodies.slice().sort((a, b) => {
      if (a.obj.id === activeId) return 1;
      if (b.obj.id === activeId) return -1;
      return b.sep - a.sep; // farther first, closer last
    });
  }, [bodies, activeId]);

  const positionedStars = useMemo(() => {
    return stars
      .filter((s) => s.altitude > -2)
      .map((s) => {
        const { dAz, dAlt, screenX, screenY } = project(s.azimuth, s.altitude);
        const onScreen = Math.abs(dAz) <= hFov * 0.55 && Math.abs(dAlt) <= vFov * 0.55;
        return { star: s, screenX, screenY, onScreen };
      });
  }, [stars, project, hFov, vFov]);

  const activeRow = useMemo(() => {
    if (!activeBody) return null;
    return bodies.find((b) => b.obj.id === activeBody.id) ?? null;
  }, [bodies, activeBody]);

  // Lock state machine — same shape as the dome's: stay inside the cone for
  // HOLD_TO_LOCK_MS before triggering a confirmed lock + haptic. Resets when
  // the active target changes or the user wanders off the body.
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

  // Edge arrow: when the active body is off-screen, project it and clamp to
  // a position just inside the viewport edge so the user knows which way to
  // swing the phone.
  const edgeArrow = useMemo(() => {
    if (!activeRow || activeRow.onScreen) return null;
    const cx = viewport.w / 2;
    const cy = viewport.h / 2;
    let dx = activeRow.screenX - cx;
    let dy = activeRow.screenY - cy;
    // Behind the user — flip so the arrow points the *short* way around.
    if (Math.abs(activeRow.dAz) > 90) {
      dx = -dx;
      dy = -dy;
    }
    const norm = Math.hypot(dx, dy) || 1;
    const ux = dx / norm;
    const uy = dy / norm;
    const margin = 70;
    // Intersect the radial with the bounding rect (cx ± w/2-margin, cy ± h/2-margin).
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
  const poorAccuracy = accuracy == null || accuracy > POOR_ACCURACY_DEG;

  // Bottom hint: prefer target-driven copy when an activeBody is set.
  let hint: string;
  if (activeBody && activeRow) {
    if (confirmedLock) {
      hint = t('found', { object: activeBody.name });
    } else if (activeRow.onScreen) {
      hint = t('almostThere', { object: activeBody.name });
    } else {
      hint = t('panTo', { object: activeBody.name, deg: Math.round(activeRow.sep) });
    }
  } else if ((altitude ?? 0) < 30) {
    hint = t('liftPhone');
  } else {
    hint = t('panAround');
  }

  const constellationSegments = useMemo(() => {
    const out: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (const [aId, bId] of CONSTELLATION_LINES) {
      const a = starById.get(aId);
      const b = starById.get(bId);
      if (!a || !b) continue;
      if (a.altitude < -1 || b.altitude < -1) continue;
      const pa = project(a.azimuth, a.altitude);
      const pb = project(b.azimuth, b.altitude);
      const aOn = Math.abs(pa.dAz) <= hFov * 0.6 && Math.abs(pa.dAlt) <= vFov * 0.6;
      const bOn = Math.abs(pb.dAz) <= hFov * 0.6 && Math.abs(pb.dAlt) <= vFov * 0.6;
      if (!aOn && !bOn) continue;
      out.push({ x1: pa.screenX, y1: pa.screenY, x2: pb.screenX, y2: pb.screenY });
    }
    return out;
  }, [starById, project, hFov, vFov]);

  return (
    <div className="ar-overlay" role="dialog" aria-modal="true" aria-label={t('title')}>
      {hasCamera ? (
        <video
          ref={videoRef}
          className="ar-overlay__camera"
          autoPlay
          playsInline
          muted
        />
      ) : (
        <div className="ar-overlay__starfield" />
      )}

      <svg
        className="ar-constellations"
        width={viewport.w}
        height={viewport.h}
        viewBox={`0 0 ${viewport.w} ${viewport.h}`}
      >
        {constellationSegments.map((seg, i) => (
          <line
            key={i}
            x1={seg.x1}
            y1={seg.y1}
            x2={seg.x2}
            y2={seg.y2}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth={1}
            strokeLinecap="round"
          />
        ))}
      </svg>

      <div className="ar-overlay__layer">
        {positionedStars.map(({ star, screenX, screenY, onScreen }) => {
          if (!onScreen) return null;
          const size = Math.max(1.5, 4 - star.mag * 0.6);
          const opacity = Math.max(0.45, 1 - star.mag * 0.18);
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
              }}
              title={star.name}
            />
          );
        })}
      </div>

      <div
        className="ar-horizon-line"
        style={{ top: Math.max(-1, Math.min(viewport.h + 1, horizonY)) }}
      >
        <span className="ar-horizon-line__label">{t('horizon')}</span>
      </div>

      <div className="ar-overlay__layer">
        {bodiesSortedForRender.map(({ obj, screenX, screenY, onScreen }) => {
          if (!onScreen) return null;
          const isActive = obj.id === activeId;
          const focused = isActive;
          return (
            <div
              key={obj.id}
              className={`ar-body ${focused ? 'ar-body--focused' : ''} ${isActive && confirmedLock ? 'ar-body--locked' : ''}`}
              style={{
                left: screenX,
                top: screenY,
                opacity: focused ? 1 : 0.85,
              }}
            >
              <div className="ar-body__icon">
                <PlanetIcon
                  id={obj.id}
                  size={focused ? 56 : 40}
                  phase={obj.phase}
                  glow={true}
                />
                <div className="ar-body__crosshair" />
                {isActive && !confirmedLock && holdProgress > 0 && (
                  <HoldRing progress={holdProgress} size={focused ? 70 : 54} />
                )}
              </div>
              <div className="ar-body__label">{obj.name}</div>
              <div className="ar-body__coords">
                ALT {Math.round(obj.altitude)}° · AZ {Math.round(obj.azimuth)}°
              </div>
            </div>
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

      {!activeBody && (
        <div className="ar-center-reticle" aria-hidden="true">
          <span className="ar-center-reticle__h" />
          <span className="ar-center-reticle__v" />
          <span className="ar-center-reticle__dot" />
        </div>
      )}

      <div className="ar-center-readout">
        <div className="ar-center-readout__line">
          <span>ALT</span>
          <strong>{phoneAim.altitude >= 0 ? '+' : ''}{phoneAim.altitude.toFixed(1)}°</strong>
          <span>·</span>
          <span>AZ</span>
          <strong>{phoneAim.azimuth.toFixed(1)}°</strong>
        </div>
      </div>

      {!hasCamera && (
        <div className="ar-bottom-hint" style={{ bottom: 'auto', top: 70 }}>
          {t('fallbacks.noCamera')}
        </div>
      )}

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

      <div className="ar-bottom-hint">{hint}</div>

      {poorAccuracy && (
        <div className="ar-accuracy-banner" role="status">
          {t('poorAccuracy')}
        </div>
      )}

      <div className="ar-overlay__topbar">
        <div>
          <div className="ar-topbar__title">{t('title')}</div>
          <div className="ar-topbar__heading">
            {cardinal} · {Math.round(phoneAim.azimuth)}°
          </div>
        </div>
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

interface CardProps {
  t: ReturnType<typeof useTranslations>;
  onClose: () => void;
}
function PermissionCard({ t, onEnable, onClose }: CardProps & { onEnable: () => void }) {
  return (
    <div className="ar-overlay">
      <div className="ar-card-stage">
        <div className="ar-card">
          <div className="ar-card__icon"><Telescope size={20} /></div>
          <h2 className="ar-card__title">{t('title')}</h2>
          <p className="ar-card__body">{t('permissionBody')}</p>
          <p className="ar-card__body">{t('permissionInstructions')}</p>
          <ul className="ar-card__list">
            <li>{t('permissionItems.camera')}</li>
            <li>{t('permissionItems.motion')}</li>
            <li>{t('permissionItems.location')}</li>
          </ul>
          <div className="ar-card__actions">
            <button type="button" className="ar-card__btn ar-card__btn--primary" onClick={onEnable}>
              {t('enable')}
            </button>
            <button type="button" className="ar-card__btn ar-card__btn--ghost" onClick={onClose}>
              {t('cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeniedCard({ t, onRetry, onClose }: CardProps & { onRetry: () => void }) {
  return (
    <div className="ar-overlay">
      <div className="ar-card-stage">
        <div className="ar-card">
          <div className="ar-card__icon"><Telescope size={20} /></div>
          <h2 className="ar-card__title">{t('denied.title')}</h2>
          <p className="ar-card__body">{t('denied.body')}</p>
          <div className="ar-card__actions">
            <button type="button" className="ar-card__btn ar-card__btn--primary" onClick={onRetry}>
              {t('denied.tryAgain')}
            </button>
            <button type="button" className="ar-card__btn ar-card__btn--ghost" onClick={onClose}>
              {t('denied.useHorizonInstead')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NoSensorsCard({ t, onClose }: CardProps) {
  return (
    <div className="ar-overlay">
      <div className="ar-card-stage">
        <div className="ar-card">
          <div className="ar-card__icon"><Telescope size={20} /></div>
          <h2 className="ar-card__title">{t('title')}</h2>
          <p className="ar-card__body">{t('fallbacks.noSensors')}</p>
          <div className="ar-card__actions">
            <button type="button" className="ar-card__btn ar-card__btn--primary" onClick={onClose}>
              {t('denied.useHorizonInstead')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
