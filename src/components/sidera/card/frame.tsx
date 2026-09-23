import type { Rarity } from '@/lib/rarity';

/** Rounded rectangle as one path, the way the card generator draws it. */
export function rr(x: number, y: number, w: number, h: number, r: number) {
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

const METAL: Record<Rarity, string[]> = {
  common: ['#f4f6fa', '#9aa3b5', '#e3e8ef', '#6f788a', '#cfd5df'],
  rare: ['#e2fff8', '#5eead4', '#2a9d8f', '#b8f7ea', '#3fb5a3'],
  epic: ['#fff3cf', '#e0a84a', '#fde6a8', '#9c6a22', '#ffd98a'],
  legendary: ['#fffaf0', '#ffe3a3', '#f4c9ff', '#bfe9ff', '#ffe9b8'],
};
export const METAL_INK: Record<Rarity, string> = { common: '#dfe4ec', rare: '#8ff0dc', epic: '#ffd98a', legendary: '#fff0cc' };
export const FOIL_OP: Record<Rarity, number> = { common: 0, rare: 0.12, epic: 0.26, legendary: 0.46 };
export const GLIT_OP: Record<Rarity, number> = { common: 0, rare: 0, epic: 0.16, legendary: 0.34 };

export const MONO = 'var(--font-mono), ui-monospace, monospace';
export const SANS = 'var(--font-geist), system-ui, sans-serif';
export const DISPLAY = 'var(--font-orbitron), sans-serif';

export const LOGO_D =
  'M13.0922 3.36946V1.73961C13.0922 1.27436 12.5543 1.01542 12.1906 1.30569L2.8604 8.75177C-0.321404 11.5593 -0.474794 16.4692 2.52582 19.4698C5.5263 22.4704 10.4363 22.3171 13.2437 19.1351L20.6898 9.80489C20.9801 9.44124 20.7211 8.90346 20.256 8.90346H18.6262C18.211 8.90346 17.9428 8.4646 18.132 8.09517L21.7925 0.950365C22.0383 0.470724 21.5251 -0.0425023 21.0451 0.203175L13.9005 3.86349C13.531 4.05286 13.0922 3.78447 13.0922 3.36946ZM7.99167 18.4452C5.53886 18.4452 3.55044 16.4567 3.55044 14.004C3.55044 11.5512 5.53872 9.56274 7.99167 9.5626C10.4445 9.5626 12.4329 11.5512 12.4329 14.004C12.4329 16.4568 10.4445 18.4452 7.99167 18.4452Z';

/** The rarity metal as two gradients (diagonal and horizontal), the guilloche and the microtext path. */
export function FrameDefs({ u, rarity }: { u: string; rarity: Rarity }) {
  const m = METAL[rarity];
  const stops = m.map((c, i) => <stop key={i} offset={i / (m.length - 1)} stopColor={c} />);
  return (
    <>
      <linearGradient id={`${u}metal`} x1="0" y1="0" x2="1" y2="1">
        {stops}
      </linearGradient>
      <linearGradient id={`${u}metalH`} x1="0" y1="0" x2="1" y2="0">
        {stops}
      </linearGradient>
      <pattern id={`${u}gui`} width="14" height="7" patternUnits="userSpaceOnUse">
        <path d="M0 3.5Q3.5 0 7 3.5T14 3.5M0 3.5Q3.5 7 7 3.5T14 3.5" fill="none" stroke={METAL_INK[rarity]} strokeWidth=".45" opacity=".55" />
      </pattern>
      <path id={`${u}mp`} d={rr(12.6, 12.6, 604.8, 854.8, 24)} />
    </>
  );
}

/** Border, guilloche band, both metal rules and the microtext serial. */
export function FrameBorder({ u, rarity, micro, ground }: { u: string; rarity: Rarity; micro: string; ground: React.ReactNode }) {
  return (
    <>
      {ground}
      <path d={`${rr(6, 6, 618, 868, 27)} ${rr(19, 19, 592, 842, 21)}`} fill={`url(#${u}gui)`} fillRule="evenodd" />
      <path d={rr(2.5, 2.5, 625, 875, 28)} fill="none" stroke={`url(#${u}metal)`} strokeWidth="2.6" />
      <path d={rr(19.5, 19.5, 591, 841, 20.5)} fill="none" stroke={`url(#${u}metal)`} strokeWidth=".8" />
      <text fill={METAL_INK[rarity]} opacity=".7" style={{ fontFamily: MONO, fontSize: 5.4, letterSpacing: 0.9 }}>
        <textPath href={`#${u}mp`}>{micro.repeat(12)}</textPath>
      </text>
    </>
  );
}
