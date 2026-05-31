// src/components/sky/PointIdentify.tsx
//
// Live-camera AR identifier — answers "what am I looking at?" by overlaying
// projected labels on the actual rear-camera feed. Replaces the old fake
// SVG "finder scope" that had no relationship to the photons hitting the
// user's retina (a label sitting on a synthesised black background sells
// false confidence — when the compass is off by 20° you can't tell).
//
// Three accuracy improvements over the old widget:
//   1. The user can SEE the sky behind the labels and judge alignment.
//   2. Tap-to-align — user taps where the labelled body actually is, we
//      nudge the compass offset by the projected angular delta. One gesture
//      absorbs declination errors, FOV mismatch, indoor magnetic bias.
//   3. Same `useDeviceHeading` instance as the dome chart, so calibration
//      propagates across both surfaces.

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Camera, CameraOff, Compass, MapPin, Target } from 'lucide-react';
import {
  angularSeparation,
  type UseDeviceHeading,
} from '@/lib/sky/use-device-heading';
import { positionStars, type PositionedStar } from '@/lib/sky/stars';
import { azimuthToCardinal } from '@/lib/sky/ar';
import { projectBodyToScreen } from '@/lib/sky/projection';
import { useCamera } from '@/hooks/useCamera';
import type { SkyObject } from '@/components/sky/finder/types';
import './PointIdentify.css';

interface PointIdentifyProps {
  objects: SkyObject[];
  observerLat: number;
  observerLon: number;
  /** Shared compass instance from the parent so calibration set anywhere
   *  (SkyMap nudge, ARFinder match-target, the tap-to-align below) reaches
   *  every surface that consumes pointing. */
  compass: UseDeviceHeading;
}

interface Candidate {
  id: string;
  name: string;
  altitude: number;
  azimuth: number;
  separation: number;
  kind: 'planet' | 'moon' | 'sun' | 'star' | 'dso';
  magnitude?: number;
  constellation?: string;
}

const SCAN_RADIUS_DEG = 12;
const HOLD_TO_LOCK_MS = 700;
const WEB_FALLBACK_AZ_RANGE = 360;
const WEB_FALLBACK_ALT_RANGE = 90;

/** Approximate FOV (deg) of the visible square eyepiece when the rear camera
 *  fills it with object-fit: cover. Typical phone rear cameras land in the
 *  55°–70° range; 60° is a sane mid-point. Per-device error is absorbed in
 *  one tap-to-align gesture, so this constant is a starting point not a
 *  hard assumption. */
const EYEPIECE_FOV_DEG = 60;
/** Logical pixel canvas used for projection math. CSS scales the eyepiece
 *  responsively — projection stays in this fixed coordinate space, then the
 *  SVG viewBox does the actual scaling. */
const EYEPIECE_LOGICAL = 360;
/** Stars dimmer than this are not labelled (eyepiece would clutter). */
const STAR_LABEL_MAG_LIMIT = 2.6;
/** Max bodies to label inside the eyepiece at once. */
const MAX_OVERLAY_LABELS = 10;

export function PointIdentify({ objects, observerLat, observerLon, compass }: PointIdentifyProps) {
  const t = useTranslations('sky.pointId');

  const [enabled, setEnabled] = useState(false);
  const [webMode, setWebMode] = useState(false);
  const [webAim, setWebAim] = useState({ az: 180, alt: 30 });
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [alignMode, setAlignMode] = useState(false);
  const [alignToast, setAlignToast] = useState<{ deg: number; ts: number } | null>(null);

  const { videoRef, stream, error: cameraError, startCamera, stopCamera } = useCamera();
  const cameraOn = stream != null;

  const stars = useMemo<PositionedStar[]>(() => {
    if (!enabled && !webMode) return [];
    return positionStars(observerLat, observerLon, new Date());
  }, [enabled, webMode, observerLat, observerLon]);

  const aim = useMemo(() => {
    if (webMode) return { az: webAim.az, alt: webAim.alt };
    return { az: compass.heading ?? 0, alt: compass.altitude ?? 0 };
  }, [webMode, webAim, compass.heading, compass.altitude]);

  const live = webMode || (enabled && compass.live);

  const candidates = useMemo<Candidate[]>(() => {
    if (!live) return [];
    const out: Candidate[] = [];
    for (const o of objects) {
      if (o.altitude < -2) continue;
      const sep = angularSeparation(o.altitude, o.azimuth, aim.alt, aim.az);
      out.push({
        id: o.id,
        name: o.name,
        altitude: o.altitude,
        azimuth: o.azimuth,
        separation: sep,
        kind: o.id === 'sun' ? 'sun' : o.id === 'moon' ? 'moon' : o.type === 'planet' ? 'planet' : 'dso',
        magnitude: o.magnitude,
        constellation: o.constellation || undefined,
      });
    }
    for (const s of stars) {
      if (s.altitude < -2) continue;
      if (s.mag > STAR_LABEL_MAG_LIMIT) continue;
      const sep = angularSeparation(s.altitude, s.azimuth, aim.alt, aim.az);
      out.push({
        id: s.id,
        name: s.name,
        altitude: s.altitude,
        azimuth: s.azimuth,
        separation: sep,
        kind: 'star',
        magnitude: s.mag,
      });
    }
    out.sort((a, b) => a.separation - b.separation);
    return out;
  }, [live, objects, stars, aim]);

  const top = candidates[0] ?? null;
  const insideScan = top != null && top.separation <= SCAN_RADIUS_DEG;

  // Feed proximity hint into the heading hook so smoothing tightens as the
  // user closes in on the candidate. Same pattern the AR finder uses.
  useEffect(() => {
    if (!enabled || webMode) {
      compass.setProximityDeg(null);
      return;
    }
    compass.setProximityDeg(top ? top.separation : null);
  }, [enabled, webMode, top, compass]);

  // Hold-to-lock — once the user lingers on a body within the scan radius,
  // mark it confirmed and emit a short haptic.
  const holdStartRef = useRef<number | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const lastTopIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!insideScan || !top) {
      holdStartRef.current = null;
      lastTopIdRef.current = null;
      if (holdProgress !== 0) setHoldProgress(0);
      if (confirmedId !== null) setConfirmedId(null);
      return;
    }
    if (top.id !== lastTopIdRef.current) {
      lastTopIdRef.current = top.id;
      holdStartRef.current = performance.now();
      setHoldProgress(0);
      setConfirmedId(null);
    }
    let raf = 0;
    const tick = () => {
      const start = holdStartRef.current;
      if (start == null) return;
      const elapsed = performance.now() - start;
      const tt = Math.min(1, elapsed / HOLD_TO_LOCK_MS);
      setHoldProgress(tt);
      if (tt >= 1) {
        if (confirmedId !== top.id) {
          setConfirmedId(top.id);
          if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            try { navigator.vibrate([10, 30, 10]); } catch { /* ignore */ }
          }
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [insideScan, top, confirmedId, holdProgress]);

  const handleEnable = useCallback(async () => {
    if (typeof DeviceOrientationEvent === 'undefined') {
      setWebMode(true);
      setEnabled(true);
      return;
    }
    await compass.request();
    if (compass.status === 'denied' || compass.status === 'unavailable') {
      setWebMode(true);
    }
    setEnabled(true);
    // Best-effort camera. If the user denies, the eyepiece falls back to a
    // dark backdrop with the same projected labels — accuracy still benefits
    // from the live compass + tap-to-align.
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      void startCamera('environment');
    }
  }, [compass, startCamera]);

  const handleDisable = useCallback(() => {
    stopCamera();
    setEnabled(false);
    setAlignMode(false);
  }, [stopCamera]);

  const retryCamera = useCallback(() => {
    void startCamera('environment');
  }, [startCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // Mount the video stream after the <video> element renders.
  useEffect(() => {
    if (videoRef.current && stream && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

  // Tap-to-align: user taps where they actually see the labelled body in the
  // live feed. We compute the pixel delta from the projected label position
  // and convert it to an azimuth nudge.
  //
  // Math: label is placed at (lx, ly) by projecting (body − aim). If the user
  // taps at (tx, ty), the real body is at angular offset (tx − C, ty − C)
  // from the camera center. The current aim is wrong by exactly the screen
  // delta between them: dAz_error = (lx − tx) * (FOV / SIZE).
  // Applying compass.nudge(+dAz_error) shifts the heading so the next frame
  // recomputes (body − aim_new) and the label slides onto the tap location.
  const handleAlignTap = useCallback((tapX: number, tapY: number) => {
    if (!top || !alignMode) return;
    const p = projectBodyToScreen(
      { altitude: top.altitude, azimuth: top.azimuth },
      { altitude: aim.alt, azimuth: aim.az },
      EYEPIECE_FOV_DEG, EYEPIECE_FOV_DEG,
      EYEPIECE_LOGICAL, EYEPIECE_LOGICAL,
      0,
    );
    const degPerPx = EYEPIECE_FOV_DEG / EYEPIECE_LOGICAL;
    const azNudge = (p.screenX - tapX) * degPerPx;
    compass.nudge(azNudge);
    setAlignMode(false);
    setAlignToast({ deg: azNudge, ts: Date.now() });
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try { navigator.vibrate(18); } catch { /* ignore */ }
    }
  }, [top, alignMode, aim, compass]);

  // Auto-clear the align toast after a few seconds.
  useEffect(() => {
    if (!alignToast) return;
    const id = window.setTimeout(() => setAlignToast(null), 2400);
    return () => window.clearTimeout(id);
  }, [alignToast]);

  const cardinal = azimuthToCardinal(aim.az);
  const accuracyBadge = !webMode && compass.accuracy != null && compass.accuracy >= 0
    ? compass.accuracy <= 8 ? 'good' : compass.accuracy <= 18 ? 'fair' : 'poor'
    : null;

  return (
    <section className="point-id" aria-label={t('aria')}>
      <header className="point-id__head">
        <div>
          <p className="point-id__eyebrow">{t('eyebrow')}</p>
          <h2 className="point-id__title">{t('title')}</h2>
          <p className="point-id__sub">{t('subtitle')}</p>
        </div>
        {!enabled ? (
          <button type="button" className="point-id__cta" onClick={handleEnable}>
            <Compass size={16} aria-hidden="true" />
            <span>{t('enable')}</span>
          </button>
        ) : (
          <button type="button" className="point-id__cta point-id__cta--ghost" onClick={handleDisable}>
            <CameraOff size={16} aria-hidden="true" />
            <span>{t('stop')}</span>
          </button>
        )}
      </header>

      {!enabled && (
        <div className="point-id__placeholder">
          <PreviewRadar />
          <ul className="point-id__features">
            <li>
              <span className="point-id__feature-dot" aria-hidden="true" />
              {t('feature1')}
            </li>
            <li>
              <span className="point-id__feature-dot" aria-hidden="true" />
              {t('feature2')}
            </li>
            <li>
              <span className="point-id__feature-dot" aria-hidden="true" />
              {t('feature3')}
            </li>
          </ul>
        </div>
      )}

      {enabled && (
        <div className="point-id__stage">
          <LiveEyepiece
            aim={aim}
            candidates={candidates.slice(0, MAX_OVERLAY_LABELS)}
            confirmedId={confirmedId}
            videoRef={videoRef}
            cameraOn={cameraOn}
            cameraError={cameraError}
            onAlignTap={handleAlignTap}
            alignMode={alignMode}
            onRetryCamera={retryCamera}
            holdProgress={holdProgress}
          />

          <div className="point-id__readout">
            <div className="point-id__aim">
              <span className="point-id__label">{t('aimingAt')}</span>
              <span className="point-id__cardinal">{cardinal}</span>
              <span className="point-id__nums">
                AZ <strong>{Math.round(aim.az)}°</strong> · ALT <strong>{Math.round(aim.alt)}°</strong>
              </span>
              {accuracyBadge && (
                <span className={`point-id__acc point-id__acc--${accuracyBadge}`}>
                  ±{Math.round(compass.accuracy ?? 0)}°
                </span>
              )}
            </div>

            <div
              className={`point-id__top ${insideScan ? 'point-id__top--in' : 'point-id__top--out'} ${confirmedId && top?.id === confirmedId ? 'point-id__top--locked' : ''}`}
              aria-live="polite"
            >
              {top && insideScan ? (
                <>
                  <div className="point-id__top-name">
                    {top.name}
                    {top.constellation && (
                      <span className="point-id__top-const">· {top.constellation}</span>
                    )}
                  </div>
                  <div className="point-id__top-meta">
                    <span>{kindLabel(top.kind, t)}</span>
                    {typeof top.magnitude === 'number' && Number.isFinite(top.magnitude) && (
                      <>
                        <span>·</span>
                        <span>mag {top.magnitude.toFixed(1)}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>{Math.round(top.separation)}° {t('away')}</span>
                  </div>
                  {confirmedId === top.id ? (
                    <div className="point-id__locked-pill">{t('identified')}</div>
                  ) : (
                    <div className="point-id__hold-track" aria-hidden="true">
                      <div className="point-id__hold-fill" style={{ width: `${holdProgress * 100}%` }} />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="point-id__empty-name">{t('empty')}</div>
                  <p className="point-id__empty-hint">{t('emptyHint')}</p>
                </>
              )}
            </div>

            {/* Tap-to-align — the single biggest accuracy fix. Visible only
                when a candidate is in view, the camera is live, and we have
                real compass data (not the web slider fallback). */}
            {cameraOn && top && insideScan && !webMode && (
              <div className="point-id__align">
                <button
                  type="button"
                  className={`point-id__align-btn ${alignMode ? 'point-id__align-btn--armed' : ''}`}
                  onClick={() => setAlignMode((v) => !v)}
                >
                  <Target size={13} aria-hidden="true" />
                  <span>{alignMode ? t('alignCancel') : t('alignStart', { name: top.name })}</span>
                </button>
                {alignMode && (
                  <p className="point-id__align-hint">{t('alignHint', { name: top.name })}</p>
                )}
              </div>
            )}

            {alignToast && (
              <div className="point-id__toast" role="status">
                {t('alignDone', { deg: Math.round(Math.abs(alignToast.deg)) })}
              </div>
            )}

            {webMode && (
              <div className="point-id__sliders">
                <label>
                  <span>{t('azimuth')}</span>
                  <input
                    type="range"
                    min={0}
                    max={WEB_FALLBACK_AZ_RANGE}
                    step={1}
                    value={webAim.az}
                    onChange={(e) => setWebAim((p) => ({ ...p, az: Number(e.target.value) }))}
                  />
                  <output>{Math.round(webAim.az)}°</output>
                </label>
                <label>
                  <span>{t('altitude')}</span>
                  <input
                    type="range"
                    min={0}
                    max={WEB_FALLBACK_ALT_RANGE}
                    step={1}
                    value={webAim.alt}
                    onChange={(e) => setWebAim((p) => ({ ...p, alt: Number(e.target.value) }))}
                  />
                  <output>{Math.round(webAim.alt)}°</output>
                </label>
              </div>
            )}

            {candidates.length > 1 && (
              <ul className="point-id__nearby">
                <li className="point-id__nearby-head">
                  <MapPin size={11} aria-hidden="true" />
                  <span>{t('nearby')}</span>
                </li>
                {candidates.slice(1, 4).map((c) => (
                  <li key={c.id} className="point-id__nearby-item">
                    <span className={`point-id__chip point-id__chip--${c.kind}`}>{c.name}</span>
                    <span className="point-id__nearby-deg">{Math.round(c.separation)}°</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function kindLabel(kind: Candidate['kind'], t: ReturnType<typeof useTranslations>): string {
  switch (kind) {
    case 'planet': return t('kind.planet');
    case 'moon': return t('kind.moon');
    case 'sun': return t('kind.sun');
    case 'star': return t('kind.star');
    case 'dso':
    default: return t('kind.dso');
  }
}

/* ------------------------------------------------------------------ *
 * LiveEyepiece — rear camera feed + projected label overlay
 * ------------------------------------------------------------------ */

interface LiveEyepieceProps {
  aim: { az: number; alt: number };
  candidates: Candidate[];
  confirmedId: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraOn: boolean;
  cameraError: string | null;
  onAlignTap: (xLogical: number, yLogical: number) => void;
  alignMode: boolean;
  onRetryCamera: () => void;
  holdProgress: number;
}

function LiveEyepiece({
  aim,
  candidates,
  confirmedId,
  videoRef,
  cameraOn,
  cameraError,
  onAlignTap,
  alignMode,
  onRetryCamera,
  holdProgress,
}: LiveEyepieceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Project every candidate into eyepiece-logical pixel space.
  type Placed = Candidate & { x: number; y: number; r: number; inEyepiece: boolean };
  const placed = useMemo<Placed[]>(() => {
    const C = EYEPIECE_LOGICAL / 2;
    return candidates.map((c) => {
      const p = projectBodyToScreen(
        { altitude: c.altitude, azimuth: c.azimuth },
        { altitude: aim.alt, azimuth: aim.az },
        EYEPIECE_FOV_DEG, EYEPIECE_FOV_DEG,
        EYEPIECE_LOGICAL, EYEPIECE_LOGICAL,
        0,
      );
      const r = Math.hypot(p.screenX - C, p.screenY - C);
      const inEyepiece = p.inFront && r <= C - 6;
      return { ...c, x: p.screenX, y: p.screenY, r, inEyepiece };
    });
  }, [candidates, aim]);

  // Map a pointer event onto the logical canvas (account for the responsive
  // pixel size of the eyepiece container).
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!alignMode) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = ((e.clientX - rect.left) / rect.width) * EYEPIECE_LOGICAL;
    const sy = ((e.clientY - rect.top) / rect.height) * EYEPIECE_LOGICAL;
    onAlignTap(sx, sy);
  }, [alignMode, onAlignTap]);

  const C = EYEPIECE_LOGICAL / 2;

  return (
    <div
      ref={containerRef}
      className={`point-id__eyepiece ${alignMode ? 'point-id__eyepiece--align' : ''}`}
      onPointerDown={handlePointerDown}
    >
      {/* Live video — fills the round mask. Always mounted so srcObject can
          attach on stream change even when temporarily black. */}
      <video
        ref={videoRef}
        className="point-id__video"
        autoPlay
        playsInline
        muted
        style={{ visibility: cameraOn ? 'visible' : 'hidden' }}
      />

      {!cameraOn && (
        <div className="point-id__nofeed">
          <CameraOff size={26} aria-hidden="true" />
          <p>{cameraError ? 'Camera blocked' : 'Camera off'}</p>
          <button type="button" onClick={onRetryCamera}>
            <Camera size={13} aria-hidden="true" /> Try again
          </button>
        </div>
      )}

      {/* Overlay SVG — labels + reticle. Sits absolute on top of the video. */}
      <svg
        className="point-id__overlay"
        viewBox={`0 0 ${EYEPIECE_LOGICAL} ${EYEPIECE_LOGICAL}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="pid-edge" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
          </radialGradient>
        </defs>

        {/* Edge vignette for an eyepiece feel without obscuring sky. */}
        <circle cx={C} cy={C} r={C - 1} fill="url(#pid-edge)" pointerEvents="none" />

        {/* Reticle — cross-hair with center gap. */}
        <g pointerEvents="none">
          <circle cx={C} cy={C} r={14} fill="none" stroke="rgba(255,150,80,0.55)" strokeWidth="1.1" />
          <line x1={C} y1={6}              x2={C} y2={C - 20}        stroke="rgba(255,150,80,0.7)" strokeWidth="1.2" strokeLinecap="round" />
          <line x1={C} y1={C + 20}         x2={C} y2={EYEPIECE_LOGICAL - 6} stroke="rgba(255,150,80,0.7)" strokeWidth="1.2" strokeLinecap="round" />
          <line x1={6} y1={C}              x2={C - 20} y2={C}        stroke="rgba(255,150,80,0.7)" strokeWidth="1.2" strokeLinecap="round" />
          <line x1={C + 20} y1={C}         x2={EYEPIECE_LOGICAL - 6} y2={C} stroke="rgba(255,150,80,0.7)" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx={C} cy={C} r="2" fill="rgba(255,150,80,0.95)" />
        </g>

        {/* Hold-to-lock ring around the reticle when a candidate is centered. */}
        {holdProgress > 0 && holdProgress < 1 && (
          <circle
            cx={C}
            cy={C}
            r={22}
            fill="none"
            stroke="var(--terracotta, #ff9650)"
            strokeWidth="2"
            strokeDasharray={2 * Math.PI * 22}
            strokeDashoffset={2 * Math.PI * 22 * (1 - holdProgress)}
            transform={`rotate(-90 ${C} ${C})`}
            opacity="0.85"
            pointerEvents="none"
          />
        )}

        {/* Labels for every candidate inside the eyepiece. */}
        {placed.map((b) => {
          if (!b.inEyepiece) return null;
          const isTop = b.id === candidates[0]?.id;
          const isLocked = b.id === confirmedId;
          const radius = b.kind === 'sun' || b.kind === 'moon' ? 14 : b.kind === 'planet' ? 11 : b.kind === 'dso' ? 9 : 7;
          const ringStroke = isLocked ? 'var(--terracotta, #ff9650)' : isTop ? 'rgba(255,230,180,0.9)' : 'rgba(244,237,224,0.55)';
          const ringWidth = isLocked ? 2 : isTop ? 1.6 : 1.1;
          const labelFill = isLocked ? 'var(--terracotta, #ff9650)' : isTop ? '#FFEEC6' : 'rgba(244,237,224,0.78)';
          const labelWeight = isLocked || isTop ? 600 : 500;
          // Label above the body unless that pushes it out of the eyepiece.
          const labelY = b.y - radius - 9 < 14 ? b.y + radius + 16 : b.y - radius - 9;
          return (
            <g key={b.id}>
              {/* Open ring leaves the actual sky visible inside. */}
              <circle cx={b.x} cy={b.y} r={radius} fill="none" stroke={ringStroke} strokeWidth={ringWidth} />
              {/* Tick from ring to label so it reads as a callout. */}
              <line x1={b.x} y1={labelY < b.y ? b.y - radius : b.y + radius}
                    x2={b.x} y2={labelY < b.y ? labelY + 4 : labelY - 11}
                    stroke={ringStroke} strokeWidth="0.8" opacity="0.7" />
              <text
                x={b.x}
                y={labelY}
                textAnchor="middle"
                fontFamily="var(--font-sans, Inter)"
                fontSize="12"
                fontWeight={labelWeight}
                fill={labelFill}
                style={{ paintOrder: 'stroke' }}
                stroke="rgba(0,0,0,0.65)"
                strokeWidth="3"
                strokeLinejoin="round"
              >
                {b.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Alignment-mode hint banner — sits along the bottom inside the
          eyepiece so the user sees the instruction without scrolling. */}
      {alignMode && (
        <div className="point-id__align-strip" aria-hidden="true">
          Tap the real {candidates[0]?.name ?? 'body'}
        </div>
      )}

      {/* FOV caption — a quiet signal that this is a finite cone, not the
          full sky, to manage expectations. */}
      <div className="point-id__fov-caption">FOV {EYEPIECE_FOV_DEG}°</div>
    </div>
  );
}

/**
 * Pre-enable preview of what the eyepiece will show once the user grants
 * camera + motion permission. Static mini scope.
 */
function PreviewRadar() {
  const SIZE = 220;
  const C = SIZE / 2;
  const FOV_R = C - 8;
  const fieldStars = [
    [C - 64,  C - 70, 0.9, '#d8e3ff', 0.55],
    [C - 30,  C - 18, 0.7, '#fbf7e6', 0.65],
    [C + 22,  C - 56, 1.1, '#dde3ff', 0.75],
    [C + 58,  C - 30, 0.9, '#fff2c8', 0.6],
    [C + 70,  C + 16, 0.8, '#ffd6a6', 0.55],
    [C + 20,  C + 80, 0.8, '#e8ecf0', 0.5],
    [C - 50,  C + 78, 1.0, '#ffaa7c', 0.7],
    [C - 80,  C + 18, 0.7, '#f4eede', 0.5],
    [C - 18,  C + 38, 0.6, '#e8d8b6', 0.5],
    [C + 44,  C + 48, 0.7, '#d8e3ff', 0.55],
    [C - 22,  C - 92, 0.7, '#cfe0ff', 0.5],
    [C + 86,  C - 8,  0.8, '#ffd0a0', 0.55],
  ] as const;
  return (
    <svg
      className="point-id__preview"
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="pid-preview-bg" cx="50%" cy="50%" r="55%">
          <stop offset="0%"  stopColor="#0a0f22" />
          <stop offset="55%" stopColor="#06091a" />
          <stop offset="100%" stopColor="#020410" />
        </radialGradient>
        <radialGradient id="pid-preview-vignette" cx="50%" cy="50%" r="50%">
          <stop offset="55%"  stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.70)" />
        </radialGradient>
        <clipPath id="pid-preview-clip">
          <circle cx={C} cy={C} r={FOV_R} />
        </clipPath>
        <radialGradient id="pid-preview-terminator" cx="33%" cy="30%" r="76%">
          <stop offset="0%"  stopColor="rgba(255,255,255,0.16)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0)" />
          <stop offset="92%" stopColor="rgba(0,0,0,0.50)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.72)" />
        </radialGradient>
        <clipPath id="pid-preview-jupiter">
          <circle cx={C - 24} cy={C - 38} r={9} />
        </clipPath>
      </defs>

      <circle cx={C} cy={C} r={FOV_R + 4} fill="none" stroke="rgba(232,216,184,0.22)" strokeWidth="1.2" />
      {Array.from({ length: 24 }).map((_, i) => {
        const ang = (i / 24) * Math.PI * 2 - Math.PI / 2;
        const inner = i % 6 === 0 ? FOV_R + 2 : FOV_R + 4;
        const outer = i % 6 === 0 ? FOV_R + 10 : FOV_R + 7;
        return (
          <line
            key={i}
            x1={C + Math.cos(ang) * inner}
            y1={C + Math.sin(ang) * inner}
            x2={C + Math.cos(ang) * outer}
            y2={C + Math.sin(ang) * outer}
            stroke={i % 6 === 0 ? 'rgba(232,216,184,0.55)' : 'rgba(232,216,184,0.22)'}
            strokeWidth={i % 6 === 0 ? 1.2 : 0.8}
          />
        );
      })}

      <g clipPath="url(#pid-preview-clip)">
        <circle cx={C} cy={C} r={FOV_R} fill="url(#pid-preview-bg)" />
        {fieldStars.map((s, i) => (
          <circle key={i} cx={s[0] as number} cy={s[1] as number} r={s[2] as number} fill={s[3] as string} opacity={s[4] as number} />
        ))}
        <circle cx={C - 24} cy={C - 38} r={17} fill="#ffe6a6" opacity="0.16" />
        <image
          href="/solar-system/planets/jupiter.jpg"
          x={C - 24 - 9}
          y={C - 38 - 9}
          width={18}
          height={18}
          preserveAspectRatio="xMidYMid slice"
          clipPath="url(#pid-preview-jupiter)"
        />
        <circle cx={C - 24} cy={C - 38} r={9} fill="url(#pid-preview-terminator)" />
        <circle cx={C - 24} cy={C - 38} r={9} fill="none" stroke="rgba(0,0,0,0.7)" strokeWidth="0.6" />
        <text x={C - 24} y={C - 38 - 14} textAnchor="middle"
          fontFamily="var(--font-sans, Inter)" fontSize="9"
          fill="rgba(244,237,224,0.8)" fontWeight={500}>
          Jupiter
        </text>
        <circle cx={C + 36} cy={C + 14} r={9}   fill="#dde3ff" opacity="0.18" />
        <circle cx={C + 36} cy={C + 14} r={4.5} fill="#dde3ff" opacity="0.40" />
        <circle cx={C + 36} cy={C + 14} r={2.4} fill="#ffffff" />
        <text x={C + 36} y={C + 14 - 11} textAnchor="middle"
          fontFamily="var(--font-sans, Inter)" fontSize="9"
          fill="rgba(244,237,224,0.78)" fontWeight={500}>
          Vega
        </text>
        <ellipse cx={C - 46} cy={C + 30} rx={7.4} ry={4.4} fill="#5EEAD4" opacity="0.22" />
        <ellipse cx={C - 46} cy={C + 30} rx={4.4} ry={2.8} fill="#5EEAD4" opacity="0.7" />
        <text x={C - 46} y={C + 30 - 9} textAnchor="middle"
          fontFamily="var(--font-sans, Inter)" fontSize="9"
          fill="rgba(244,237,224,0.78)" fontWeight={500}>
          M31
        </text>
        <circle cx={C} cy={C} r={FOV_R} fill="url(#pid-preview-vignette)" />
      </g>

      <g clipPath="url(#pid-preview-clip)">
        <circle cx={C} cy={C} r="13" fill="none" stroke="rgba(255,150,80,0.40)" strokeWidth="1.0" />
        <line x1={C} y1={C - FOV_R + 4}  x2={C} y2={C - 18} stroke="rgba(255,150,80,0.65)" strokeWidth="1.1" strokeLinecap="round" />
        <line x1={C} y1={C + 18} x2={C} y2={C + FOV_R - 4} stroke="rgba(255,150,80,0.65)" strokeWidth="1.1" strokeLinecap="round" />
        <line x1={C - FOV_R + 4}  y1={C} x2={C - 18} y2={C} stroke="rgba(255,150,80,0.65)" strokeWidth="1.1" strokeLinecap="round" />
        <line x1={C + 18} y1={C} x2={C + FOV_R - 4}  y2={C} stroke="rgba(255,150,80,0.65)" strokeWidth="1.1" strokeLinecap="round" />
        <circle cx={C} cy={C} r="1.6" fill="rgba(255,150,80,0.95)" />
      </g>
    </svg>
  );
}
