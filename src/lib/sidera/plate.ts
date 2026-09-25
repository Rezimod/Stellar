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
const NAME_SIZE: Record<string, number> = { SATURN: 44, 'PLEIADES-OCCULTATION': 30 };

/** Two lines on the back: what this is, said simply, and why it matters. */
const STORY: Record<string, [string, string]> = {
  'FIRST-LIGHT': ['Before any star, a shutter opens.', 'Whatever the sky gives first, you hold.'],
  IMILAC: ['A world broke apart before Earth had oceans.', 'This is a piece of its heart, green with olivine.'],
  'LUNAR-FRAGMENT': ['An impact threw it off the Moon.', 'It fell here, and now it is held.'],
  TYCHO: ['One strike, 108 million years ago.', 'Its rays still cross the whole near side.'],
  'OLYMPUS-MONS': ['Three Everests high, wide as France.', 'You could stand on it and not know it was a mountain.'],
  JUPITER: ['A thousand Earths would fit inside.', 'Its storm has raged longer than any nation.'],
  EUROPA: ['Under the ice, twice the water of Earth.', 'The best place to look for life we have not met.'],
  SATURN: ['Ice as small as sand, as big as houses.', 'From here, the thinnest thing we have ever seen.'],
  'KRAKEN-MARE': ['A sea where the rain is methane.', 'The only shore beyond Earth where waves may break.'],
  HALLEY: ['It came in 1986. It comes again in 2061.', 'Hold the card, and wait with it.'],
  'VOYAGER-1': ['Launched in 1977, still calling home.', 'Every year, farther from everyone who ever lived.'],
  M45: ['Seven sisters, a hundred million years young.', 'Named by every people who ever looked up.'],
  M42: ['A cloud where stars are being born tonight.', 'You can see it with your own eyes.'],
  M1: ['In 1054, a star was seen in daylight.', 'This is what remains, a heart still spinning.'],
  'SGR-A': ['Four million suns, hidden in the dark.', 'Everything in our galaxy turns around it.'],
  M31: ['A trillion stars, 2.5 million light-years out.', 'It is coming toward us. In four billion years, we meet.'],
  ORIONIDS: ['Dust shed by Halley, centuries ago.', 'It burns above you at 66 kilometres a second.'],
  'HUNTERS-MOON': ['The full Moon that rises with the dusk.', 'For a few nights, it lights the whole field.'],
  'PLEIADES-OCCULTATION': ['The Moon crosses the seven sisters.', 'One by one, they vanish and return.'],
  GEMINIDS: ['Not comet dust: the crumbs of an asteroid.', 'The richest shower of the year, under no Moon.'],
  'CHRISTMAS-SUPERMOON': ['The closest full Moon of the year.', 'Fourteen percent wider, thirty percent brighter.'],
  'DOUBLE-OPPOSITION': ['Jupiter, then Mars, at their closest to Earth.', 'Eight days apart. The next pair is years away.'],
  'SNOW-MOON-ECLIPSE': ['A full Moon slips into the edge of Earth’s shadow.', 'Watch one limb go quietly dusky.'],
  'GREAT-ECLIPSE': ['Six minutes of night at midday.', 'The longest darkness on land this century.'],
};

export type Plate = {
  designation: string;
  name: string;
  rarity: Rarity;
  rname: string;
  glyph: string;
  /** Place in the set, two digits. */
  num: string;
  des: string;
  /** Under the name on the face: what it is and where. */
  kicker: string;
  data: [string, string][];
  story: [string, string];
  /** Edition count, padded to three digits. */
  of: string;
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
    kicker: `${seed.objectType} · ${seed.catalogRef}`.toUpperCase(),
    data: record.stats.map(([label, value]) => [label, value.toUpperCase()]),
    story: STORY[designation],
    of: pad3(seed.editionSize),
    nameSize: NAME_SIZE[designation] ?? Math.min(60, Math.floor(400 / (seed.name.length * 0.56))),
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
