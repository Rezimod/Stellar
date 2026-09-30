import { memo } from 'react';
import { editionLabel, type Plate } from '@/lib/stellar/plate';
import type { Rarity } from '@/lib/rarity';
import { FOIL_OP, LOGO_D, MONO, SANS } from './frame';

type Props = {
  plate: Plate;
  /** The holder's edition number. Absent, the card prints a dash. */
  edition?: number | null;
  /** A real capture from Live Telescope V1 in place of the archive image. */
  capture?: string | null;
  /** Small cards draw the small image: the same picture, a tenth of the bytes. */
  lite?: boolean;
  u: string;
};

/** The light each rarity is lit with: the dot by its name and the edge along the foot. */
const LIGHT: Record<Rarity, string> = { common: '#c9ced8', rare: '#5eead4', epic: '#ffb347', legendary: '#f7dc8a' };

const COLS = [40, 223, 406];

/**
 * The face of a card, as an archive print: the photograph edge to edge, a hairline
 * inset, the mark and rarity at the head, and the name with three facts at the foot.
 * Cards with no photograph — the fiction of the Frontier — lay their drawing in the same place.
 */
function CardFront({ plate: c, edition, capture, lite = false, u }: Props) {
  const r = c.rarity;
  const light = LIGHT[r];
  const ed = editionLabel(edition);
  const [type, ...cat] = c.kicker.split(' · ');
  const facts = c.data.slice(0, 3);
  const ext = lite ? 'webp' : 'svg';

  return (
    <div className="sdc-card sdc-card--archive" style={{ boxShadow: '0 40px 90px -30px rgba(0,0,0,.95)' }}>
      <div className="sdc-window sdc-window--full">
        {capture ? (
          <div className="sdc-lay1">
            <img src={capture} alt="" loading="lazy" decoding="async" />
          </div>
        ) : c.photo ? (
          <div className="sdc-lay1">
            <img src={lite ? c.photo.lite : c.photo.src} alt="" loading="lazy" decoding="async" />
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
          <linearGradient id={`${u}shade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity=".55" />
            <stop offset=".17" stopColor="#000" stopOpacity="0" />
            <stop offset=".5" stopColor="#000" stopOpacity="0" />
            <stop offset=".76" stopColor="#000" stopOpacity=".74" />
            <stop offset="1" stopColor="#000" stopOpacity=".95" />
          </linearGradient>
          <linearGradient id={`${u}edge`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={light} stopOpacity="0" />
            <stop offset=".5" stopColor={light} />
            <stop offset="1" stopColor={light} stopOpacity="0" />
          </linearGradient>
          <radialGradient id={`${u}dot`}>
            <stop offset="0" stopColor={light} />
            <stop offset=".45" stopColor={light} />
            <stop offset="1" stopColor={light} stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="630" height="880" fill={`url(#${u}shade)`} />
        <rect x="21" y="21" width="588" height="838" rx="18" fill="none" stroke="rgba(255,255,255,.24)" strokeWidth="1.6" />

        <g transform="translate(46 44) scale(.7)">
          <path d={LOGO_D} fill="#F4EDE0" />
        </g>
        <text x="68" y="57" fill="#f5f1e8" style={{ fontFamily: SANS, fontWeight: 600, fontSize: 17, letterSpacing: 6.5 }}>
          STELLAR
        </text>
        <circle cx={584 - c.rname.length * 12.6 - 18} cy="51" r="8" fill={`url(#${u}dot)`} />
        <text x="584" y="57" textAnchor="end" fill={light} style={{ fontFamily: MONO, fontWeight: 600, fontSize: 15, letterSpacing: 3.6 }}>
          {c.rname.toUpperCase()}
        </text>
        <text x="584" y="92" textAnchor="end" fill="rgba(255,255,255,.62)" style={{ fontFamily: MONO, fontSize: 15, letterSpacing: 2 }}>
          Nº {ed} / {c.of}
        </text>

        <text x="44" y={facts.length ? 700 : 770} fill="rgba(255,255,255,.64)" style={{ fontFamily: MONO, fontWeight: 500, fontSize: 14.5, letterSpacing: 3 }}>
          {type}
          {cat.length ? ` · ${cat.join(' · ')}` : ''}
        </text>
        <text x="42" y={facts.length ? 758 : 828} fill="#f7f4ee" style={{ fontFamily: SANS, fontWeight: 600, fontSize: Math.min(c.nameSize, 58), letterSpacing: -2 }}>
          {c.name}
        </text>

        {facts.length > 0 && (
          <g>
            <line x1="44" x2="586" y1="782" y2="782" stroke="rgba(255,255,255,.22)" strokeWidth="1.2" />
            {facts.map(([label, value], i) => (
              <g key={label} transform={`translate(${COLS[i] + 4} 0)`}>
                <text y="806" fill="rgba(255,255,255,.52)" style={{ fontFamily: MONO, fontWeight: 500, fontSize: 11.5, letterSpacing: 2.2 }}>
                  {label}
                </text>
                <text y="832" fill="#f3f0ea" style={{ fontFamily: MONO, fontWeight: 500, fontSize: 16.5 }}>
                  {value}
                </text>
              </g>
            ))}
          </g>
        )}

        <rect x="0" y="874" width="630" height="6" fill={`url(#${u}edge)`} />
      </svg>

      {r === 'legendary' && <div className="sdc-foil" style={{ opacity: FOIL_OP[r] * 0.6, ['--sdc-foil' as string]: FOIL_OP[r] }} />}
      <div className="sdc-glare" />
    </div>
  );
}

export default memo(CardFront);
