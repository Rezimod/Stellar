import { memo } from 'react';
import { editionLabel, type Plate } from '@/lib/stellar/plate';
import { DISPLAY, LOGO_D, MONO, SANS } from './frame';
import type { Rarity } from '@/lib/rarity';

const LIGHT: Record<Rarity, string> = { common: '#c9ced8', rare: '#5eead4', epic: '#ffb347', legendary: '#f7dc8a' };

type Props = {
  plate: Plate;
  edition?: number | null;
  /** The capsule commitment the edition was drawn from. */
  commitment?: string | null;
  /** Face down and not yet turned: nothing on it says which card it is. */
  sealed?: boolean;
  u: string;
};

/** A hypotrochoid, the curve a spirograph draws: the seal on the back. */
function rosette(cx: number, cy: number, R: number, r: number, d: number, s: number, rot: number, steps: number) {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const per = (2 * Math.PI * r) / gcd(R, r);
  const a = (rot * Math.PI) / 180;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (per * i) / steps;
    const x = (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
    const y = (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
    pts.push(`${(cx + s * (x * Math.cos(a) - y * Math.sin(a))).toFixed(1)} ${(cy + s * (x * Math.sin(a) + y * Math.cos(a))).toFixed(1)}`);
  }
  return 'M' + pts.join('L');
}

const SEAL = [rosette(315, 372, 24, 7, 12, 6.2, 0, 1400), rosette(315, 372, 20, 9, 7, 6.6, 9, 1200), rosette(315, 372, 30, 11, 16, 4.6, 4, 1500)];

const short = (hash: string) => `[${hash.slice(0, 4)}…${hash.slice(-4)}]`;

/** "IMAGE · NASA, ESA … · PUBLIC DOMAIN", cut to fit one line of the back. */
function credit(p: NonNullable<Plate['photo']>) {
  const head = p.kind === 'illustration' ? "ARTIST'S IMPRESSION" : 'IMAGE';
  const tail = p.license.toUpperCase();
  const room = 86 - head.length - tail.length - 6;
  const who = p.credit.length > room ? `${p.credit.slice(0, room - 1).trimEnd()}…` : p.credit;
  return `${head} · ${who.toUpperCase()} · ${tail}`;
}

function CardBack({ plate: c, edition, commitment, sealed = false, u }: Props) {
  const r = sealed ? 'common' : c.rarity;
  const b = `${u}b`;
  const light = LIGHT[r];
  const ed = editionLabel(edition);
  const lines = sealed
    ? ['One card of First Light.', 'Turn it over.']
    : [
        ...c.story,
        c.section === 'almanac'
          ? 'On the night, every holder receives the capture.'
          : c.family === 'frontier'
            ? 'Fiction. A Stellar world, in no sky but this one.'
          : c.noun
            ? `When Live Telescope V1 photographs ${c.noun}, every holder receives the image.`
            : edition == null
              ? `One of ${c.of} editions.`
              : `Edition ${ed} of ${c.of}.`,
      ];

  return (
    <div className="sdc-card" style={{ boxShadow: '0 40px 90px -30px rgba(0,0,0,.95)' }}>
      <svg className="sdc-frame" viewBox="0 0 630 880" aria-hidden="true">
        <defs>
          <radialGradient id={`${b}bk`} cx=".5" cy=".42" r=".75">
            <stop offset="0" stopColor="#0d1326" />
            <stop offset=".65" stopColor="#05070f" />
            <stop offset="1" stopColor="#020308" />
          </radialGradient>
          <linearGradient id={`${b}edge`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={light} stopOpacity="0" />
            <stop offset=".5" stopColor={light} />
            <stop offset="1" stopColor={light} stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="630" height="880" fill={`url(#${b}bk)`} />
        <rect x="21" y="21" width="588" height="838" rx="18" fill="none" stroke="rgba(255,255,255,.24)" strokeWidth="1.6" />
        <rect x="0" y="874" width="630" height="6" fill={`url(#${b}edge)`} />
        <g fill="none" stroke="rgba(255,255,255,.9)" strokeWidth=".5">
          <path d={SEAL[0]} opacity=".38" />
          <path d={SEAL[1]} opacity=".3" />
          <path d={SEAL[2]} opacity=".22" />
        </g>
        {[48, 52, 150].map((radius) => (
          <circle key={radius} cx="315" cy="372" r={radius} fill="none" stroke={radius === 48 ? light : "rgba(255,255,255,.35)"} strokeWidth={radius === 48 ? 1.2 : 0.6} opacity=".7" />
        ))}
        <circle cx="315" cy="372" r="47" fill="#05070f" />
        <g transform="translate(294 351) scale(1.9)">
          <path d={LOGO_D} fill="#F4EDE0" />
        </g>
        <text x="315" y="104" textAnchor="middle" fill="rgba(245,241,232,.6)" style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 2.4 }}>
          {sealed ? 'FIRST LIGHT · COLLECTIBLE ASTRONOMY' : c.back}
        </text>
        <line x1="60" y1="124" x2="570" y2="124" stroke="rgba(245,241,232,.1)" />
        {!sealed && (
          <>
            <text x="315" y="184" textAnchor="middle" fill="#f5f1e8" style={{ fontFamily: SANS, fontWeight: 600, fontSize: Math.min(40, c.nameSize * 0.7), letterSpacing: -1 }}>
              {c.name}
            </text>
            <text x="315" y="208" textAnchor="middle" fill="rgba(245,241,232,.55)" style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 2.2 }}>
              {c.kicker}
            </text>
            {c.data.map(([label, value], i) => (
              <g key={label} transform={`translate(${315 + (i - 1) * 176} 560)`}>
                <text textAnchor="middle" fill="rgba(245,241,232,.5)" style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 2 }}>
                  {label}
                </text>
                <text y="24" textAnchor="middle" fill="#f5f1e8" style={{ fontFamily: MONO, fontSize: 15 }}>
                  {value}
                </text>
              </g>
            ))}
            {c.photo && (
              <text x="315" y="606" textAnchor="middle" fill="rgba(245,241,232,.42)" style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 1.2 }}>
                {credit(c.photo)}
              </text>
            )}
          </>
        )}
        <text x="315" y="640" textAnchor="middle" fill="#f5f1e8" style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 26, letterSpacing: 11 }}>
          STELLAR
        </text>
        <text x="315" y="668" textAnchor="middle" fill="rgba(245,241,232,.6)" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 2.4 }}>
          {sealed ? 'FIRST LIGHT · SEALED' : `FIRST LIGHT · ${c.glyph} ${c.rname.toUpperCase()}`}
        </text>
        {lines.map((line, i) => (
          <text key={i} x="315" y={706 + i * 24} textAnchor="middle" fill={i === 2 ? 'rgba(245,241,232,.55)' : 'rgba(245,241,232,.86)'} style={{ fontFamily: SANS, fontSize: i === 2 ? 13 : 16 }}>
            {line}
          </text>
        ))}
        <line x1="60" y1="790" x2="570" y2="790" stroke="rgba(245,241,232,.1)" />
        <text x="60" y="820" fill="rgba(245,241,232,.5)" style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: 1.6 }}>
          COMMITMENT
        </text>
        <text x="570" y="820" textAnchor="end" fill="rgba(245,241,232,.78)" style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: 1.2 }}>
          {commitment ? short(commitment) : '—'}
        </text>
        <text x="60" y="840" fill="rgba(245,241,232,.5)" style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: 1.6 }}>
          LIVE TELESCOPE V1 · TBILISI · COMMISSIONING
        </text>
      </svg>
      <div className="sdc-glare" />
    </div>
  );
}

export default memo(CardBack);
