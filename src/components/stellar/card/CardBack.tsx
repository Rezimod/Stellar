import { memo } from 'react';
import { editionLabel, type Plate } from '@/lib/stellar/plate';
import { photoFor } from '@/lib/stellar/photos';
import { CONDENSED, FOIL_OP, Glint, INK, LOGO_D, MONO, Paper, PosterDefs, SPACED, StripedTitle, fit, rr } from './frame';

type Props = {
  plate: Plate;
  edition?: number | null;
  /** The capsule commitment the edition was drawn from. */
  commitment?: string | null;
  /** Face down and not yet turned: nothing on it says which card it is. */
  sealed?: boolean;
  u: string;
};

/** A hypotrochoid, the curve a spirograph draws: the seal on a sealed back. */
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

const SEAL = [rosette(315, 300, 24, 7, 12, 6.2, 0, 1400), rosette(315, 300, 20, 9, 7, 6.6, 9, 1200), rosette(315, 300, 30, 11, 16, 4.6, 4, 1500)];

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
const WHOLE = new Set(['SIKHOTE-ALIN', 'GIBEON', 'CAMPO-DEL-CIELO', 'MUONIONALUSTA', 'ALLENDE', 'EARTH', 'MOON', 'SUN', 'MERCURY', 'VENUS', 'MARS', 'JUPITER', 'IO', 'EUROPA', 'GANYMEDE', 'SATURN', 'TITAN', 'ENCELADUS', 'URANUS', 'NEPTUNE', 'PLUTO', 'BLOOD-MOON', 'HUNTERS-MOON', 'CHRISTMAS-SUPERMOON', 'DOUBLE-OPPOSITION', 'SNOW-MOON-ECLIPSE']);

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

/** A crimped foil seam across the card: ridges pressed into it and a row of teeth along its inner edge. */
function seam(top: boolean) {
  const y0 = top ? 0 : 880;
  const y1 = top ? 62 : 818;
  const tooth = top ? 7 : -7;
  let d = `M0 ${y0}H630V${y1}`;
  for (let x = 630; x > 0; x -= 15) d += `L${x - 7.5} ${y1 + tooth}L${x - 15} ${y1}`;
  return `${d}Z`;
}

const SEAMS = [seam(true), seam(false)];
const RIDGES = Array.from({ length: 105 }, (_, i) => 3 + i * 6);
/** Fixed specks of starlight on the wrapper, the same on every sealed card. */
const SPECKS = Array.from({ length: 46 }, (_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12543.1234;
  return { x: 40 + (a - Math.floor(a)) * 550, y: 90 + (b - Math.floor(b)) * 700, r: 0.5 + ((i * 7) % 5) * 0.28 };
});
/** The eight long points of the burst behind the medallion. */
const BURST = Array.from({ length: 16 }, (_, i) => {
  const a = (i * Math.PI) / 8;
  const long = i % 2 === 0;
  const r = long ? 210 : 120;
  const w = long ? 0.07 : 0.05;
  const pt = (ang: number, rad: number) => `${(315 + Math.cos(ang) * rad).toFixed(1)} ${(300 + Math.sin(ang) * rad).toFixed(1)}`;
  return { d: `M${pt(a - w, 56)}L${pt(a, r)}L${pt(a + w, 56)}Z`, long };
});

/**
 * A card still in its wrapper: an obsidian foil pack, crimped shut at both
 * ends, a gold medallion at its heart under a burst of light, a holographic
 * sheen running over it. Nothing on it says which card is inside.
 */
function Sealed({ u }: { u: string }) {
  const edge = rr(10, 10, 610, 860, 22);
  return (
    <div className="sdc-card sdc-card--sealed">
      <div className="sdc-seal-body" />
      <div className="sdc-seal-rays" />
      <div className="sdc-halftone" />
      <svg className="sdc-frame" viewBox="0 0 630 880" aria-hidden="true">
        <defs>
          <PosterDefs u={u} rarity="legendary" />
          <linearGradient id={`${u}chrome`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff6dc" />
            <stop offset=".22" stopColor="#c99a4a" />
            <stop offset=".45" stopColor="#fff1c4" />
            <stop offset=".62" stopColor="#8a5a22" />
            <stop offset=".82" stopColor="#ffe3a0" />
            <stop offset="1" stopColor="#7a4a1a" />
          </linearGradient>
          <linearGradient id={`${u}seam`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3a2412" />
            <stop offset=".18" stopColor="#c9924a" />
            <stop offset=".36" stopColor="#fff0c8" />
            <stop offset=".5" stopColor="#b07a36" />
            <stop offset=".68" stopColor="#ffe2a0" />
            <stop offset=".86" stopColor="#9a6428" />
            <stop offset="1" stopColor="#3a2412" />
          </linearGradient>
          <radialGradient id={`${u}medal`} cx=".38" cy=".3" r=".8">
            <stop offset="0" stopColor="#3a2210" />
            <stop offset=".6" stopColor="#140904" />
            <stop offset="1" stopColor="#060302" />
          </radialGradient>
          <radialGradient id={`${u}core`}>
            <stop offset="0" stopColor="#fff4d6" stopOpacity=".95" />
            <stop offset=".25" stopColor="#ffc35a" stopOpacity=".55" />
            <stop offset="1" stopColor="#ff7a2a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${u}flare`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffd38a" stopOpacity="0" />
            <stop offset=".5" stopColor="#fff8e6" stopOpacity=".95" />
            <stop offset="1" stopColor="#ffd38a" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`${u}clip`}>
            <path d={rr(0, 0, 630, 880, 30)} />
          </clipPath>
        </defs>

        <g clipPath={`url(#${u}clip)`}>
          {SPECKS.map((s, i) => (
            <circle key={i} cx={s.x.toFixed(1)} cy={s.y.toFixed(1)} r={s.r.toFixed(2)} fill="#fff2d4" opacity={0.35 + (i % 4) * 0.15} />
          ))}

          <g className="sdc-seal-burst">
            {BURST.map((b, i) => (
              <path key={i} d={b.d} fill={`url(#${u}core)`} opacity={b.long ? 0.9 : 0.55} />
            ))}
          </g>
          <circle cx="315" cy="300" r="190" fill={`url(#${u}core)`} opacity=".45" />

          <g fill="none" stroke={`url(#${u}chrome)`}>
            <path d={SEAL[0]} strokeWidth=".8" opacity=".75" />
            <path d={SEAL[1]} strokeWidth=".7" opacity=".6" />
            <path d={SEAL[2]} strokeWidth=".6" opacity=".5" />
          </g>
          <circle cx="315" cy="300" r="168" fill="none" stroke={`url(#${u}chrome)`} strokeWidth="1" opacity=".7" />
          <circle cx="315" cy="300" r="174" fill="none" stroke={`url(#${u}chrome)`} strokeWidth=".5" strokeDasharray="2 6" opacity=".7" />

          <circle cx="315" cy="300" r="66" fill="none" stroke="#ffcf7a" strokeWidth="10" opacity=".14" />
          <circle cx="315" cy="300" r="60" fill={`url(#${u}chrome)`} />
          <circle cx="315" cy="300" r="53" fill={`url(#${u}medal)`} />
          <circle cx="315" cy="300" r="53" fill="none" stroke="#000" strokeOpacity=".5" strokeWidth="2" />
          <g transform="translate(288 274) scale(2.45)">
            <path d={LOGO_D} fill={`url(#${u}sun)`} />
          </g>
          <rect x="95" y="298.5" width="440" height="3" fill={`url(#${u}flare)`} />
          <Glint x={315} y={300} r={34} o={0.55} />

          <StripedTitle u={u} rarity="legendary" lines={['STELLAR']} base={598} cap={96} />
          <text x="315" y="640" textAnchor="middle" fill={INK.cream} style={{ fontFamily: SPACED, fontWeight: 400, fontSize: 19, letterSpacing: 12 }}>
            GENESIS
          </text>

          <g transform="translate(205 670)">
            <path d="M14 0H206L220 19L206 38H14L0 19Z" fill="#0b0604" stroke={`url(#${u}chrome)`} strokeWidth="1.6" />
            <text x="110" y="26" textAnchor="middle" fill={`url(#${u}sun)`} style={{ fontFamily: CONDENSED, fontSize: 21, letterSpacing: 4 }}>
              SEALED CARD
            </text>
          </g>
          <text x="315" y="752" textAnchor="middle" fill="rgba(243,230,204,.72)" style={{ fontFamily: SPACED, fontWeight: 400, fontSize: 14, letterSpacing: 5 }}>
            ONE OF A HUNDRED SKIES
          </text>

          {SEAMS.map((d, i) => (
            <g key={i}>
              <path d={d} fill={`url(#${u}seam)`} />
              <g stroke="#2a1608" strokeOpacity=".28" strokeWidth="1.2">
                {RIDGES.map((x) => (
                  <line key={x} x1={x} x2={x} y1={i ? 826 : 0} y2={i ? 880 : 54} />
                ))}
              </g>
              <path d={d} fill="none" stroke="#fff3cf" strokeOpacity=".5" strokeWidth=".8" />
            </g>
          ))}
          <text x="315" y="38" textAnchor="middle" fill="#2a1608" style={{ fontFamily: SPACED, fontWeight: 600, fontSize: 14, letterSpacing: 7 }}>
            FOUNDING SET
          </text>
          <text x="315" y="858" textAnchor="middle" fill="#2a1608" style={{ fontFamily: SPACED, fontWeight: 600, fontSize: 14, letterSpacing: 7 }}>
            OPEN UNDER A CLEAR SKY
          </text>
        </g>

        <path d={rr(1.5, 1.5, 627, 877, 29)} fill="none" stroke={`url(#${u}chrome)`} strokeWidth="3" />
        <path d={edge} fill="none" stroke={`url(#${u}chrome)`} strokeWidth=".8" opacity=".55" />
      </svg>
      <div className="sdc-seal-holo" />
      <div className="sdc-seal-sweep" />
      <div className="sdc-glare" />
    </div>
  );
}

/**
 * The back of a card: the real thing. The photograph of the object in a
 * viewfinder, its name on the red block, the two lines of its story, its
 * three figures as a ledger, and what the telescope will do for its holder.
 */
function CardBack({ plate: c, edition, commitment, sealed = false, u }: Props) {
  const b = `${u}b`;
  if (sealed) return <Sealed u={b} />;

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

  const promise = c.solar
    ? 'A daytime event. Live Telescope V1 does not point at the Sun; this card records the day.'
    : c.section === 'almanac'
      ? 'If the night is clear, every holder receives the capture.'
      : c.family === 'sights'
        ? 'When it comes, Live Telescope V1 records it for every holder.'
        : c.noun && c.observable
          ? `When Live Telescope V1 photographs ${c.noun}, every holder receives the image.`
          : `One of ${c.of} editions, numbered and held.`;
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
            <img src={photo.file} alt="" loading="lazy" decoding="async" style={{ objectPosition: photo.focus ?? '50% 50%' }} />
          </div>
        ) : (
          <>
            <div className="sdc-lay0 sdc-grade">
              <img src={`${c.art}/sky.webp`} alt="" loading="lazy" decoding="async" />
            </div>
            <div className="sdc-lay1 sdc-grade">
              <img src={`${c.art}/object.webp`} alt="" loading="lazy" decoding="async" />
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
        <text x="315" y={BOX.y + 42} textAnchor="middle" fill={INK.cream} style={{ fontFamily: CONDENSED, fontSize: 27, letterSpacing: 0.8 }}>
          LIVE TELESCOPE V1 · THE NIGHT SKY
        </text>
        <Glint x={315 - 196} y={BOX.y + 33} r={10} o={0.9} />
        <Glint x={315 + 196} y={BOX.y + 33} r={10} o={0.9} />
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
          {'  FOUNDING SET  '}
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
