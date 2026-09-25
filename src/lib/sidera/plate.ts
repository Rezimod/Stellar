/**
 * What a First Light card prints: its line of record, three figures, and the
 * line on its back — read off the card's own record. The drawing itself is in
 * public/cards/plate/<DESIGNATION>/, written by scripts/sidera-plates/build.py.
 */
import { rarityInfo, type Rarity } from '@/lib/rarity';
import type { Section } from '@/lib/sets/build';
import { SET_001_CARDS, SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';

const MOVES = 'RA/DEC · MOVES — COMPUTED FOR THE NIGHT';

/** The name as it runs on the back: "When Node 01 photographs the Moon". Absent for what the node cannot point at. */
const NOUN: Record<string, string> = {
  TYCHO: 'Tycho',
  'OLYMPUS-MONS': 'Olympus Mons',
  JUPITER: 'Jupiter',
  EUROPA: 'Europa',
  SATURN: 'Saturn',
  'KRAKEN-MARE': 'Kraken Mare',
  HALLEY: 'Halley',
  M45: 'the Pleiades',
  M42: 'the Orion Nebula',
  M1: 'the Crab',
  'SGR-A': 'Sagittarius A*',
  M31: 'Andromeda',
};

/** Name size where the face sets it by hand. */
const NAME_SIZE: Record<string, number> = { SATURN: 40 };

export type Plate = {
  designation: string;
  name: string;
  rarity: Rarity;
  rname: string;
  glyph: string;
  /** Place in the set, two digits. */
  num: string;
  des: string;
  data: [string, string][];
  /** Edition count, padded to three digits. */
  of: string;
  /** Legendary cards are full art: the drawing runs to the edge. */
  full: boolean;
  nameSize: number;
  back: string;
  noun: string | null;
  section: Section;
  /** The directory holding sky.svg, object.svg and survey.svg. */
  art: string;
};

const pad3 = (n: number) => String(n).padStart(3, '0');

/** "RA 00H 42M 44S · DEC +41° 16′ 09″" */
function position(ra: number, dec: number) {
  const s = Math.round(ra * 3600);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const a = Math.round(Math.abs(dec) * 3600);
  const d = Math.floor(a / 3600), dm = Math.floor((a % 3600) / 60), ds = a % 60;
  const two = (v: number) => String(v).padStart(2, '0');
  return `RA ${two(h)}H ${two(m)}M ${two(sec)}S · DEC ${dec < 0 ? '−' : '+'}${two(d)}° ${two(dm)}′ ${two(ds)}″`;
}

/** "LAT 43.31° S · LON 11.36° W" */
function lunar(lat: number, lon: number) {
  return `LAT ${Math.abs(lat).toFixed(2)}° ${lat < 0 ? 'S' : 'N'} · LON ${Math.abs(lon).toFixed(2)}° ${lon < 0 ? 'W' : 'E'}`;
}

export function plateFor(designation: string): Plate | null {
  const card = SET_001_CARD_BY_DESIGNATION.get(designation);
  if (!card) return null;
  const { seed, record } = card;
  const rarity = seed.rarity as Rarity;
  const info = rarityInfo(rarity);
  const back =
    record.section === 'almanac'
      ? `${record.eventStartUtc!.slice(0, 10)} · ${record.eventEndUtc!.slice(0, 10)} UTC`
      : seed.raHours != null && seed.decDeg != null
        ? position(seed.raHours, seed.decDeg)
        : seed.surfaceLat != null && seed.surfaceLon != null
          ? lunar(seed.surfaceLat, seed.surfaceLon)
          : NOUN[designation]
            ? MOVES
            : seed.catalogRef.toUpperCase();
  return {
    designation,
    name: seed.name,
    rarity,
    rname: info.label,
    glyph: info.glyph,
    num: String(SET_001_CARDS.indexOf(card) + 1).padStart(2, '0'),
    des: `${designation} · ${seed.objectType} · ${seed.catalogRef}`.toUpperCase(),
    data: record.stats.map(([label, value]) => [label, value.toUpperCase()]),
    of: pad3(seed.editionSize),
    full: rarity === 'legendary',
    nameSize: NAME_SIZE[designation] ?? Math.min(58, Math.floor(410 / (seed.name.length * 0.6))),
    back,
    noun: NOUN[designation] ?? null,
    section: record.section,
    art: `/cards/plate/${designation}`,
  };
}

/** Each object's own light, for the glow a tile sits on. Where an object has none — a crater, a stone — the family's stands in. */
const GLOW: Record<string, string> = {
  'FIRST-LIGHT': '#e8e2d4', IMILAC: '#d9b26f', 'LUNAR-FRAGMENT': '#c9d6ff', TYCHO: '#bacbff', 'OLYMPUS-MONS': '#ff9a63',
  JUPITER: '#ffbd8a', EUROPA: '#d8ecff', SATURN: '#ffe3a3', 'KRAKEN-MARE': '#ffd28a', HALLEY: '#7fc8ff', 'VOYAGER-1': '#bfc8d8',
  M45: '#6fb6ff', M42: '#ff9ec7', M1: '#9fd0ff', 'SGR-A': '#ff8a2a', M31: '#b8c6ff',
  ORIONIDS: '#9fcaff', 'HUNTERS-MOON': '#ffd79a', 'PLEIADES-OCCULTATION': '#c9d6ff', GEMINIDS: '#a9c4ff',
  'CHRISTMAS-SUPERMOON': '#fff1cf', 'DOUBLE-OPPOSITION': '#ffb070', 'SNOW-MOON-ECLIPSE': '#d6c2ff', 'GREAT-ECLIPSE': '#ffe9b8',
};
export const glowFor = (designation: string) => GLOW[designation] ?? '#bcd8ff';

export const editionLabel = (n: number | null | undefined) => (n == null ? '—' : pad3(n));
