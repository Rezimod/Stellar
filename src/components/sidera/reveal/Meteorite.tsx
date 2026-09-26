import type { CSSProperties } from 'react';

/* Particle counts. Every one is a span moved by transform and opacity only,
   so the whole reveal stays on the compositor of a mid phone. */
const EMBERS = 12;
const FRAGMENTS = 5;
const SPARKS = 16;
const RAIN = 10;
const MOTES = 12;
const SHARDS = 10;

const many = (n: number, cls: string) =>
  Array.from({ length: n }, (_, k) => <span key={k} className={cls} style={{ '--k': k, '--n': n } as CSSProperties} />);

/** The crack the stone breaks along, in its 120 × 120 box. */
const SEAM = [
  [57, 7],
  [63, 30],
  [51, 50],
  [66, 70],
  [55, 92],
  [62, 113],
] as const;
const seamPath = `M${SEAM.map(([x, y]) => `${x} ${y}`).join(' L')}`;
const seamClip = SEAM.map(([x, y]) => `${((x / 120) * 100).toFixed(1)}% ${((y / 120) * 100).toFixed(1)}%`);
const HALF_CLIP = {
  l: `polygon(0 0, ${seamClip[0].split(' ')[0]} 0, ${seamClip.join(', ')}, ${seamClip[seamClip.length - 1].split(' ')[0]} 100%, 0 100%)`,
  r: `polygon(${seamClip[0].split(' ')[0]} 0, 100% 0, 100% 100%, ${seamClip[seamClip.length - 1].split(' ')[0]} 100%, ${[...seamClip].reverse().join(', ')})`,
};

/** Thumbprint pits left by the air on the way down. */
const PITS = [
  [38, 34, 9, 7],
  [74, 26, 7, 5],
  [86, 54, 10, 7],
  [42, 70, 11, 8],
  [28, 88, 7, 5],
  [76, 88, 9, 6],
  [97, 76, 5, 4],
  [22, 56, 5, 4],
] as const;

const OUTLINE =
  'M52 8 C64 3 80 9 90 17 C101 25 112 36 113 52 C115 66 108 76 110 88 C111 100 98 110 84 112 C70 115 62 108 48 112 C33 116 18 106 12 92 C6 79 11 68 7 55 C3 40 12 26 24 18 C33 12 42 11 52 8 Z';

/** Grains of lighter stone showing through the crust. */
const GRAINS = [
  [60, 40, 1.4],
  [30, 46, 1],
  [92, 38, 1.2],
  [64, 98, 1.1],
  [100, 64, 0.9],
  [56, 82, 1.3],
] as const;

/** Veins of light that open off the seam as the stone heats from inside. */
const VEINS = ['M51 50 L34 58 L26 55', 'M66 70 L86 77 L94 72', 'M63 30 L78 24', 'M55 92 L40 100', 'M34 58 L30 72'];

/** The gradients and glow the stone is painted with, once per reveal. */
export function StoneDefs({ id }: { id: string }) {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-core`} cx="34%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#5d544b" />
          <stop offset="40%" stopColor="#2b2622" />
          <stop offset="100%" stopColor="#0a0807" />
        </radialGradient>
        <radialGradient id={`${id}-pit`} cx="60%" cy="62%" r="62%">
          <stop offset="0%" stopColor="#050403" stopOpacity="0.7" />
          <stop offset="70%" stopColor="#120f0d" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8a7f72" stopOpacity="0.28" />
        </radialGradient>
        <linearGradient id={`${id}-crust`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.14" />
          <stop offset="45%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>
    </svg>
  );
}

/**
 * One half of the meteorite: fusion crust, thumbprints, grains, the seam it
 * breaks along and the veins that open off it. Each half draws the whole
 * stone and clips to its own side of the seam, so the break is one line.
 */
export function Stone({ id, half }: { id: string; half: 'l' | 'r' }) {
  return (
    <span className={`sd-reveal__half sd-reveal__half--${half}`} style={{ clipPath: HALF_CLIP[half] }}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <path d={OUTLINE} fill={`url(#${id}-core)`} />
        {PITS.map(([cx, cy, rx, ry], k) => (
          <ellipse key={k} cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${id}-pit)`} />
        ))}
        {GRAINS.map(([cx, cy, r], k) => (
          <circle key={k} cx={cx} cy={cy} r={r} fill="#a89c8c" opacity="0.35" />
        ))}
        <path d={OUTLINE} fill={`url(#${id}-crust)`} stroke="currentColor" strokeWidth="1.4" className="sd-reveal__rim" />
        <g className="sd-reveal__crack" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <path d={seamPath} strokeWidth="7" filter={`url(#${id}-glow)`} opacity="0.85" />
          <path d={seamPath} strokeWidth="2" />
        </g>
        <g className="sd-reveal__veins" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2">
          {VEINS.map((d, k) => (
            <path key={k} d={d} style={{ '--k': k } as CSSProperties} />
          ))}
        </g>
      </svg>
    </span>
  );
}

/**
 * The stone in the air: the head of the meteor, moved along the line of the
 * fall. A white-hot sheath gives way to one in the capsule's colour, a bow
 * shock stands ahead of it, a tail and embers stream behind, fragments break
 * off. The train it leaves hangs in the sky after it.
 */
export function Meteor() {
  return (
    <>
      <span className="sd-reveal__meteor">
        <span className="sd-reveal__sheath sd-reveal__sheath--hot" />
        <span className="sd-reveal__sheath sd-reveal__sheath--cool" />
        <span className="sd-reveal__cone" />
        <span className="sd-reveal__tail" />
        {many(EMBERS, 'sd-reveal__ember')}
        {many(FRAGMENTS, 'sd-reveal__fragment')}
      </span>
      <span className="sd-reveal__train" />
    </>
  );
}

/**
 * Everything the strike and the burst throw off, laid at the centre of the
 * field: the flash, three shock rings a little apart in colour, sparks, dust,
 * the crater's glow, embers raining back down, motes hanging in the air; then
 * at the burst the shards, the column of light, a second set of rings and
 * the turning rays behind the break.
 */
export function Impact() {
  return (
    <>
      <span className="sd-reveal__crater" />
      <span className="sd-reveal__flash" />
      <span className="sd-reveal__shock sd-reveal__shock--r" />
      <span className="sd-reveal__shock sd-reveal__shock--b" />
      <span className="sd-reveal__shock sd-reveal__shock--w" />
      {many(SPARKS, 'sd-reveal__spark')}
      <span className="sd-reveal__dust" />
      {many(RAIN, 'sd-reveal__rain')}
      {many(MOTES, 'sd-reveal__mote')}
      <span className="sd-reveal__rays" />
      <span className="sd-reveal__column" />
      {many(SHARDS, 'sd-reveal__shard')}
      <span className="sd-reveal__shock sd-reveal__shock--r sd-reveal__shock--burst" />
      <span className="sd-reveal__shock sd-reveal__shock--b sd-reveal__shock--burst" />
      <span className="sd-reveal__shock sd-reveal__shock--w sd-reveal__shock--burst" />
    </>
  );
}
