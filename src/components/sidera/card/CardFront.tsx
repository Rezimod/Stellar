import { memo } from 'react';
import { editionLabel, type Plate } from '@/lib/sidera/plate';
import { DISPLAY, FOIL_OP, FrameBorder, FrameDefs, GLIT_OP, LOGO_D, MONO, SANS, rr } from './frame';

type Props = {
  plate: Plate;
  /** The holder's edition number. Absent, the cartouche prints a dash. */
  edition?: number | null;
  /** A real capture from Node 01 in place of the drawn plate. */
  capture?: string | null;
  /** Small cards draw from the pre-rendered WebP layers: the same picture, none of the filter work. */
  lite?: boolean;
  u: string;
};

/** The window runs nearly the whole card; the name sits over the drawing's foot. */
const WIN_H = 832;

/** The face of a card: the drawing alone — sky and object, no survey — edge to edge under the metal frame; the name at its foot; foil, glitter and glare on top. */
function CardFront({ plate: c, edition, capture, lite = false, u }: Props) {
  const ext = lite ? 'webp' : 'svg';
  const r = c.rarity;
  const f = `${u}f`;
  const ed = editionLabel(edition);
  const win = rr(24, 24, 582, WIN_H, 18);
  const chipW = 30 + c.rname.length * 9.2;
  const micro = `SIDERA · FIRST LIGHT · ${c.des.split(' · ')[0]} · EDITION ${ed} OF ${c.of} · COMMITTED BEFORE SALE · `;
  const ranked = r === 'epic' || r === 'legendary';

  return (
    <div
      className="sdc-card"
      style={{ boxShadow: ranked ? '0 0 0 1px rgba(255,226,160,.08), 0 40px 90px -30px rgba(0,0,0,.95)' : '0 40px 90px -30px rgba(0,0,0,.95)' }}
    >
      <div className="sdc-window" style={{ height: '94.55%', borderRadius: '3.09% / 2.16%' }}>
        {capture ? (
          <div className="sdc-lay1">
            <img src={capture} alt="" loading="lazy" decoding="async" />
          </div>
        ) : (
          <>
            <div className="sdc-lay0">
              <img src={`${c.art}/sky.${ext}`} alt="" loading="lazy" decoding="async" />
            </div>
            <div className="sdc-lay1">
              <img src={`${c.art}/object.${ext}`} alt="" loading="lazy" decoding="async" />
            </div>
          </>
        )}
      </div>

      <svg className="sdc-frame" viewBox="0 0 630 880" aria-hidden="true">
        <defs>
          <FrameDefs u={f} rarity={r} />
          <linearGradient id={`${f}top`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#02030a" stopOpacity=".7" />
            <stop offset="1" stopColor="#02030a" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${f}bot`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#03040a" stopOpacity="0" />
            <stop offset=".5" stopColor="#03040a" stopOpacity=".78" />
            <stop offset="1" stopColor="#03040a" stopOpacity=".96" />
          </linearGradient>
        </defs>
        <FrameBorder
          u={f}
          rarity={r}
          micro={micro}
          ground={<path d={`${rr(0, 0, 630, 880, 30)} ${win}`} fill="#080d1e" fillRule="evenodd" />}
        />
        <path d={win} fill="none" stroke="rgba(0,0,0,.6)" strokeWidth="2" />
        <path d={win} fill="none" stroke={`url(#${f}metal)`} strokeWidth=".6" opacity=".8" />
        <rect x="24" y="24" width="582" height="92" fill={`url(#${f}top)`} />
        <rect x="24" y="600" width="582" height="256" fill={`url(#${f}bot)`} />
        {[
          [24, 24],
          [606, 24],
          [24, 24 + WIN_H],
          [606, 24 + WIN_H],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y})`} fill={`url(#${f}metal)`}>
            <path d="M0 -7L1.6 0L0 7L-1.6 0Z" />
            <path d="M-7 0L0 1.6L7 0L0 -1.6Z" />
          </g>
        ))}

        <g transform="translate(46 50) scale(.78)">
          <path d={LOGO_D} fill="#F4EDE0" />
        </g>
        <text x="68" y="64" fill="#f5f1e8" style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 13, letterSpacing: 4.5 }}>
          SIDERA
        </text>
        <text x="584" y="64" textAnchor="end" fill="rgba(245,241,232,.78)" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 2 }}>
          FIRST LIGHT · {c.num} / {c.total}
        </text>

        <g transform="translate(44 724)">
          <rect width={chipW} height="24" rx="12" fill="rgba(4,6,14,.72)" stroke={`url(#${f}metalH)`} strokeWidth=".9" />
          <text
            x={chipW / 2}
            y="16.2"
            textAnchor="middle"
            fill={`url(#${f}metalH)`}
            style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 500, letterSpacing: 2.2 }}
          >
            {c.glyph} {c.rname.toUpperCase()}
          </text>
        </g>

        <text x="46" y="806" fill="#f5f1e8" style={{ fontFamily: SANS, fontWeight: 600, fontSize: c.nameSize, letterSpacing: -1.6 }}>
          {c.name}
        </text>
        <text x="48" y="832" fill="rgba(245,241,232,.5)" style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: 2.2 }}>
          {c.kicker}
        </text>

        <g transform="translate(470 736)">
          <rect width="110" height="56" rx="9" fill="rgba(4,6,14,.55)" stroke={`url(#${f}metal)`} strokeWidth=".9" />
          <text x="12" y="17" fill="rgba(245,241,232,.55)" style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 2 }}>
            EDITION
          </text>
          <text x="12" y="44" fill={`url(#${f}metalH)`} style={{ fontFamily: MONO, fontSize: 24, fontWeight: 500 }}>
            {ed}
          </text>
          <text x="98" y="44" textAnchor="end" fill="rgba(245,241,232,.55)" style={{ fontFamily: MONO, fontSize: 10 }}>
            / {c.of}
          </text>
        </g>
      </svg>

      {FOIL_OP[r] > 0 && <div className="sdc-foil" style={{ opacity: FOIL_OP[r], ['--sdc-foil' as string]: FOIL_OP[r] }} />}
      {GLIT_OP[r] > 0 && (
        <svg className="sdc-glitter" style={{ opacity: GLIT_OP[r] }} viewBox="0 0 630 880" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <filter id={`${u}gl`} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves={1} seed={5} />
              <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 .95  0 0 0 0 .85  0 0 0 9 -6.2" />
            </filter>
          </defs>
          <rect width="630" height="880" filter={`url(#${u}gl)`} />
        </svg>
      )}
      <div className="sdc-glare" />
    </div>
  );
}

export default memo(CardFront);
