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
import { CONSTELLATION_LINES, positionStars, type PositionedStar } from '@/lib/sky/stars';
import { azimuthToCardinal } from '@/lib/sky/ar';
import type { SkyObject } from '@/components/sky/finder/types';
import './PointIdentify.css';

/** A tiny equirectangular texture URL by planet id — same hero assets the
 *  3D solar system uses. Renders inside the finder scope as a textured disc
 *  so planets read as real photographs, not generic dots. */
const PLANET_TEXTURE_URL: Record<string, string> = {
  sun:     '/solar-system/planets/sun.jpg',
  moon:    '/images/planets/moon.jpg',
  mercury: '/solar-system/planets/mercury.jpg',
  venus:   '/solar-system/planets/venus.jpg',
  mars:    '/solar-system/planets/mars.jpg',
  jupiter: '/solar-system/planets/jupiter.jpg',
  saturn:  '/solar-system/planets/saturn-2k.jpg',
  uranus:  '/solar-system/planets/uranus.jpg',
  neptune: '/solar-system/planets/neptune.jpg',
};

/** Spectral-class tints for catalog stars — same palette the AR finder uses.
 *  Anything not in this map falls back to a magnitude-derived neutral tint. */
const STAR_SPECTRAL_TINT: Record<string, string> = {
  sirius: '#dde3ff', rigel: '#cee0ff', vega: '#dde3ff', spica: '#cfe0ff',
  regulus: '#d8e4f6', bellatrix: '#d6e2f4', alnilam: '#d4e0f4',
  alnitak: '#d4e0f4', mintaka: '#d4e0f4', altair: '#fbf7e6', deneb: '#f0eee0',
  procyon: '#fbf7e6', castor: '#ecedf0', capella: '#fff2c8',
  pollux: '#ffc89a', arcturus: '#ffb072', aldebaran: '#ffaa78',
  betelgeuse: '#ff8c5a', antares: '#ff8260', hadar: '#cee0ff',
  achernar: '#cee0ff', polaris: '#fbf7e6', canopus: '#fbf7e6',
  rigil: '#fff2c8',
};

function starTint(id: string, mag: number): string {
  const known = STAR_SPECTRAL_TINT[id];
  if (known) return known;
  if (mag <= -1) return '#cee0ff';
  if (mag <= 0)  return '#f4eede';
  if (mag <= 1)  return '#ffd6a6';
  return '#e8d8b6';
}

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
            <FinderScopeSVG
              aim={aim}
              candidates={candidates.slice(0, 8)}
              confirmedId={confirmedId}
              stars={stars}
              objects={objects}
            />
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
  // Mini finder-scope preview matching the live view's aesthetic. Static
  // sample bodies including a textured Jupiter so the user can see at a
  // glance what the post-enable view will look like.
  const SIZE = 220;
  const C = SIZE / 2;
  const FOV_R = C - 8;
  // Deterministic faint star sprinkle so the preview never looks empty.
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

      {/* Outer rim + degree ticks. */}
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

        {/* Field stars */}
        {fieldStars.map((s, i) => (
          <circle key={i} cx={s[0] as number} cy={s[1] as number} r={s[2] as number} fill={s[3] as string} opacity={s[4] as number} />
        ))}

        {/* Sample Jupiter — textured + terminator overlay. */}
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

        {/* Sample bright star (Vega) */}
        <circle cx={C + 36} cy={C + 14} r={9}   fill="#dde3ff" opacity="0.18" />
        <circle cx={C + 36} cy={C + 14} r={4.5} fill="#dde3ff" opacity="0.40" />
        <circle cx={C + 36} cy={C + 14} r={2.4} fill="#ffffff" />
        <text x={C + 36} y={C + 14 - 11} textAnchor="middle"
          fontFamily="var(--font-sans, Inter)" fontSize="9"
          fill="rgba(244,237,224,0.78)" fontWeight={500}>
          Vega
        </text>

        {/* Sample DSO (M31) */}
        <ellipse cx={C - 46} cy={C + 30} rx={7.4} ry={4.4} fill="#5EEAD4" opacity="0.22" />
        <ellipse cx={C - 46} cy={C + 30} rx={4.4} ry={2.8} fill="#5EEAD4" opacity="0.7" />
        <text x={C - 46} y={C + 30 - 9} textAnchor="middle"
          fontFamily="var(--font-sans, Inter)" fontSize="9"
          fill="rgba(244,237,224,0.78)" fontWeight={500}>
          M31
        </text>

        {/* Vignette */}
        <circle cx={C} cy={C} r={FOV_R} fill="url(#pid-preview-vignette)" />
      </g>

      {/* Reticle */}
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

interface FinderScopeProps {
  aim: { az: number; alt: number };
  candidates: Candidate[];
  confirmedId: string | null;
  /** All positioned stars from the parent — used for the field backdrop
   *  (faint stars filling the eyepiece) and constellation line segments. */
  stars: PositionedStar[];
  /** Catalog bodies — used to draw DSOs in the FOV at their actual
   *  positions, not just from the candidate list. */
  objects: SkyObject[];
}

/**
 * Realistic telescope finder-scope view of the patch of sky the phone is
 * aimed at. Replaces the abstract polar radar.
 *
 * Layers from back to front, inside a circular eyepiece clip:
 *  • Deep navy gradient backdrop with mild edge vignette
 *  • Hundreds of faint catalog field stars at their real angular offsets,
 *    sized by magnitude, tinted by spectral class
 *  • Constellation line segments that pass through the FOV
 *  • DSOs as soft warm-cyan glows
 *  • Candidate bodies on top:
 *      planets/moon/sun → actual hero photo clipped into a circle with a
 *        subtle directional terminator gradient for 3D feel
 *      stars → bright disc with a coloured halo
 *  • A telescope reticle (cross-hair with a centre gap + inner FOV ring)
 *
 * Degree ticks around the rim and an FOV caption underneath complete the
 * "finder-scope" aesthetic.
 */
function FinderScopeSVG({ aim, candidates, confirmedId, stars, objects }: FinderScopeProps) {
  const SIZE = 240;
  const C = SIZE / 2;
  const FOV_R = C - 8;           // eyepiece radius (pixels)
  const MAX_DEG = 26;            // half-angle of the visible field
  const DEG_PER_PX = MAX_DEG / FOV_R;

  // Map (az, alt) → pixel coords in the scope, with tangent-plane scaling
  // around the aim direction. We use the small-angle equirectangular
  // approximation — perfectly adequate at the 25° scale we're showing.
  function place(cAz: number, cAlt: number): { x: number; y: number; r: number } {
    const dAlt = cAlt - aim.alt;
    let dAz = cAz - aim.az;
    while (dAz > 180) dAz -= 360;
    while (dAz < -180) dAz += 360;
    // Compress dAz by cos(alt) so the field doesn't smear near zenith.
    const cosAlt = Math.cos(((aim.alt + cAlt) * 0.5) * Math.PI / 180);
    const ang = Math.hypot(dAz * cosAlt, dAlt);
    const x = C + (dAz * cosAlt) / DEG_PER_PX;
    const y = C - dAlt / DEG_PER_PX;
    return { x, y, r: ang };
  }

  // Identify candidate ids so we don't double-render them as field stars.
  const candidateIds = new Set(candidates.map((c) => c.id));

  // Star lookup for constellation lines.
  const starById = new Map<string, PositionedStar>();
  for (const s of stars) starById.set(s.id, s);

  // Background field stars — every catalog star inside the FOV that isn't
  // already a candidate. Cap to avoid runaway counts in dense fields.
  type FieldStar = { id: string; x: number; y: number; r: number; size: number; tint: string; opacity: number; mag: number };
  const fieldStars: FieldStar[] = [];
  for (const s of stars) {
    if (s.altitude < -2) continue;
    if (candidateIds.has(s.id)) continue;
    const p = place(s.azimuth, s.altitude);
    if (p.r > MAX_DEG) continue;
    const mag = s.mag;
    if (mag > 5.0) continue;       // anything fainter blends into noise
    const size = Math.max(0.6, 2.6 - mag * 0.42);
    const opacity = THREE_clamp(0.25, 0.95, 1.05 - mag * 0.13);
    fieldStars.push({
      id: s.id, x: p.x, y: p.y, r: p.r, size, opacity,
      tint: starTint(s.id, mag), mag,
    });
    if (fieldStars.length > 220) break;
  }

  // DSO ghosts — catalog galaxies/nebulae/clusters drawn at their position
  // even when not the active candidate, so the field shows what's there.
  type DsoGhost = { id: string; x: number; y: number; opacity: number; tint: string };
  const dsoGhosts: DsoGhost[] = [];
  for (const o of objects) {
    if (candidateIds.has(o.id)) continue;
    if (!(o.type === 'galaxy' || o.type === 'nebula' || o.type === 'cluster')) continue;
    if (o.altitude < -2) continue;
    const p = place(o.azimuth, o.altitude);
    if (p.r > MAX_DEG) continue;
    dsoGhosts.push({
      id: o.id,
      x: p.x,
      y: p.y,
      opacity: THREE_clamp(0.15, 0.6, 0.65 - o.magnitude * 0.07),
      tint: o.type === 'galaxy' ? '#cfd9ff' : o.type === 'nebula' ? '#ffc8d4' : '#fff7d8',
    });
  }

  // Constellation lines that touch the FOV.
  type Seg = { x1: number; y1: number; x2: number; y2: number };
  const constellationSegs: Seg[] = [];
  for (const [aId, bId] of CONSTELLATION_LINES) {
    const a = starById.get(aId);
    const b = starById.get(bId);
    if (!a || !b) continue;
    if (a.altitude < -2 && b.altitude < -2) continue;
    const pa = place(a.azimuth, a.altitude);
    const pb = place(b.azimuth, b.altitude);
    // Skip if both endpoints are far outside the FOV (rough cull).
    if (pa.r > MAX_DEG * 1.5 && pb.r > MAX_DEG * 1.5) continue;
    constellationSegs.push({ x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y });
  }

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height="100%" aria-hidden="true">
      <defs>
        {/* Eyepiece backdrop — deep navy with a touch of warm core. */}
        <radialGradient id="pid-bg" cx="50%" cy="50%" r="55%">
          <stop offset="0%"  stopColor="#0a0f22" />
          <stop offset="55%" stopColor="#06091a" />
          <stop offset="100%" stopColor="#020410" />
        </radialGradient>
        {/* Soft vignette darkening the eyepiece edge. */}
        <radialGradient id="pid-vignette" cx="50%" cy="50%" r="50%">
          <stop offset="55%"  stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.70)" />
        </radialGradient>
        {/* The eyepiece field clip. */}
        <clipPath id="pid-fov-clip">
          <circle cx={C} cy={C} r={FOV_R} />
        </clipPath>
        {/* Directional terminator gradient for planets — sells the sphere
           shape without needing a separate per-planet shader. */}
        <radialGradient id="pid-terminator" cx="33%" cy="30%" r="76%">
          <stop offset="0%"  stopColor="rgba(255,255,255,0.16)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0)" />
          <stop offset="92%" stopColor="rgba(0,0,0,0.50)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.72)" />
        </radialGradient>
        {/* Per-candidate planet circle clips. */}
        {candidates.map((c) => {
          const radius = candidateRadius(c, /*active*/ c.id === confirmedId);
          const p = place(c.azimuth, c.altitude);
          return (
            <clipPath id={`pid-clip-${c.id}`} key={`clip-${c.id}`}>
              <circle cx={p.x} cy={p.y} r={radius} />
            </clipPath>
          );
        })}
      </defs>

      {/* Outer rim + degree ticks. Sits outside the FOV clip so the rim
          shows even when the eyepiece is dark. */}
      <circle cx={C} cy={C} r={FOV_R + 4} fill="none" stroke="rgba(232,216,184,0.22)" strokeWidth="1.2" />
      {Array.from({ length: 24 }).map((_, i) => {
        const ang = (i / 24) * Math.PI * 2 - Math.PI / 2;
        const inner = i % 6 === 0 ? FOV_R + 2 : FOV_R + 4;
        const outer = i % 6 === 0 ? FOV_R + 10 : FOV_R + 7;
        const cs = Math.cos(ang);
        const sn = Math.sin(ang);
        return (
          <line
            key={i}
            x1={C + cs * inner}
            y1={C + sn * inner}
            x2={C + cs * outer}
            y2={C + sn * outer}
            stroke={i % 6 === 0 ? 'rgba(232,216,184,0.55)' : 'rgba(232,216,184,0.22)'}
            strokeWidth={i % 6 === 0 ? 1.2 : 0.8}
          />
        );
      })}
      {/* Cardinal pointer at the top — the direction the user is aiming. */}
      <text x={C} y={11} textAnchor="middle"
        fontFamily="var(--font-mono, JetBrains Mono)"
        fontSize="9"
        letterSpacing="0.18em"
        fill="rgba(232,216,184,0.55)">
        ↑ {Math.round(aim.az)}°
      </text>

      {/* Eyepiece field — everything inside the FOV clip. */}
      <g clipPath="url(#pid-fov-clip)">
        <circle cx={C} cy={C} r={FOV_R} fill="url(#pid-bg)" />

        {/* Constellation line segments — faint, behind the stars. */}
        <g stroke="rgba(168,184,216,0.16)" strokeWidth="0.7" strokeLinecap="round">
          {constellationSegs.map((s, i) => (
            <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
          ))}
        </g>

        {/* DSO ghosts. */}
        {dsoGhosts.map((d) => (
          <g key={d.id} opacity={d.opacity}>
            <ellipse cx={d.x} cy={d.y} rx={6} ry={3.6} fill={d.tint} opacity="0.18" />
            <ellipse cx={d.x} cy={d.y} rx={3.2} ry={2} fill={d.tint} opacity="0.55" />
          </g>
        ))}

        {/* Field stars — soft halo + bright core, spectral-class tint. */}
        {fieldStars.map((s) => (
          <g key={s.id} opacity={s.opacity}>
            {s.mag <= 2.4 && (
              <circle cx={s.x} cy={s.y} r={s.size * 2.2} fill={s.tint} opacity="0.18" />
            )}
            <circle cx={s.x} cy={s.y} r={s.size} fill={s.tint} />
          </g>
        ))}

        {/* Candidates on top. Planets/moon/sun use the actual hero
            texture clipped to a disc, with a directional terminator
            gradient layered on top for a 3D-shaded look. Stars get a
            bright disc + tint-coloured halo. */}
        {candidates.map((c) => {
          const isLocked = c.id === confirmedId;
          const p = place(c.azimuth, c.altitude);
          const inside = c.separation <= MAX_DEG;
          if (!inside) return null;
          const radius = candidateRadius(c, isLocked);
          const opacity = THREE_clamp(0.55, 1, 1 - c.separation / (MAX_DEG * 1.4));

          if (c.kind === 'star') {
            const tint = starTint(c.id, c.magnitude ?? 1);
            return (
              <g key={c.id} opacity={opacity}>
                <circle cx={p.x} cy={p.y} r={radius * 3.0} fill={tint} opacity="0.18" />
                <circle cx={p.x} cy={p.y} r={radius * 1.6} fill={tint} opacity="0.40" />
                <circle cx={p.x} cy={p.y} r={radius * 0.9} fill="#ffffff" />
                {isLocked && (
                  <circle cx={p.x} cy={p.y} r={radius * 3.6} fill="none" stroke="var(--terracotta)" strokeWidth="1.1" />
                )}
                <CandidateLabel x={p.x} y={p.y - radius * 3.2 - 6} name={c.name} locked={isLocked} />
              </g>
            );
          }

          if (c.kind === 'dso') {
            return (
              <g key={c.id} opacity={opacity}>
                <ellipse cx={p.x} cy={p.y} rx={radius * 1.9} ry={radius * 1.1} fill="#5EEAD4" opacity="0.22" />
                <ellipse cx={p.x} cy={p.y} rx={radius * 1.1} ry={radius * 0.7} fill="#5EEAD4" opacity="0.7" />
                {isLocked && (
                  <ellipse cx={p.x} cy={p.y} rx={radius * 2.6} ry={radius * 1.7} fill="none" stroke="var(--terracotta)" strokeWidth="1.1" />
                )}
                <CandidateLabel x={p.x} y={p.y - radius * 1.8 - 6} name={c.name} locked={isLocked} />
              </g>
            );
          }

          // planet / moon / sun — textured disc with terminator overlay
          const texUrl = PLANET_TEXTURE_URL[c.id];
          return (
            <g key={c.id} opacity={opacity}>
              {/* Soft glow halo behind the disc. */}
              <circle
                cx={p.x}
                cy={p.y}
                r={radius * 1.9}
                fill={c.id === 'sun' ? '#ffd27a' : c.id === 'moon' ? '#f3eedf' : '#ffe6a6'}
                opacity={c.id === 'sun' ? 0.32 : 0.15}
              />
              {texUrl && (
                <image
                  href={texUrl}
                  x={p.x - radius}
                  y={p.y - radius}
                  width={radius * 2}
                  height={radius * 2}
                  preserveAspectRatio="xMidYMid slice"
                  clipPath={`url(#pid-clip-${c.id})`}
                />
              )}
              {/* Terminator gradient overlay — only for non-sun bodies. */}
              {c.id !== 'sun' && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={radius}
                  fill="url(#pid-terminator)"
                />
              )}
              {/* Crisp rim. */}
              <circle cx={p.x} cy={p.y} r={radius} fill="none" stroke="rgba(0,0,0,0.7)" strokeWidth="0.6" />
              {isLocked && (
                <circle cx={p.x} cy={p.y} r={radius + 5} fill="none" stroke="var(--terracotta)" strokeWidth="1.3" />
              )}
              <CandidateLabel x={p.x} y={p.y - radius - 6} name={c.name} locked={isLocked} />
            </g>
          );
        })}

        {/* Vignette overlay last, so it darkens stars near the edge. */}
        <circle cx={C} cy={C} r={FOV_R} fill="url(#pid-vignette)" />
      </g>

      {/* Reticle — sits above the field, inside the clip so the lines
          don't extend past the rim. Cross with a centre gap + small
          inner FOV ring; warm terracotta to read against the night-blue. */}
      <g clipPath="url(#pid-fov-clip)">
        <circle cx={C} cy={C} r="13" fill="none" stroke="rgba(255,150,80,0.40)" strokeWidth="1.0" />
        <line x1={C} y1={C - FOV_R + 4}  x2={C} y2={C - 18} stroke="rgba(255,150,80,0.65)" strokeWidth="1.1" strokeLinecap="round" />
        <line x1={C} y1={C + 18} x2={C} y2={C + FOV_R - 4} stroke="rgba(255,150,80,0.65)" strokeWidth="1.1" strokeLinecap="round" />
        <line x1={C - FOV_R + 4}  y1={C} x2={C - 18} y2={C} stroke="rgba(255,150,80,0.65)" strokeWidth="1.1" strokeLinecap="round" />
        <line x1={C + 18} y1={C} x2={C + FOV_R - 4}  y2={C} stroke="rgba(255,150,80,0.65)" strokeWidth="1.1" strokeLinecap="round" />
        <circle cx={C} cy={C} r="1.6" fill="rgba(255,150,80,0.95)" />
      </g>

      {/* Footer — FOV caption + altitude readout, like a real eyepiece. */}
      <text x={14} y={SIZE - 8}
        fontFamily="var(--font-mono, JetBrains Mono)"
        fontSize="9"
        letterSpacing="0.16em"
        fill="rgba(232,216,184,0.55)">
        FOV {MAX_DEG * 2}°
      </text>
      <text x={SIZE - 14} y={SIZE - 8}
        textAnchor="end"
        fontFamily="var(--font-mono, JetBrains Mono)"
        fontSize="9"
        letterSpacing="0.14em"
        fill="rgba(232,216,184,0.55)">
        ALT {Math.round(aim.alt)}°
      </text>
    </svg>
  );
}

function candidateRadius(c: Candidate, active: boolean): number {
  const base =
    c.kind === 'sun' || c.kind === 'moon' ? 12 :
    c.kind === 'planet' ? 9 :
    c.kind === 'dso' ? 5 :
    3.5;
  return active ? base * 1.18 : base;
}

function CandidateLabel({ x, y, name, locked }: { x: number; y: number; name: string; locked: boolean }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontFamily="var(--font-sans, Inter)"
      fontSize="9"
      letterSpacing="0.04em"
      fill={locked ? 'var(--terracotta)' : 'rgba(244,237,224,0.78)'}
      fontWeight={locked ? 600 : 500}
    >
      {name}
    </text>
  );
}

function THREE_clamp(lo: number, hi: number, x: number): number {
  return Math.min(hi, Math.max(lo, x));
}
