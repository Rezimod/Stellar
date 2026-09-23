/**
 * The card around the plate: the metal of its rarity, a guilloche band, a
 * microtext serial running round the border, the header, the rarity chip, the
 * name panel and the foil-stamped edition number. Also the back: a rosette
 * seal around the comet mark and the holder's certificate.
 *
 * The card is drawn on a 630 × 880 grid (63 × 88 mm, a playing card). Every
 * figure it prints comes from the set record; the four surveyed cards add
 * three measurements of their own.
 */
import { rarityInfo, type Rarity } from '@/lib/rarity';
import { VOTE_WEIGHT } from '@/lib/sidera/economics';
import { SET_001_CARDS } from '@/lib/sets/set-001';
import { COMET, n, rr } from './draw';

export const CARD_W = 630;
export const CARD_H = 880;

const METAL: Record<Rarity, string[]> = {
  common: ['#f4f6fa', '#9aa3b5', '#e3e8ef', '#6f788a', '#cfd5df'],
  rare: ['#e2fff8', '#5eead4', '#2a9d8f', '#b8f7ea', '#3fb5a3'],
  epic: ['#fff3cf', '#e0a84a', '#fde6a8', '#9c6a22', '#ffd98a'],
  legendary: ['#fffaf0', '#ffe3a3', '#f4c9ff', '#bfe9ff', '#ffe9b8'],
};
const METAL_INK: Record<Rarity, string> = { common: '#dfe4ec', rare: '#8ff0dc', epic: '#ffd98a', legendary: '#fff0cc' };

/** The finish each rarity is printed in. Foil and glitter strengths are read by the card's CSS. */
export const FINISH: Record<Rarity, { foil: number; glitter: number; label: string }> = {
  common: { foil: 0, glitter: 0, label: 'Matte engraving' },
  rare: { foil: 0.07, glitter: 0, label: 'Teal metal' },
  epic: { foil: 0.13, glitter: 0.12, label: 'Gold foil' },
  legendary: { foil: 0.22, glitter: 0.26, label: 'Prismatic full art' },
};

/** Three measurements per surveyed card, printed under its name. */
const FACTS: Record<string, [string, string][]> = {
  MOON: [['DIAMETER', '3,474 KM'], ['DISTANCE', '384,400 KM'], ['SYNODIC', '29.5 DAYS']],
  M31: [['DISTANCE', '2.5 MLY'], ['STARS', '~1 TRILLION'], ['MAGNITUDE', '3.4']],
  SATURN: [['DIAMETER', '120,536 KM'], ['DAY', '10 H 33 M'], ['DENSITY', '0.69 G/CM³']],
  M87: [['MASS', '6.5 BN M☉'], ['DISTANCE', '55 MLY'], ['SHADOW', '42 µAS']],
};

/** A line of position for the back. */
const POSITION: Record<string, string> = {
  M31: 'RA 00H 42M 44S · DEC +41° 16′ 09″',
  M87: 'RA 12H 30M 49S · DEC +12° 23′ 28″',
};

const STATUS_WORD: Record<string, string> = { dedicated: 'DEDICATED', eligible: 'ELIGIBLE', not_available: 'NOT OBSERVABLE' };

export type CardFace = {
  designation: string;
  name: string;
  rarity: Rarity;
  objectType: string;
  catalogRef: string;
  observationStatus: string;
  editionSize: number;
  /** The holder's edition. Null prints the edition size instead. */
  edition: number | null;
  /** Set number, 1-based. */
  number: number;
  full: boolean;
};

const pad3 = (v: number) => String(v).padStart(3, '0');
const pad2 = (v: number) => String(v).padStart(2, '0');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clip = (s: string, max: number) => (s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s);

const SANS = 'font-family:var(--sd-sans),system-ui,sans-serif';
const MONO = 'font-family:var(--sd-mono),ui-monospace,monospace';
const MARK = 'font-family:var(--sd-display),var(--sd-sans),sans-serif';

/** A card's record, as the frame needs it. Null for a designation outside Set 001. */
export function cardFace(designation: string, edition: number | null, full: boolean): CardFace | null {
  const i = SET_001_CARDS.findIndex((c) => c.seed.designation === designation);
  if (i < 0) return null;
  const s = SET_001_CARDS[i].seed;
  return {
    designation: s.designation,
    name: s.name,
    rarity: s.rarity as Rarity,
    objectType: s.objectType,
    catalogRef: s.catalogRef,
    observationStatus: s.observationStatus,
    editionSize: s.editionSize,
    edition,
    number: i + 1,
    full,
  };
}

function metalDefs(u: string, r: Rarity) {
  const m = METAL[r];
  const stops = m.map((c, i) => `<stop offset="${n(i / (m.length - 1))}" stop-color="${c}"/>`).join('');
  return `<linearGradient id="${u}metal" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient><linearGradient id="${u}metalH" x1="0" y1="0" x2="1" y2="0">${stops}</linearGradient>`;
}

/** Border, guilloche and microtext: shared by front and back. */
function border(u: string, r: Rarity, micro: string) {
  const ink = METAL_INK[r];
  return {
    defs:
      metalDefs(u, r) +
      `<pattern id="${u}gui" width="14" height="7" patternUnits="userSpaceOnUse"><path d="M0 3.5Q3.5 0 7 3.5T14 3.5M0 3.5Q3.5 7 7 3.5T14 3.5" fill="none" stroke="${ink}" stroke-width=".45" opacity=".55"/></pattern>` +
      `<path id="${u}mp" d="${rr(12.6, 12.6, 604.8, 854.8, 24)}"/>`,
    body:
      `<path d="${rr(6, 6, 618, 868, 27)} ${rr(19, 19, 592, 842, 21)}" fill="url(#${u}gui)" fill-rule="evenodd"/>` +
      `<path d="${rr(2.5, 2.5, 625, 875, 28)}" fill="none" stroke="url(#${u}metal)" stroke-width="2.6"/>` +
      `<path d="${rr(19.5, 19.5, 591, 841, 20.5)}" fill="none" stroke="url(#${u}metal)" stroke-width=".8"/>` +
      `<text fill="${ink}" opacity=".7" style="${MONO};font-size:5.4px;letter-spacing:.9px"><textPath href="#${u}mp">${esc(micro.repeat(12))}</textPath></text>`,
  };
}

const wrap = (defs: string, body: string) =>
  `<svg width="100%" height="100%" viewBox="0 0 ${CARD_W} ${CARD_H}" style="position:absolute;inset:0;display:block" aria-hidden="true" focusable="false"><defs>${defs}</defs>${body}</svg>`;

/** The front's frame, drawn over the art window. */
export function frameSvg(c: CardFace, u: string): string {
  const { rarity } = c;
  const info = rarityInfo(rarity);
  const wh = c.full ? 832 : 620;
  const win = rr(24, 24, 582, wh, 18);
  const size = pad3(c.editionSize);
  const b = border(u, rarity, `SIDERA · SET 001 · ${c.designation} · EDITION ${c.edition === null ? '—' : pad3(c.edition)} OF ${size} · COMMITTED BEFORE SALE · `);
  const defs =
    b.defs +
    `<linearGradient id="${u}panel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1633"/><stop offset="1" stop-color="#070b1a"/></linearGradient>` +
    `<linearGradient id="${u}top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#02030a" stop-opacity=".75"/><stop offset="1" stop-color="#02030a" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="${u}bot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03040a" stop-opacity="0"/><stop offset=".45" stop-color="#03040a" stop-opacity=".82"/><stop offset="1" stop-color="#03040a" stop-opacity=".96"/></linearGradient>`;

  let o = `<path d="${rr(0, 0, CARD_W, CARD_H, 30)} ${win}" fill="#080d1e" fill-rule="evenodd"/>` + b.body;
  o += `<path d="${win}" fill="none" stroke="rgba(0,0,0,.6)" stroke-width="2"/><path d="${win}" fill="none" stroke="url(#${u}metal)" stroke-width=".6" opacity=".8"/>`;
  o += `<rect x="24" y="24" width="582" height="92" fill="url(#${u}top)"/>`;
  for (const [x, y] of [[24, 24], [606, 24], [24, 24 + wh], [606, 24 + wh]]) {
    o += `<path d="M0 -7L1.6 0L0 7L-1.6 0Z M-7 0L0 1.6L7 0L0 -1.6Z" fill="url(#${u}metal)" transform="translate(${x} ${y})"/>`;
  }
  o += `<g transform="translate(46 50) scale(.78)"><path d="${COMET}" fill="#F4EDE0"/></g>`;
  o += `<text x="68" y="64" fill="#f5f1e8" style="${MARK};font-weight:600;font-size:13px;letter-spacing:4.5px">SIDERA</text>`;
  o += `<text x="584" y="64" text-anchor="end" fill="rgba(245,241,232,.78)" style="${MONO};font-size:11px;letter-spacing:2px">SET 001 · ${pad2(c.number)} / ${pad2(SET_001_CARDS.length)}</text>`;

  const chipY = c.full ? 548 : 24 + wh - 40;
  const cw = 30 + info.label.length * 9.2;
  o += `<g transform="translate(44 ${chipY})"><rect width="${n(cw)}" height="24" rx="12" fill="rgba(4,6,14,.72)" stroke="url(#${u}metalH)" stroke-width=".9"/><text x="${n(cw / 2)}" y="16.2" text-anchor="middle" fill="url(#${u}metalH)" style="${MONO};font-size:10.5px;font-weight:500;letter-spacing:2.2px">${info.glyph} ${info.label.toUpperCase()}</text></g>`;

  if (c.full) {
    o += `<rect x="24" y="560" width="582" height="296" fill="url(#${u}bot)"/>`;
  } else {
    o += `<path d="${rr(24, 652, 582, 204, 16)}" fill="url(#${u}panel)"/><path d="${rr(24.5, 652.5, 581, 203, 16)}" fill="none" stroke="rgba(245,241,232,.08)"/>`;
  }
  const nameSize = Math.min(58, Math.floor(410 / (c.name.length * 0.56)));
  o += `<text x="50" y="724" fill="#f5f1e8" style="${SANS};font-weight:600;font-size:${nameSize}px;letter-spacing:${n(-nameSize * 0.028)}px">${esc(c.name)}</text>`;
  const line = clip(`${c.designation} · ${c.objectType} · ${c.catalogRef}`.toUpperCase(), 58);
  o += `<text x="52" y="756" fill="rgba(245,241,232,.56)" style="${MONO};font-size:11px;letter-spacing:2px">${esc(line)}</text>`;
  o += `<line x1="52" y1="776" x2="578" y2="776" stroke="rgba(245,241,232,.1)"/>`;
  const facts: [string, string][] = FACTS[c.designation] ?? [
    ['EDITIONS', c.editionSize.toLocaleString('en-US')],
    ['VOTE WEIGHT', String(VOTE_WEIGHT[rarity])],
    ['NODE 01', STATUS_WORD[c.observationStatus] ?? c.observationStatus.toUpperCase()],
  ];
  facts.forEach(([label, value], i) => {
    const x = 52 + i * 182;
    o += `<text x="${x}" y="802" fill="rgba(245,241,232,.5)" style="${MONO};font-size:9.5px;letter-spacing:2px">${esc(label)}</text>`;
    o += `<text x="${x}" y="828" fill="#f5f1e8" style="${MONO};font-size:16px">${esc(clip(value, 16))}</text>`;
  });
  const held = c.edition !== null;
  o +=
    `<g transform="translate(470 678)"><rect width="110" height="56" rx="9" fill="rgba(255,255,255,.025)" stroke="url(#${u}metal)" stroke-width=".9"/>` +
    `<text x="12" y="17" fill="rgba(245,241,232,.55)" style="${MONO};font-size:8.5px;letter-spacing:2px">${held ? 'EDITION' : 'EDITIONS'}</text>` +
    `<text x="12" y="44" fill="url(#${u}metalH)" style="${MONO};font-size:24px;font-weight:500">${held ? pad3(c.edition as number) : size}</text>` +
    (held ? `<text x="98" y="44" text-anchor="end" fill="rgba(245,241,232,.55)" style="${MONO};font-size:10px">/ ${size}</text>` : '') +
    `</g>`;
  return wrap(defs, o);
}

/** A hypotrochoid, the curve a banknote's rosette is drawn from. */
function rosette(cx: number, cy: number, R: number, r: number, d: number, s: number, rot: number, steps: number) {
  const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x);
  const period = (2 * Math.PI * r) / gcd(R, r);
  const a = (rot * Math.PI) / 180;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (period * i) / steps;
    const x = (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
    const y = (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
    pts.push(`${n(cx + s * (x * Math.cos(a) - y * Math.sin(a)))} ${n(cy + s * (x * Math.sin(a) + y * Math.cos(a)))}`);
  }
  return 'M' + pts.join('L');
}

/** The back: seal, name of the set, and what the holder receives. */
export function backSvg(c: CardFace, u: string): string {
  const info = rarityInfo(c.rarity);
  const size = pad3(c.editionSize);
  const ed = c.edition === null ? '—' : pad3(c.edition);
  const b = border(u, c.rarity, `SIDERA · SET 001 · ${c.designation} · EDITION ${ed} OF ${size} · NODE 01 · TBILISI · `);
  const defs = b.defs + `<radialGradient id="${u}bk" cx=".5" cy=".42" r=".7"><stop offset="0" stop-color="#121c40"/><stop offset=".6" stop-color="#0a1128"/><stop offset="1" stop-color="#060a18"/></radialGradient>`;
  const fiction = c.observationStatus === 'not_available' && c.objectType.toLowerCase().startsWith('fiction');
  const subject = c.designation === 'MOON' ? 'the Moon' : c.name.replace(/^The /, 'the ');
  let o = `<path d="${rr(0, 0, CARD_W, CARD_H, 30)}" fill="url(#${u}bk)"/>` + b.body;
  o +=
    `<g fill="none" stroke="url(#${u}metal)" stroke-width=".5">` +
    `<path d="${rosette(315, 372, 24, 7, 12, 8.6, 0, 1400)}" opacity=".38"/>` +
    `<path d="${rosette(315, 372, 20, 9, 7, 9.2, 9, 1200)}" opacity=".3"/>` +
    `<path d="${rosette(315, 372, 30, 11, 16, 6.4, 4, 1500)}" opacity=".22"/></g>`;
  for (const cr of [66, 72, 214]) o += `<circle cx="315" cy="372" r="${cr}" fill="none" stroke="url(#${u}metal)" stroke-width="${cr === 66 ? 1.2 : 0.6}" opacity=".7"/>`;
  o += `<circle cx="315" cy="372" r="65" fill="#080d1e"/><g transform="translate(287 344) scale(2.55)"><path d="${COMET}" fill="url(#${u}metal)"/></g>`;
  o += `<text x="315" y="104" text-anchor="middle" fill="rgba(245,241,232,.6)" style="${MONO};font-size:10px;letter-spacing:2.4px">${esc(POSITION[c.designation] ?? (fiction ? 'FICTION · EXISTS IN NO SKY' : 'MOVES · COMPUTED FOR THE NIGHT'))}</text>`;
  o += `<line x1="60" y1="124" x2="570" y2="124" stroke="rgba(245,241,232,.1)"/>`;
  o += `<text x="315" y="640" text-anchor="middle" fill="url(#${u}metalH)" style="${MARK};font-weight:600;font-size:26px;letter-spacing:11px">SIDERA</text>`;
  o += `<text x="315" y="668" text-anchor="middle" fill="rgba(245,241,232,.6)" style="${MONO};font-size:11px;letter-spacing:2.4px">SET 001 · ${pad2(c.number)} / ${pad2(SET_001_CARDS.length)} · ${info.glyph} ${info.label.toUpperCase()}</text>`;
  const lines = [
    c.edition === null ? `One of ${c.editionSize.toLocaleString('en-US')} editions.` : `This card is edition ${ed} of ${size}.`,
    ...(fiction
      ? ['It is an original design that exists in no sky,', 'so no telescope will photograph it.']
      : [`When Node 01 photographs ${esc(subject)},`, 'every holder of this card receives the image.']),
  ];
  lines.forEach((t, i) => {
    o += `<text x="315" y="${714 + i * 22}" text-anchor="middle" fill="rgba(245,241,232,.78)" style="${SANS};font-size:15px">${t}</text>`;
  });
  o += `<line x1="60" y1="790" x2="570" y2="790" stroke="rgba(245,241,232,.1)"/>`;
  o += `<text x="60" y="820" fill="rgba(245,241,232,.5)" style="${MONO};font-size:9.5px;letter-spacing:1.6px">${esc(c.catalogRef.toUpperCase().slice(0, 40))}</text>`;
  o += `<text x="60" y="840" fill="rgba(245,241,232,.5)" style="${MONO};font-size:9.5px;letter-spacing:1.6px">NODE 01 · TBILISI · COMMISSIONING</text>`;
  return wrap(defs, o);
}
