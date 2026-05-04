'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { headingDelta, type HeadingStatus } from '@/lib/sky/use-device-heading';
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

const SIZE = 360;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 152;
const ON_TARGET_DEG = 8;

interface SkyMapProps {
  objects: SkyObject[];
  activeId: ObjectId | null;
  onSelect: (id: ObjectId) => void;
  /** Optional live device compass heading. When provided, the dome rotates so the user's facing direction is at top. */
  heading?: number | null;
  /** Permission/availability state for the heading source. */
  headingStatus?: HeadingStatus;
  /** Triggered when the user taps the calibrate compass control. */
  onCalibrate?: () => void;
}

interface Plotted {
  obj: SkyObject;
  x: number;
  y: number;
}

function project(alt: number, az: number, headingOffset: number): { x: number; y: number } {
  const altC = Math.max(0, Math.min(90, alt));
  const dist = (1 - altC / 90) * R;
  // Subtracting the heading offset rotates the chart so the user's facing
  // azimuth sits at the top of the dome.
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
  headingStatus = 'idle',
  onCalibrate,
}: SkyMapProps) {
  const t = useTranslations('sky.skymap');
  const liveOffset = heading ?? 0;
  const isLive = heading != null;

  const plotted = useMemo<Plotted[]>(() => {
    return objects
      .filter((o) => o.visible)
      .map((o) => {
        const p = project(o.altitude, o.azimuth, liveOffset);
        return { obj: o, x: p.x, y: p.y };
      });
  }, [objects, liveOffset]);

  // Render order: faintest first, brightest above, active body last.
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

  // Aim arrow geometry: signed delta from current heading to target azimuth.
  const aim = useMemo(() => {
    if (!isLive || !active) return null;
    const delta = headingDelta(active.obj.azimuth, heading ?? 0);
    const onTarget = Math.abs(delta) <= ON_TARGET_DEG;
    return { delta, onTarget };
  }, [isLive, active, heading]);

  // Cardinal letters need to STAY at compass-correct positions, so we draw
  // them in the rotating frame at their true azimuths (0/90/180/270).
  const cardinals: { dir: string; az: number }[] = [
    { dir: 'N', az: 0 },
    { dir: 'E', az: 90 },
    { dir: 'S', az: 180 },
    { dir: 'W', az: 270 },
  ];

  return (
    <div className="sky-map">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className={`sky-map__svg${isLive ? ' is-live' : ''}`}
        role="img"
        aria-label="Sky map showing visible bodies"
      >
        <defs>
          <radialGradient id="skymap-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0d1a3d" />
            <stop offset="100%" stopColor="#040814" />
          </radialGradient>
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

        <circle cx={CX} cy={CY} r={R} fill="url(#skymap-bg)" />

        <circle cx={CX} cy={CY} r={R * (1 / 3)} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
        <circle cx={CX} cy={CY} r={R * (2 / 3)} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />

        {/* Cardinal grid (un-rotated visual reference) */}
        <line x1={CX} y1={CY - R} x2={CX} y2={CY + R} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
        <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />

        <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth={1} />

        {/* Live heading marker — small terracotta tick at the top of the rim,
            indicating "this is where the user is facing." Drawn only when live. */}
        {isLive && <FacingTick />}

        <circle cx={CX} cy={CY} r={1.5} fill="rgba(255,255,255,0.4)" />

        <text x={CX + 4} y={CY - R * (1 / 3) + 3} fill="rgba(255,255,255,0.30)" fontSize="8"
          fontFamily="var(--mono)" letterSpacing="0.05em">60°</text>
        <text x={CX + 4} y={CY - R * (2 / 3) + 3} fill="rgba(255,255,255,0.30)" fontSize="8"
          fontFamily="var(--mono)" letterSpacing="0.05em">30°</text>

        {/* Cardinals — positioned at their true azimuths after rotation. */}
        {cardinals.map((c) => {
          const angleRad = ((c.az - liveOffset) * Math.PI) / 180;
          const lx = CX + (R + 14) * Math.sin(angleRad);
          const ly = CY - (R + 14) * Math.cos(angleRad);
          return (
            <text
              key={c.dir}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--text)"
              fontSize="13"
              fontFamily="var(--mono)"
              letterSpacing="0.16em"
            >
              {c.dir}
            </text>
          );
        })}

        {/* Aim arrow: outside the rim, points to the active target's screen
            position when live. Pulses while off-target, locks when on-target. */}
        {aim && active && (
          <AimArrow x={active.x} y={active.y} onTarget={aim.onTarget} />
        )}

        {/* Bodies */}
        {drawOrder.map((p) => {
          const isActive = p.obj.id === activeId;
          return (
            <ObjectGlyph
              key={p.obj.id}
              p={p}
              isActive={isActive}
              onSelect={onSelect}
            />
          );
        })}

        {/* Active crosshair last */}
        {active && <Crosshair x={active.x} y={active.y} />}
      </svg>

      {/* === Compass control overlay === */}
      <div className="sky-map__hud">
        {isLive ? (
          <span className={`sky-map__facing${aim?.onTarget ? ' is-locked' : ''}`}>
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
        {aim && (
          <span className={`sky-map__aim-pill${aim.onTarget ? ' is-locked' : ''}`}>
            {aim.onTarget
              ? t('onTarget')
              : t(aim.delta > 0 ? 'turnRight' : 'turnLeft', { deg: Math.abs(Math.round(aim.delta)) })}
          </span>
        )}
      </div>
    </div>
  );
}

interface GlyphProps {
  p: Plotted;
  isActive: boolean;
  onSelect: (id: ObjectId) => void;
}

function ObjectGlyph({ p, isActive, onSelect }: GlyphProps) {
  const { obj, x, y } = p;
  const dx = x - CX;
  const dy = y - CY;
  const norm = Math.hypot(dx, dy) || 1;

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

  const labelOffset = (isPlanet ? radius : 6) + 11;
  const lx = x + (dx / norm) * labelOffset;
  const ly = y + (dy / norm) * labelOffset;
  const anchor = lx < CX - 24 ? 'end' : lx > CX + 24 ? 'start' : 'middle';

  const showLabel =
    isActive ||
    isPlanet ||
    (obj.type !== 'star' && obj.type !== 'double') ||
    obj.magnitude <= 1.5;

  return (
    <g
      onClick={() => onSelect(obj.id)}
      style={{ cursor: 'pointer' }}
      role="button"
      aria-label={obj.name}
    >
      {renderBody(obj, x, y, radius)}
      {showLabel && (
        <text
          x={lx}
          y={ly}
          textAnchor={anchor}
          dominantBaseline="middle"
          fill={isActive ? 'var(--terracotta)' : isPlanet ? 'var(--text)' : 'rgba(255,255,255,0.55)'}
          fontSize="9.5"
          fontFamily="var(--mono)"
          letterSpacing="0.10em"
        >
          {obj.name.toUpperCase()}
        </text>
      )}
    </g>
  );
}

function renderBody(o: SkyObject, x: number, y: number, r: number) {
  if (o.type === 'planet' || o.type === 'sun' || o.type === 'moon') {
    return <circle cx={x} cy={y} r={r} fill={PLANET_COLORS[o.id] ?? '#ffffff'} />;
  }
  if (o.type === 'star' || o.type === 'double') {
    return (
      <>
        {o.magnitude <= 0.6 && (
          <circle cx={x} cy={y} r={r + 1.6} fill={starColor(o.magnitude)} opacity={0.18} />
        )}
        <circle cx={x} cy={y} r={r} fill={starColor(o.magnitude)} />
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

function Crosshair({ x, y }: { x: number; y: number }) {
  const ringR = 11;
  const tickGap = 2.5;
  const tickLen = 6;
  return (
    <g pointerEvents="none">
      <circle cx={x} cy={y} r={ringR} fill="none" stroke="var(--terracotta)" strokeWidth={1.1} opacity={0.95} />
      <line x1={x} y1={y - ringR - tickGap} x2={x} y2={y - ringR - tickGap - tickLen}
        stroke="var(--terracotta)" strokeWidth={1.1} />
      <line x1={x} y1={y + ringR + tickGap} x2={x} y2={y + ringR + tickGap + tickLen}
        stroke="var(--terracotta)" strokeWidth={1.1} />
      <line x1={x - ringR - tickGap} y1={y} x2={x - ringR - tickGap - tickLen} y2={y}
        stroke="var(--terracotta)" strokeWidth={1.1} />
      <line x1={x + ringR + tickGap} y1={y} x2={x + ringR + tickGap + tickLen} y2={y}
        stroke="var(--terracotta)" strokeWidth={1.1} />
    </g>
  );
}

/** Fixed terracotta tick at the top of the rim — "you are facing this way." */
function FacingTick() {
  return (
    <g pointerEvents="none">
      <line
        x1={CX}
        y1={CY - R - 6}
        x2={CX}
        y2={CY - R + 6}
        stroke="var(--terracotta)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <circle cx={CX} cy={CY - R} r={2.4} fill="var(--terracotta)" />
    </g>
  );
}

/**
 * Aim arrow — sits just outside the rim of the dome, pointing inward at the
 * target's screen position. The target is already projected in the rotating
 * frame, so we use its screen (x, y) directly to derive the rim point.
 */
function AimArrow({ x, y, onTarget }: { x: number; y: number; onTarget: boolean }) {
  const dx = x - CX;
  const dy = y - CY;
  const len = Math.hypot(dx, dy) || 1;
  // Rim point along the radial line through the target.
  const ux = dx / len;
  const uy = dy / len;
  const rimX = CX + (R + 16) * ux;
  const rimY = CY + (R + 16) * uy;
  // Triangle pointing inward at the target.
  const tipX = CX + (R + 6) * ux;
  const tipY = CY + (R + 6) * uy;
  // Two base corners perpendicular to the radial.
  const px = -uy;
  const py = ux;
  const baseHalf = 6;
  const bx1 = rimX + px * baseHalf;
  const by1 = rimY + py * baseHalf;
  const bx2 = rimX - px * baseHalf;
  const by2 = rimY - py * baseHalf;

  return (
    <g
      pointerEvents="none"
      className={`sky-map__aim${onTarget ? ' is-locked' : ' is-pulsing'}`}
    >
      <polygon
        points={`${tipX},${tipY} ${bx1},${by1} ${bx2},${by2}`}
        fill="var(--terracotta)"
        opacity={onTarget ? 1 : 0.85}
      />
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
