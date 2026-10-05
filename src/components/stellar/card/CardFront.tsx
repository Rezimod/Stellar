import { memo } from 'react';
import { editionLabel, type Plate } from '@/lib/stellar/plate';
import {
  CONDENSED,
  FOIL_OP,
  Footer,
  GLIT_OP,
  Glint,
  INK,
  Paper,
  PosterDefs,
  RarityBadge,
  Rules,
  SPACED,
  StripedTitle,
  fit,
  rr,
  width,
} from './frame';

type Props = {
  plate: Plate;
  /** The holder's edition number. Absent, the footer prints a dash. */
  edition?: number | null;
  /** A real capture from Live Telescope V1 in place of the drawn plate. */
  capture?: string | null;
  /** Small cards draw from the pre-rendered WebP layers: the same picture, none of the filter work. */
  lite?: boolean;
  u: string;
};

/** The window: the poster's night, from the top margin nearly to the foot; only the set line sits below it. */
export const WIN = { x: 20, y: 20, w: 590, h: 784, r: 18 };

/** A fine line just inside the window, in the rarity's metal. */
const EDGE: Record<Plate['rarity'], [string, number]> = { common: ['#cbb994', 0.28], rare: ['#e0703a', 0.45], epic: ['#ff8a3d', 0.6], legendary: ['#ffd36e', 0.85] };

/** Where the lens glints sit in the sky, as fractions of the window; the same on every card, a little off the grid. */
const GLINTS: [number, number, number][] = [
  [0.1, 0.24, 9],
  [0.86, 0.13, 7],
  [0.93, 0.47, 10],
  [0.06, 0.61, 6],
  [0.78, 0.71, 5],
];

/**
 * The face of a card, as a space-opera poster: the drawing fills a tall dark
 * window under its quote, the name in striped sunset letters across its foot,
 * and below it only the set line and the edition. The headline, the three
 * figures and the record are on the back.
 */
function CardFront({ plate: c, edition, capture, lite = false, u }: Props) {
  const ext = lite ? 'webp' : 'svg';
  const r = c.rarity;
  const f = `${u}f`;
  const p = c.poster;
  const ed = editionLabel(edition);
  const win = rr(WIN.x, WIN.y, WIN.w, WIN.h, WIN.r);
  const flat = p.title.replace('\n', ' ');
  const lines = flat.length <= 14 ? [flat] : p.title.split('\n');

  const epithet = p.epithet.toUpperCase();
  const epSize = 15;
  const epTrack = Math.min(9, Math.max(3, (430 - epithet.length * epSize * 0.45) / Math.max(1, epithet.length)));
  const epW = width(epithet.length, epSize, 'spaced', epTrack);
  const titleBase = 726;

  const quote = p.quote ? `“${p.quote.toUpperCase()}”` : null;
  const qSize = quote ? fit(quote.length, 520, 'condensed', 24) : 0;

  const [edge, edgeOp] = EDGE[r];

  return (
    <div className="sdc-card">
      <div className="sdc-window" style={{ left: `${(WIN.x / 630) * 100}%`, top: `${(WIN.y / 880) * 100}%`, width: `${(WIN.w / 630) * 100}%`, height: `${(WIN.h / 880) * 100}%`, borderRadius: `${(WIN.r / WIN.w) * 100}% / ${(WIN.r / WIN.h) * 100}%` }}>
        {capture ? (
          <div className="sdc-lay1">
            <img src={capture} alt="" loading="lazy" decoding="async" />
          </div>
        ) : (
          <>
            <div className="sdc-lay0 sdc-grade">
              <img src={`${c.art}/sky.${ext}`} alt="" loading="lazy" decoding="async" />
            </div>
            <div className="sdc-rays" />
            <div className="sdc-lay1 sdc-grade sdc-fringe">
              <img src={`${c.art}/object.${ext}`} alt="" loading="lazy" decoding="async" />
            </div>
          </>
        )}
        <div className="sdc-halftone" />
        <div className="sdc-scrim" />
      </div>

      <svg className="sdc-frame" viewBox="0 0 630 880" aria-hidden="true">
        <defs>
          <PosterDefs u={f} rarity={r} />
        </defs>
        <Paper u={f} hole={win} />
        <path d={win} fill="none" stroke="#1a0d07" strokeWidth="2.5" />
        <path d={rr(WIN.x + 1.5, WIN.y + 1.5, WIN.w - 3, WIN.h - 3, WIN.r - 1)} fill="none" stroke="#fff" strokeOpacity=".07" />
        <path d={rr(WIN.x + 7, WIN.y + 7, WIN.w - 14, WIN.h - 14, WIN.r - 5)} fill="none" stroke={edge} strokeOpacity={edgeOp} strokeWidth="1.2" />

        {GLINTS.map(([gx, gy, gr]) => (
          <Glint key={`${gx}-${gy}`} x={WIN.x + gx * WIN.w} y={WIN.y + gy * WIN.h} r={gr} o={0.75} />
        ))}

        <RarityBadge u={f} rarity={r} label={c.rname} />
        <text x="584" y="62" textAnchor="end" fill="rgba(243,230,204,.62)" style={{ fontFamily: SPACED, fontWeight: 400, fontSize: 11, letterSpacing: 3 }}>
          {c.num} / {c.total}
        </text>

        {quote && (
          <text x="315" y="122" textAnchor="middle" fill={INK.quote} style={{ fontFamily: CONDENSED, fontSize: qSize, letterSpacing: 0.6 }}>
            {quote}
          </text>
        )}

        <StripedTitle u={f} rarity={r} lines={lines} base={titleBase} />

        {epithet && (
          <g>
            <rect x={315 - epW / 2 - 70} y={titleBase + 37} width="50" height="1.4" fill={INK.orange} opacity=".85" />
            <rect x={315 + epW / 2 + 20} y={titleBase + 37} width="50" height="1.4" fill={INK.orange} opacity=".85" />
            <text x="315" y={titleBase + 43} textAnchor="middle" fill={INK.cream} style={{ fontFamily: SPACED, fontWeight: 300, fontSize: epSize, letterSpacing: epTrack }}>
              {epithet}
            </text>
          </g>
        )}

        <Rules u={f} y={WIN.y + WIN.h + 11} />

        <Footer y={857} right={`${ed} / ${c.of}`} />
      </svg>

      {FOIL_OP[r] > 0 && <div className="sdc-foil" style={{ opacity: FOIL_OP[r], ['--sdc-foil' as string]: FOIL_OP[r] }} />}
      {GLIT_OP[r] > 0 && (
        <svg className="sdc-glitter" style={{ opacity: GLIT_OP[r] }} viewBox="0 0 630 880" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <filter id={`${u}gl`} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves={1} seed={5} />
              <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 .9  0 0 0 0 .7  0 0 0 9 -6.2" />
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
