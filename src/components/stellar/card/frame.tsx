import type { Rarity } from '@/lib/rarity';

/** Rounded rectangle as one path, the way the card generator draws it. */
export function rr(x: number, y: number, w: number, h: number, r: number) {
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

export const FOIL_OP: Record<Rarity, number> = { common: 0, rare: 0.05, epic: 0.12, legendary: 0.3 };
export const GLIT_OP: Record<Rarity, number> = { common: 0, rare: 0, epic: 0.12, legendary: 0.28 };

export const MONO = 'var(--font-mono), ui-monospace, monospace';
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

export type Palette = {
  /** The stock the card is printed on, light to dark. Metal stocks run as a diagonal sheen. */
  stock: string[];
  metal: boolean;
  /** The deckle at the very edge. */
  edge: string;
  /** The block the name prints on, and its inks. */
  band: string;
  title: string;
  sub: string;
  /** The reason band under the name: what holding the card gives. */
  reasonFill: string;
  reasonStroke: string;
  reasonInk: string;
  glint: string;
  /** The title in the dark box on the back. */
  boxInk: string;
  /** Text on the stock itself, on the back. */
  ink: string;
  muted: string;
  rule: string;
};

/** One stock per rarity: cream and red for a common, brushed steel and ultramarine for a rare, a sunset for an epic, gold for a legendary. */
export const PALETTE: Record<Rarity, Palette> = {
  common: {
    stock: ['#f1e6cc', '#e8dbbd', '#d9c9a5'],
    metal: false,
    edge: '#b9a37c',
    band: '#c4282a',
    title: '#f3e6cc',
    sub: '#f3e6cc',
    reasonFill: 'rgba(255, 250, 240, .35)',
    reasonStroke: '#b9a37c',
    reasonInk: '#2a1a10',
    glint: '#c4282a',
    boxInk: '#f3e6cc',
    ink: '#2a1a10',
    muted: '#7a5a44',
    rule: '#241810',
  },
  rare: {
    stock: ['#f2f4f8', '#cfd5de', '#eef1f5', '#b3bbc8', '#d6dbe3'],
    metal: true,
    edge: '#8f9aab',
    band: '#1e4a9a',
    title: '#f2f5fa',
    sub: '#dce5f5',
    reasonFill: 'rgba(255, 255, 255, .28)',
    reasonStroke: '#6b89c4',
    reasonInk: '#1e4a9a',
    glint: '#2d5fc0',
    boxInk: '#dfe8fb',
    ink: '#1b2a45',
    muted: '#4e5d78',
    rule: '#1b2a45',
  },
  epic: {
    stock: ['#f07a48', '#d6422a', '#8e1e12'],
    metal: false,
    edge: '#ffb08a',
    band: '#1a1110',
    title: '#ff8a4a',
    sub: '#f6dcc8',
    reasonFill: 'rgba(22, 10, 8, .5)',
    reasonStroke: '#ffb08a',
    reasonInk: '#ffe6d4',
    glint: '#ff8a4a',
    boxInk: '#ff8a4a',
    ink: '#fff0e4',
    muted: '#ffd2bc',
    rule: '#fff0e4',
  },
  legendary: {
    stock: ['#f7e9b6', '#c9a24a', '#f3dc8a', '#b8923c', '#e6c870'],
    metal: true,
    edge: '#8a6a26',
    band: '#171210',
    title: '#f3dc8a',
    sub: '#f3e6cc',
    reasonFill: 'rgba(22, 16, 8, .8)',
    reasonStroke: '#d9b85a',
    reasonInk: '#f3dc8a',
    glint: '#f3dc8a',
    boxInk: '#f3dc8a',
    ink: '#2a1e0a',
    muted: '#6b5420',
    rule: '#2a1e0a',
  },
};

/** Average advance per character, in em, measured on the set's capitals. */
const ADV = { title: 0.73, condensed: 0.45, spaced: 0.45, spacedBold: 0.49 };

/** Font size at which a line of `len` characters fills no more than `max` units. */
export const fit = (len: number, max: number, adv: keyof typeof ADV, cap: number) => Math.min(cap, max / (Math.max(1, len) * ADV[adv]));
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
  const pal = PALETTE[rarity];
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
      {pal.metal ? (
        <linearGradient id={`${u}paper`} x1="0" y1="0" x2="1" y2="1">
          {pal.stock.map((c, i) => (
            <stop key={i} offset={i / (pal.stock.length - 1)} stopColor={c} />
          ))}
        </linearGradient>
      ) : (
        <radialGradient id={`${u}paper`} cx=".5" cy=".38" r=".85">
          <stop offset="0" stopColor={pal.stock[0]} />
          <stop offset=".7" stopColor={pal.stock[1]} />
          <stop offset="1" stopColor={pal.stock[2]} />
        </radialGradient>
      )}
      <filter id={`${u}grain`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves={2} seed={3} />
        <feColorMatrix type="matrix" values="0 0 0 0 .33  0 0 0 0 .22  0 0 0 0 .12  0 0 0 .16 0" />
        <feComposite in2="SourceGraphic" operator="in" />
      </filter>
    </>
  );
}

/** The stock with a window cut out of it, grain on the paper, a darker deckle at the very edge. */
export function Paper({ u, hole, edge = INK.paperLo }: { u: string; hole?: string; edge?: string }) {
  const card = rr(0, 0, 630, 880, 30);
  const d = hole ? `${card} ${hole}` : card;
  return (
    <>
      <path d={d} fill={`url(#${u}paper)`} fillRule="evenodd" />
      <path d={d} fill="#000" fillRule="evenodd" filter={`url(#${u}grain)`} />
      <path d={rr(1, 1, 628, 878, 29)} fill="none" stroke={edge} strokeWidth="2" opacity=".7" />
    </>
  );
}

/** A four-pointed glint, the kind a lens throws off a bright star. */
export function Glint({ x, y, r, o = 1, color = '#fffaf0' }: { x: number; y: number; r: number; o?: number; color?: string }) {
  const t = r * 0.07;
  return (
    <g transform={`translate(${x} ${y})`} opacity={o}>
      <path d={`M0 ${-r}L${t} ${-t}L${r * 0.62} 0L${t} ${t}L0 ${r}L${-t} ${t}L${-r * 0.62} 0L${-t} ${-t}Z`} fill={color} />
      <circle r={r * 0.12} fill={color} />
    </g>
  );
}
