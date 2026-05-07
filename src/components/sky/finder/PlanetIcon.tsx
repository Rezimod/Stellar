'use client';

import type { CSSProperties } from 'react';

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

const GRADIENTS: Record<PlanetId, string> = {
  sun:     'radial-gradient(circle at 40% 40%, #fffbe1 0%, #FFB347 50%, #ff7b1a 90%)',
  moon:    'radial-gradient(circle at 40% 40%, #F8F4EC 0%, #c8c2b5 60%, #6a665e 95%)',
  mercury: 'radial-gradient(circle at 35% 35%, #e2dccd 0%, #a89e88 55%, #58523f 95%)',
  venus:   'radial-gradient(circle at 35% 35%, #fff5d6 0%, #e7cd84 50%, #8a6b2a 95%)',
  mars:    'radial-gradient(circle at 35% 35%, #ff7b54 0%, #c2451f 60%, #5a1d08 95%)',
  jupiter: 'radial-gradient(circle at 35% 35%, #fbe9b7 0%, #d4a574 30%, #8b5a2b 65%, #3a1f0c 95%)',
  saturn:  'radial-gradient(circle at 35% 35%, #f0dc9a 0%, #c89a3e 55%, #6b5020 95%)',
  uranus:  'radial-gradient(circle at 35% 35%, #b9e8e2 0%, #5fa3a8 55%, #214550 95%)',
  neptune: 'radial-gradient(circle at 35% 35%, #6fa0e0 0%, #2d5a9c 55%, #142a52 95%)',
};

const GLOW: Record<PlanetId, string> = {
  sun:     '0 0 32px rgba(255,179,71,0.55), 0 0 64px rgba(255,123,26,0.35)',
  moon:    '0 0 24px rgba(244,237,224,0.30)',
  mercury: '0 0 18px rgba(232,222,200,0.20)',
  venus:   '0 0 26px rgba(255,232,160,0.30)',
  mars:    '0 0 22px rgba(255,123,84,0.30)',
  jupiter: '0 0 28px rgba(212,165,116,0.32)',
  saturn:  '0 0 24px rgba(200,154,62,0.30)',
  uranus:  '0 0 22px rgba(95,163,168,0.28)',
  neptune: '0 0 22px rgba(111,160,224,0.30)',
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
  const sphere: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    background: GRADIENTS[planetId],
    boxShadow: glow ? GLOW[planetId] : 'none',
    position: 'relative',
    overflow: 'hidden',
  };

  if (planetId === 'moon') {
    return (
      <div style={wrap}>
        <div style={sphere}>
          <MoonShadow phase={phase ?? 0.5} size={size} />
        </div>
      </div>
    );
  }

  if (planetId === 'jupiter') {
    return (
      <div style={wrap}>
        <div style={sphere}>
          <JupiterBands size={size} />
        </div>
      </div>
    );
  }

  if (planetId === 'saturn') {
    return (
      <div style={wrap}>
        <div style={sphere}>
          <JupiterBands size={size} dim />
        </div>
        <SaturnRings size={size} />
      </div>
    );
  }

  return (
    <div style={wrap}>
      <div style={sphere} />
    </div>
  );
}

function MoonShadow({ phase, size }: { phase: number; size: number }) {
  // phase: 0=new, 0.25=first quarter, 0.5=full, 0.75=last quarter
  // Cover the un-illuminated portion with a dark overlay positioned by phase.
  // Render a circle the same size, offset so its overlap matches the dark side.
  const p = ((phase % 1) + 1) % 1;
  if (p < 0.03 || p > 0.97) {
    // new moon — almost entirely dark
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(7,11,20,0.92)',
        }}
      />
    );
  }
  if (p > 0.47 && p < 0.53) return null; // full

  // Waxing (0..0.5): dark side on the LEFT, shrinks toward 0.5
  // Waning (0.5..1): dark side on the RIGHT, grows toward 1
  const waxing = p < 0.5;
  const k = waxing ? p / 0.5 : (1 - p) / 0.5; // 0..1, where 1 = full
  // offset: how far the shadow disc is shifted off the moon disc
  // at k=0 (new) -> shadow exactly covers; at k=1 (full) -> shadow fully off
  const offset = k * size;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        [waxing ? 'left' : 'right']: -offset,
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'rgba(7,11,20,0.85)',
      }}
    />
  );
}

function JupiterBands({ size, dim }: { size: number; dim?: boolean }) {
  const bands = [
    { y: 28, h: 6, op: dim ? 0.18 : 0.32 },
    { y: 44, h: 8, op: dim ? 0.14 : 0.26 },
    { y: 60, h: 5, op: dim ? 0.16 : 0.28 },
    { y: 72, h: 4, op: dim ? 0.10 : 0.20 },
  ];
  return (
    <>
      {bands.map((b, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${(b.y / 100) * size}px`,
            height: `${(b.h / 100) * size}px`,
            background: `rgba(80,45,20,${b.op})`,
            mixBlendMode: 'multiply',
          }}
        />
      ))}
    </>
  );
}

/**
 * Hero glyph for catalog targets (stars, doubles, clusters, nebulae, galaxies).
 * Aims for the same visual weight as PlanetIcon's planet sphere — sized for
 * the DirectionHero card.
 */
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
  if (type === 'star' || type === 'double') {
    // Mag-to-radius: brighter star reads larger.
    const m = Math.max(-2, Math.min(4, magnitude));
    const core = size * (0.13 - ((m + 2) / 6) * 0.05); // ~size * 0.13 → 0.08
    const halo = size * 0.42;
    const tint = m <= -1 ? '#5EEAD4' : m <= 0 ? '#F8F4EC' : m <= 1 ? '#FFB347' : '#e8d8b6';
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
              background: '#5EEAD4',
              opacity: 0.85,
            }}
          />
        )}
      </div>
    );
  }
  if (type === 'galaxy') {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <radialGradient id="cg-galaxy-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f4eef8" />
            <stop offset="40%" stopColor="rgba(220,210,240,0.7)" />
            <stop offset="100%" stopColor="rgba(170,180,220,0)" />
          </radialGradient>
          <radialGradient id="cg-galaxy-arms" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(216,224,248,0.85)" />
            <stop offset="55%" stopColor="rgba(150,170,210,0.40)" />
            <stop offset="100%" stopColor="rgba(110,130,170,0)" />
          </radialGradient>
        </defs>
        <g transform="rotate(-28 50 50)">
          <ellipse cx={50} cy={50} rx={46} ry={16} fill="url(#cg-galaxy-arms)" />
          <ellipse cx={50} cy={50} rx={28} ry={9} fill="url(#cg-galaxy-arms)" opacity={0.8} />
          <circle cx={50} cy={50} r={12} fill="url(#cg-galaxy-core)" />
          <circle cx={50} cy={50} r={3.5} fill="#fdf8ff" />
        </g>
      </svg>
    );
  }
  if (type === 'nebula') {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <radialGradient id="cg-nebula" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="rgba(255,205,200,0.95)" />
            <stop offset="35%" stopColor="rgba(232,164,158,0.55)" />
            <stop offset="80%" stopColor="rgba(150,90,120,0.18)" />
            <stop offset="100%" stopColor="rgba(80,40,80,0)" />
          </radialGradient>
          <radialGradient id="cg-nebula-blue" cx="60%" cy="40%" r="40%">
            <stop offset="0%" stopColor="rgba(180,205,255,0.55)" />
            <stop offset="100%" stopColor="rgba(80,100,160,0)" />
          </radialGradient>
        </defs>
        <circle cx={50} cy={50} r={48} fill="url(#cg-nebula)" />
        <circle cx={58} cy={42} r={28} fill="url(#cg-nebula-blue)" />
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
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <radialGradient id="cg-cluster-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(241,228,184,0.30)" />
            <stop offset="100%" stopColor="rgba(241,228,184,0)" />
          </radialGradient>
        </defs>
        <circle cx={50} cy={50} r={42} fill="url(#cg-cluster-bg)" />
        {/* Deterministic-ish star pattern */}
        {[
          [50,30,2.4],[40,40,1.6],[60,42,1.8],[35,55,1.4],[65,55,1.6],[50,55,2.0],
          [45,48,1.2],[55,38,1.2],[50,68,1.6],[42,65,1.2],[58,65,1.2],[48,42,1.0],
          [62,50,1.0],[38,48,1.0],[55,72,1.0],[44,72,0.9],
        ].map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="#fff7d8" />
        ))}
      </svg>
    );
  }
  return null;
}

function SaturnRings({ size }: { size: number }) {
  const ringW = size * 1.55;
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: ringW,
        height: ringW,
        marginTop: -ringW / 2,
        marginLeft: -ringW / 2,
        borderRadius: '50%',
        border: '1.5px solid rgba(200,154,62,0.85)',
        transform: 'rotate(-14deg) scaleY(0.18)',
        boxShadow: '0 0 8px rgba(200,154,62,0.25)',
        pointerEvents: 'none',
      }}
    />
  );
}
