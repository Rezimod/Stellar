'use client';

/**
 * Per-mission animated artwork for the Discovery-Sealed seal.
 * Mirrors the homepage orrery technique: a circular clip-path with two side-by-side
 * tiled texture images that translateX in a loop, giving the body a real-looking spin.
 *
 * Planets/Moon use NASA-style equirectangular textures already shipped in /public.
 * Deep-sky targets use slow parallax + twinkle on a real DSO image.
 */

import { useId } from 'react';

type MissionKind =
  | { kind: 'sphere'; texture: string; spin: number; rings?: boolean; tilt?: number; retrograde?: boolean }
  | { kind: 'dso'; image: string; tone: string };

const ART: Record<string, MissionKind> = {
  moon:           { kind: 'sphere', texture: '/images/planets/moon.jpg',     spin: 90 },
  jupiter:        { kind: 'sphere', texture: '/hero/planets/jupiter.jpg',    spin: 6 },
  'quick-jupiter':{ kind: 'sphere', texture: '/hero/planets/jupiter.jpg',    spin: 6 },
  saturn:         { kind: 'sphere', texture: '/hero/planets/saturn.jpg',     spin: 7,  rings: true, tilt: -22 },
  'quick-saturn': { kind: 'sphere', texture: '/hero/planets/saturn.jpg',     spin: 7,  rings: true, tilt: -22 },
  mars:           { kind: 'sphere', texture: '/hero/planets/mars.jpg',       spin: 14 },
  mercury:        { kind: 'sphere', texture: '/hero/planets/mercury.jpg',    spin: 28 },
  venus:          { kind: 'sphere', texture: '/hero/planets/venus.jpg',      spin: 40, retrograde: true },
  pleiades:       { kind: 'dso',    image: '/images/dso/m45.jpg', tone: 'rgba(160,200,255,0.5)' },
  orion:          { kind: 'dso',    image: '/images/dso/m42.jpg', tone: 'rgba(255,140,140,0.45)' },
  andromeda:      { kind: 'dso',    image: '/images/dso/m31.jpg', tone: 'rgba(255,210,170,0.4)' },
  crab:           { kind: 'dso',    image: '/images/dso/m1.jpg',  tone: 'rgba(255,180,200,0.5)' },
};

export default function MissionRotateArt({
  missionId,
  size = 96,
}: {
  missionId: string;
  size?: number;
}) {
  const art = ART[missionId];
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  if (!art) return <FallbackOrb size={size} uid={uid} />;
  if (art.kind === 'dso') return <DsoArt size={size} image={art.image} tone={art.tone} uid={uid} />;
  return <SphereArt size={size} art={art} uid={uid} />;
}

function SphereArt({
  size,
  art,
  uid,
}: {
  size: number;
  art: Extract<MissionKind, { kind: 'sphere' }>;
  uid: string;
}) {
  const r = size / 2;
  const W = 4 * r;
  const H = 2 * r;
  const cx = r;
  const cy = r;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <style>{`
        @keyframes mra-spin-${uid}     { from { transform: translateX(0); }              to { transform: translateX(-${W}px); } }
        @keyframes mra-spin-rev-${uid} { from { transform: translateX(-${W}px); }       to { transform: translateX(0); } }
        .mra-spin-${uid}     { animation: mra-spin-${uid}     ${art.spin}s linear infinite; }
        .mra-spin-rev-${uid} { animation: mra-spin-rev-${uid} ${art.spin}s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .mra-spin-${uid}, .mra-spin-rev-${uid} { animation: none !important; }
        }
      `}</style>
      <defs>
        <clipPath id={`mra-clip-${uid}`} clipPathUnits="userSpaceOnUse">
          <circle cx={cx} cy={cy} r={r - 1} />
        </clipPath>
        <radialGradient id={`mra-limb-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="86%" stopColor="#000" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.78" />
        </radialGradient>
        <radialGradient id={`mra-spec-${uid}`} cx="32%" cy="28%" r="42%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`mra-ring-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"  stopColor="#8A6D45" stopOpacity="0" />
          <stop offset="20%" stopColor="#D9B886" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#F2DDB0" stopOpacity="1" />
          <stop offset="80%" stopColor="#D9B886" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#8A6D45" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`mra-ring-back-${uid}`} clipPathUnits="userSpaceOnUse">
          <rect x={cx - r} y={cy - r} width={2 * r} height={r} />
        </clipPath>
        <clipPath id={`mra-ring-front-${uid}`} clipPathUnits="userSpaceOnUse">
          <rect x={cx - r} y={cy} width={2 * r} height={r} />
        </clipPath>
      </defs>

      {art.rings && (
        <g transform={`rotate(${art.tilt ?? -22} ${cx} ${cy})`} clipPath={`url(#mra-ring-back-${uid})`} opacity="0.85">
          <ellipse cx={cx} cy={cy} rx={r * 1.45} ry={r * 0.38} stroke={`url(#mra-ring-${uid})`} strokeWidth={r * 0.18} fill="none" />
        </g>
      )}

      <g clipPath={`url(#mra-clip-${uid})`}>
        <g className={art.retrograde ? `mra-spin-rev-${uid}` : `mra-spin-${uid}`}>
          <image
            href={art.texture}
            x={0}
            y={cy - r}
            width={W}
            height={H}
            preserveAspectRatio="none"
          />
          <image
            href={art.texture}
            x={W}
            y={cy - r}
            width={W}
            height={H}
            preserveAspectRatio="none"
          />
        </g>
      </g>

      <circle cx={cx} cy={cy} r={r - 1} fill={`url(#mra-spec-${uid})`} />
      <circle cx={cx} cy={cy} r={r - 1} fill={`url(#mra-limb-${uid})`} />

      {art.rings && (
        <g transform={`rotate(${art.tilt ?? -22} ${cx} ${cy})`} clipPath={`url(#mra-ring-front-${uid})`}>
          <ellipse cx={cx} cy={cy} rx={r * 1.45} ry={r * 0.38} stroke={`url(#mra-ring-${uid})`} strokeWidth={r * 0.2} fill="none" />
          <ellipse cx={cx} cy={cy} rx={r * 1.32} ry={r * 0.34} stroke="rgba(0,0,0,0.45)" strokeWidth={r * 0.02} fill="none" />
        </g>
      )}

      <circle cx={cx} cy={cy} r={r - 0.5} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
    </svg>
  );
}

function DsoArt({
  size,
  image,
  tone,
  uid,
}: {
  size: number;
  image: string;
  tone: string;
  uid: string;
}) {
  const r = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <style>{`
        @keyframes mra-drift-${uid} {
          0%   { transform: scale(1.05) rotate(0deg); }
          50%  { transform: scale(1.12) rotate(2deg); }
          100% { transform: scale(1.05) rotate(0deg); }
        }
        @keyframes mra-pulse-${uid} {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 0.9; }
        }
        .mra-drift-${uid} {
          transform-origin: ${r}px ${r}px;
          transform-box: view-box;
          animation: mra-drift-${uid} 24s ease-in-out infinite;
        }
        .mra-pulse-${uid} { animation: mra-pulse-${uid} 4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .mra-drift-${uid}, .mra-pulse-${uid} { animation: none !important; }
        }
      `}</style>
      <defs>
        <clipPath id={`mra-dso-clip-${uid}`} clipPathUnits="userSpaceOnUse">
          <circle cx={r} cy={r} r={r - 1} />
        </clipPath>
        <radialGradient id={`mra-dso-tint-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"  stopColor={tone} />
          <stop offset="60%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.7)" />
        </radialGradient>
      </defs>

      <g clipPath={`url(#mra-dso-clip-${uid})`}>
        <g className={`mra-drift-${uid}`}>
          <image
            href={image}
            x={0}
            y={0}
            width={size}
            height={size}
            preserveAspectRatio="xMidYMid slice"
          />
        </g>
        <circle cx={r} cy={r} r={r - 1} fill={`url(#mra-dso-tint-${uid})`} className={`mra-pulse-${uid}`} />
      </g>

      <circle cx={r} cy={r} r={r - 0.5} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
    </svg>
  );
}

function FallbackOrb({ size, uid }: { size: number; uid: string }) {
  const r = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <style>{`
        @keyframes mra-orb-${uid} { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .mra-orb-${uid} { transform-origin: ${r}px ${r}px; transform-box: view-box; animation: mra-orb-${uid} 60s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .mra-orb-${uid} { animation: none !important; } }
      `}</style>
      <defs>
        <radialGradient id={`mra-fb-${uid}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#5EEAD4" stopOpacity="0.6" />
          <stop offset="60%" stopColor="#FFB347" stopOpacity="0.2" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <g className={`mra-orb-${uid}`}>
        <circle cx={r} cy={r} r={r - 4} fill={`url(#mra-fb-${uid})`} />
        <circle cx={r * 0.65} cy={r * 0.7} r={size * 0.04} fill="#fff" opacity="0.7" />
        <circle cx={r * 1.2} cy={r * 1.1} r={size * 0.03} fill="#fff" opacity="0.55" />
      </g>
    </svg>
  );
}
