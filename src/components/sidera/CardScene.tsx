import type { JSX } from 'react';
import type { Palette } from './cardArtPalette';

/**
 * The object itself, drawn the way it is recognised.
 *
 * Each card gets the one feature it is known by — Saturn's rings and the
 * Cassini division, Jupiter's spot, Mars's polar cap and Valles Marineris,
 * Pluto's heart, Europa's lineae, the Trapezium inside Orion. Nothing here is
 * a photograph and nothing pretends to be; it is a drawing made from the same
 * record the card carries.
 */

export type SceneProps = {
  designation: string;
  kind: 'lunar' | 'planet' | 'moon' | 'star' | 'deepsky' | 'fiction';
  p: Palette;
  id: string;
  /** Where CardArt's generator had got to; the scene carries on from there. */
  seed: number;
  /** Lunar cards only: where the gazetteer puts the feature. */
  lat?: number | null;
  lon?: number | null;
};

/** A generator picking up at a saved state. `state()` reads where it has got to. */
export function resume(start: number) {
  let h = start;
  const rand = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
  rand.state = () => h;
  return rand;
}

const CX = 100;
const CY = 176;

function Terminator({ r, cy = CY, tilt = 0 }: { r: number; cy?: number; tilt?: number }) {
  return (
    <path
      d={`M${CX} ${cy - r} A${r} ${r} 0 0 1 ${CX} ${cy + r} A${r * 0.62} ${r} 0 0 0 ${CX} ${cy - r}`}
      fill="#03050d"
      opacity="0.58"
      transform={tilt ? `rotate(${tilt} ${CX} ${cy})` : undefined}
    />
  );
}

function Limb({ r, color, cy = CY }: { r: number; color: string; cy?: number }) {
  return <circle cx={CX} cy={cy} r={r} fill="none" stroke={color} strokeOpacity="0.5" strokeWidth="1.2" />;
}

function Spikes({ x, y, len, color, weight = 1 }: { x: number; y: number; len: number; color: string; weight?: number }) {
  return (
    <g stroke={color} strokeLinecap="round" opacity="0.85">
      <line x1={x - len} y1={y} x2={x + len} y2={y} strokeWidth={weight} />
      <line x1={x} y1={y - len} x2={x} y2={y + len} strokeWidth={weight} />
      <line x1={x - len * 0.5} y1={y - len * 0.5} x2={x + len * 0.5} y2={y + len * 0.5} strokeWidth={weight * 0.5} strokeOpacity="0.5" />
      <line x1={x + len * 0.5} y1={y - len * 0.5} x2={x - len * 0.5} y2={y + len * 0.5} strokeWidth={weight * 0.5} strokeOpacity="0.5" />
    </g>
  );
}

function spiral(turns: number, a: number, b: number, phase: number) {
  const pts: string[] = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * turns * Math.PI * 2;
    const r = a * Math.exp(b * t);
    pts.push(`${(CX + Math.cos(t + phase) * r).toFixed(1)} ${(CY + Math.sin(t + phase) * r * 0.74).toFixed(1)}`);
  }
  return `M${pts.join(' L')}`;
}

type Ctx = { p: Palette; id: string; rand: ReturnType<typeof resume>; body: string };

/** Scattered points on an arc around (x, y): star trails, lensed stars. */
function arcDots(rand: Ctx['rand'], n: number, x: number, y: number, rMin: number, rMax: number) {
  return Array.from({ length: n }, () => {
    const a = rand() * Math.PI * 2;
    const r = rMin + rand() * (rMax - rMin);
    return { a, r, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r };
  });
}

/* ── Real ─────────────────────────────────────────────────────── */

/** The full Moon as it hangs over the horizon: the maria where they really are, Tycho's rays in the south. */
function Moon({ p, id }: Ctx) {
  const R = 80;
  // Near-side maria, north up, as fractions of the radius.
  const maria: Array<[number, number, number, number, number]> = [
    [-0.28, -0.4, 0.28, 0.22, -20], // Imbrium
    [-0.6, 0.0, 0.2, 0.42, 12], // Procellarum
    [0.18, -0.36, 0.16, 0.14, 0], // Serenitatis
    [0.32, -0.06, 0.2, 0.15, 12], // Tranquillitatis
    [0.64, -0.2, 0.09, 0.08, 0], // Crisium
    [0.5, 0.18, 0.1, 0.13, 0], // Fecunditatis
    [0.28, 0.28, 0.07, 0.07, 0], // Nectaris
    [-0.16, 0.3, 0.15, 0.1, -10], // Nubium
    [-0.48, 0.36, 0.07, 0.07, 0], // Humorum
  ];
  const tycho = { x: CX - 0.16 * R, y: CY + 0.62 * R };
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-limbdark`} cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="#03050d" stopOpacity="0" />
          <stop offset="100%" stopColor="#03050d" stopOpacity="0.45" />
        </radialGradient>
        <filter id={`${id}-mare`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>
      <circle cx={CX} cy={CY} r={R + 26} fill={`url(#${id}-wash)`} opacity="0.55" />
      <circle cx={CX} cy={CY} r={R} fill="#e8eaee" />
      <g fill="#6b6f7a" opacity="0.55" filter={`url(#${id}-mare)`}>
        {maria.map(([x, y, rx, ry, rot], i) => (
          <ellipse key={i} cx={CX + x * R} cy={CY + y * R} rx={rx * R} ry={ry * R} transform={`rotate(${rot} ${CX + x * R} ${CY + y * R})`} />
        ))}
      </g>
      <g stroke="#ffffff" strokeLinecap="round" strokeOpacity="0.28">
        {Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2 + 0.2;
          const l = 12 + ((i * 37) % 11) * 2.4;
          return <line key={i} x1={tycho.x} y1={tycho.y} x2={tycho.x + Math.cos(a) * l} y2={tycho.y + Math.sin(a) * l} strokeWidth={0.8 + (i % 3) * 0.4} />;
        })}
      </g>
      <circle cx={tycho.x} cy={tycho.y} r="3.2" fill="#ffffff" />
      <circle cx={CX - 0.3 * R} cy={CY - 0.12 * R} r="3" fill="#ffffff" opacity="0.8" />
      <circle cx={CX - 0.58 * R} cy={CY - 0.16 * R} r="2.4" fill="#ffffff" opacity="0.7" />
      <circle cx={CX} cy={CY} r={R} fill={`url(#${id}-limbdark)`} />
      <Limb r={R} color={p.glow} />
    </g>
  );
}

/** Halley: a bright coma, a curved dust tail and a straight blue ion tail, both away from the Sun. */
function Halley({ p, id }: Ctx) {
  const hx = 138;
  const hy = 142;
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-dust`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff4dc" stopOpacity="0.85" />
          <stop offset="45%" stopColor={p.body} stopOpacity="0.35" />
          <stop offset="100%" stopColor={p.body} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-ion`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d6f0ff" stopOpacity="0.9" />
          <stop offset="100%" stopColor={p.glow} stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>
      <path d={`M${hx - 2} ${hy - 4} C ${hx - 40} ${hy + 20}, ${hx - 90} ${hy + 50}, -10 300 L 96 300 C ${hx - 30} ${hy + 80}, ${hx - 6} ${hy + 36}, ${hx + 6} ${hy + 6} Z`} fill={`url(#${id}-dust)`} filter={`url(#${id}-soft)`} />
      <path d={`M${hx} ${hy} C ${hx - 30} ${hy + 30}, ${hx - 70} ${hy + 64}, 30 300`} stroke="#fff4dc" strokeWidth="1.2" fill="none" opacity="0.5" />
      <path d={`M${hx} ${hy} L 2 262 L 12 272 Z`} fill={`url(#${id}-ion)`} opacity="0.9" filter={`url(#${id}-soft)`} />
      <path d={`M${hx} ${hy} L 20 280`} stroke={p.glow} strokeWidth="0.8" opacity="0.6" />
      <circle cx={hx} cy={hy} r="34" fill={`url(#${id}-glow)`} />
      <circle cx={hx} cy={hy} r="9" fill="#ffffff" opacity="0.9" />
      <Spikes x={hx} y={hy} len={18} color="#ffffff" weight={0.7} />
    </g>
  );
}

/** Sirius: the brightest star in the sky, blue-white, with its white dwarf close by. */
function Sirius({ p, id }: Ctx) {
  return (
    <g>
      <circle cx={CX} cy={CY} r="92" fill={`url(#${id}-wash)`} opacity="0.8" />
      <circle cx={CX} cy={CY} r="46" fill={p.glow} opacity="0.14" />
      <Spikes x={CX} y={CY} len={98} color={p.body} weight={2.4} />
      <circle cx={CX} cy={CY} r="28" fill={`url(#${id}-glow)`} />
      <circle cx={CX} cy={CY} r="13" fill="#ffffff" />
      <circle cx={CX + 26} cy={CY - 14} r="2" fill="#ffffff" opacity="0.9" />
      <circle cx={CX + 26} cy={CY - 14} r="5" fill={p.glow} opacity="0.3" />
    </g>
  );
}

/** Polaris: the one star the sky turns around, and the sky turning. */
function Polaris({ p, id, rand }: Ctx) {
  const x = CX;
  const y = CY - 4;
  return (
    <g>
      <g fill="none" strokeLinecap="round">
        {Array.from({ length: 34 }, (_, i) => {
          const r = 12 + i * 3.1 + rand() * 2;
          const a0 = rand() * Math.PI * 2;
          const sweep = 0.5 + rand() * 1.1;
          const x0 = x + Math.cos(a0) * r;
          const y0 = y + Math.sin(a0) * r;
          const x1 = x + Math.cos(a0 + sweep) * r;
          const y1 = y + Math.sin(a0 + sweep) * r;
          const warm = rand() < 0.3;
          return (
            <path
              key={i}
              d={`M${x0.toFixed(1)} ${y0.toFixed(1)} A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`}
              stroke={warm ? '#ffd9a0' : p.glow}
              strokeWidth={0.5 + rand() * 1.1}
              strokeOpacity={0.25 + rand() * 0.5}
            />
          );
        })}
      </g>
      <circle cx={x} cy={y} r="22" fill={`url(#${id}-glow)`} />
      <Spikes x={x} y={y} len={34} color={p.body} weight={1.4} />
      <circle cx={x} cy={y} r="6.5" fill="#fffaf0" />
    </g>
  );
}

/** Betelgeuse: a star so swollen it would reach past Jupiter, boiling and shedding dust. */
function Betelgeuse({ p, id, rand }: Ctx) {
  const R = 70;
  const edge = Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * Math.PI * 2;
    const r = R * (0.95 + rand() * 0.08);
    return `${(CX + Math.cos(a) * r).toFixed(1)} ${(CY + Math.sin(a) * r).toFixed(1)}`;
  });
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-star`} cx="42%" cy="40%" r="62%">
          <stop offset="0%" stopColor="#ffd08a" />
          <stop offset="45%" stopColor={p.body} />
          <stop offset="100%" stopColor={p.shade} />
        </radialGradient>
        <filter id={`${id}-boil`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
      </defs>
      <ellipse cx={CX + 6} cy={CY - 4} rx={R + 34} ry={R + 26} fill={`url(#${id}-wash)`} opacity="0.9" />
      <polygon points={edge.join(' ')} fill={`url(#${id}-star)`} />
      <g filter={`url(#${id}-boil)`}>
        {Array.from({ length: 16 }, (_, i) => {
          const a = rand() * Math.PI * 2;
          const d = rand() * R * 0.7;
          const hot = rand() < 0.45;
          return <circle key={i} cx={CX + Math.cos(a) * d} cy={CY + Math.sin(a) * d} r={8 + rand() * 14} fill={hot ? '#ffcf8a' : p.shade} opacity={hot ? 0.35 : 0.3} />;
        })}
      </g>
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#ffb27a" strokeOpacity="0.4" strokeWidth="1.2" />
    </g>
  );
}

/** The Pleiades: seven blue stars in their little dipper, trailing the dust they are passing through. */
function Pleiades({ p, id }: Ctx) {
  const s = 1.45;
  const stars: Array<[number, number, number]> = [
    [0, 0, 9], // Alcyone
    [-40, 4, 7], // Atlas
    [-38, -8, 4.5], // Pleione
    [16, 16, 7], // Merope
    [36, -4, 7.5], // Electra
    [26, -24, 7], // Maia
    [16, -40, 5.5], // Taygeta
    [48, -20, 4.5], // Celaeno
  ];
  return (
    <g>
      <defs>
        <filter id={`${id}-veil`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      <g filter={`url(#${id}-veil)`} stroke={p.glow} strokeLinecap="round" opacity="0.5">
        {[-26, -12, 0, 12, 24, 36].map((dy, i) => (
          <line key={i} x1={CX - 70} y1={CY + dy + 30} x2={CX + 80} y2={CY + dy - 40} strokeWidth={6 + (i % 3) * 3} strokeOpacity={0.25 + (i % 2) * 0.2} />
        ))}
      </g>
      <ellipse cx={CX + 6} cy={CY - 6} rx="80" ry="60" fill={`url(#${id}-wash)`} opacity="0.7" />
      {stars.map(([x, y, r], i) => {
        const sx = CX - 6 + x * s;
        const sy = CY + 4 + y * s;
        return (
          <g key={i}>
            <circle cx={sx} cy={sy} r={r * 2.2} fill={p.glow} opacity="0.18" />
            <Spikes x={sx} y={sy} len={r * 3.6} color={p.body} weight={0.8} />
            <circle cx={sx} cy={sy} r={r * 0.55} fill="#ffffff" />
          </g>
        );
      })}
    </g>
  );
}

/** Andromeda: the nearest big spiral, steeply tilted, with its two small companions. */
function Andromeda({ p, id }: Ctx) {
  const rot = `rotate(-34 ${CX} ${CY})`;
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-disc`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff1d6" stopOpacity="0.95" />
          <stop offset="18%" stopColor="#f3d9ae" stopOpacity="0.7" />
          <stop offset="55%" stopColor={p.glow} stopOpacity="0.28" />
          <stop offset="100%" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      <g transform={rot}>
        <ellipse cx={CX} cy={CY} rx="98" ry="34" fill={`url(#${id}-disc)`} />
        <ellipse cx={CX} cy={CY} rx="70" ry="22" fill="none" stroke={p.glow} strokeOpacity="0.35" strokeWidth="6" />
        <path d={`M${CX - 82} ${CY - 6} Q ${CX} ${CY - 26} ${CX + 82} ${CY - 12}`} stroke="#03050d" strokeWidth="3.5" fill="none" opacity="0.55" />
        <path d={`M${CX - 60} ${CY - 11} Q ${CX} ${CY - 22} ${CX + 60} ${CY - 14}`} stroke="#03050d" strokeWidth="2" fill="none" opacity="0.5" />
        <ellipse cx={CX} cy={CY} rx="18" ry="8" fill="#fff6e2" opacity="0.85" />
      </g>
      {/* M32, round and close; M110, stretched and further out. */}
      <circle cx={CX + 22} cy={CY + 24} r="5" fill="#fff1d6" opacity="0.75" />
      <circle cx={CX + 22} cy={CY + 24} r="10" fill={p.glow} opacity="0.2" />
      <ellipse cx={CX - 40} cy={CY - 52} rx="10" ry="5" fill="#fff1d6" opacity="0.5" transform={`rotate(-60 ${CX - 40} ${CY - 52})`} />
    </g>
  );
}

/** The Pillars of Creation: three columns of dust, their tops lit by the young stars they are making. */
function Pillars({ p, id, rand }: Ctx) {
  const pillars = [
    { x: 56, top: 128, w: 50, lean: -8 },
    { x: 112, top: 170, w: 38, lean: 5 },
    { x: 158, top: 204, w: 30, lean: 9 },
  ];
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-neb`} cx="55%" cy="45%" r="70%">
          <stop offset="0%" stopColor="#f5d08a" stopOpacity="0.55" />
          <stop offset="45%" stopColor={p.glow} stopOpacity="0.35" />
          <stop offset="100%" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-dustcol`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5a3a26" />
          <stop offset="30%" stopColor="#2a1a14" />
          <stop offset="100%" stopColor="#0c0806" />
        </linearGradient>
      </defs>
      <rect x="0" y="100" width="200" height="180" fill={`url(#${id}-neb)`} />
      {pillars.map((c, i) => {
        const w = c.w;
        const d = `M${c.x - w / 2} 284 C ${c.x - w / 2 - 4} ${c.top + 60}, ${c.x - w * 0.35 + c.lean} ${c.top + 14}, ${c.x + c.lean} ${c.top} C ${c.x + w * 0.4 + c.lean} ${c.top + 10}, ${c.x + w / 2 + 2} ${c.top + 60}, ${c.x + w / 2 + 6} 284 Z`;
        return (
          <g key={i}>
            <path d={d} fill={`url(#${id}-dustcol)`} />
            <path d={`M${c.x - w * 0.34 + c.lean} ${c.top + 16} C ${c.x - w * 0.2 + c.lean} ${c.top + 4}, ${c.x + c.lean} ${c.top - 1}, ${c.x + w * 0.38 + c.lean} ${c.top + 10}`} stroke="#ffd79a" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.85" />
          </g>
        );
      })}
      {Array.from({ length: 14 }, (_, i) => (
        <circle key={i} cx={rand() * 200} cy={110 + rand() * 90} r={0.8 + rand() * 1.2} fill="#ffffff" opacity={0.5 + rand() * 0.5} />
      ))}
    </g>
  );
}

/** M87*: the first black hole ever seen — a shadow inside a ring of light, brightest where it swings toward us. */
function M87({ p, id }: Ctx) {
  const cy = CY - 2;
  return (
    <g>
      <defs>
        <filter id={`${id}-halo`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <linearGradient id={`${id}-jet`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor={p.glow} stopOpacity="0.6" />
          <stop offset="100%" stopColor={p.glow} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M${CX} ${cy} L 198 104 L 190 98 Z`} fill={`url(#${id}-jet)`} opacity="0.5" />
      <g filter={`url(#${id}-halo)`}>
        <circle cx={CX} cy={cy} r="46" fill="none" stroke={p.glow} strokeWidth="22" strokeOpacity="0.55" />
      </g>
      <circle cx={CX} cy={cy} r="46" fill="none" stroke={p.body} strokeWidth="9" strokeOpacity="0.55" />
      <path d={`M${CX - 46} ${cy} A46 46 0 0 0 ${CX + 46} ${cy}`} fill="none" stroke="#ffd18a" strokeWidth="13" strokeOpacity="0.9" />
      <path d={`M${CX - 30} ${cy + 35} A46 46 0 0 0 ${CX + 30} ${cy + 35}`} fill="none" stroke="#fff4d6" strokeWidth="6" strokeOpacity="0.9" />
      <circle cx={CX} cy={cy} r="33" fill="#020205" />
    </g>
  );
}

/* ── Fiction: original designs ────────────────────────────────── */

/** A desert world at the hour both suns go down. */
function TwinSun({ p, id }: Ctx) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-dusk`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="30%" stopColor="#2a1838" stopOpacity="0" />
          <stop offset="72%" stopColor="#c7643a" stopOpacity="0.75" />
          <stop offset="84%" stopColor="#ffc27a" stopOpacity="0.9" />
        </linearGradient>
        <radialGradient id={`${id}-sun`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#ffe2a8" />
          <stop offset="100%" stopColor="#ff9a4a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="100" width="200" height="140" fill={`url(#${id}-dusk)`} />
      <circle cx="78" cy="206" r="40" fill={`url(#${id}-sun)`} />
      <circle cx="78" cy="206" r="13" fill="#fff6e2" />
      <circle cx="132" cy="214" r="26" fill={`url(#${id}-sun)`} opacity="0.9" />
      <circle cx="132" cy="214" r="8" fill="#ffe6c2" />
      <path d="M0 226 C 30 214, 60 222, 92 216 S 150 208, 200 220 L200 280 L0 280 Z" fill={p.shade} />
      <path d="M0 240 C 40 228, 90 246, 130 234 S 180 236, 200 232 L200 280 L0 280 Z" fill="#3a2016" />
      <path d="M0 258 C 50 248, 100 262, 150 252 S 190 258, 200 256 L200 280 L0 280 Z" fill="#1c0f0b" />
      <path d="M0 226 C 30 214, 60 222, 92 216 S 150 208, 200 220" stroke="#ffcf94" strokeWidth="1" fill="none" opacity="0.6" />
    </g>
  );
}

/** An ocean that covers a whole world, and the storms that cross it. */
function TideWorld({ p, id, rand }: Ctx) {
  const R = 72;
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-sea`} cx="36%" cy="32%" r="78%">
          <stop offset="0%" stopColor="#7fd8ff" />
          <stop offset="40%" stopColor={p.body} />
          <stop offset="100%" stopColor={p.shade} />
        </radialGradient>
        <clipPath id={`${id}-disc`}>
          <circle cx={CX} cy={CY} r={R} />
        </clipPath>
      </defs>
      <circle cx={CX} cy={CY} r={R + 12} fill={p.glow} opacity="0.1" />
      <circle cx={CX} cy={CY} r={R} fill={`url(#${id}-sea)`} />
      <g clipPath={`url(#${id}-disc)`} fill="none" stroke="#ffffff" strokeLinecap="round">
        {Array.from({ length: 9 }, (_, i) => {
          const y = CY - R + 16 + i * 16 + rand() * 6;
          return <path key={i} d={`M${CX - R} ${y} C ${CX - 30} ${y - 12}, ${CX + 20} ${y + 14}, ${CX + R} ${y - 4}`} strokeWidth={1 + rand() * 2.4} strokeOpacity={0.12 + rand() * 0.28} />;
        })}
        <path d={`M${CX + 18} ${CY + 6} m-16 0 a16 12 0 1 0 32 0 a10 8 0 1 0 -20 0 a5 4 0 1 0 10 0`} strokeWidth="2.4" strokeOpacity="0.6" />
      </g>
      <Terminator r={R} />
      <Limb r={R} color={p.glow} />
      <circle cx="160" cy="118" r="7" fill="#dfe6f0" />
      <path d="M160 111 a7 7 0 0 1 0 14 a4.5 7 0 0 0 0 -14" fill="#03050d" opacity="0.55" />
    </g>
  );
}

/** A ring a million miles round, the inside of it land and sea and weather. */
function RingHabitat({ p, id, rand }: Ctx) {
  const rot = `rotate(-14 ${CX} ${CY})`;
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-star`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#fff0c8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffd08a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="146" cy="140" r="44" fill={`url(#${id}-star)`} />
      <g transform={rot}>
        {/* The far side of the band, land facing us. */}
        <path d={`M${CX - 92} ${CY} A92 38 0 0 1 ${CX + 92} ${CY}`} fill="none" stroke={p.body} strokeWidth="15" strokeOpacity="0.85" />
        <g stroke="#ffffff" strokeLinecap="round" strokeOpacity="0.5">
          {Array.from({ length: 12 }, (_, i) => {
            const t = 0.12 + (i / 12) * 0.76;
            const a = Math.PI + t * Math.PI;
            const x = CX + Math.cos(a) * 92;
            const y = CY + Math.sin(a) * 38;
            return <line key={i} x1={x - 3} y1={y} x2={x + 2 + rand() * 4} y2={y} strokeWidth="1.6" />;
          })}
        </g>
        {/* The near side: the outer hull, lit along its rim. */}
        <path d={`M${CX - 92} ${CY} A92 38 0 0 0 ${CX + 92} ${CY}`} fill="none" stroke={p.shade} strokeWidth="18" />
        <path d={`M${CX - 92} ${CY} A92 38 0 0 0 ${CX + 92} ${CY}`} fill="none" stroke={p.glow} strokeWidth="1.2" strokeOpacity="0.8" transform="translate(0 -6)" />
      </g>
    </g>
  );
}

/** Unit-7: a small service robot, patched and dented, carrying the one green thing it has found. */
function Unit7({ p }: Ctx) {
  const x = CX;
  return (
    <g>
      <ellipse cx={x} cy="258" rx="62" ry="8" fill="#000000" opacity="0.5" />
      {/* Treads. */}
      {[-30, 30].map((dx) => (
        <g key={dx}>
          <rect x={x + dx - 16} y="228" width="32" height="26" rx="12" fill="#1c2230" stroke={p.shade} strokeWidth="1.2" />
          {[-8, 0, 8].map((wx) => (
            <circle key={wx} cx={x + dx + wx} cy="241" r="3.4" fill="#3a4458" />
          ))}
        </g>
      ))}
      {/* Body, with a stencilled 7 and a dent. */}
      <rect x={x - 30} y="178" width="60" height="52" rx="5" fill={p.body} />
      <rect x={x - 30} y="178" width="60" height="52" rx="5" fill="none" stroke="#0b1020" strokeOpacity="0.4" />
      <rect x={x - 22} y="186" width="44" height="8" rx="2" fill={p.glow} opacity="0.9" />
      <text x={x + 12} y="222" fontFamily="var(--sd-mono), monospace" fontSize="18" fontWeight="700" fill="#0b1020" opacity="0.55">7</text>
      <path d={`M${x - 22} 204 q6 5 12 0`} stroke="#0b1020" strokeOpacity="0.35" fill="none" />
      {/* Neck, antenna, and a head of two lenses. */}
      <rect x={x - 3} y="166" width="6" height="14" fill="#3a4458" />
      <line x1={x + 14} y1="150" x2={x + 22} y2="126" stroke="#9aa6bd" strokeWidth="1.4" />
      <circle cx={x + 22} cy="125" r="2.6" fill="#ff8a4a" />
      <rect x={x - 28} y="144" width="56" height="24" rx="10" fill="#2a3244" />
      {[-13, 13].map((dx) => (
        <g key={dx}>
          <circle cx={x + dx} cy="156" r="10" fill="#0b1020" stroke="#9aa6bd" strokeWidth="1.2" />
          <circle cx={x + dx} cy="156" r="5.5" fill="#7fe7ff" opacity="0.9" />
          <circle cx={x + dx - 2} cy="154" r="1.8" fill="#ffffff" />
        </g>
      ))}
      {/* An arm out front, a sprout in a cup. */}
      <path d={`M${x + 30} 204 l18 4 l0 14`} stroke="#9aa6bd" strokeWidth="3" fill="none" strokeLinejoin="round" />
      <path d={`M${x + 42} 222 h12 l-2 10 h-8 z`} fill="#8a6a4a" />
      <path d={`M${x + 48} 222 v-10`} stroke="#6fd48a" strokeWidth="1.4" />
      <path d={`M${x + 48} 214 q-7 -5 -9 1 q6 2 9 -1`} fill="#6fd48a" />
      <path d={`M${x + 48} 213 q7 -6 9 0 q-6 3 -9 0`} fill="#8ae8a0" />
    </g>
  );
}

/** The Sentinel: a tall machine on a ridge, watching a world it was built to guard. */
function Sentinel({ p, id }: Ctx) {
  const x = 116;
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-world`} cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor={p.body} />
          <stop offset="100%" stopColor={p.shade} />
        </radialGradient>
      </defs>
      <circle cx="56" cy="238" r="96" fill={`url(#${id}-world)`} opacity="0.9" />
      <circle cx="56" cy="238" r="96" fill="none" stroke={p.glow} strokeOpacity="0.6" strokeWidth="1.4" />
      <path d="M0 262 L60 250 L96 256 L130 246 L170 254 L200 250 L200 280 L0 280 Z" fill="#05060c" />
      {/* The figure, a silhouette with one lit visor. */}
      <g fill="#05060c">
        <rect x={x - 5} y="126" width="10" height="14" rx="3" />
        <path d={`M${x - 11} 142 h22 l-3 44 h-16 z`} />
        <path d={`M${x - 11} 144 l-10 34 l3 1 l11 -30 z`} />
        <path d={`M${x + 11} 144 l9 36 l-3 1 l-10 -32 z`} />
        <path d={`M${x - 7} 186 l-4 62 h5 l5 -60 z`} />
        <path d={`M${x + 7} 186 l3 62 h-5 l-5 -60 z`} />
      </g>
      <rect x={x - 4} y="131" width="8" height="2.4" rx="1" fill={p.glow} />
      <rect x={x - 8} y="129" width="16" height="7" fill={p.glow} opacity="0.25" />
    </g>
  );
}

/** The Black Slab: a flat black stone that should not be there, and the worlds lined up above it. */
function BlackSlab({ p, id }: Ctx) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-plain`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.body} stopOpacity="0.5" />
          <stop offset="100%" stopColor="#05060a" />
        </linearGradient>
      </defs>
      {/* The alignment: a sun rising behind a world, a moon above. */}
      <circle cx={CX} cy="132" r="15" fill="#e8e2d4" opacity="0.9" />
      <path d={`M${CX - 15} 132 a15 15 0 0 0 30 0 a15 11 0 0 1 -30 0`} fill="#03050d" opacity="0.6" />
      <circle cx={CX} cy="112" r="6" fill="#cdd3de" opacity="0.8" />
      <circle cx={CX} cy="150" r="30" fill={`url(#${id}-glow)`} opacity="0.7" />
      <rect x="0" y="222" width="200" height="58" fill={`url(#${id}-plain)`} />
      <line x1="0" y1="222" x2="200" y2="222" stroke={p.glow} strokeOpacity="0.4" />
      <path d={`M${CX + 14} 246 L 200 262 L 200 272 Z`} fill="#000000" opacity="0.55" />
      <rect x={CX - 14} y="160" width="28" height="86" fill="#020203" />
      <line x1={CX - 14} y1="160" x2={CX - 14} y2="246" stroke={p.glow} strokeOpacity="0.55" strokeWidth="0.8" />
      <line x1={CX - 14} y1="160" x2={CX + 14} y2="160" stroke={p.glow} strokeOpacity="0.4" strokeWidth="0.8" />
    </g>
  );
}

/** The Derelict: a generation ship adrift, its spine broken, a few windows still lit. */
function Derelict({ p, id, rand }: Ctx) {
  const rot = `rotate(-16 ${CX} ${CY})`;
  const modules = [-80, -62, -46, -30, 14, 30, 48, 66];
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-limb`} cx="50%" cy="0%" r="80%">
          <stop offset="0%" stopColor={p.glow} stopOpacity="0.45" />
          <stop offset="100%" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="150" cy="300" rx="150" ry="70" fill={`url(#${id}-limb)`} />
      <g transform={rot}>
        <rect x={CX - 92} y={CY - 3} width="84" height="6" fill="#39414f" />
        <rect x={CX + 8} y={CY - 3} width="84" height="6" fill="#39414f" transform={`rotate(6 ${CX + 8} ${CY})`} />
        {modules.map((mx, i) => {
          const h = 16 + ((i * 7) % 5) * 5;
          return (
            <g key={mx} transform={mx > 0 ? `rotate(6 ${CX + 8} ${CY})` : undefined}>
              <rect x={CX + mx} y={CY - h / 2} width="12" height={h} rx="2" fill={p.body} />
              <rect x={CX + mx} y={CY - h / 2} width="12" height="2" fill={p.glow} opacity="0.5" />
              {i % 3 === 0 && <rect x={CX + mx + 4} y={CY - 2} width="3" height="3" fill="#ffd27a" />}
            </g>
          );
        })}
        <circle cx={CX - 92} cy={CY} r="10" fill={p.shade} />
        <circle cx={CX - 92} cy={CY} r="4" fill="#7fd8ff" opacity="0.4" />
      </g>
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={CX - 6 + (rand() - 0.5) * 30} y={CY - 4 + (rand() - 0.5) * 30} width={1.5 + rand() * 3} height={1.5 + rand() * 2} fill="#5a6474" transform={`rotate(${rand() * 90} ${CX} ${CY})`} />
      ))}
    </g>
  );
}

/** The Wormhole: a sphere of light that is a window onto another galaxy, the sky bent around it. */
function Wormhole({ p, id, rand }: Ctx) {
  const R = 60;
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-orb`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0a0f24" />
          <stop offset="70%" stopColor="#141a3a" />
          <stop offset="96%" stopColor={p.glow} stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ffffff" />
        </radialGradient>
        <clipPath id={`${id}-inside`}>
          <circle cx={CX} cy={CY} r={R - 2} />
        </clipPath>
        <filter id={`${id}-bloom`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      {/* Stars dragged into arcs by the bend. */}
      <g stroke="#ffffff" strokeLinecap="round" fill="none">
        {arcDots(rand, 26, CX, CY, R + 6, R + 44).map((d, i) => (
          <path key={i} d={`M${d.x.toFixed(1)} ${d.y.toFixed(1)} A${d.r.toFixed(1)} ${d.r.toFixed(1)} 0 0 1 ${(CX + Math.cos(d.a + 0.16) * d.r).toFixed(1)} ${(CY + Math.sin(d.a + 0.16) * d.r).toFixed(1)}`} strokeWidth={0.6 + rand()} strokeOpacity={0.3 + rand() * 0.5} />
        ))}
      </g>
      <circle cx={CX} cy={CY} r={R + 10} fill={p.glow} opacity="0.35" filter={`url(#${id}-bloom)`} />
      <circle cx={CX} cy={CY} r={R} fill={`url(#${id}-orb)`} />
      {/* The far galaxy, seen through it and smeared along the rim. */}
      <g clipPath={`url(#${id}-inside)`}>
        <ellipse cx={CX - 8} cy={CY + 6} rx="30" ry="10" fill={p.body} opacity="0.35" transform={`rotate(-24 ${CX - 8} ${CY + 6})`} />
        <ellipse cx={CX - 8} cy={CY + 6} rx="9" ry="4" fill="#fff4dc" opacity="0.8" transform={`rotate(-24 ${CX - 8} ${CY + 6})`} />
        <path d={`M${CX - R + 6} ${CY - 20} A${R - 6} ${R - 6} 0 0 1 ${CX + 10} ${CY - R + 6}`} stroke={p.body} strokeWidth="5" fill="none" opacity="0.4" />
      </g>
      <circle cx={CX} cy={CY} r={R + 2} fill="none" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.9" />
    </g>
  );
}

const SCENES: Record<string, (c: Ctx) => JSX.Element> = {
  MOON: Moon,
  HALLEY: Halley,
  SIRIUS: Sirius,
  POLARIS: Polaris,
  BETELGEUSE: Betelgeuse,
  M45: Pleiades,
  M31: Andromeda,
  M16: Pillars,
  M87: M87,
  'TWIN-SUN': TwinSun,
  'TIDE-WORLD': TideWorld,
  'RING-HABITAT': RingHabitat,
  'UNIT-7': Unit7,
  SENTINEL: Sentinel,
  'BLACK-SLAB': BlackSlab,
  DERELICT: Derelict,
  WORMHOLE: Wormhole,
};

export default function CardScene({ designation, kind, p, id, seed, lat, lon }: SceneProps) {
  const rand = resume(seed);
  const body = `url(#${id}-body)`;

  const Scene = SCENES[designation];
  // Called, not mounted: a scene of its own would render with a generator this
  // render already advanced, and draw something else than the server did.
  if (Scene) return Scene({ p, id, rand, body });

  if (kind === 'lunar') {
    const fx = CX + (lon ?? 0) * 0.78;
    const fy = CY - (lat ?? 0) * 0.78;
    const base = designation === 'TRANQUILITY-BASE';
    return (
      <g>
        <circle cx={CX} cy={CY} r="86" fill={p.glow} opacity="0.07" />
        <circle cx={CX} cy={CY} r="78" fill={body} />
        {/* The maria: the dark plains, seen from the angle this card takes. */}
        <g fill={p.shade} opacity="0.34" transform={`rotate(${-30 + rand() * 60} ${CX} ${CY})`}>
          <ellipse cx="128" cy="140" rx={26 + rand() * 10} ry={20 + rand() * 8} />
          <ellipse cx="86" cy="126" rx={18 + rand() * 8} ry={14 + rand() * 6} />
          <ellipse cx="66" cy="164" rx={15 + rand() * 7} ry={18 + rand() * 8} />
        </g>
        {Array.from({ length: 22 }, (_, i) => {
          const a = rand() * Math.PI * 2;
          const d = rand() * 70;
          const r = 2.5 + rand() * 9;
          return (
            <g key={i} opacity="0.55">
              <circle cx={CX + Math.cos(a) * d} cy={CY + Math.sin(a) * d} r={r} fill="#03050d" opacity="0.3" />
              <circle cx={CX + Math.cos(a) * d - r * 0.2} cy={CY + Math.sin(a) * d - r * 0.2} r={r * 0.82} fill={p.body} opacity="0.45" />
            </g>
          );
        })}
        {/* The card's own feature. Craters get their ray system; the base gets a lander. */}
        {base ? (
          <g>
            <ellipse cx={fx} cy={fy} rx="26" ry="18" fill={p.shade} opacity="0.5" />
            <g transform={`translate(${fx} ${fy}) scale(1.1)`}>
              <path d="M-5 -4 h10 l2 4 -3 3 h-8 l-3 -3 z" fill="#f2f6ff" opacity="0.95" />
              <path d="M-6 3 h12 v3 h-12 z" fill={p.shade} opacity="0.9" />
              <g stroke="#f2f6ff" strokeWidth="1" opacity="0.9">
                <line x1="-6" y1="6" x2="-9" y2="11" />
                <line x1="6" y1="6" x2="9" y2="11" />
              </g>
              <line x1="11" y1="10" x2="11" y2="-2" stroke="#f2f6ff" strokeWidth="0.8" opacity="0.8" />
              <path d="M11 -2 h7 v4 h-7 z" fill="#ffb347" opacity="0.9" />
            </g>
          </g>
        ) : (
          <g>
            <g stroke="#f5f8ff" strokeOpacity="0.32" strokeLinecap="round">
              {Array.from({ length: 18 }, (_, i) => {
                const a = (i / 18) * Math.PI * 2 + 0.3;
                const l = 26 + rand() * 54;
                return (
                  <line
                    key={i}
                    x1={fx + Math.cos(a) * 16}
                    y1={fy + Math.sin(a) * 16}
                    x2={fx + Math.cos(a) * l}
                    y2={fy + Math.sin(a) * l}
                    strokeWidth={0.6 + rand() * 1.6}
                  />
                );
              })}
            </g>
            <circle cx={fx} cy={fy} r="22" fill="#03050d" opacity="0.45" />
            <circle cx={fx - 2} cy={fy - 2} r="20" fill="#fbfdff" opacity="0.88" />
            <circle cx={fx} cy={fy} r="13" fill={p.shade} opacity="0.6" />
            <circle cx={fx + 2} cy={fy + 2} r="10" fill="#03050d" opacity="0.3" />
            <circle cx={fx} cy={fy} r="4" fill="#fbfdff" opacity="0.95" />
          </g>
        )}
        <Terminator r={78} />
        <Limb r={78} color={p.glow} />
      </g>
    );
  }

  if (designation === 'SATURN') {
    return (
      <g>
        <circle cx={CX} cy={CY} r="82" fill={p.glow} opacity="0.08" />
        <g transform={`rotate(-17 ${CX} ${CY})`}>
          <ellipse cx={CX} cy={CY} rx="112" ry="30" fill="none" stroke={p.glow} strokeOpacity="0.28" strokeWidth="16" />
          <ellipse cx={CX} cy={CY} rx="112" ry="30" fill="none" stroke={p.body} strokeOpacity="0.55" strokeWidth="5" />
          <ellipse cx={CX} cy={CY} rx="98" ry="26" fill="none" stroke="#03050d" strokeOpacity="0.9" strokeWidth="2" />
          <ellipse cx={CX} cy={CY} rx="90" ry="24" fill="none" stroke={p.body} strokeOpacity="0.45" strokeWidth="6" />
        </g>
        <circle cx={CX} cy={CY} r="60" fill={body} />
        {Array.from({ length: 6 }, (_, i) => (
          <ellipse key={i} cx={CX} cy={CY - 42 + i * 17} rx={58 - Math.abs(i - 2.5) * 7} ry={4.5} fill={p.shade} opacity={0.2 + rand() * 0.14} />
        ))}
        {/* The rings throw their own shadow across the southern bands. */}
        <path d={`M${CX - 58} ${CY + 12} q58 16 116 -4 v9 q-58 20 -116 4 z`} fill="#03050d" opacity="0.35" />
        <Terminator r={60} />
        <Limb r={60} color={p.glow} />
        <g transform={`rotate(-17 ${CX} ${CY})`}>
          <ellipse cx={CX} cy={CY} rx="112" ry="30" fill="none" stroke={p.body} strokeOpacity="0.3" strokeWidth="1" />
        </g>
        <circle cx="168" cy="118" r="4" fill={p.body} opacity="0.7" />
        <circle cx="38" cy="238" r="2.4" fill={p.body} opacity="0.55" />
      </g>
    );
  }

  if (designation === 'JUPITER') {
    const r = 66;
    return (
      <g>
        <circle cx={CX} cy={CY} r={r + 8} fill={p.glow} opacity="0.07" />
        <circle cx={CX} cy={CY} r={r} fill={body} />
        {Array.from({ length: 9 }, (_, i) => (
          <ellipse
            key={i}
            cx={CX}
            cy={CY - r * 0.82 + (i * r * 1.64) / 8}
            rx={Math.sqrt(Math.max(0, r * r - Math.pow(r * 0.82 - (i * r * 1.64) / 8, 2)))}
            ry={r * 0.075}
            fill={i % 2 ? p.shade : '#fdf1dd'}
            opacity={i % 2 ? 0.34 : 0.22}
          />
        ))}
        <g transform={`translate(${CX + 20} ${CY + 16}) rotate(-8)`}>
          <ellipse cx="0" cy="0" rx="17" ry="10" fill="#8e3a22" opacity="0.8" />
          <ellipse cx="0" cy="0" rx="14" ry="8" fill="#d4572f" opacity="0.85" />
          <ellipse cx="0" cy="0" rx="6" ry="3.5" fill="#ffcfa6" opacity="0.5" />
        </g>
        <Terminator r={r} />
        <Limb r={r} color={p.glow} />
        <g fill={p.body} opacity="0.75">
          <circle cx="172" cy="126" r="2.6" />
          <circle cx="184" cy="150" r="1.9" />
          <circle cx="24" cy="204" r="2.2" />
          <circle cx="14" cy="166" r="1.6" />
        </g>
      </g>
    );
  }

  if (designation === 'MARS') {
    return (
      <g>
        <circle cx={CX} cy={CY} r="74" fill={p.glow} opacity="0.08" />
        <circle cx={CX} cy={CY} r="66" fill={body} />
        {/* The albedo markings: Syrtis Major high on one side, the southern
            highlands dark and broad beneath it. */}
        <g fill={p.shade}>
          <path d={`M${CX + 10} ${CY - 46} q30 6 26 34 q-20 12 -32 -4 q-8 -20 6 -30 z`} opacity="0.5" />
          <path d={`M${CX - 52} ${CY + 18} q34 -14 66 2 q-10 26 -40 26 q-24 -2 -26 -28 z`} opacity="0.34" />
          <ellipse cx={CX + 34} cy={CY + 34} rx="16" ry="9" opacity="0.26" transform={`rotate(-16 ${CX + 34} ${CY + 34})`} />
        </g>
        {/* Olympus Mons: the highest ground in the solar system, bright from here. */}
        <circle cx={CX - 30} cy={CY - 22} r="8" fill="#f6c39a" opacity="0.4" />
        <circle cx={CX - 30} cy={CY - 22} r="2.4" fill="#5d2314" opacity="0.45" />
        {/* Valles Marineris. */}
        <g transform={`rotate(-14 ${CX - 28} ${CY + 10})`} stroke="#5d2314" fill="none" strokeLinecap="round" opacity="0.55">
          <path d={`M${CX - 52} ${CY + 8} q18 -7 36 -3`} strokeWidth="2.4" />
          <path d={`M${CX - 26} ${CY + 6} q8 5 15 4`} strokeWidth="1.1" strokeOpacity="0.7" />
        </g>
        {/* The caps. */}
        <ellipse cx={CX - 2} cy={CY - 57} rx="18" ry="7" fill="#f4f8ff" opacity="0.7" />
        <ellipse cx={CX + 4} cy={CY + 61} rx="11" ry="4" fill="#f4f8ff" opacity="0.42" />
        <Terminator r={66} />
        <Limb r={66} color={p.glow} />
      </g>
    );
  }

  if (designation === 'VENUS') {
    return (
      <g>
        <circle cx={CX} cy={CY} r="80" fill={p.glow} opacity="0.1" />
        <circle cx={CX} cy={CY} r="68" fill={body} />
        {Array.from({ length: 5 }, (_, i) => (
          <path
            key={i}
            d={`M${CX - 60} ${CY - 40 + i * 20} q34 ${10 + i * 2} 60 ${-4 - i} q26 6 58 -6`}
            stroke={p.shade}
            strokeOpacity={0.22 + rand() * 0.16}
            strokeWidth={5 - i * 0.4}
            fill="none"
          />
        ))}
        {/* A crescent: Venus is only ever seen lit from the side. */}
        <path d={`M${CX} ${CY - 68} A68 68 0 0 1 ${CX} ${CY + 68} A30 68 0 0 0 ${CX} ${CY - 68}`} fill="#03050d" opacity="0.72" />
        <Limb r={68} color={p.glow} />
      </g>
    );
  }

  if (designation === 'PLUTO') {
    return (
      <g>
        <circle cx={CX} cy={CY} r="62" fill={p.glow} opacity="0.07" />
        <circle cx={CX} cy={CY} r="54" fill={body} />
        <ellipse cx={CX - 24} cy={CY - 20} rx="18" ry="12" fill={p.shade} opacity="0.4" />
        <ellipse cx={CX - 8} cy={CY + 34} rx="26" ry="10" fill={p.shade} opacity="0.3" />
        {/* Sputnik Planitia — the heart. */}
        <path
          d={`M${CX + 6} ${CY + 30} c-22 -12 -30 -30 -18 -40 c8 -7 18 -3 20 6 c4 -9 15 -12 22 -4 c10 11 0 28 -24 38 z`}
          fill="#f7efe2"
          opacity="0.9"
        />
        <Terminator r={54} tilt={8} />
        <Limb r={54} color={p.glow} />
        {/* Charon, half the size and never far. */}
        <circle cx="166" cy="106" r="13" fill={p.shade} opacity="0.7" />
        <circle cx="163" cy="103" r="10" fill={p.body} opacity="0.4" />
      </g>
    );
  }

  if (designation === 'M42') {
    return (
      <g>
        <g opacity="0.9">
          <ellipse cx={CX} cy={CY} rx="86" ry="66" fill={`url(#${id}-wash)`} />
          <ellipse cx={CX - 26} cy={CY - 14} rx="46" ry="38" fill={`url(#${id}-wash)`} transform={`rotate(-28 ${CX - 26} ${CY - 14})`} />
          <ellipse cx={CX + 30} cy={CY + 18} rx="40" ry="30" fill={`url(#${id}-glow)`} opacity="0.5" transform={`rotate(18 ${CX + 30} ${CY + 18})`} />
        </g>
        {/* The dark lane that gives the nebula its fish-mouth. */}
        <path d={`M${CX - 8} ${CY - 60} q14 34 -4 58 q-18 20 6 44`} stroke="#03050d" strokeWidth="13" fill="none" opacity="0.5" strokeLinecap="round" />
        {/* The Trapezium: four young stars doing the lighting. */}
        <g>
          {[
            [-5, -4],
            [4, -6],
            [6, 3],
            [-3, 5],
          ].map(([dx, dy], i) => (
            <g key={i}>
              <Spikes x={CX + dx * 1.6} y={CY + dy * 1.6} len={16 - i * 2} color="#ffffff" weight={0.7} />
              <circle cx={CX + dx * 1.6} cy={CY + dy * 1.6} r={2.4 - i * 0.2} fill="#ffffff" />
            </g>
          ))}
        </g>
      </g>
    );
  }

  /* The clusters, and anything else: a swarm, dense at the middle. */
  return (
    <g>
      <circle cx={CX} cy={CY} r="80" fill={`url(#${id}-wash)`} opacity="0.6" />
      {Array.from({ length: 180 }, (_, i) => {
        const a = rand() * Math.PI * 2;
        const d = Math.pow(rand(), 2.1) * 74;
        return <circle key={i} cx={CX + Math.cos(a) * d} cy={CY + Math.sin(a) * d} r={d < 20 ? 0.7 : 0.6 + rand() * 1.3} fill={rand() < 0.3 ? p.glow : '#ffffff'} opacity={0.35 + rand() * 0.6} />;
      })}
      <circle cx={CX} cy={CY} r="16" fill={`url(#${id}-glow)`} />
    </g>
  );
}
