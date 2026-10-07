import type { Rarity } from '@/lib/rarity';

/** Rounded rectangle as one path, the way the card generator draws it. */
export function rr(x: number, y: number, w: number, h: number, r: number) {
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

export const FOIL_OP: Record<Rarity, number> = { common: 0, rare: 0.05, epic: 0.12, legendary: 0.3 };
export const GLIT_OP: Record<Rarity, number> = { common: 0, rare: 0, epic: 0.12, legendary: 0.28 };

export const MONO = 'var(--font-mono), ui-monospace, monospace';
export const SANS = 'var(--font-geist), system-ui, sans-serif';
export const TITLE = 'var(--font-bowlby), Impact, sans-serif';
export const CONDENSED = 'var(--font-anton), Impact, sans-serif';
export const SPACED = 'var(--font-oswald), sans-serif';

/** The poster's inks: the paper, the dark it prints on, and the sunset the titles are cut from. */
export const INK = {
  paper: '#e8dbbd',
  paperHi: '#f1e6cc',
  paperLo: '#d9c9a5',
  night: '#0e0806',
  text: '#2a1a10',
  muted: '#7a5a44',
  red: '#b8372a',
  orange: '#ee8c3a',
  quote: '#f2a35a',
  cream: '#f3e6cc',
};

export const LOGO_D =
  'M13.0922 3.36946V1.73961C13.0922 1.27436 12.5543 1.01542 12.1906 1.30569L2.8604 8.75177C-0.321404 11.5593 -0.474794 16.4692 2.52582 19.4698C5.5263 22.4704 10.4363 22.3171 13.2437 19.1351L20.6898 9.80489C20.9801 9.44124 20.7211 8.90346 20.256 8.90346H18.6262C18.211 8.90346 17.9428 8.4646 18.132 8.09517L21.7925 0.950365C22.0383 0.470724 21.5251 -0.0425023 21.0451 0.203175L13.9005 3.86349C13.531 4.05286 13.0922 3.78447 13.0922 3.36946ZM7.99167 18.4452C5.53886 18.4452 3.55044 16.4567 3.55044 14.004C3.55044 11.5512 5.53872 9.56274 7.99167 9.5626C10.4445 9.5626 12.4329 11.5512 12.4329 14.004C12.4329 16.4568 10.4445 18.4452 7.99167 18.4452Z';

/** Average advance per character, in em, measured on the set's capitals. */
const ADV = { title: 0.73, condensed: 0.45, spaced: 0.45, spacedBold: 0.49 };

/** Font size at which a line of `len` characters fills no more than `max` units. */
export const fit = (len: number, max: number, adv: keyof typeof ADV, cap: number) => Math.min(cap, max / (Math.max(1, len) * ADV[adv]));
/** Bowlby One's advance per capital, in em, read from the font: an average undersizes M and W, and the title then gets squeezed to fit. */
const BOWLBY: Record<string, number> = {
  ' ': 0.35, A: 0.8, B: 0.767, C: 0.76, D: 0.805, E: 0.638, F: 0.618, G: 0.821, H: 0.808, I: 0.411, J: 0.675, K: 0.804, L: 0.618, M: 1.071,
  N: 0.843, O: 0.803, P: 0.746, Q: 0.802, R: 0.762, S: 0.725, T: 0.644, U: 0.789, V: 0.759, W: 1.04, X: 0.781, Y: 0.744, Z: 0.681,
  '0': 0.714, '1': 0.771, '2': 0.712, '3': 0.71, '4': 0.7, '5': 0.717, '6': 0.711, '7': 0.714, '8': 0.708, '9': 0.711,
  '-': 0.419, '.': 0.378, ',': 0.359, "'": 0.392, '’': 0.354, '‘': 0.355, '*': 0.454, '&': 0.886,
};
/** A title line's width in em. */
const titleEm = (line: string) => [...line].reduce((sum, ch) => sum + (BOWLBY[ch] ?? ADV.title), 0);

/** Width a line will take at that size, plus its tracking. */
export const width = (len: number, size: number, adv: keyof typeof ADV, track = 0) => len * (size * ADV[adv] + track);

/** The sunset the striped letters are cut from, cream at the top to brick at the foot. */
export const SUNSET: Record<Rarity, string[]> = {
  common: ['#fff3d2', '#ffd36b', '#f7931f', '#e0481f', '#a81c14'],
  rare: ['#fff3d2', '#ffd36b', '#f7931f', '#e0481f', '#a81c14'],
  epic: ['#fff5d8', '#ffd66e', '#f8901c', '#e2431c', '#a51912'],
  legendary: ['#fffbea', '#ffe9a3', '#ffc34d', '#f3913a', '#d0602a'],
};

/** Shared gradients: the sunset fill, the rule triple, the paper grain. */
export function PosterDefs({ u, rarity }: { u: string; rarity: Rarity }) {
  const s = SUNSET[rarity];
  return (
    <>
      <linearGradient id={`${u}sun`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={s[0]} />
        <stop offset=".34" stopColor={s[1]} />
        <stop offset=".56" stopColor={s[2]} />
        <stop offset=".78" stopColor={s[3]} />
        <stop offset="1" stopColor={s[4]} />
      </linearGradient>
      {[
        ['ry', '#f6c46a'],
        ['ro', INK.orange],
        ['rr', '#c8402a'],
      ].map(([k, c]) => (
        <linearGradient key={k} id={`${u}${k}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={c} stopOpacity="0" />
          <stop offset=".12" stopColor={c} />
          <stop offset=".88" stopColor={c} />
          <stop offset="1" stopColor={c} stopOpacity="0" />
        </linearGradient>
      ))}
      <linearGradient id={`${u}edge`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={INK.orange} stopOpacity="0" />
        <stop offset=".5" stopColor={INK.orange} />
        <stop offset="1" stopColor={INK.orange} stopOpacity="0" />
      </linearGradient>
      <radialGradient id={`${u}paper`} cx=".5" cy=".38" r=".85">
        <stop offset="0" stopColor={INK.paperHi} />
        <stop offset=".7" stopColor={INK.paper} />
        <stop offset="1" stopColor={INK.paperLo} />
      </radialGradient>
      <filter id={`${u}grain`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves={2} seed={3} />
        <feColorMatrix type="matrix" values="0 0 0 0 .33  0 0 0 0 .22  0 0 0 0 .12  0 0 0 .16 0" />
        <feComposite in2="SourceGraphic" operator="in" />
      </filter>
    </>
  );
}

/** Cream card with a window cut out of it, grain on the paper, a darker deckle at the very edge. */
export function Paper({ u, hole }: { u: string; hole?: string }) {
  const card = rr(0, 0, 630, 880, 30);
  const d = hole ? `${card} ${hole}` : card;
  return (
    <>
      <path d={d} fill={`url(#${u}paper)`} fillRule="evenodd" />
      <path d={d} fill="#000" fillRule="evenodd" filter={`url(#${u}grain)`} />
      <path d={rr(1, 1, 628, 878, 29)} fill="none" stroke="#b9a37c" strokeWidth="2" opacity=".7" />
    </>
  );
}

/** Three warm hairlines under the window, fading at both ends. */
export function Rules({ u, y }: { u: string; y: number }) {
  return (
    <g>
      <rect x="30" y={y} width="570" height="1.4" fill={`url(#${u}ry)`} />
      <rect x="30" y={y + 4} width="570" height="2" fill={`url(#${u}ro)`} />
      <rect x="30" y={y + 9} width="570" height="1.4" fill={`url(#${u}rr)`} />
    </g>
  );
}

/** A four-pointed glint, the kind a lens throws off a bright star. */
export function Glint({ x, y, r, o = 1 }: { x: number; y: number; r: number; o?: number }) {
  const t = r * 0.07;
  return (
    <g transform={`translate(${x} ${y})`} opacity={o}>
      <path d={`M0 ${-r}L${t} ${-t}L${r * 0.62} 0L${t} ${t}L0 ${r}L${-t} ${t}L${-r * 0.62} 0L${-t} ${-t}Z`} fill="#fffaf0" />
      <circle r={r * 0.12} fill="#fff" />
    </g>
  );
}

/** Where each sunset colour sits down the letter: a long cream crown, then the heat comes on fast. */
const STOPS = [0.1, 0.36, 0.55, 0.74, 1];

/**
 * The title, in strong sunset letters, a dark
 * extrusion under them and a glint on the last letter. Lines run centred on x,
 * the last line's baseline at `base`.
 */
export function StripedTitle({ u, rarity, lines, base, max = 540, cap = 84, glint = true }: { u: string; rarity: Rarity; lines: string[]; base: number; max?: number; cap?: number; glint?: boolean }) {
  const widest = Math.max(...lines.map(titleEm));
  const size = Math.min(lines.length > 1 ? Math.min(cap, 70) : cap, max / widest);
  const lead = size * 0.98;
  const capH = size * 0.74;
  const s = SUNSET[rarity];
  return (
    <g>
      {lines.map((line, i) => {
        const y = base - (lines.length - 1 - i) * lead;
        const natural = titleEm(line) * size;
        // Short names spread out the way SATURN does on the poster; long ones keep their own spacing.
        const w = line.length <= 7 ? Math.min(max, natural * (1 + (7 - line.length) * 0.06 + 0.08)) : Math.min(max, natural);
        const id = `${u}t${i}`;
        const common = {
          x: 315,
          y,
          textAnchor: 'middle' as const,
          textLength: w,
          lengthAdjust: (w >= natural ? 'spacing' : 'spacingAndGlyphs') as 'spacing' | 'spacingAndGlyphs',
          style: { fontFamily: TITLE, fontSize: size },
        };
        return (
          <g key={i}>
            <linearGradient id={`${id}g`} gradientUnits="userSpaceOnUse" x1="0" y1={y - capH} x2="0" y2={y}>
              {STOPS.map((at, k) => (
                <stop key={at} offset={at} stopColor={s[k]} />
              ))}
            </linearGradient>
            <text {...common} dy={size * 0.09} fill="#0c0503" stroke="#0c0503" strokeWidth={size * 0.07} strokeLinejoin="round" opacity=".92">
              {line}
            </text>
            <text {...common} fill="#140804" stroke="#140804" strokeWidth={size * 0.035} strokeLinejoin="round" opacity=".9">
              {line}
            </text>
            <text {...common} fill={`url(#${id}g)`}>
              {line}
            </text>
            {glint && i === lines.length - 1 && <Glint x={315 + w / 2 - size * 0.08} y={y - capH - size * 0.06} r={size * 0.5} />}
          </g>
        );
      })}
    </g>
  );
}

/** The badge's metals: the ring and lettering per rarity, and how much light it throws. */
const METAL: Record<Rarity, { a: string; b: string; glow: number }> = {
  common: { a: '#e6d8b4', b: '#a8997a', glow: 0.3 },
  rare: { a: '#ffd37a', b: '#d98a2c', glow: 0.55 },
  epic: { a: '#ff9a5c', b: '#e23c2a', glow: 0.75 },
  legendary: { a: '#fff1b8', b: '#f0b53c', glow: 0.95 },
};

/**
 * The enamel badge pinned over the card's top-right corner, half on the
 * cream and half on the night: the number in a cream disc, the rarity in
 * metal letters, a gloss across the top and the rarity's light around it.
 */
export function CornerBadge({ u, rarity, label, number }: { u: string; rarity: Rarity; label: string; number: string }) {
  const m = METAL[rarity];
  const text = label.toUpperCase();
  const numSize = number.length > 2 ? 19 : 23;
  const w = 62 + text.length * 12.6 + 30;
  const x = 596 - w;
  const y = 22;
  const h = 62;
  return (
    <g>
      <defs>
        <linearGradient id={`${u}cbm`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={m.a} />
          <stop offset=".5" stopColor={m.b} />
          <stop offset="1" stopColor={m.a} />
        </linearGradient>
        <linearGradient id={`${u}cbe`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a1b12" />
          <stop offset="1" stopColor="#0b0705" />
        </linearGradient>
        <linearGradient id={`${u}cbg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".28" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${u}cbs`} x1="0" y1="0" x2="1" y2="0">
          <stop offset=".3" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".22" />
          <stop offset=".7" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={`${u}cbf`} x="-40%" y="-80%" width="180%" height="260%">
          <feGaussianBlur stdDeviation="11" />
        </filter>
      </defs>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={m.b} opacity={m.glow} filter={`url(#${u}cbf)`} />
      <rect x={x + 2} y={y + 6} width={w - 4} height={h} rx={h / 2} fill="#000" opacity=".45" filter={`url(#${u}cbf)`} />
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={`url(#${u}cbe)`} stroke={`url(#${u}cbm)`} strokeWidth="2.4" />
      <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx={(h - 8) / 2} fill="none" stroke="#fff" strokeOpacity=".08" />
      <rect x={x + 3} y={y + 3} width={w - 6} height={h / 2 - 3} rx={(h / 2 - 3) / 2} fill={`url(#${u}cbg)`} />
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={`url(#${u}cbs)`} />
      <circle cx={x + 32} cy={y + h / 2} r="22" fill={INK.paperHi} stroke={`url(#${u}cbm)`} strokeWidth="1.8" />
      <text x={x + 32} y={y + h / 2 + numSize * 0.36} textAnchor="middle" fill={INK.night} style={{ fontFamily: CONDENSED, fontSize: numSize, letterSpacing: 0.3 }}>
        {number}
      </text>
      <text x={x + 66} y={y + h / 2 + 6} fill={`url(#${u}cbm)`} style={{ fontFamily: SPACED, fontWeight: 500, fontSize: 17, letterSpacing: 4.2 }}>
        {text}
      </text>
    </g>
  );
}

/** The panel's last line: the set on the left, the edition on the right, the set label between diamonds. */
export function Footer({ y, right }: { y: number; right: string }) {
  const st = { fontFamily: SPACED, fontWeight: 500, fontSize: 10.5, letterSpacing: 3.4 };
  return (
    <g>
      <text x="58" y={y} fill={INK.muted} style={st}>
        GENESIS
      </text>
      <text x="315" y={y} textAnchor="middle" fill={INK.muted} style={st}>
        <tspan fill={INK.red}>◆</tspan>
        {'  FOUNDING SET  '}
        <tspan fill={INK.red}>◆</tspan>
      </text>
      <text x="572" y={y} textAnchor="end" fill={INK.muted} style={st}>
        {right}
      </text>
    </g>
  );
}
