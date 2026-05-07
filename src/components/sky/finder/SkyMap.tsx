'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { angularSeparation, headingDelta, type HeadingStatus } from '@/lib/sky/use-device-heading';
import type { ObjectId, SkyObject } from './types';

const PLANET_COLORS: Record<string, string> = {
  sun:     '#ffd166',
  moon:    '#f4ede0',
  mercury: '#d6cdb1',
  venus:   '#f7e7a8',
  mars:    '#ff7b54',
  jupiter: '#fbe9b7',
  saturn:  '#d4a574',
  uranus:  '#9ad4d4',
  neptune: '#8db7e8',
};

function starColor(mag: number): string {
  if (mag <= -1) return '#bcd6ff';
  if (mag <= 0)  return '#f4ede0';
  if (mag <= 1)  return '#fff1d2';
  return '#e8d8b6';
}

/**
 * Per-star spectral tint — overrides the magnitude-only fallback for the
 * brightest stars where the eye can actually pick out colour. Hot O/B
 * stars read blue-white; K-type read warm orange; M-type red giants read
 * deep orange-red. Matches what the eye sees through clean dark-sky air.
 */
const CONSTELLATION_NAMES: Record<string, string> = {
  orion:      'ORION',
  ursaMajor:  'URSA MAJOR',
  cassiopeia: 'CASSIOPEIA',
  cygnus:     'CYGNUS',
  andromeda:  'ANDROMEDA',
  lyra:       'LYRA',
};

const STAR_TINT: Record<string, string> = {
  // Blue-white (B/A class)
  sirius:    '#cfe1ff',
  vega:      '#d4e4ff',
  rigel:     '#cee0ff',
  spica:     '#cfe0ff',
  regulus:   '#d8e4f6',
  bellatrix: '#d6e2f4',
  alnilam:   '#d4e0f4',
  alnitak:   '#d4e0f4',
  mintaka:   '#d4e0f4',
  // White (A/F)
  altair:    '#f4f1e6',
  deneb:     '#f0eee0',
  procyon:   '#f4ede0',
  castor:    '#ecedf0',
  // Yellow / yellow-white (F/G)
  capella:   '#fbe9ad',
  pollux:    '#f3c98a',
  // Orange (K)
  arcturus:  '#f0a55c',
  aldebaran: '#ec8b56',
  // Red giants (M)
  betelgeuse:'#e87454',
  antares:   '#e36c4a',
};

function azimuthToCardinal(az: number): string {
  const n = ((az % 360) + 360) % 360;
  if (n >= 337.5 || n < 22.5) return 'N';
  if (n < 67.5) return 'NE';
  if (n < 112.5) return 'E';
  if (n < 157.5) return 'SE';
  if (n < 202.5) return 'S';
  if (n < 247.5) return 'SW';
  if (n < 292.5) return 'W';
  return 'NW';
}

const SIZE = 380;
const CX = SIZE / 2;
const CY = SIZE / 2;
/** Circular dome radius — azimuthal equidistant projection. Zenith at the
 *  centre, horizon on a circle of radius R. This is the projection every
 *  real-world planetarium app (Stellarium, SkyView, Sky Safari) uses, so
 *  angles read true: a 45° span between two bodies measures 45° on screen. */
const R = 168;
/** Cardinal-label radius — sits just outside R. */
const CARD_R = R + 14;

/**
 * Per-target lock radius (degrees of great-circle separation). Bigger for
 * naked-eye targets where the user has a wide field of view; tighter for
 * scope-only DSOs that need precise aiming.
 */
function lockRadiusDeg(obj: SkyObject): number {
  if (obj.instrument === 'telescope') return 3;
  if (obj.instrument === 'binoculars') return 5;
  return 8;
}

/** Hold this long inside the lock cone before triggering a confirmed lock. */
const HOLD_TO_LOCK_MS = 800;
/**
 * Compass accuracy worse than this triggers the calibration banner. iOS
 * reports `webkitCompassAccuracy` in degrees; missing or > 15° = unreliable.
 */
const POOR_ACCURACY_DEG = 15;

/** Bright star + its current alt/az, sized for chart rendering. */
export interface ConstellationStar {
  id: string;
  name: string;
  altitude: number;
  azimuth: number;
  mag: number;
  /** Constellation key (e.g. 'orion', 'andromeda'). */
  constellation?: string;
}

interface SkyMapProps {
  objects: SkyObject[];
  activeId: ObjectId | null;
  onSelect: (id: ObjectId) => void;
  /** Optional live device compass heading. When provided, the dome rotates so the user's facing direction is at top. */
  heading?: number | null;
  /** Optional live device altitude (where the back of the phone points), −90..+90. */
  userAltitude?: number | null;
  /** Permission/availability state for the heading source. */
  headingStatus?: HeadingStatus;
  /** iOS compass accuracy in degrees, or null if unknown. */
  accuracy?: number | null;
  /** Triggered when the user taps the calibrate compass control. */
  onCalibrate?: () => void;
  /** Stick-figure stars to render at low opacity behind the bodies. */
  constellationStars?: ConstellationStar[];
  /** Stick-figure line segments — pairs of star ids. */
  constellationLines?: Array<[string, string]>;
  /** When set, draws a dashed terracotta trail from anchor → active body. */
  hopAnchor?: { id: string; name: string; azimuth: number; altitude: number } | null;
  /** Best body the user can physically aim at to calibrate the compass — set
   *  by the page (Moon &gt; bright planet &gt; Sun &gt; brightest visible). The
   *  guided calibration banner uses this regardless of the selected target. */
  calibrationAnchor?: { id: string; name: string; azimuth: number; altitude: number } | null;
  /** Persistent calibration offset (degrees) — shown next to nudge controls. */
  calibrationOffset?: number;
  /** Apply ±degrees to the calibration offset. Optional — only renders the +/− pad when provided. */
  onNudge?: (delta: number) => void;
  /**
   * Reports the angular distance between the user's current aim and the
   * active target whenever it changes. Used by the heading hook to dampen
   * smoothing as the user closes in. Optional.
   */
  onProximityChange?: (deg: number | null) => void;
}

interface Plotted {
  obj: SkyObject;
  x: number;
  y: number;
}

interface LabelPlacement {
  lx: number;
  ly: number;
  anchor: 'start' | 'middle' | 'end';
  text: string;
}

const CHAR_W = 5.2;
const LABEL_H = 10;
const LABEL_PAD = 2;

function labelPriority(p: Plotted, activeId: string | null): number {
  if (p.obj.id === activeId) return 0;
  const t = p.obj.type;
  if (t === 'sun' || t === 'moon' || t === 'planet') return 1;
  if ((t === 'star' || t === 'double') && p.obj.magnitude <= 1.5) return 2;
  if (t === 'star' || t === 'double') return 5;
  return 3;
}

function makeLabel(p: Plotted): LabelPlacement {
  const isPlanet = p.obj.type === 'planet' || p.obj.type === 'sun' || p.obj.type === 'moon';
  let radius: number;
  if (isPlanet) {
    radius = p.obj.id === 'sun' ? 7 : p.obj.id === 'moon' ? 6.5 : 5.5;
  } else {
    radius = 4.5;
  }
  const dx = p.x - CX;
  const dy = p.y - CY;
  const norm = Math.hypot(dx, dy) || 1;
  const offset = radius + 11;
  const lx = p.x + (dx / norm) * offset;
  const ly = p.y + (dy / norm) * offset;
  const anchor: 'start' | 'middle' | 'end' = lx < CX - 24 ? 'end' : lx > CX + 24 ? 'start' : 'middle';
  return { lx, ly, anchor, text: p.obj.name };
}

function labelBox(pl: LabelPlacement): { x: number; y: number; w: number; h: number } {
  const w = pl.text.length * CHAR_W + LABEL_PAD * 2;
  const h = LABEL_H + LABEL_PAD * 2;
  let left: number;
  if (pl.anchor === 'end') left = pl.lx - w + LABEL_PAD;
  else if (pl.anchor === 'start') left = pl.lx - LABEL_PAD;
  else left = pl.lx - w / 2;
  return { x: left, y: pl.ly - h / 2, w, h };
}

function rectsOverlap(a: { x: number; y: number; w: number; h: number }, b: typeof a): boolean {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
}

/**
 * Azimuthal equidistant projection. Zenith at centre, horizon on a circle
 * of radius R. Radial distance from the centre is linear in the zenith
 * angle, so two bodies separated by N° on the sky are separated by N° on
 * the chart. This is the conventional planetarium projection — what
 * SkyView, Stellarium, and Sky Safari all use.
 */
function project(alt: number, az: number, headingOffset: number): { x: number; y: number } {
  const altC = Math.max(0, Math.min(90, alt));
  const dist = (1 - altC / 90) * R; // 0 at zenith, R at horizon
  const azRad = ((az - headingOffset) * Math.PI) / 180;
  return {
    x: CX + dist * Math.sin(azRad),
    y: CY - dist * Math.cos(azRad),
  };
}

export function SkyMap({
  objects,
  activeId,
  onSelect,
  heading = null,
  userAltitude = null,
  headingStatus = 'idle',
  accuracy = null,
  onCalibrate,
  constellationStars = [],
  constellationLines = [],
  hopAnchor = null,
  calibrationAnchor = null,
  calibrationOffset = 0,
  onNudge,
  onProximityChange,
}: SkyMapProps) {
  const t = useTranslations('sky.skymap');
  const liveOffset = heading ?? 0;
  const isLive = heading != null;
  const hasTilt = userAltitude != null;

  const plotted = useMemo<Plotted[]>(() => {
    return objects
      .filter((o) => o.visible)
      .map((o) => {
        const p = project(o.altitude, o.azimuth, liveOffset);
        return { obj: o, x: p.x, y: p.y };
      });
  }, [objects, liveOffset]);

  const drawOrder = useMemo(() => {
    return plotted.slice().sort((a, b) => {
      const aA = a.obj.id === activeId ? 1 : 0;
      const bA = b.obj.id === activeId ? 1 : 0;
      if (aA !== bA) return aA - bA;
      return b.obj.magnitude - a.obj.magnitude;
    });
  }, [plotted, activeId]);

  const active = useMemo(() => {
    if (!activeId) return null;
    return plotted.find((p) => p.obj.id === activeId) ?? null;
  }, [plotted, activeId]);

  const labelMap = useMemo(() => {
    const sorted = plotted.slice().sort((a, b) => {
      const pa = labelPriority(a, activeId);
      const pb = labelPriority(b, activeId);
      if (pa !== pb) return pa - pb;
      return a.obj.magnitude - b.obj.magnitude;
    });
    const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
    const out = new Map<string, LabelPlacement | null>();
    for (const p of sorted) {
      const isPlanet = p.obj.type === 'planet' || p.obj.type === 'sun' || p.obj.type === 'moon';
      const isStar = p.obj.type === 'star' || p.obj.type === 'double';
      const eligible =
        p.obj.id === activeId ||
        isPlanet ||
        (!isStar) ||
        p.obj.magnitude <= 1.5;
      if (!eligible) { out.set(p.obj.id, null); continue; }

      const placement = makeLabel(p);
      const box = labelBox(placement);
      const collides = placed.some((b) => rectsOverlap(box, b));
      if (!collides) {
        placed.push(box);
        out.set(p.obj.id, placement);
      } else if (p.obj.id === activeId) {
        placed.push(box);
        out.set(p.obj.id, placement);
      } else {
        out.set(p.obj.id, null);
      }
    }
    return out;
  }, [plotted, activeId]);

  // Single great-circle distance from user's aim to the active body. This is
  // the proximity that drives every aim-feedback element below — replacing
  // the older two-axis (Δaz, Δalt) box check that broke near zenith.
  const proximity = useMemo(() => {
    if (!isLive || !hasTilt || !active) return null;
    return angularSeparation(
      userAltitude ?? 0,
      heading ?? 0,
      active.obj.altitude,
      active.obj.azimuth,
    );
  }, [isLive, hasTilt, active, heading, userAltitude]);

  // Feed proximity back to the heading hook so it can dampen smoothing as
  // the user closes in. Optional — falls back gracefully when unset.
  useEffect(() => {
    if (!onProximityChange) return;
    onProximityChange(proximity);
  }, [proximity, onProximityChange]);

  const lockRadius = active ? lockRadiusDeg(active.obj) : 8;
  const insideLockCone = proximity != null && proximity <= lockRadius;

  // Hold-to-lock state machine. The user has to keep the aim inside the
  // lock cone for HOLD_TO_LOCK_MS before the lock confirms — this rejects
  // sensor wobble that otherwise flickered the lock on/off.
  const [holdProgress, setHoldProgress] = useState(0); // 0..1
  const [confirmedLock, setConfirmedLock] = useState(false);
  const holdStartRef = useRef<number | null>(null);
  const lastActiveIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Reset whenever the active target changes.
    if (active?.obj.id !== lastActiveIdRef.current) {
      lastActiveIdRef.current = active?.obj.id ?? null;
      holdStartRef.current = null;
      setHoldProgress(0);
      setConfirmedLock(false);
    }
  }, [active]);

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
      const t = Math.min(1, elapsed / HOLD_TO_LOCK_MS);
      setHoldProgress(t);
      if (t >= 1) {
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

  // Where the phone is currently aimed, projected onto the rotated dome.
  // Always at angle 0 (top of dome) since the chart rotates with heading;
  // the radial position is driven by the user's pitch.
  const userAim = useMemo(() => {
    if (!isLive || !hasTilt) return null;
    const alt = Math.max(0, Math.min(90, userAltitude ?? 0));
    const dist = (1 - alt / 90) * R;
    return { x: CX, y: CY - dist, belowHorizon: (userAltitude ?? 0) < 0 };
  }, [isLive, hasTilt, userAltitude]);

  const starfield = useMemo(() => {
    let seed = 1729;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const stars: { x: number; y: number; r: number; o: number }[] = [];
    const target = 130;
    const innerR = R - 4;
    let attempts = 0;
    while (stars.length < target && attempts < target * 8) {
      attempts++;
      const x = rand() * SIZE;
      const y = rand() * SIZE;
      const dx = x - CX;
      const dy = y - CY;
      if (dx * dx + dy * dy > innerR * innerR) continue;
      const r = 0.35 + rand() * 1.05;
      const o = 0.22 + rand() * 0.55;
      stars.push({ x, y, r, o });
    }
    return stars;
  }, []);

  const projectedStars = useMemo(() => {
    return constellationStars
      .filter((s) => s.altitude > 0)
      .map((s) => ({ ...s, ...project(s.altitude, s.azimuth, liveOffset) }));
  }, [constellationStars, liveOffset]);

  const starById = useMemo(() => {
    const m = new Map<string, (typeof projectedStars)[number]>();
    projectedStars.forEach((s) => m.set(s.id, s));
    return m;
  }, [projectedStars]);

  const activeConstellation = useMemo(() => {
    if (hopAnchor) {
      const a = constellationStars.find((s) => s.id === hopAnchor.id);
      if (a?.constellation) return a.constellation;
    }
    if (active) {
      const a = constellationStars.find((s) => s.id === active.obj.id);
      if (a?.constellation) return a.constellation;
    }
    return null;
  }, [hopAnchor, active, constellationStars]);

  // Centroid per constellation, in screen coords. Only computed for groups
  // that have 2+ stars currently above the horizon, so a constellation
  // half-set never gets a label drifting below the rim.
  const constellationLabels = useMemo(() => {
    const buckets = new Map<string, { x: number; y: number; n: number }>();
    for (const s of projectedStars) {
      const key = s.constellation;
      if (!key || !CONSTELLATION_NAMES[key]) continue;
      const b = buckets.get(key) ?? { x: 0, y: 0, n: 0 };
      b.x += s.x;
      b.y += s.y;
      b.n += 1;
      buckets.set(key, b);
    }
    const out: { key: string; x: number; y: number; n: number }[] = [];
    buckets.forEach((b, key) => {
      if (b.n >= 2) out.push({ key, x: b.x / b.n, y: b.y / b.n, n: b.n });
    });
    return out;
  }, [projectedStars]);

  const hopTrail = useMemo(() => {
    if (!hopAnchor || !active) return null;
    if (hopAnchor.altitude <= 0) return null;
    const from = project(hopAnchor.altitude, hopAnchor.azimuth, liveOffset);
    const to = { x: active.x, y: active.y };
    return { from, to };
  }, [hopAnchor, active, liveOffset]);

  const cardinals: { dir: string; az: number; tier: 'primary' | 'secondary' }[] = [
    { dir: 'N',  az: 0,   tier: 'primary' },
    { dir: 'NE', az: 45,  tier: 'secondary' },
    { dir: 'E',  az: 90,  tier: 'primary' },
    { dir: 'SE', az: 135, tier: 'secondary' },
    { dir: 'S',  az: 180, tier: 'primary' },
    { dir: 'SW', az: 225, tier: 'secondary' },
    { dir: 'W',  az: 270, tier: 'primary' },
    { dir: 'NW', az: 315, tier: 'secondary' },
  ];

  // Tick marks every 15°. Long ticks at cardinals, medium at inter-cardinals,
  // short for the rest. Sits just inside the rim so the dome reads as a real
  // bearing wheel rather than a bare circle.
  const ticks = Array.from({ length: 24 }, (_, i) => i * 15);

  // Compass accuracy is poor when iOS reports >15° or omits the field while
  // the user is live. Surfaces a calibration banner so the user knows why
  // targets might be off without blaming the math.
  const poorAccuracy = isLive && (accuracy == null || accuracy > POOR_ACCURACY_DEG);

  return (
    <div className="sky-map">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className={`sky-map__svg${isLive ? ' is-live' : ''}`}
        role="img"
        aria-label="Sky map showing visible bodies"
      >
        <defs>
          <radialGradient id="skymap-bg" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor="#0e1a36" />
            <stop offset="55%" stopColor="#070d22" />
            <stop offset="100%" stopColor="#02060f" />
          </radialGradient>
          <clipPath id="skymap-clip">
            <circle cx={CX} cy={CY} r={R} />
          </clipPath>
          <radialGradient id="skymap-nebula" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(232,164,158,0.85)" />
            <stop offset="60%" stopColor="rgba(190,108,108,0.35)" />
            <stop offset="100%" stopColor="rgba(140,70,80,0.0)" />
          </radialGradient>
          <radialGradient id="skymap-galaxy" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="rgba(216,224,248,0.75)" />
            <stop offset="55%" stopColor="rgba(150,170,210,0.30)" />
            <stop offset="100%" stopColor="rgba(110,130,170,0)" />
          </radialGradient>
        </defs>

        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="url(#skymap-bg)"
        />

        <g clipPath="url(#skymap-clip)" pointerEvents="none">
          {starfield.map((s, i) => (
            <circle
              key={`bg-${i}`}
              cx={s.x}
              cy={s.y}
              r={s.r}
              fill="#f4ede0"
              opacity={s.o}
            />
          ))}
        </g>

        {/* Concentric altitude rings at 30° and 60° (radii 2R/3 and R/3). */}
        {[1 / 3, 2 / 3].map((k) => (
          <circle
            key={`alt-${k}`}
            cx={CX}
            cy={CY}
            r={R * k}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={0.5}
          />
        ))}

        <line x1={CX} y1={CY - R} x2={CX} y2={CY + R} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
        <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />

        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth={1}
          className="sky-map__rim"
        />

        {/* Constellation centroid labels — quietly identify the figure
            you're looking at. Highlighted when the active body is in it. */}
        {constellationLabels.length > 0 && (
          <g pointerEvents="none">
            {constellationLabels.map((c) => {
              const isActive = activeConstellation === c.key;
              return (
                <text
                  key={`cname-${c.key}`}
                  x={c.x}
                  y={c.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="9"
                  fontFamily="var(--mono)"
                  letterSpacing="0.22em"
                  fill={isActive ? 'rgba(255,229,184,0.78)' : 'rgba(255,255,255,0.22)'}
                  className="sky-map__cname"
                >
                  {CONSTELLATION_NAMES[c.key]}
                </text>
              );
            })}
          </g>
        )}

        {/* Constellation stick figures + bright stars (drawn under the
            bodies so the planet glyphs sit on top). */}
        {constellationLines.length > 0 && (
          <g pointerEvents="none">
            {constellationLines.map(([a, b], i) => {
              const sa = starById.get(a);
              const sb = starById.get(b);
              if (!sa || !sb) return null;
              const isActive = activeConstellation && (sa.constellation === activeConstellation || sb.constellation === activeConstellation);
              return (
                <line
                  key={`cline-${i}`}
                  x1={sa.x}
                  y1={sa.y}
                  x2={sb.x}
                  y2={sb.y}
                  stroke={isActive ? 'rgba(255,241,210,0.65)' : 'rgba(255,255,255,0.22)'}
                  strokeWidth={isActive ? 1.0 : 0.75}
                  strokeLinecap="round"
                />
              );
            })}
            {projectedStars.map((s) => {
              const isActive = activeConstellation && s.constellation === activeConstellation;
              const r = s.mag <= 1 ? 1.9 : s.mag <= 2 ? 1.55 : 1.2;
              const tint = STAR_TINT[s.id] ?? (isActive ? '#fff1d2' : starColor(s.mag));
              return (
                <circle
                  key={`cstar-${s.id}`}
                  cx={s.x}
                  cy={s.y}
                  r={r}
                  fill={tint}
                  opacity={isActive ? 1 : 0.82}
                />
              );
            })}
          </g>
        )}

        {hopTrail && (
          <g pointerEvents="none" className="sky-map__hop-trail">
            <line
              x1={hopTrail.from.x}
              y1={hopTrail.from.y}
              x2={hopTrail.to.x}
              y2={hopTrail.to.y}
              stroke="var(--terracotta)"
              strokeWidth={1.2}
              strokeDasharray="4 3"
              opacity={0.85}
            />
            <circle cx={hopTrail.from.x} cy={hopTrail.from.y} r={3.5}
              fill="none" stroke="var(--terracotta)" strokeWidth={1.1} opacity={0.9} />
          </g>
        )}

        <circle cx={CX} cy={CY} r={1.5} fill="rgba(255,255,255,0.4)" />

        <text x={CX + 4} y={CY - R * (1 / 3) + 3} fill="rgba(255,255,255,0.30)" fontSize="8"
          fontFamily="var(--mono)" letterSpacing="0.05em" className="sky-map__alt-label">60°</text>
        <text x={CX + 4} y={CY - R * (2 / 3) + 3} fill="rgba(255,255,255,0.30)" fontSize="8"
          fontFamily="var(--mono)" letterSpacing="0.05em" className="sky-map__alt-label">30°</text>

        {/* Compass tick rose — bearings every 15° around the rim. */}
        <g pointerEvents="none">
          {ticks.map((az) => {
            const isCardinal = az % 90 === 0;
            const isInter = !isCardinal && az % 45 === 0;
            const angleRad = ((az - liveOffset) * Math.PI) / 180;
            const sx = Math.sin(angleRad);
            const sy = -Math.cos(angleRad);
            const len = isCardinal ? 6 : isInter ? 4 : 2.5;
            const x1 = CX + (R - 1) * sx;
            const y1 = CY + (R - 1) * sy;
            const x2 = CX + (R - 1 - len) * sx;
            const y2 = CY + (R - 1 - len) * sy;
            return (
              <line
                key={`tick-${az}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isCardinal ? 'rgba(255,255,255,0.45)' : isInter ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.16)'}
                strokeWidth={isCardinal ? 1.1 : 0.8}
                strokeLinecap="round"
              />
            );
          })}
        </g>

        {cardinals.map((c) => {
          const angleRad = ((c.az - liveOffset) * Math.PI) / 180;
          const lx = CX + CARD_R * Math.sin(angleRad);
          const ly = CY - CARD_R * Math.cos(angleRad);
          const distFromTop = Math.abs(((c.az - liveOffset + 540) % 360) - 180);
          const isFacing = isLive && distFromTop > 135;
          const isPrimary = c.tier === 'primary';
          // North gets a tiny upward arrow notch above the letter so it
          // reads as the orienting tick at a glance.
          const isNorth = c.dir === 'N';
          return (
            <g key={c.dir}>
              {isNorth && (
                <polygon
                  points={`${lx - 3.5},${ly + 9} ${lx + 3.5},${ly + 9} ${lx},${ly + 4}`}
                  fill="var(--terracotta)"
                  opacity={0.78}
                />
              )}
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={isNorth ? 14 : isPrimary ? 12 : 9.5}
                fontFamily="var(--mono)"
                letterSpacing={isPrimary ? '0.14em' : '0.18em'}
                className={`sky-map__cardinal sky-map__cardinal--${c.tier}${isFacing ? ' sky-map__cardinal--facing' : ''}${isNorth ? ' sky-map__cardinal--north' : ''}`}
              >
                {c.dir}
              </text>
            </g>
          );
        })}

        {/* Aim guide: a soft line from the user's reticle to the active
            target while not yet locked. Replaces the rim arrow + verbal
            "turn 12°" pill with a single visual cue — drag yourself onto
            the target. */}
        {isLive && active && userAim && !confirmedLock && (
          <AimGuide from={userAim} to={{ x: active.x, y: active.y }} proximity={proximity ?? 999} />
        )}

        {/* User-aim reticle: where the phone is currently pointing. The
            target glyph sits at its own (az, alt) — when the user aims
            correctly, the two visually merge. Scanning state drives a
            soft breathing pulse; lock state freezes it green. */}
        {userAim && (
          <UserAimReticle
            x={userAim.x}
            y={userAim.y}
            below={userAim.belowHorizon}
            locked={confirmedLock}
            scanning={!confirmedLock && !insideLockCone}
          />
        )}

        {/* Bodies — opacity tapers near the horizon (atmospheric extinction).
            Active body always renders at full opacity so the user can find it. */}
        {drawOrder.map((p) => {
          const isActive = p.obj.id === activeId;
          const alt = p.obj.altitude;
          const opacity = isActive
            ? 1
            : alt >= 25
              ? 1
              : Math.max(0.55, 0.55 + (alt / 25) * 0.45);
          return (
            <ObjectGlyph
              key={p.obj.id}
              p={p}
              isActive={isActive}
              onSelect={onSelect}
              label={labelMap.get(p.obj.id) ?? null}
              opacity={opacity}
            />
          );
        })}

        {/* Active crosshair + lock progress arc + lock ripples last so
            they sit above everything. */}
        {active && (
          <>
            {confirmedLock && <LockRipples key={`lock-${active.obj.id}`} x={active.x} y={active.y} />}
            <Crosshair x={active.x} y={active.y} locked={confirmedLock} />
            {isLive && hasTilt && !confirmedLock && holdProgress > 0 && (
              <HoldArc x={active.x} y={active.y} progress={holdProgress} />
            )}
          </>
        )}
      </svg>

      {/* === Compass control overlay === */}
      <div className="sky-map__hud">
        {isLive ? (
          <span className={`sky-map__facing${confirmedLock ? ' is-locked' : ''}`}>
            <span className="sky-map__facing-dot" />
            <span className="sky-map__facing-label">{t('facing')}</span>
            <span className="sky-map__facing-deg">{Math.round(((heading ?? 0) % 360 + 360) % 360)}°</span>
            <span className="sky-map__facing-card">{azimuthToCardinal(heading ?? 0)}</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={onCalibrate}
            className="sky-map__calibrate"
            disabled={headingStatus === 'unavailable'}
            aria-label={t('calibrate')}
          >
            <CompassIcon />
            <span>
              {headingStatus === 'denied'
                ? t('compassDenied')
                : headingStatus === 'unavailable'
                  ? t('compassUnavailable')
                  : t('calibrate')}
            </span>
          </button>
        )}
        {active && proximity != null && (
          <span className={`sky-map__aim-pill${confirmedLock ? ' is-locked' : insideLockCone ? ' is-acquiring' : ''}`}>
            {confirmedLock ? (
              <span className="sky-map__aim-pill-lock">{t('onTarget')}</span>
            ) : (
              <>
                <strong className="sky-map__aim-pill-deg">{Math.round(proximity)}°</strong>
                <span className="sky-map__aim-pill-suffix">{t('away')}</span>
              </>
            )}
          </span>
        )}
      </div>

      {poorAccuracy && (
        <div className="sky-map__accuracy" role="status">
          <span className="sky-map__accuracy-icon" aria-hidden="true">∞</span>
          <span>{t('poorAccuracy')}</span>
        </div>
      )}

      {isLive && calibrationAnchor && onNudge && hasTilt && (
        <CalibrationBanner
          anchor={calibrationAnchor}
          heading={heading ?? 0}
          userAlt={userAltitude ?? 0}
          onLock={() => {
            const delta = headingDelta(calibrationAnchor.azimuth, heading ?? 0);
            onNudge(delta);
          }}
          calibrationOffset={calibrationOffset}
        />
      )}

      {isLive && onNudge && (
        <div className="sky-map__nudge" role="group" aria-label={t('nudgeAria')}>
          <button
            type="button"
            className="sky-map__nudge-btn"
            onClick={() => onNudge(-1)}
            aria-label={t('nudgeLeft')}
          >
            −1°
          </button>
          <span className="sky-map__nudge-val" aria-live="polite">
            {calibrationOffset === 0
              ? t('nudgeNeutral')
              : `${calibrationOffset > 0 ? '+' : ''}${Math.round(calibrationOffset)}°`}
          </span>
          <button
            type="button"
            className="sky-map__nudge-btn"
            onClick={() => onNudge(1)}
            aria-label={t('nudgeRight')}
          >
            +1°
          </button>
        </div>
      )}
    </div>
  );
}

interface GlyphProps {
  p: Plotted;
  isActive: boolean;
  onSelect: (id: ObjectId) => void;
  label: LabelPlacement | null;
  opacity?: number;
}

function ObjectGlyph({ p, isActive, onSelect, label, opacity = 1 }: GlyphProps) {
  const { obj, x, y } = p;

  const isPlanet = obj.type === 'planet' || obj.type === 'sun' || obj.type === 'moon';
  let radius: number;
  if (isPlanet) {
    radius = obj.id === 'sun' ? 7 : obj.id === 'moon' ? 6.5 : 5.5;
  } else if (obj.type === 'star' || obj.type === 'double') {
    const m = Math.max(-1.5, Math.min(4, obj.magnitude));
    radius = 4.5 - ((m + 1.5) / 5.5) * 3.1;
  } else {
    radius = 4.5;
  }
  if (isActive && (obj.type === 'star' || obj.type === 'double')) radius += 1;

  return (
    <g
      onClick={() => onSelect(obj.id)}
      style={{ cursor: 'pointer', opacity }}
      role="button"
      aria-label={obj.name}
    >
      {renderBody(obj, x, y, radius)}
      <circle
        className="sky-map__hit"
        cx={x}
        cy={y}
        r={Math.max(radius + 14, 22)}
        fill="transparent"
      />
      {label && (
        <text
          x={label.lx}
          y={label.ly}
          textAnchor={label.anchor}
          dominantBaseline="middle"
          fill={isActive ? 'var(--terracotta)' : isPlanet ? 'var(--text)' : 'rgba(255,255,255,0.55)'}
          fontSize="9.5"
          fontFamily="var(--mono)"
          letterSpacing="0.06em"
        >
          {label.text}
        </text>
      )}
    </g>
  );
}

function renderBody(o: SkyObject, x: number, y: number, r: number) {
  if (o.type === 'planet' || o.type === 'sun' || o.type === 'moon') {
    const fill = PLANET_COLORS[o.id] ?? '#ffffff';
    // Soft halo so planets bloom slightly against the dome — same trick
    // SkyView uses to make Jupiter/Venus pop without overdrawing them.
    return (
      <>
        <circle cx={x} cy={y} r={r + 4} fill={fill} opacity={0.08} />
        <circle cx={x} cy={y} r={r + 2} fill={fill} opacity={0.16} />
        <circle cx={x} cy={y} r={r} fill={fill} />
      </>
    );
  }
  if (o.type === 'star' || o.type === 'double') {
    const c = STAR_TINT[o.id] ?? starColor(o.magnitude);
    const veryBright = o.magnitude <= 0.6;
    const bright = o.magnitude <= 1.5;
    const spike = r * (veryBright ? 4.2 : 2.6);
    return (
      <>
        {bright && <circle cx={x} cy={y} r={r + 4} fill={c} opacity={0.06} />}
        {bright && <circle cx={x} cy={y} r={r + 2} fill={c} opacity={0.18} />}
        <circle cx={x} cy={y} r={r} fill={c} />
        {veryBright && (
          <g stroke={c} strokeWidth={0.55} strokeLinecap="round" opacity={0.6} pointerEvents="none">
            <line x1={x - spike} y1={y} x2={x + spike} y2={y} />
            <line x1={x} y1={y - spike} x2={x} y2={y + spike} />
          </g>
        )}
        {o.type === 'double' && (
          <circle cx={x + r * 1.3} cy={y - r * 0.6} r={Math.max(1.1, r * 0.55)} fill={starColor(o.magnitude + 1)} />
        )}
      </>
    );
  }
  if (o.type === 'cluster') {
    const s = 2.6;
    return (
      <g fill="#f1e4b8" opacity={0.95}>
        <circle cx={x} cy={y - s} r={1.6} />
        <circle cx={x - s} cy={y + s * 0.6} r={1.6} />
        <circle cx={x + s} cy={y + s * 0.6} r={1.6} />
        <circle cx={x} cy={y} r={1.1} opacity={0.7} />
      </g>
    );
  }
  if (o.type === 'nebula') {
    return (
      <>
        <circle cx={x} cy={y} r={6.5} fill="url(#skymap-nebula)" />
        <circle cx={x} cy={y} r={1.4} fill="#f5d8d3" />
      </>
    );
  }
  if (o.type === 'galaxy') {
    return (
      <>
        <ellipse cx={x} cy={y} rx={7.2} ry={3.0} fill="url(#skymap-galaxy)" transform={`rotate(35 ${x} ${y})`} />
        <circle cx={x} cy={y} r={1.3} fill="#e6ecf8" />
      </>
    );
  }
  return <circle cx={x} cy={y} r={r} fill="#ffffff" />;
}

function Crosshair({ x, y, locked = false }: { x: number; y: number; locked?: boolean }) {
  const ringR = 11;
  const tickGap = 2.5;
  const tickLen = 6;
  return (
    <g pointerEvents="none" className={`sky-map__crosshair${locked ? ' is-locked' : ''}`}>
      <circle cx={x} cy={y} r={ringR} fill="none" strokeWidth={1.2} opacity={0.95} />
      <line x1={x} y1={y - ringR - tickGap} x2={x} y2={y - ringR - tickGap - tickLen} strokeWidth={1.2} />
      <line x1={x} y1={y + ringR + tickGap} x2={x} y2={y + ringR + tickGap + tickLen} strokeWidth={1.2} />
      <line x1={x - ringR - tickGap} y1={y} x2={x - ringR - tickGap - tickLen} y2={y} strokeWidth={1.2} />
      <line x1={x + ringR + tickGap} y1={y} x2={x + ringR + tickGap + tickLen} y2={y} strokeWidth={1.2} />
    </g>
  );
}

/** Three expanding rings emanating from the lock point. */
function LockRipples({ x, y }: { x: number; y: number }) {
  return (
    <g pointerEvents="none" className="sky-map__lock-ripples">
      <circle cx={x} cy={y} r={11} fill="none" stroke="#7ed4a8" strokeWidth={1.2} className="sky-map__lock-ring sky-map__lock-ring--1" />
      <circle cx={x} cy={y} r={11} fill="none" stroke="#7ed4a8" strokeWidth={1.0} className="sky-map__lock-ring sky-map__lock-ring--2" />
      <circle cx={x} cy={y} r={11} fill="none" stroke="#7ed4a8" strokeWidth={0.8} className="sky-map__lock-ring sky-map__lock-ring--3" />
    </g>
  );
}

/**
 * Hold-to-lock progress arc. Renders a thin terracotta arc around the
 * crosshair that fills as the user holds aim inside the lock cone.
 */
function HoldArc({ x, y, progress }: { x: number; y: number; progress: number }) {
  const r = 14;
  const pct = Math.max(0, Math.min(1, progress));
  const C = 2 * Math.PI * r;
  return (
    <g pointerEvents="none">
      <circle
        cx={x}
        cy={y}
        r={r}
        fill="none"
        stroke="var(--terracotta)"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeDasharray={`${C * pct} ${C}`}
        transform={`rotate(-90 ${x} ${y})`}
        opacity={0.9}
      />
    </g>
  );
}

/**
 * Soft line connecting the user's reticle to the active target. Length is
 * the screen distance; opacity fades as the user closes in so it gets out
 * of the way once the two markers visually merge. The dash pattern flows
 * via CSS so the user perceives motion toward the target.
 */
function AimGuide({
  from,
  to,
  proximity,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  proximity: number;
}) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 4) return null;
  const opacity = Math.max(0.12, Math.min(0.55, proximity / 60));
  return (
    <g pointerEvents="none" className="sky-map__aim-guide">
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke="var(--terracotta)"
        strokeWidth={1}
        strokeLinecap="round"
        strokeDasharray="2 4"
        opacity={opacity}
      />
    </g>
  );
}

function UserAimReticle({
  x,
  y,
  below,
  locked,
  scanning,
}: {
  x: number;
  y: number;
  below: boolean;
  locked: boolean;
  scanning: boolean;
}) {
  if (below) {
    return (
      <g pointerEvents="none" opacity={0.55}>
        <text
          x={CX}
          y={CY + R - 8}
          textAnchor="middle"
          fill="rgba(255,255,255,0.45)"
          fontSize="9"
          fontFamily="var(--mono)"
          letterSpacing="0.16em"
        >
          ↓ BELOW HORIZON
        </text>
      </g>
    );
  }
  const r = 5.5;
  const tickLen = 5;
  // Stroke + fill come from CSS so we can transition the color smoothly
  // when the lock state flips, instead of jumping. The animation is also
  // CSS-controlled — see .sky-map__user-aim styles.
  return (
    <g
      pointerEvents="none"
      transform={`translate(${x} ${y})`}
      className={`sky-map__user-aim${locked ? ' is-locked' : scanning ? ' is-scanning' : ''}`}
    >
      <g className="sky-map__user-aim-pulse">
        <circle cx={0} cy={0} r={r} fill="none" strokeWidth={1.2} />
        <circle cx={0} cy={0} r={1.4} />
        <line x1={0} y1={-r - 1} x2={0} y2={-r - 1 - tickLen} strokeWidth={1.2} />
        <line x1={0} y1={r + 1} x2={0} y2={r + 1 + tickLen} strokeWidth={1.2} />
        <line x1={-r - 1} y1={0} x2={-r - 1 - tickLen} y2={0} strokeWidth={1.2} />
        <line x1={r + 1} y1={0} x2={r + 1 + tickLen} y2={0} strokeWidth={1.2} />
      </g>
    </g>
  );
}

function CompassIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx={8} cy={8} r={6.5} fill="none" stroke="currentColor" strokeWidth={1.1} />
      <polygon points="8,3.5 9.5,8 8,7 6.5,8" fill="currentColor" />
      <polygon points="8,12.5 9.5,8 8,9 6.5,8" fill="currentColor" opacity={0.4} />
    </svg>
  );
}

interface CalibrationBannerProps {
  anchor: { id: string; name: string; azimuth: number; altitude: number };
  heading: number;
  userAlt: number;
  onLock: () => void;
  calibrationOffset: number;
}

/**
 * Self-narrating calibration prompt. Reads the user's current tilt and
 * azimuth, picks the next instruction (tilt → sweep → tap), and only
 * triggers the lock when the phone is roughly aimed at the anchor body.
 *
 * State machine:
 *   |Δalt| > 12°  → "Tilt up/down NN° to <name>"
 *   |Δaz|  > 25°  → "Sweep left/right NN° toward <name>"
 *   else          → "Aim at <name> · tap to calibrate" (button enabled)
 *
 * After the first lock, a quiet success pill shows the applied offset for
 * a few seconds, then the banner disappears so the chart is unobstructed.
 */
function CalibrationBanner({
  anchor,
  heading,
  userAlt,
  onLock,
  calibrationOffset,
}: CalibrationBannerProps) {
  const t = useTranslations('sky.skymap');
  const tiltDelta = anchor.altitude - userAlt;
  const azDelta = headingDelta(anchor.azimuth, heading);
  const [justLocked, setJustLocked] = useState(false);

  useEffect(() => {
    if (!justLocked) return;
    const id = window.setTimeout(() => setJustLocked(false), 2400);
    return () => window.clearTimeout(id);
  }, [justLocked]);

  // Hide the banner entirely if user has already calibrated and is now
  // off-aim — they don't need a second prompt cluttering the chart.
  if (calibrationOffset !== 0 && !justLocked && Math.abs(azDelta) > 30) return null;

  if (justLocked) {
    return (
      <div className="sky-map__cal-banner sky-map__cal-banner--locked" role="status">
        <span className="sky-map__cal-banner-icon" aria-hidden="true">✓</span>
        <span className="sky-map__cal-banner-text">
          {t('calLocked', { name: anchor.name, deg: Math.round(calibrationOffset) })}
        </span>
      </div>
    );
  }

  const tiltOff = Math.abs(tiltDelta) > 12;
  const azOff = Math.abs(azDelta) > 25;

  if (tiltOff) {
    const dir = tiltDelta > 0 ? '↑' : '↓';
    return (
      <div className="sky-map__cal-banner sky-map__cal-banner--guide" role="status">
        <span className="sky-map__cal-banner-icon" aria-hidden="true">{dir}</span>
        <span className="sky-map__cal-banner-text">
          {t('calTilt', {
            dir: tiltDelta > 0 ? t('up') : t('down'),
            deg: Math.abs(Math.round(tiltDelta)),
            name: anchor.name,
          })}
        </span>
      </div>
    );
  }
  if (azOff) {
    const dir = azDelta > 0 ? '→' : '←';
    return (
      <div className="sky-map__cal-banner sky-map__cal-banner--guide" role="status">
        <span className="sky-map__cal-banner-icon" aria-hidden="true">{dir}</span>
        <span className="sky-map__cal-banner-text">
          {t('calSweep', {
            dir: azDelta > 0 ? t('right') : t('left'),
            deg: Math.abs(Math.round(azDelta)),
            name: anchor.name,
          })}
        </span>
      </div>
    );
  }
  return (
    <button
      type="button"
      className="sky-map__cal-banner sky-map__cal-banner--ready"
      onClick={() => {
        onLock();
        setJustLocked(true);
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          try { navigator.vibrate([10, 30, 10]); } catch { /* ignore */ }
        }
      }}
      aria-label={t('calReady', { name: anchor.name })}
    >
      <span className="sky-map__cal-banner-icon" aria-hidden="true">⊕</span>
      <span className="sky-map__cal-banner-text">
        {t('calReady', { name: anchor.name })}
      </span>
    </button>
  );
}
