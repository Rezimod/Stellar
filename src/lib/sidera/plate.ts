/**
 * What a Set 001 card prints: its line of record, three figures, and the line
 * on its back. The drawing itself is in public/cards/plate/<DESIGNATION>/,
 * written by scripts/sidera-plates/build.py.
 */
import { rarityInfo, type Rarity } from '@/lib/rarity';
import { SET_001_CARDS, SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';

type Spec = {
  des: string;
  data: [string, string][];
  /** Name as it runs on the back: "When Node 01 photographs the Moon". Null for fiction. */
  noun: string | null;
  back: string;
  /** Name size where the plate sets it by hand. */
  nameSize?: number;
};

const MOVES = 'RA/DEC · MOVES — COMPUTED FOR THE NIGHT';

const SPECS: Record<string, Spec> = {
  MOON: { des: 'MOON · EARTH’S MOON · JPL HORIZONS 301', data: [['DIAMETER', '3,474 KM'], ['DISTANCE', '384,400 KM'], ['SYNODIC', '29.5 DAYS']], noun: 'the Moon', back: MOVES, nameSize: 54 },
  'TRANQUILITY-BASE': { des: 'TRANQUILITY BASE · APOLLO 11 · LROC', data: [['LANDED', '20 JUL 1969'], ['MOONWALK', '2 H 31 M'], ['LATITUDE', '0.674° N']], noun: 'Tranquility Base', back: 'LAT 0.674° N · LON 23.473° E' },
  VENUS: { des: 'VENUS · PLANET · JPL HORIZONS 299', data: [['DIAMETER', '12,104 KM'], ['DAY', '243 DAYS'], ['SURFACE', '465 °C']], noun: 'Venus', back: MOVES },
  MARS: { des: 'MARS · PLANET · JPL HORIZONS 499', data: [['DIAMETER', '6,779 KM'], ['DAY', '24 H 37 M'], ['MOONS', '2']], noun: 'Mars', back: MOVES },
  JUPITER: { des: 'JUPITER · PLANET · JPL HORIZONS 599', data: [['DIAMETER', '142,984 KM'], ['DAY', '9 H 56 M'], ['MOONS', '95']], noun: 'Jupiter', back: MOVES },
  SATURN: { des: 'SATURN · PLANET · JPL HORIZONS 699', data: [['DIAMETER', '120,536 KM'], ['DAY', '10 H 33 M'], ['DENSITY', '0.69 G/CM³']], noun: 'Saturn', back: MOVES, nameSize: 58 },
  PLUTO: { des: 'PLUTO · DWARF PLANET · JPL HORIZONS 999', data: [['DIAMETER', '2,377 KM'], ['YEAR', '248 YEARS'], ['DAY', '6.4 DAYS']], noun: 'Pluto', back: MOVES },
  HALLEY: { des: '1P/HALLEY · COMET · PERIODIC', data: [['PERIOD', '76 YEARS'], ['NUCLEUS', '15 × 8 KM'], ['RETURNS', '2061']], noun: 'Halley’s Comet', back: MOVES },
  SIRIUS: { des: 'SIRIUS · STAR · HIP 32349', data: [['MAGNITUDE', '−1.46'], ['DISTANCE', '8.6 LY'], ['TYPE', 'A1V']], noun: 'Sirius', back: '' },
  POLARIS: { des: 'POLARIS · STAR · HIP 11767', data: [['MAGNITUDE', '1.98'], ['DISTANCE', '433 LY'], ['TYPE', 'F7IB']], noun: 'Polaris', back: '' },
  BETELGEUSE: { des: 'BETELGEUSE · RED SUPERGIANT · HIP 27989', data: [['MAGNITUDE', '0.50'], ['DISTANCE', '~550 LY'], ['RADIUS', '~760 R☉']], noun: 'Betelgeuse', back: '' },
  M42: { des: 'M42 · NEBULA · NGC 1976', data: [['DISTANCE', '1,344 LY'], ['SIZE', '24 LY'], ['MAGNITUDE', '4.0']], noun: 'the Orion Nebula', back: '' },
  M45: { des: 'M45 · STAR CLUSTER · SEVEN SISTERS', data: [['DISTANCE', '444 LY'], ['AGE', '100 MYR'], ['MAGNITUDE', '1.6']], noun: 'the Pleiades', back: '' },
  M31: { des: 'M31 · SPIRAL GALAXY · NGC 224', data: [['DISTANCE', '2.5 MLY'], ['STARS', '~1 TRILLION'], ['MAGNITUDE', '3.4']], noun: 'Andromeda', back: '' },
  M16: { des: 'M16 · NEBULA · NGC 6611', data: [['DISTANCE', '5,700 LY'], ['PILLAR', '4 LY TALL'], ['MAGNITUDE', '6.0']], noun: 'the Eagle Nebula', back: '' },
  M87: { des: 'M87* · SUPERMASSIVE BLACK HOLE · VIRGO A', data: [['MASS', '6.5 BN M☉'], ['DISTANCE', '55 MLY'], ['SHADOW', '42 µAS']], noun: 'M87', back: '', nameSize: 46 },
  'TWIN-SUN': { des: 'TWIN-SUN · FICTIONAL WORLD · SIDERA FICTION 01', data: [['SUNS', '2'], ['SUNSETS', '2 A DAY'], ['WATER', 'NONE']], noun: null, back: '' },
  'TIDE-WORLD': { des: 'TIDE-WORLD · FICTIONAL WORLD · SIDERA FICTION 02', data: [['OCEAN', '100%'], ['LAND', 'NONE'], ['MOONS', '1']], noun: null, back: '' },
  'RING-HABITAT': { des: 'RING-HABITAT · FICTIONAL HABITAT · SIDERA FICTION 03', data: [['RADIUS', '1 AU'], ['STAR', '1'], ['NIGHT', 'BY SHADOW']], noun: null, back: '' },
  'UNIT-7': { des: 'UNIT-7 · FICTIONAL ROBOT · SIDERA FICTION 04', data: [['HEIGHT', '1.1 M'], ['PLANTS', '1'], ['COMPANY', 'NONE']], noun: null, back: '' },
  SENTINEL: { des: 'SENTINEL · FICTIONAL ROBOT · SIDERA FICTION 05', data: [['HEIGHT', '40 M'], ['WATCHING', '10,000 YEARS'], ['SENSORS', '1']], noun: null, back: '' },
  'BLACK-SLAB': { des: 'BLACK-SLAB · FICTIONAL ARTIFACT · SIDERA FICTION 06', data: [['RATIO', '1 : 4 : 9'], ['MAKER', 'UNKNOWN'], ['SEEN', 'AT ALIGNMENT']], noun: null, back: '' },
  DERELICT: { des: 'DERELICT · FICTIONAL STARSHIP · SIDERA FICTION 07', data: [['LENGTH', '11 KM'], ['LIGHTS ON', '4'], ['CREW', 'NONE FOUND']], noun: null, back: '' },
  WORMHOLE: { des: 'WORMHOLE · FICTIONAL PHENOMENON · SIDERA FICTION 08', data: [['THROAT', '1,400 KM'], ['DEPTH', '0 KM'], ['OTHER SIDE', 'A GALAXY']], noun: null, back: '' },
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
  data: [string, string][];
  /** Edition count, padded to three digits. */
  of: string;
  /** Legendary cards are full art: the drawing runs to the edge. */
  full: boolean;
  nameSize: number;
  back: string;
  noun: string | null;
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

export function plateFor(designation: string): Plate | null {
  const card = SET_001_CARD_BY_DESIGNATION.get(designation);
  const spec = SPECS[designation];
  if (!card || !spec) return null;
  const { seed } = card;
  const rarity = seed.rarity as Rarity;
  const info = rarityInfo(rarity);
  const fiction = spec.noun === null;
  const back =
    spec.back ||
    (fiction
      ? `${seed.catalogRef.toUpperCase()} · NOT IN ANY SKY`
      : seed.raHours != null && seed.decDeg != null
        ? position(seed.raHours, seed.decDeg)
        : MOVES);
  return {
    designation,
    name: seed.name,
    rarity,
    rname: info.label,
    glyph: info.glyph,
    num: String(SET_001_CARDS.indexOf(card) + 1).padStart(2, '0'),
    des: spec.des,
    data: spec.data,
    of: pad3(seed.editionSize),
    full: rarity === 'legendary',
    nameSize: spec.nameSize ?? Math.min(58, Math.floor(410 / (seed.name.length * 0.6))),
    back,
    noun: spec.noun,
    art: `/cards/plate/${designation}`,
  };
}

export const editionLabel = (n: number | null | undefined) => (n == null ? '—' : pad3(n));
