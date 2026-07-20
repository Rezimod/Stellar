'use client';

import { type CSSProperties, useId } from 'react';
import { PLANET_PALETTES as SOLAR_PALETTES, type PlanetPalette } from '@/lib/solar-system/planet-palettes';

type PlanetId =
  | 'sun'
  | 'moon'
  | 'mercury'
  | 'venus'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune';

export type CatalogObjectType =
  | 'planet'
  | 'star'
  | 'double'
  | 'cluster'
  | 'nebula'
  | 'galaxy'
  | 'moon'
  | 'sun';

export interface PlanetIconProps {
  /** Object id — for planets/sun/moon, the body name; for catalog targets, the catalog id. */
  id: string;
  /** Catalog type — required for non-planet targets so the icon picks the right glyph. */
  type?: CatalogObjectType;
  /** Apparent magnitude — used to size star glyphs. */
  magnitude?: number;
  size?: number;
  /** Moon phase 0–1, only used when id === 'moon'. */
  phase?: number | null;
  glow?: boolean;
}

const PLANET_IDS = new Set<PlanetId>(['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']);

const PLANET_PALETTES: Record<PlanetId, PlanetPalette> = {
  sun: SOLAR_PALETTES.sun,
  moon: { light: '#f8f4ec', mid: '#cbc4b6', dark: '#676259', rim: '#2d3036' },
  mercury: SOLAR_PALETTES.mercury,
  venus: SOLAR_PALETTES.venus,
  mars: SOLAR_PALETTES.mars,
  jupiter: SOLAR_PALETTES.jupiter,
  saturn: SOLAR_PALETTES.saturn,
  uranus: SOLAR_PALETTES.uranus,
  neptune: SOLAR_PALETTES.neptune,
};

const GLOW_FILTERS: Record<PlanetId, string> = {
  sun: 'drop-shadow(0 0 14px rgba(255,179,71,0.65)) drop-shadow(0 0 28px rgba(255,123,26,0.36))',
  moon: 'drop-shadow(0 0 8px rgba(244,237,224,0.34))',
  mercury: 'drop-shadow(0 0 7px rgba(232,222,200,0.24))',
  venus: 'drop-shadow(0 0 10px rgba(255,232,160,0.34))',
  mars: 'drop-shadow(0 0 10px rgba(255,123,84,0.30))',
  jupiter: 'drop-shadow(0 0 11px rgba(212,165,116,0.30))',
  saturn: 'drop-shadow(0 0 12px rgba(200,154,62,0.28))',
  uranus: 'drop-shadow(0 0 9px rgba(95,163,168,0.30))',
  neptune: 'drop-shadow(0 0 10px rgba(111,160,224,0.32))',
};

export function PlanetIcon({ id, type, magnitude, size = 88, phase = null, glow = true }: PlanetIconProps) {
  const wrap: CSSProperties = {
    position: 'relative',
    width: size,
    height: size,
    flexShrink: 0,
  };

  // Resolve renderer: planets/sun/moon by id; everything else by type.
  const isPlanet = PLANET_IDS.has(id as PlanetId);
  if (!isPlanet && type) {
    return (
      <div style={wrap}>
        <CatalogGlyph type={type} size={size} magnitude={magnitude} glow={glow} />
      </div>
    );
  }

  const planetId = id as PlanetId;
  return (
    <div style={{ ...wrap, filter: glow ? GLOW_FILTERS[planetId] : 'none' }}>
      <PlanetSvg planetId={planetId} size={size} phase={phase ?? 0.5} />
    </div>
  );
}

function safeId(raw: string): string {
  return raw.replace(/:/g, '');
}

function PlanetSvg({ planetId, size, phase }: { planetId: PlanetId; size: number; phase: number }) {
  const palette = PLANET_PALETTES[planetId];
  const uid = safeId(useId());
  const clipId = `${uid}-clip`;
  const sphereId = `${uid}-sphere`;
  const sheenId = `${uid}-sheen`;
  const atmosphereId = `${uid}-atmos`;
  const ringClipId = `${uid}-rings-front`;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <circle cx={50} cy={50} r={34} />
        </clipPath>
        <clipPath id={ringClipId}>
          <rect x={0} y={50} width={100} height={50} />
        </clipPath>
        <radialGradient id={sphereId} cx="34%" cy="28%" r="74%">
          <stop offset="0%" stopColor={palette.light} />
          <stop offset="56%" stopColor={palette.mid} />
          <stop offset="100%" stopColor={palette.dark} />
        </radialGradient>
        <radialGradient id={sheenId} cx="28%" cy="22%" r="62%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.52)" />
          <stop offset="35%" stopColor="rgba(255,255,255,0.16)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <radialGradient id={atmosphereId} cx="50%" cy="50%" r="62%">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="76%" stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.18)" />
        </radialGradient>
      </defs>

      {planetId === 'sun' && (
        <>
          <circle cx={50} cy={50} r={42} fill="rgba(255,179,71,0.16)" />
          <circle cx={50} cy={50} r={47} fill="rgba(255,179,71,0.06)" />
        </>
      )}

      {planetId === 'saturn' && <SaturnRingsSvg front={false} tone={palette.mid} shadow={palette.dark} />}

      <g clipPath={`url(#${clipId})`}>
        <circle cx={50} cy={50} r={34} fill={`url(#${sphereId})`} />
        <circle cx={50} cy={50} r={34} fill={`url(#${sheenId})`} />
        {planetId === 'moon' && <MoonSurface phase={phase} />}
        {planetId === 'mercury' && <MercurySurface />}
        {planetId === 'venus' && <VenusSurface />}
        {planetId === 'mars' && <MarsSurface />}
        {planetId === 'jupiter' && <JupiterSurface />}
        {planetId === 'saturn' && <SaturnSurface />}
        {planetId === 'uranus' && <IceGiantBands tone="#8dd5d8" opacity={0.28} />}
        {planetId === 'neptune' && <IceGiantBands tone="#a8caff" opacity={0.22} />}
        {planetId === 'sun' && <SunSurface />}
        <circle cx={50} cy={50} r={34} fill={`url(#${atmosphereId})`} />
      </g>

      <circle cx={50} cy={50} r={34} fill="none" stroke={palette.rim} strokeOpacity={0.24} />
      {planetId === 'saturn' && <SaturnRingsSvg front={true} tone={palette.light} shadow={palette.dark} clipId={ringClipId} />}
    </svg>
  );
}

function MoonSurface({ phase }: { phase: number }) {
  const p = ((phase % 1) + 1) % 1;
  if (p < 0.03 || p > 0.97) {
    return (
      <circle cx={50} cy={50} r={34} fill="rgba(7,11,20,0.92)" />
    );
  }
  const craters = [
    { x: 34, y: 36, r: 5.2, o: 0.18 },
    { x: 58, y: 30, r: 3.4, o: 0.14 },
    { x: 61, y: 54, r: 7.2, o: 0.16 },
    { x: 38, y: 60, r: 4.4, o: 0.12 },
  ];
  const waxing = p < 0.5;
  const k = waxing ? p / 0.5 : (1 - p) / 0.5; // 0..1, where 1 = full
  const shift = k * 68;

  return (
    <>
      {craters.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r={c.r} fill={`rgba(90,88,86,${c.o})`} />
          <circle cx={c.x - 0.8} cy={c.y - 0.8} r={c.r * 0.66} fill="rgba(255,255,255,0.10)" />
        </g>
      ))}
      {!(p > 0.47 && p < 0.53) && (
        <circle
          cx={waxing ? 50 - shift : 50 + shift}
          cy={50}
          r={34}
          fill="rgba(7,11,20,0.82)"
        />
      )}
    </>
  );
}

function MercurySurface() {
  return (
    <>
      {[32, 44, 57, 66].map((y, i) => (
        <circle key={i} cx={26 + i * 11} cy={y} r={i % 2 === 0 ? 4.4 : 3.1} fill="rgba(72,68,62,0.22)" />
      ))}
    </>
  );
}

function VenusSurface() {
  return (
    <g opacity={0.28} fill="#f3dfad">
      <path d="M18 38c16-4 34-3 50 2l8 4v6c-18-7-38-8-58-3l-4 2v-7l4-4Z" />
      <path d="M24 58c14-3 30-2 44 2l8 3v5c-16-5-34-6-50-2l-4 2v-5l2-5Z" />
    </g>
  );
}

function MarsSurface() {
  return (
    <g>
      <path d="M31 34c8-6 17-6 25-2 4 2 8 2 11 0 2 6-1 13-8 17-6 4-13 5-20 2-5-2-8-8-8-17Z" fill="rgba(93,38,20,0.28)" />
      <path d="M39 58c5-3 11-3 16 0 4 3 8 3 12 1 0 6-4 10-10 12-7 2-16 1-21-4-2-2-1-7 3-9Z" fill="rgba(64,24,13,0.24)" />
      <ellipse cx={59} cy={28} rx={7} ry={4} fill="rgba(255,216,192,0.12)" />
    </g>
  );
}

function JupiterSurface() {
  const bands = [
    { y: 24, h: 8, fill: 'rgba(150,94,46,0.26)' },
    { y: 37, h: 10, fill: 'rgba(122,69,30,0.18)' },
    { y: 51, h: 7, fill: 'rgba(151,106,73,0.24)' },
    { y: 63, h: 6, fill: 'rgba(96,62,32,0.18)' },
  ];
  return (
    <g>
      {bands.map((band, i) => (
        <rect key={i} x={16} y={band.y} width={68} height={band.h} rx={band.h / 2} fill={band.fill} />
      ))}
      <ellipse cx={62} cy={55} rx={9} ry={5.5} fill="rgba(194,120,80,0.36)" />
      <ellipse cx={62} cy={55} rx={5.5} ry={2.8} fill="rgba(238,196,164,0.22)" />
    </g>
  );
}

function SaturnSurface() {
  return (
    <g opacity={0.3}>
      <rect x={20} y={31} width={60} height={8} rx={4} fill="rgba(121,86,31,0.18)" />
      <rect x={18} y={48} width={64} height={7} rx={3.5} fill="rgba(121,86,31,0.22)" />
      <rect x={24} y={61} width={54} height={5} rx={2.5} fill="rgba(121,86,31,0.16)" />
    </g>
  );
}

function IceGiantBands({ tone, opacity }: { tone: string; opacity: number }) {
  return (
    <g fill={tone} opacity={opacity}>
      <rect x={20} y={34} width={60} height={4} rx={2} />
      <rect x={16} y={50} width={68} height={5} rx={2.5} />
      <rect x={24} y={63} width={52} height={4} rx={2} />
    </g>
  );
}

function SunSurface() {
  return (
    <g opacity={0.34}>
      <circle cx={50} cy={50} r={24} fill="rgba(255,248,204,0.18)" />
      <path d="M28 36c8-7 17-9 26-7 5 1 10 0 14-3 1 8-3 15-10 19-8 4-18 4-26 0-5-2-7-5-4-9Z" fill="rgba(255,235,145,0.28)" />
      <path d="M30 58c9-4 19-5 29-3 4 1 8 0 12-2 0 7-5 12-12 15-10 4-21 3-28-3-2-2-2-5-1-7Z" fill="rgba(255,196,89,0.20)" />
    </g>
  );
}

function SaturnRingsSvg({
  front,
  tone,
  shadow,
  clipId,
}: {
  front: boolean;
  tone: string;
  shadow: string;
  clipId?: string;
}) {
  const ring = (
    <g transform="rotate(-14 50 50)">
      <ellipse cx={50} cy={50} rx={43} ry={15} fill="none" stroke={tone} strokeWidth={6} strokeOpacity={front ? 0.7 : 0.34} />
      <ellipse cx={50} cy={50} rx={35} ry={10.5} fill="none" stroke={shadow} strokeWidth={1.4} strokeOpacity={front ? 0.22 : 0.14} />
    </g>
  );
  if (front && clipId) {
    return <g clipPath={`url(#${clipId})`}>{ring}</g>;
  }
  return <g>{ring}</g>;
}

function CatalogGlyph({
  type,
  size,
  magnitude = 1,
  glow = true,
}: {
  type: CatalogObjectType;
  size: number;
  magnitude?: number;
  glow?: boolean;
}) {
  const uid = safeId(useId());
  if (type === 'star' || type === 'double') {
    // Mag-to-radius: brighter star reads larger.
    const m = Math.max(-2, Math.min(4, magnitude));
    const core = size * (0.13 - ((m + 2) / 6) * 0.05); // ~size * 0.13 → 0.08
    const halo = size * 0.42;
    // Theme-aware tints: identical at night (ink = white), readable on the
    // light chip in day mode (ink = near-black, darkened teal/amber).
    const tint =
      m <= -1 ? 'var(--teal-text, #5EEAD4)'
      : m <= 0 ? 'rgba(var(--ink), 0.95)'
      : m <= 1 ? 'var(--accent-text, #FFB347)'
      : 'rgba(var(--ink), 0.75)';
    const haloShadow = glow
      ? `0 0 ${size * 0.18}px rgba(255,250,235,0.45), 0 0 ${size * 0.34}px rgba(180,205,255,0.18)`
      : 'none';
    return (
      <div
        aria-hidden="true"
        style={{
          width: size,
          height: size,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: `radial-gradient(circle at 50% 50%, ${tint} 0%, rgba(244,237,224,0.16) ${(halo / size) * 50}%, rgba(0,0,0,0) 70%)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: core,
            height: core,
            marginTop: -core / 2,
            marginLeft: -core / 2,
            borderRadius: '50%',
            background: tint,
            boxShadow: haloShadow,
          }}
        />
        {type === 'double' && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: core * 0.55,
              height: core * 0.55,
              marginTop: -core * 0.275 - core * 0.85,
              marginLeft: core * 0.55,
              borderRadius: '50%',
              background: 'var(--teal-text, #5EEAD4)',
              opacity: 0.85,
            }}
          />
        )}
      </div>
    );
  }
  if (type === 'galaxy') {
    const coreId = `${uid}-galaxy-core`;
    const armsId = `${uid}-galaxy-arms`;
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <radialGradient id={coreId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f4eef8" />
            <stop offset="40%" stopColor="rgba(220,210,240,0.7)" />
            <stop offset="100%" stopColor="rgba(170,180,220,0)" />
          </radialGradient>
          <radialGradient id={armsId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(216,224,248,0.85)" />
            <stop offset="55%" stopColor="rgba(150,170,210,0.40)" />
            <stop offset="100%" stopColor="rgba(110,130,170,0)" />
          </radialGradient>
        </defs>
        <g transform="rotate(-28 50 50)">
          <ellipse cx={50} cy={50} rx={46} ry={16} fill={`url(#${armsId})`} />
          <ellipse cx={50} cy={50} rx={28} ry={9} fill={`url(#${armsId})`} opacity={0.8} />
          <circle cx={50} cy={50} r={12} fill={`url(#${coreId})`} />
          <circle cx={50} cy={50} r={3.5} style={{ fill: 'rgba(var(--ink), 0.92)' }} />
        </g>
      </svg>
    );
  }
  if (type === 'nebula') {
    const nebulaId = `${uid}-nebula`;
    const nebulaBlueId = `${uid}-nebula-blue`;
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <radialGradient id={nebulaId} cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="rgba(255,205,200,0.95)" />
            <stop offset="35%" stopColor="rgba(232,164,158,0.55)" />
            <stop offset="80%" stopColor="rgba(150,90,120,0.18)" />
            <stop offset="100%" stopColor="rgba(80,40,80,0)" />
          </radialGradient>
          <radialGradient id={nebulaBlueId} cx="60%" cy="40%" r="40%">
            <stop offset="0%" stopColor="rgba(180,205,255,0.55)" />
            <stop offset="100%" stopColor="rgba(80,100,160,0)" />
          </radialGradient>
        </defs>
        <circle cx={50} cy={50} r={48} fill={`url(#${nebulaId})`} />
        <circle cx={58} cy={42} r={28} fill={`url(#${nebulaBlueId})`} />
        <g fill="#fff8f0">
          <circle cx={50} cy={50} r={1.6} />
          <circle cx={42} cy={45} r={1.0} opacity={0.85} />
          <circle cx={56} cy={56} r={1.0} opacity={0.85} />
          <circle cx={62} cy={47} r={0.8} opacity={0.7} />
        </g>
      </svg>
    );
  }
  if (type === 'cluster') {
    const clusterId = `${uid}-cluster-bg`;
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <radialGradient id={clusterId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(241,228,184,0.30)" />
            <stop offset="100%" stopColor="rgba(241,228,184,0)" />
          </radialGradient>
        </defs>
        <circle cx={50} cy={50} r={42} fill={`url(#${clusterId})`} />
        {/* Deterministic-ish star pattern */}
        {[
          [50,30,2.4],[40,40,1.6],[60,42,1.8],[35,55,1.4],[65,55,1.6],[50,55,2.0],
          [45,48,1.2],[55,38,1.2],[50,68,1.6],[42,65,1.2],[58,65,1.2],[48,42,1.0],
          [62,50,1.0],[38,48,1.0],[55,72,1.0],[44,72,0.9],
        ].map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} style={{ fill: 'rgba(var(--ink), 0.92)' }} />
        ))}
      </svg>
    );
  }
  return null;
}
