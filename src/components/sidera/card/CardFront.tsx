import { memo } from 'react';
import { editionLabel, type Plate } from '@/lib/sidera/plate';
import { DISPLAY, FOIL_OP, FrameBorder, FrameDefs, GLIT_OP, LOGO_D, MONO, SANS, rr } from './frame';

type Props = {
  plate: Plate;
  /** The holder's edition number. Absent, the cartouche prints a dash. */
  edition?: number | null;
  /** A real capture from Node 01. It takes the drawing's place in the window. */
  capture?: string | null;
  u: string;
};

/** The face of a card: art window of three parallax layers under the metal frame, foil, glitter and glare on top. */
function CardFront({ plate: c, edition, capture, u }: Props) {
  const r = c.rarity;
  const f = `${u}f`;
  const wh = c.full ? 832 : 620;
  const ed = editionLabel(edition);
  const win = rr(24, 24, 582, wh, 18);
  const chipY = c.full ? 548 : 24 + wh - 40;
  const chipW = 30 + c.rname.length * 9.2;
  const micro = `SIDERA · FIRST LIGHT · ${c.des.split(' · ')[0]} · EDITION ${ed} OF ${c.of} · COMMITTED BEFORE SALE · `;
  const ranked = r === 'epic' || r === 'legendary';

  return (
    <div
      className="sdc-card"
      style={{ boxShadow: ranked ? '0 0 0 1px rgba(255,226,160,.08), 0 40px 90px -30px rgba(0,0,0,.95)' : '0 40px 90px -30px rgba(0,0,0,.95)' }}
    >
      <div
        className="sdc-window"
        style={{ height: c.full ? '94.55%' : '70.45%', borderRadius: `3.09% / ${c.full ? '2.16%' : '2.9%'}` }}
      >
        {capture ? (
          <div className="sdc-lay1">
            <img src={capture} alt="" loading="lazy" decoding="async" />
          </div>
        ) : (
          <>
            <div className="sdc-lay0">
              <img src={`${c.art}/sky.svg`} alt="" loading="lazy" decoding="async" />
            </div>
            <div className="sdc-lay1">
              <img src={`${c.art}/object.svg`} alt="" loading="lazy" decoding="async" />
            </div>
            <div className="sdc-lay2">
              <img src={`${c.art}/survey.svg`} alt="" loading="lazy" decoding="async" />
            </div>
          </>
        )}
      </div>

      <svg className="sdc-frame" viewBox="0 0 630 880" aria-hidden="true">
        <defs>
          <FrameDefs u={f} rarity={r} />
          <linearGradient id={`${f}panel`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0d1633" />
            <stop offset="1" stopColor="#070b1a" />
          </linearGradient>
          <linearGradient id={`${f}top`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#02030a" stopOpacity=".75" />
            <stop offset="1" stopColor="#02030a" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${f}bot`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#03040a" stopOpacity="0" />
            <stop offset=".45" stopColor="#03040a" stopOpacity=".82" />
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
        {[
          [24, 24],
          [606, 24],
          [24, 24 + wh],
          [606, 24 + wh],
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
          FIRST LIGHT · {c.num} / 24
        </text>

        <g transform={`translate(44 ${chipY})`}>
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

        {c.full ? (
          <rect x="24" y="560" width="582" height="296" fill={`url(#${f}bot)`} />
        ) : (
          <>
            <path d={rr(24, 652, 582, 204, 16)} fill={`url(#${f}panel)`} />
            <path d={rr(24.5, 652.5, 581, 203, 16)} fill="none" stroke="rgba(245,241,232,.08)" />
          </>
        )}
        <text x="50" y="724" fill="#f5f1e8" style={{ fontFamily: SANS, fontWeight: 600, fontSize: c.nameSize, letterSpacing: -1.6 }}>
          {c.name}
        </text>
        <text x="52" y="756" fill="rgba(245,241,232,.56)" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 2 }}>
          {c.des}
        </text>
        <line x1="52" y1="776" x2="578" y2="776" stroke="rgba(245,241,232,.1)" />
        {c.data.map(([label, value], i) => (
          <g key={label}>
            <text x={52 + i * 182} y="802" fill="rgba(245,241,232,.5)" style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: 2 }}>
              {label}
            </text>
            <text x={52 + i * 182} y="828" fill="#f5f1e8" style={{ fontFamily: MONO, fontSize: 16 }}>
              {value}
            </text>
          </g>
        ))}

        <g transform="translate(470 678)">
          <rect width="110" height="56" rx="9" fill="rgba(255,255,255,.025)" stroke={`url(#${f}metal)`} strokeWidth=".9" />
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
