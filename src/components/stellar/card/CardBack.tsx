import { memo } from 'react';
import FadeImg from '../FadeImg';
import { editionLabel, type Plate } from '@/lib/stellar/plate';
import { photoFor } from '@/lib/stellar/photos';
import { TIER_PERKS, perkFor, votePower } from '@/lib/stellar/perks';
import { CONDENSED, FOIL_OP, Glint, INK, MONO, Paper, PosterDefs, SPACED, fit, rr } from './frame';

type Props = {
  plate: Plate;
  edition?: number | null;
  /** The capsule commitment the edition was drawn from. */
  commitment?: string | null;
  /** Face down and not yet turned: nothing on it says which card it is. */
  sealed?: boolean;
  /** The card the page is about: its pictures load at once, ahead of everything else. */
  priority?: boolean;
  u: string;
};

const short = (hash: string) => `[${hash.slice(0, 4)}…${hash.slice(-4)}]`;

const pct = (x: number, y: number, w: number, h: number, r: number) => ({
  left: `${(x / 630) * 100}%`,
  top: `${(y / 880) * 100}%`,
  width: `${(w / 630) * 100}%`,
  height: `${(h / 880) * 100}%`,
  borderRadius: `${(r / w) * 100}% / ${(r / h) * 100}%`,
});

/** The photograph's window on the back, the red block under it, the ledger and the telescope's box. */
const PW = { x: 30, y: 30, w: 570, h: 356, r: 10 };
const BAND = { x: 30, y: 398, w: 570, h: 104 };
const LEDGER = { y: 594, h: 94 };
const BOX = { x: 30, y: 702, w: 570, h: 116 };

/** Planets, moons and the Sun: the whole disc shown on black, never cropped by the window. */
const WHOLE = new Set(['CANYON-DIABLO', 'GIBEON', 'CAMPO-DEL-CIELO', 'MUONIONALUSTA', 'ALLENDE', 'EARTH', 'MOON', 'SUN', 'MERCURY', 'VENUS', 'MARS', 'JUPITER', 'IO', 'EUROPA', 'GANYMEDE', 'SATURN', 'TITAN', 'ENCELADUS', 'URANUS', 'NEPTUNE', 'PLUTO', 'BLOOD-MOON', 'HUNTERS-MOON', 'CHRISTMAS-SUPERMOON', 'DOUBLE-OPPOSITION', 'SNOW-MOON-ECLIPSE']);

/** A figure split into its number, set large, and its unit, set small after it: "3,475" and "KM". */
function splitFigure(value: string): [string, string] {
  const m = value.match(/^([~<>≈]?[\d][\d.,:/]*)\s+([^\d\s][^\d]*[A-Za-z].*)$/);
  return m ? [m[1], m[2]] : [value, ''];
}

/** A line broken at the space nearest its middle, when it is too long for one. */
function halve(line: string, max: number): string[] {
  if (line.length <= max) return [line];
  const mid = Math.ceil(line.length / 2);
  const after = line.indexOf(' ', mid);
  const before = line.lastIndexOf(' ', mid);
  const cut = after < 0 ? before : before < 0 ? after : mid - before <= after - mid ? before : after;
  return cut > 0 ? [line.slice(0, cut), line.slice(cut + 1)] : [line];
}

/** Viewfinder corners just inside the photograph. */
function Brackets() {
  const x0 = PW.x + 14, y0 = PW.y + 14, x1 = PW.x + PW.w - 14, y1 = PW.y + PW.h - 14, k = 24;
  return (
    <g fill="none" stroke={INK.cream} strokeWidth="2" strokeOpacity=".85">
      <path d={`M${x0} ${y0 + k}V${y0}H${x0 + k}`} />
      <path d={`M${x1 - k} ${y0}H${x1}V${y0 + k}`} />
      <path d={`M${x0} ${y1 - k}V${y1}H${x0 + k}`} />
      <path d={`M${x1 - k} ${y1}H${x1}V${y1 - k}`} />
      <rect x={x0 + 6} y={y0 + 6} width={x1 - x0 - 12} height={y1 - y0 - 12} strokeWidth=".7" strokeOpacity=".22" />
    </g>
  );
}

/** The face-down card before the reveal: the star on its last night, nothing on it saying which card is inside. */
export const SEALED_SRC = '/cards/sealed.webp?v=lastlight';

function Sealed({ priority }: { priority: boolean }) {
  return (
    <div className="sdc-card sdc-card--sealed">
      <img className="sdc-sealed" src={SEALED_SRC} alt="" decoding="async" fetchPriority={priority ? 'high' : undefined} />
      <div className="sdc-glare" />
    </div>
  );
}

/**
 * The back of a card: the real thing. The photograph of the object in a
 * viewfinder, its name on the red block, the two lines of its story, its
 * three figures as a ledger, and what the card gives its holder.
 */
function CardBack({ plate: c, edition, commitment, sealed = false, priority = false, u }: Props) {
  const b = `${u}b`;
  if (sealed) return <Sealed priority={priority} />;

  const r = c.rarity;
  const ed = editionLabel(edition);
  const photo = photoFor(c.designation);
  const win = rr(PW.x, PW.y, PW.w, PW.h, PW.r);

  const credit = photo ? `${photo.kind === 'impression' ? 'ARTIST’S IMPRESSION · ' : ''}${photo.credit}`.toUpperCase() : c.designation === 'FIRST-LIGHT' ? 'AWAITING THE FIRST FRAME' : '';
  // The credit runs along the photograph's foot; a long one breaks in two and shrinks to stay inside the brackets.
  const creditLines = halve(credit, 70);
  const creditSize = Math.min(10, ...creditLines.map((l) => (PW.w - 110 - l.length * 1.2) / (Math.max(1, l.length) * 0.46)));

  const name = c.name.toUpperCase();
  const nameSize = fit(name.length, BAND.w - 60, 'condensed', 70);
  const kicker = c.kicker;
  const kSize = 15;
  const kTrack = Math.min(6, Math.max(1.2, (BAND.w - 60 - kicker.length * kSize * 0.45) / Math.max(1, kicker.length)));

  const story = c.story.filter(Boolean);
  const storySize = Math.min(...story.map((l) => fit(l.length, 550, 'spaced', 26)));

  const perk = perkFor(c.designation, r);
  const promise = perk.soon ? `Coming soon. ${perk.line}` : perk.line;
  const boxTitle = (r === 'common' ? `A vote on the night · ×${votePower(c.designation, r)}` : TIER_PERKS.find((t) => t.rarity === r)!.title).toUpperCase();
  const boxSize = fit(boxTitle.length, BOX.w - 110, 'condensed', 27);
  const glintDx = (boxTitle.length * boxSize * 0.45) / 2 + 22;
  const promiseLines = halve(promise, 62);
  const pSize = Math.min(...promiseLines.map((l) => fit(l.length, BOX.w - 60, 'spaced', 21)));

  const col = BAND.w / 3;
  const figures = c.figures.slice(0, 3);
  const foot = { fontFamily: SPACED, fontWeight: 500, fontSize: 14, letterSpacing: 5 };

  return (
    <div className="sdc-card">
      <div className="sdc-window" style={pct(PW.x, PW.y, PW.w, PW.h, PW.r)}>
        {photo ? (
          <div className={`sdc-photo${WHOLE.has(c.designation) ? ' sdc-photo--whole' : ''}`}>
            <FadeImg priority={priority} src={photo.file} alt="" style={{ objectPosition: photo.focus ?? '50% 50%' }} />
          </div>
        ) : (
          <>
            <div className="sdc-lay0 sdc-grade">
              <FadeImg priority={priority} src={`${c.art}/sky.webp`} alt="" />
            </div>
            <div className="sdc-lay1 sdc-grade">
              <FadeImg priority={priority} src={`${c.art}/object.webp`} alt="" />
            </div>
          </>
        )}
        <div className="sdc-scrim sdc-scrim--photo" />
      </div>

      <svg className="sdc-frame" viewBox="0 0 630 880" aria-hidden="true">
        <defs>
          <PosterDefs u={b} rarity={r} />
        </defs>
        <Paper u={b} hole={win} />
        <path d={win} fill="none" stroke="#1a0d07" strokeWidth="2" />
        <Brackets />
        {credit &&
          creditLines.map((line, i) => (
            <text key={i} x={PW.x + PW.w - 48} y={PW.y + PW.h - 26 - (creditLines.length - 1 - i) * (creditSize + 3)} textAnchor="end" fill="rgba(243,230,204,.62)" style={{ fontFamily: SPACED, fontWeight: 400, fontSize: creditSize, letterSpacing: 1.2 }}>
              {line}
            </text>
          ))}

        <rect x={BAND.x} y={BAND.y} width={BAND.w} height={BAND.h} rx="6" fill="#a8182a" />
        <rect x={BAND.x} y={BAND.y} width={BAND.w} height={BAND.h} rx="6" fill="#000" filter={`url(#${b}grain)`} opacity=".6" />
        <text x="315" y={BAND.y + 64} textAnchor="middle" fill={INK.cream} style={{ fontFamily: CONDENSED, fontSize: nameSize, letterSpacing: nameSize * 0.02 }}>
          {name}
        </text>
        <text x="315" y={BAND.y + 90} textAnchor="middle" fill={INK.cream} style={{ fontFamily: SPACED, fontWeight: 500, fontSize: kSize, letterSpacing: kTrack }}>
          {kicker}
        </text>

        {story.map((line, i) => (
          <text key={i} x="315" y={BAND.y + BAND.h + 46 + i * 31} textAnchor="middle" fill="#241810" style={{ fontFamily: SPACED, fontWeight: 400, fontSize: storySize, letterSpacing: 0.2 }}>
            {line}
          </text>
        ))}

        <line x1={BAND.x} y1={LEDGER.y} x2={BAND.x + BAND.w} y2={LEDGER.y} stroke="#241810" strokeWidth="1.6" />
        <line x1={BAND.x} y1={LEDGER.y + LEDGER.h} x2={BAND.x + BAND.w} y2={LEDGER.y + LEDGER.h} stroke="#241810" strokeWidth="1.6" />
        {[1, 2].map((i) => (
          <line key={i} x1={BAND.x + col * i} y1={LEDGER.y + 1} x2={BAND.x + col * i} y2={LEDGER.y + LEDGER.h - 1} stroke="#241810" strokeOpacity=".22" />
        ))}
        {figures.map(([value, label], i) => {
          const cx = BAND.x + col * i + col / 2;
          const [big, unit] = splitFigure(value);
          const room = col - 26;
          // Width in em: Anton figures run about .5 em, the unit in Oswald at .42 of the size about .2 em a letter.
          const bigSize = Math.min(46, room / Math.max(1, big.length * 0.5 + (unit ? unit.length * 0.25 + 0.3 : 0)));
          const unitSize = Math.max(12, Math.min(18, bigSize * 0.42));
          return (
            <g key={label}>
              <text x={cx} y={LEDGER.y + 24} textAnchor="middle" fill="#5a4636" style={{ fontFamily: SPACED, fontWeight: 500, fontSize: 13, letterSpacing: 4 }}>
                {label.toUpperCase()}
              </text>
              <text x={cx} y={LEDGER.y + 78} textAnchor="middle" fill="#160e08" style={{ fontFamily: CONDENSED, fontSize: bigSize, letterSpacing: 0.3 }}>
                {big}
                {unit && (
                  <tspan dx={bigSize * 0.18} style={{ fontFamily: SPACED, fontWeight: 500, fontSize: unitSize, letterSpacing: 1.6 }}>
                    {unit}
                  </tspan>
                )}
              </text>
            </g>
          );
        })}

        <rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} rx="6" fill="#1a1510" />
        <rect x={BOX.x + 4} y={BOX.y + 4} width={BOX.w - 8} height={BOX.h - 8} rx="4" fill="none" stroke={INK.cream} strokeOpacity=".07" />
        <text x="315" y={BOX.y + 42} textAnchor="middle" fill={INK.cream} style={{ fontFamily: CONDENSED, fontSize: boxSize, letterSpacing: 0.8 }}>
          {boxTitle}
        </text>
        <Glint x={315 - glintDx} y={BOX.y + 33} r={10} o={0.9} />
        <Glint x={315 + glintDx} y={BOX.y + 33} r={10} o={0.9} />
        {promiseLines.map((line, i) => (
          <text key={i} x="315" y={BOX.y + 72 + i * 25} textAnchor="middle" fill="rgba(243,230,204,.86)" style={{ fontFamily: SPACED, fontWeight: 400, fontSize: pSize, letterSpacing: 0.3 }}>
            {line}
          </text>
        ))}
        {commitment && (
          <text x={BOX.x + BOX.w - 14} y={BOX.y + 16} textAnchor="end" fill="rgba(243,230,204,.4)" style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1 }}>
            {short(commitment)}
          </text>
        )}

        <text x={BOX.x} y="852" fill={INK.text} style={foot}>
          GENESIS
        </text>
        <text x="315" y="852" textAnchor="middle" fill={INK.text} style={foot}>
          <tspan fill={INK.red}>◆</tspan>
          {'  GENESIS  '}
          <tspan fill={INK.red}>◆</tspan>
        </text>
        <text x={BOX.x + BOX.w} y="852" textAnchor="end" fill={INK.text} style={foot}>
          {ed} / {c.of}
        </text>
      </svg>
      {FOIL_OP[r] > 0 && <div className="sdc-foil" style={{ opacity: FOIL_OP[r] * 0.6 }} />}
      <div className="sdc-glare" />
    </div>
  );
}

export default memo(CardBack);
