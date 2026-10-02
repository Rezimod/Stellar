import { memo } from 'react';
import { editionLabel, type Plate } from '@/lib/stellar/plate';
import { photoFor } from '@/lib/stellar/photos';
import { CONDENSED, FOIL_OP, Footer, INK, LOGO_D, MONO, Paper, PosterDefs, Rules, SANS, SPACED, StripedTitle, fit, rr, width } from './frame';

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

const SEAL = [rosette(315, 262, 24, 7, 12, 6.2, 0, 1400), rosette(315, 262, 20, 9, 7, 6.6, 9, 1200), rosette(315, 262, 30, 11, 16, 4.6, 4, 1500)];

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

function Sealed({ u }: { u: string }) {
  const win = rr(22, 22, 586, 598, 16);
  return (
    <div className="sdc-card">
      <div className="sdc-window sdc-window--sealed" style={pct(22, 22, 586, 598, 16)}>
        <div className="sdc-rays sdc-rays--seal" />
        <div className="sdc-halftone" />
      </div>
      <svg className="sdc-frame" viewBox="0 0 630 880" aria-hidden="true">
        <defs>
          <PosterDefs u={u} rarity="rare" />
        </defs>
        <Paper u={u} hole={win} />
        <path d={win} fill="none" stroke="#1a0d07" strokeWidth="2.5" />
        <g fill="none" stroke={INK.orange} strokeWidth=".6">
          <path d={SEAL[0]} opacity=".5" />
          <path d={SEAL[1]} opacity=".4" />
          <path d={SEAL[2]} opacity=".3" />
        </g>
        {[48, 53, 160].map((radius) => (
          <circle key={radius} cx="315" cy="262" r={radius} fill="none" stroke={INK.orange} strokeWidth={radius === 48 ? 1.4 : 0.7} opacity=".75" />
        ))}
        <circle cx="315" cy="262" r="47" fill={INK.night} />
        <g transform="translate(294 241) scale(1.9)">
          <path d={LOGO_D} fill={`url(#${u}sun)`} />
        </g>
        <StripedTitle u={u} rarity="rare" lines={['STELLAR']} base={520} cap={78} />
        <text x="315" y="566" textAnchor="middle" fill={INK.cream} style={{ fontFamily: SPACED, fontWeight: 300, fontSize: 15, letterSpacing: 7 }}>
          FIRST LIGHT · SEALED
        </text>
        <Rules u={u} y={634} />
        <text x="315" y="706" textAnchor="middle" fill={INK.text} style={{ fontFamily: CONDENSED, fontSize: 36, letterSpacing: 0.4 }}>
          ONE CARD OF FIRST LIGHT
        </text>
        <text x="315" y="732" textAnchor="middle" fill={INK.red} style={{ fontFamily: SPACED, fontWeight: 500, fontSize: 12, letterSpacing: 5 }}>
          TURN IT OVER
        </text>
        <line x1="50" y1="764" x2="580" y2="764" stroke={INK.text} strokeOpacity=".22" />
        <text x="315" y="796" textAnchor="middle" fill={INK.muted} style={{ fontFamily: SPACED, fontWeight: 500, fontSize: 10.5, letterSpacing: 3 }}>
          LIVE TELESCOPE V1 · THE NIGHT SKY · COMMISSIONING
        </text>
        <line x1="50" y1="824" x2="580" y2="824" stroke={INK.text} strokeOpacity=".22" />
        <Footer y={850} right="SEALED" />
      </svg>
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
  const promise =
    c.section === 'almanac'
      ? 'On the night, every holder receives the capture.'
      : c.family === 'sights'
        ? 'When it comes, Live Telescope V1 records it for every holder.'
        : c.noun
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
