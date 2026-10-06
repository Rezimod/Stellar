import { memo } from 'react';
import { editionLabel, type Plate } from '@/lib/stellar/plate';
import { photoFor } from '@/lib/stellar/photos';
import { CONDENSED, FOIL_OP, Footer, Glint, INK, LOGO_D, MONO, Paper, PosterDefs, Rules, SANS, SPACED, StripedTitle, fit, rr, width } from './frame';

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

/** The photograph's window on the back: wider than tall, the way the telescopes frame them. */
const PW = { x: 22, y: 22, w: 586, h: 420, r: 16 };

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
 * The back of a card: the real thing. A photograph of the object — Hubble's
 * where Hubble has one — with its credit, and under it what the object is, the
 * two lines of its story and its record as a ledger.
 */
function CardBack({ plate: c, edition, commitment, sealed = false, u }: Props) {
  const b = `${u}b`;
  if (sealed) return <Sealed u={b} />;

  const r = c.rarity;
  const ed = editionLabel(edition);
  const photo = photoFor(c.designation);
  const win = rr(PW.x, PW.y, PW.w, PW.h, PW.r);

  const chip = photo
    ? photo.kind === 'impression'
      ? 'ARTIST’S IMPRESSION'
      : [photo.source, photo.year].filter(Boolean).join(' · ').toUpperCase()
    : c.designation === 'FIRST-LIGHT'
        ? 'AWAITING THE FIRST FRAME'
        : 'DRAWN PLATE';
  const chipSize = 10;
  const chipW = width(chip.length, chipSize, 'spacedBold', 2.2) + 26;
  const credit = photo ? `IMAGE · ${photo.credit}`.toUpperCase() : '';
  // A long credit runs to two lines, broken at the space nearest its middle.
  const cut = credit.length > 96 ? credit.lastIndexOf(' ', Math.ceil(credit.length / 2) + 6) : -1;
  const creditLines = cut > 0 ? [credit.slice(0, cut), credit.slice(cut + 1)] : [credit];
  const creditSize = fit(Math.max(...creditLines.map((l) => l.length)), 540, 'spaced', 9.5);

  const name = c.name.toUpperCase();
  const promise = c.solar
    ? 'A daytime event. Live Telescope V1 does not point at the Sun; this card records the day.'
    : c.section === 'almanac'
      ? 'If the night is clear, every holder receives the capture.'
      : c.family === 'sights'
        ? 'When it comes, Live Telescope V1 records it for every holder.'
        : c.noun && c.observable
          ? `When Live Telescope V1 photographs ${c.noun}, every holder receives the image.`
          : `One of ${c.of} editions.`;
  const ledger: [string, string][] = [...c.figures.map(([v, l]) => [l.toUpperCase(), v] as [string, string]), [c.section === 'almanac' ? 'WINDOW' : 'POSITION', c.back]];

  return (
    <div className="sdc-card">
      <div className="sdc-window" style={pct(PW.x, PW.y, PW.w, PW.h, PW.r)}>
        {photo ? (
          <div className="sdc-photo">
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
        <path d={win} fill="none" stroke="#1a0d07" strokeWidth="2.5" />

        <g transform="translate(38 38)">
          <rect width={chipW} height="26" rx="6" fill="rgba(14,8,6,.78)" stroke={INK.orange} strokeWidth="1.2" />
          <text x={chipW / 2} y="17.4" textAnchor="middle" fill={INK.cream} style={{ fontFamily: SPACED, fontWeight: 500, fontSize: chipSize, letterSpacing: 2.2 }}>
            {chip}
          </text>
        </g>
        <text x="586" y="56" textAnchor="end" fill="rgba(243,230,204,.7)" style={{ fontFamily: SPACED, fontWeight: 400, fontSize: 11, letterSpacing: 3 }}>
          {c.num} / {c.total}
        </text>
        {credit &&
          creditLines.map((line, i) => (
            <text key={i} x="40" y={PW.y + PW.h - 16 - (creditLines.length - 1 - i) * 13} fill="rgba(243,230,204,.78)" style={{ fontFamily: SPACED, fontWeight: 400, fontSize: creditSize, letterSpacing: 1.2 }}>
              {line}
            </text>
          ))}

        <Rules u={b} y={PW.y + PW.h + 12} />

        <text x="315" y="506" textAnchor="middle" fill={INK.text} style={{ fontFamily: CONDENSED, fontSize: fit(name.length, 520, 'condensed', 40), letterSpacing: 0.5 }}>
          {name}
        </text>
        <text x="315" y="528" textAnchor="middle" fill={INK.red} style={{ fontFamily: SPACED, fontWeight: 500, fontSize: 11, letterSpacing: Math.min(3.2, (520 - c.kicker.length * 5.4) / Math.max(1, c.kicker.length)) }}>
          {c.kicker}
        </text>
        {c.story.filter(Boolean).map((line, i) => (
          <text key={i} x="315" y={560 + i * 22} textAnchor="middle" fill="#3b2a1e" style={{ fontFamily: SANS, fontWeight: 500, fontSize: fit(line.length, 540, 'spaced', 15) }}>
            {line}
          </text>
        ))}

        {ledger.map(([label, value], i) => {
          const y = 622 + i * 25;
          const vSize = fit(value.length, 330, 'condensed', 15);
          const lw = width(label.length, 10, 'spacedBold', 2.4);
          const vw = width(value.length, vSize, 'condensed', 0.4);
          return (
            <g key={label}>
              <text x="58" y={y} fill={INK.muted} style={{ fontFamily: SPACED, fontWeight: 500, fontSize: 10, letterSpacing: 2.4 }}>
                {label}
              </text>
              <line x1={58 + lw + 10} y1={y - 3} x2={572 - vw - 10} y2={y - 3} stroke={INK.text} strokeOpacity=".35" strokeDasharray="1 4" strokeLinecap="round" />
              <text x="572" y={y} textAnchor="end" fill={INK.text} style={{ fontFamily: CONDENSED, fontSize: vSize, letterSpacing: 0.4 }}>
                {value}
              </text>
            </g>
          );
        })}

        <text x="315" y="740" textAnchor="middle" fill={INK.muted} style={{ fontFamily: SANS, fontStyle: 'italic', fontWeight: 500, fontSize: fit(promise.length, 540, 'spaced', 12.5) }}>
          {promise}
        </text>
        <line x1="50" y1="756" x2="580" y2="756" stroke={INK.text} strokeOpacity=".22" />
        <text x="58" y="780" fill={INK.muted} style={{ fontFamily: SPACED, fontWeight: 500, fontSize: 9.5, letterSpacing: 2.4 }}>
          COMMITMENT
        </text>
        <text x="572" y="780" textAnchor="end" fill={INK.text} style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1 }}>
          {commitment ? short(commitment) : '—'}
        </text>
        <text x="58" y="802" fill={INK.muted} style={{ fontFamily: SPACED, fontWeight: 500, fontSize: 9.5, letterSpacing: 2.4 }}>
          LIVE TELESCOPE V1 · THE NIGHT SKY · COMMISSIONING
        </text>
        <line x1="50" y1="824" x2="580" y2="824" stroke={INK.text} strokeOpacity=".22" />
        <Footer y={850} right={`${ed} / ${c.of}`} />
      </svg>
      {FOIL_OP[r] > 0 && <div className="sdc-foil" style={{ opacity: FOIL_OP[r] * 0.6 }} />}
      <div className="sdc-glare" />
    </div>
  );
}

export default memo(CardBack);
