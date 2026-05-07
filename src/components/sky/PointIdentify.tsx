// src/components/sky/PointIdentify.tsx
//
// Reverse compass — answers "what am I looking at?"
// The compass answers "where is X?". This widget identifies whatever the user
// is currently aiming the back of the phone at, by ranking sky objects by
// angular distance to the phone's pointing vector.

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Compass, MapPin } from 'lucide-react';
import {
  angularSeparation,
  type UseDeviceHeading,
} from '@/lib/sky/use-device-heading';
import { positionStars, type PositionedStar } from '@/lib/sky/stars';
import { azimuthToCardinal } from '@/lib/sky/ar';
import type { SkyObject } from '@/components/sky/finder/types';
import './PointIdentify.css';

interface PointIdentifyProps {
  objects: SkyObject[];
  observerLat: number;
  observerLon: number;
  /** Shared compass instance from the parent so the calibration offset
   *  set in SkyMap propagates here. Earlier this component called
   *  useDeviceHeading() itself, which forked the state — calibration
   *  in SkyMap silently didn't reach Reverse Compass. */
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

export function PointIdentify({ objects, observerLat, observerLon, compass }: PointIdentifyProps) {
  const t = useTranslations('sky.pointId');

  const [enabled, setEnabled] = useState(false);
  const [webMode, setWebMode] = useState(false);
  const [webAim, setWebAim] = useState({ az: 180, alt: 30 });
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

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
      if (s.mag > 2.4) continue; // only label the brightest
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

  // Hold-to-lock — same pattern as the AR finder. Once the user lingers
  // on a body, we mark it confirmed and emit a short haptic.
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

  const handleEnable = async () => {
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
  };

  const cardinal = azimuthToCardinal(aim.az);

  return (
    <section className="point-id" aria-label={t('aria')}>
      <header className="point-id__head">
        <div>
          <p className="point-id__eyebrow">{t('eyebrow')}</p>
          <h2 className="point-id__title">{t('title')}</h2>
          <p className="point-id__sub">{t('subtitle')}</p>
        </div>
        {!enabled && (
          <button type="button" className="point-id__cta" onClick={handleEnable}>
            <Compass size={16} aria-hidden="true" />
            <span>{t('enable')}</span>
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
          <div className="point-id__radar">
            <RadarSVG aim={aim} candidates={candidates.slice(0, 8)} confirmedId={confirmedId} />
          </div>

          <div className="point-id__readout">
            <div className="point-id__aim">
              <span className="point-id__label">{t('aimingAt')}</span>
              <span className="point-id__cardinal">{cardinal}</span>
              <span className="point-id__nums">
                AZ <strong>{Math.round(aim.az)}°</strong> · ALT <strong>{Math.round(aim.alt)}°</strong>
              </span>
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

/**
 * Pre-enable preview of what the radar will show once the user grants
 * motion permission. Renders a static set of example bodies labelled by
 * name so the user knows roughly what they're getting — replaces the
 * empty rings + sweep that read as "nothing here yet."
 */
function PreviewRadar() {
  const SIZE = 220;
  const C = SIZE / 2;
  const samples: { x: number; y: number; r: number; fill: string; label: string }[] = [
    { x: C - 24, y: C - 38, r: 4.5, fill: '#FFE6A6', label: 'Jupiter' },
    { x: C + 36, y: C + 14, r: 3.2, fill: '#cfe1ff', label: 'Vega' },
    { x: C + 10, y: C + 48, r: 2.6, fill: '#e8d8b6', label: 'Altair' },
    { x: C - 46, y: C + 30, r: 2.2, fill: '#5EEAD4', label: 'M31' },
  ];
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
          <stop offset="0%" stopColor="rgba(232,164,102,0.06)" />
          <stop offset="60%" stopColor="rgba(11,24,48,0.30)" />
          <stop offset="100%" stopColor="rgba(11,24,48,0.55)" />
        </radialGradient>
      </defs>
      <circle cx={C} cy={C} r={C - 4} fill="url(#pid-preview-bg)" stroke="rgba(255,255,255,0.10)" />
      <circle cx={C} cy={C} r={(C - 14) * 0.66} fill="none" stroke="rgba(255,255,255,0.06)" strokeDasharray="2 4" />
      <circle cx={C} cy={C} r={(C - 14) * 0.33} fill="none" stroke="rgba(255,255,255,0.06)" strokeDasharray="2 4" />

      {/* Reticle */}
      <g>
        <circle cx={C} cy={C} r={14} fill="none" stroke="var(--terracotta)" strokeWidth={1.3} />
        <line x1={C - 22} y1={C} x2={C - 16} y2={C} stroke="var(--terracotta)" strokeWidth={1.3} />
        <line x1={C + 16} y1={C} x2={C + 22} y2={C} stroke="var(--terracotta)" strokeWidth={1.3} />
        <line x1={C} y1={C - 22} x2={C} y2={C - 16} stroke="var(--terracotta)" strokeWidth={1.3} />
        <line x1={C} y1={C + 16} x2={C} y2={C + 22} stroke="var(--terracotta)" strokeWidth={1.3} />
        <circle cx={C} cy={C} r={2} fill="var(--terracotta)" />
      </g>

      {/* Sample bodies + labels */}
      {samples.map((s, i) => (
        <g key={i} opacity={0.85}>
          <circle cx={s.x} cy={s.y} r={s.r} fill={s.fill} />
          <text
            x={s.x}
            y={s.y - s.r - 4}
            textAnchor="middle"
            fontFamily="var(--font-sans, Inter)"
            fontSize="9"
            fill="rgba(255,255,255,0.70)"
          >
            {s.label}
          </text>
        </g>
      ))}

      {/* Subtle slow sweep so the preview feels alive without being noisy */}
      <line
        x1={C}
        y1={C}
        x2={C}
        y2={14}
        stroke="rgba(255,179,71,0.45)"
        strokeWidth={1}
        strokeLinecap="round"
        className="point-id__preview-sweep"
      />
    </svg>
  );
}

interface RadarSVGProps {
  aim: { az: number; alt: number };
  candidates: Candidate[];
  confirmedId: string | null;
}

function RadarSVG({ aim, candidates, confirmedId }: RadarSVGProps) {
  // Polar plot centered on the aim direction. Radius = angular distance,
  // mapped from 0..30°. Anything beyond gets clipped — this is a "what's
  // near my reticle" view, not a full sky map.
  const SIZE = 240;
  const C = SIZE / 2;
  const MAX_DEG = 30;

  function place(cAz: number, cAlt: number) {
    const dAlt = cAlt - aim.alt;
    let dAz = cAz - aim.az;
    while (dAz > 180) dAz -= 360;
    while (dAz < -180) dAz += 360;
    const r = Math.hypot(dAz, dAlt);
    if (r > MAX_DEG) {
      // Clamp visually to the rim, but keep the angle.
      const rr = MAX_DEG;
      const ang = Math.atan2(dAlt, dAz);
      return { x: C + Math.cos(ang) * (rr / MAX_DEG) * (C - 14), y: C - Math.sin(ang) * (rr / MAX_DEG) * (C - 14), r };
    }
    return { x: C + (dAz / MAX_DEG) * (C - 14), y: C - (dAlt / MAX_DEG) * (C - 14), r };
  }

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height="100%" aria-hidden="true">
      <defs>
        <radialGradient id="pid-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,179,71,0.10)" />
          <stop offset="60%" stopColor="rgba(11,24,48,0.45)" />
          <stop offset="100%" stopColor="rgba(11,24,48,0.85)" />
        </radialGradient>
      </defs>

      <circle cx={C} cy={C} r={C - 4} fill="url(#pid-bg)" stroke="rgba(255,255,255,0.10)" />
      <circle cx={C} cy={C} r={(C - 14) * 0.66} fill="none" stroke="rgba(255,255,255,0.06)" strokeDasharray="2 4" />
      <circle cx={C} cy={C} r={(C - 14) * 0.33} fill="none" stroke="rgba(255,255,255,0.06)" strokeDasharray="2 4" />

      {/* Sweeping radar arm */}
      <g className="point-id__sweep">
        <line x1={C} y1={C} x2={C} y2={14} stroke="rgba(255,179,71,0.45)" strokeWidth="1.2" strokeLinecap="round" />
        <line x1={C} y1={C} x2={C} y2={32} stroke="rgba(255,179,71,0.85)" strokeWidth="1.6" strokeLinecap="round" />
      </g>

      {/* Cardinal hints (relative to aim, only show the closest one) */}
      <text x={C} y={12} textAnchor="middle" fontFamily="var(--font-mono, JetBrains Mono)" fontSize="10" fill="rgba(255,255,255,0.40)">↑ {Math.round(aim.az)}°</text>

      {/* Reticle (always centered) */}
      <g>
        <circle cx={C} cy={C} r="14" fill="none" stroke="var(--terracotta)" strokeWidth="1.3" />
        <line x1={C - 22} y1={C} x2={C - 16} y2={C} stroke="var(--terracotta)" strokeWidth="1.3" />
        <line x1={C + 16} y1={C} x2={C + 22} y2={C} stroke="var(--terracotta)" strokeWidth="1.3" />
        <line x1={C} y1={C - 22} x2={C} y2={C - 16} stroke="var(--terracotta)" strokeWidth="1.3" />
        <line x1={C} y1={C + 16} x2={C} y2={C + 22} stroke="var(--terracotta)" strokeWidth="1.3" />
        <circle cx={C} cy={C} r="2" fill="var(--terracotta)" />
      </g>

      {/* Candidate dots */}
      {candidates.map((c) => {
        const p = place(c.azimuth, c.altitude);
        const isLocked = c.id === confirmedId;
        const inside = c.separation <= MAX_DEG;
        const opacity = inside ? Math.max(0.35, 1 - c.separation / MAX_DEG) : 0.25;
        const radius = c.kind === 'planet' || c.kind === 'moon' || c.kind === 'sun' ? 4.5 : 3;
        const fill = c.kind === 'star' ? '#E8ECF1' : c.kind === 'dso' ? '#5EEAD4' : '#FFB347';
        return (
          <g key={c.id} opacity={opacity}>
            {isLocked && (
              <circle cx={p.x} cy={p.y} r={radius + 6} fill="none" stroke="var(--terracotta)" strokeWidth="1.2" />
            )}
            <circle cx={p.x} cy={p.y} r={radius} fill={fill} />
            <text
              x={p.x}
              y={p.y - radius - 4}
              textAnchor="middle"
              fontFamily="var(--font-sans, Inter)"
              fontSize="9"
              fill={isLocked ? 'var(--terracotta)' : 'rgba(255,255,255,0.75)'}
              fontWeight={isLocked ? 600 : 400}
            >
              {c.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
