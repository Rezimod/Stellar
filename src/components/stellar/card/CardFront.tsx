import { memo } from 'react';
import type { Plate } from '@/lib/stellar/plate';
import { photoFor } from '@/lib/stellar/photos';
import { CONDENSED, FOIL_OP, GLIT_OP, Glint, INK, Paper, PosterDefs, SPACED, fit, rr } from './frame';

type Props = {
  plate: Plate;
  /** A real capture from Live Telescope V1 in place of the drawn plate. */
  capture?: string | null;
  /** Small cards draw from the pre-rendered WebP layers: the same picture, none of the filter work. */
  lite?: boolean;
  u: string;
};

/** The window: the night, set into the cream with an even margin, the name block under it. */
export const WIN = { x: 30, y: 52, w: 570, h: 622, r: 10 };

/** The red block the name prints on. */
const BAND = { x: 56, y: 692, w: 518, h: 134 };

/** Cards whose photograph is a map, a workshop or a specimen on a table: the drawn plate stays on the front, the photograph on the back. */
const DRAWN = new Set(['IMILAC', 'LUNAR-FRAGMENT', 'CHICXULUB', 'TUNGUSKA', 'JWST', 'SL9', 'VOYAGER-1', 'ARCTURUS', 'POLARIS', 'CMB']);

/** The rainbow that slides over the face as it tilts: a faint sheen on a common, a full spectrum on a legendary. */
const HOLO: Record<Plate['rarity'], number> = { common: 0.03, rare: 0.07, epic: 0.12, legendary: 0.22 };

/** The art is taller than the window; showing more of its top lowers the object toward the rays' centre. */
const ART_POS = { objectPosition: '50% 20%' };

/** Where the lens glints sit in the sky, as fractions of the window; the same on every card, a little off the grid. */
const GLINTS: [number, number, number][] = [
  [0.1, 0.3, 7],
  [0.86, 0.19, 6],
  [0.93, 0.5, 8],
  [0.06, 0.66, 5],
  [0.78, 0.76, 4],
];

/**
 * The face of a card: the picture in a tall dark window on cream stock and
 * the name in a red block under it with one line beneath. The rarity and the
 * number ride on the tile outside the card; the figures and the record are on
 * the back.
 */
function CardFront({ plate: c, capture, lite = false, u }: Props) {
  const ext = lite ? 'webp' : 'svg';
  const r = c.rarity;
  const f = `${u}f`;
  const p = c.poster;
  const win = rr(WIN.x, WIN.y, WIN.w, WIN.h, WIN.r);
  const photo = DRAWN.has(c.designation) ? null : photoFor(c.designation);
  const flat = p.title.replace('\n', ' ');
  const oneLine = fit(flat.length, BAND.w - 50, 'condensed', 84);
  // One line wherever it stays big; only a name that would shrink below half the block's height breaks in two.
  const lines = oneLine >= 48 || !p.title.includes('\n') ? [flat] : p.title.split('\n');
  const two = lines.length > 1;
  const size = two ? Math.min(...lines.map((l) => fit(l.length, BAND.w - 60, 'condensed', 36))) : oneLine;
  const titleBase = two ? 766 : 774;
  const lead = size * 1.02;

  const sub = p.headline.toUpperCase();
  const subSize = 17;
  const subTrack = Math.min(5, Math.max(1.5, (BAND.w - 50 - sub.length * subSize * 0.49) / Math.max(1, sub.length)));


  return (
    <div className="sdc-card">
      <div className="sdc-window" style={{ left: `${(WIN.x / 630) * 100}%`, top: `${(WIN.y / 880) * 100}%`, width: `${(WIN.w / 630) * 100}%`, height: `${(WIN.h / 880) * 100}%`, borderRadius: `${(WIN.r / WIN.w) * 100}% / ${(WIN.r / WIN.h) * 100}%` }}>
        {capture ? (
          <div className="sdc-lay1">
            <img src={capture} alt="" loading="lazy" decoding="async" />
          </div>
        ) : photo ? (
          <>
            <div className="sdc-lay1 sdc-photo">
              <img src={photo.file} alt="" loading="lazy" decoding="async" style={{ objectPosition: photo.focus ?? '50% 50%' }} />
            </div>
            <div className="sdc-rays" />
          </>
        ) : (
          <>
            <div className="sdc-lay0 sdc-grade">
              <img src={`${c.art}/sky.${ext}`} alt="" loading="lazy" decoding="async" style={ART_POS} />
            </div>
            <div className="sdc-rays" />
            <div className="sdc-breath" style={{ ['--sdc-breath' as string]: '#ffb070' }} />
            <div className="sdc-lay1 sdc-grade sdc-fringe">
              <img src={`${c.art}/object.${ext}`} alt="" loading="lazy" decoding="async" style={ART_POS} />
            </div>
          </>
        )}
        <div className="sdc-twinkle" />
        <div className="sdc-halftone" />
        <div className="sdc-scrim" />
      </div>

      <svg className="sdc-frame" viewBox="0 0 630 880" aria-hidden="true">
        <defs>
          <PosterDefs u={f} rarity={r} />
        </defs>
        <Paper u={f} hole={win} />
        <path d={win} fill="none" stroke="#1a0d07" strokeWidth="2" />
        <path d={rr(WIN.x + 1.5, WIN.y + 1.5, WIN.w - 3, WIN.h - 3, WIN.r - 1)} fill="none" stroke="#fff" strokeOpacity=".06" />

        {GLINTS.map(([gx, gy, gr]) => (
          <Glint key={`${gx}-${gy}`} x={WIN.x + gx * WIN.w} y={WIN.y + gy * WIN.h} r={gr} o={0.6} />
        ))}

        <rect x={BAND.x} y={BAND.y} width={BAND.w} height={BAND.h} fill="#c4282a" />
        <rect x={BAND.x} y={BAND.y} width={BAND.w} height={BAND.h} fill="#000" filter={`url(#${f}grain)`} opacity=".6" />
        {lines.map((line, i) => (
          <text key={i} x="315" y={titleBase - (lines.length - 1 - i) * lead} textAnchor="middle" fill={INK.cream} style={{ fontFamily: CONDENSED, fontSize: size, letterSpacing: size * 0.02 }}>
            {line}
          </text>
        ))}
        <text x="315" y="808" textAnchor="middle" fill={INK.cream} style={{ fontFamily: SPACED, fontWeight: 500, fontSize: subSize, letterSpacing: subTrack }}>
          {sub}
        </text>
      </svg>

      {FOIL_OP[r] > 0 && <div className="sdc-foil" style={{ ['--sdc-foil' as string]: FOIL_OP[r] }} />}
      <div className={`sdc-holo sdc-holo--${r}`} style={{ ['--sdc-holo' as string]: HOLO[r] }} />
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
