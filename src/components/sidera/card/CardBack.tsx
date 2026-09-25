import { memo } from 'react';
import { editionLabel, type Plate } from '@/lib/sidera/plate';
import { DISPLAY, FOIL_OP, FrameBorder, FrameDefs, LOGO_D, MONO, SANS, rr } from './frame';

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

function CardBack({ plate: c, edition, commitment, sealed = false, u }: Props) {
  const r = sealed ? 'common' : c.rarity;
  const b = `${u}b`;
  const ed = editionLabel(edition);
  const micro = sealed
    ? 'SIDERA · FIRST LIGHT · SEALED · NODE 01 · TBILISI · '
    : `SIDERA · FIRST LIGHT · ${c.des.split(' · ')[0]} · EDITION ${ed} OF ${c.of} · NODE 01 · TBILISI · `;
  const lines = sealed
    ? ['One card of First Light.', 'Turn it over.']
    : [
        ...c.story,
        c.section === 'almanac'
          ? 'On the night, every holder receives the capture.'
          : c.noun
            ? `When Node 01 photographs ${c.noun}, every holder receives the image.`
            : edition == null
              ? `One of ${c.of} editions.`
              : `Edition ${ed} of ${c.of}.`,
      ];

  return (
    <div className="sdc-card" style={{ boxShadow: '0 40px 90px -30px rgba(0,0,0,.95)' }}>
      <svg className="sdc-frame" viewBox="0 0 630 880" aria-hidden="true">
        <defs>
          <FrameDefs u={b} rarity={r} />
          <radialGradient id={`${b}bk`} cx=".5" cy=".42" r=".7">
            <stop offset="0" stopColor="#121c40" />
            <stop offset=".6" stopColor="#0a1128" />
            <stop offset="1" stopColor="#060a18" />
          </radialGradient>
        </defs>
        <FrameBorder u={b} rarity={r} micro={micro} ground={<path d={rr(0, 0, 630, 880, 30)} fill={`url(#${b}bk)`} />} />
        <g fill="none" stroke={`url(#${b}metal)`} strokeWidth=".5">
          <path d={SEAL[0]} opacity=".38" />
          <path d={SEAL[1]} opacity=".3" />
          <path d={SEAL[2]} opacity=".22" />
        </g>
        {[48, 52, 150].map((radius) => (
          <circle key={radius} cx="315" cy="372" r={radius} fill="none" stroke={`url(#${b}metal)`} strokeWidth={radius === 48 ? 1.2 : 0.6} opacity=".7" />
        ))}
        <circle cx="315" cy="372" r="47" fill="#080d1e" />
        <g transform="translate(294 351) scale(1.9)">
          <path d={LOGO_D} fill={`url(#${b}metal)`} />
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
          </>
        )}
        <text x="315" y="640" textAnchor="middle" fill={`url(#${b}metalH)`} style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 26, letterSpacing: 11 }}>
          SIDERA
        </text>
        <text x="315" y="668" textAnchor="middle" fill="rgba(245,241,232,.6)" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 2.4 }}>
          {sealed ? 'FIRST LIGHT · SEALED' : `FIRST LIGHT · ${c.num} / 24 · ${c.glyph} ${c.rname.toUpperCase()}`}
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
          NODE 01 · TBILISI · COMMISSIONING
        </text>
      </svg>
      <div className="sdc-foil" style={{ opacity: Math.max(0.1, FOIL_OP[r] * 0.7) }} />
      <div className="sdc-glare" />
    </div>
  );
}

export default memo(CardBack);
