/**
 * First Light.
 *
 * Twenty-four cards in two halves. The Objects (01–16) are real things,
 * numbered outward from Earth: the observatory's own first frame, two
 * fragments held in the hand, then the Moon, Mars, Jupiter, Saturn, a comet, a
 * spacecraft and the deep sky. The Almanac (17–24) is real dated events; each
 * is sold until its event ends, then sealed.
 *
 * Rarity is a decision made here and stored; it has nothing to do with whether
 * Node 01 can photograph the object — that is judged from the instrument and
 * the site (see build.ts). Fixed positions are J2000, from the node's own
 * catalogue (sky-field.ts) where it has the object. Lunar positions are the
 * IAU gazetteer's. Sizes for resolution are the object's real extent at a
 * typical distance.
 */

import { DEEP_SKY_BY_ID } from '@/lib/observatory/sky-field';
import { arcsecFromKm, arcsecFromKmAtAu, MOON_DISTANCE_KM } from '@/lib/sidera/observability';
import { authorAlmanac, authorCard, authorKept, type AuthoredCard, type CardFacts, type CardOptics } from './build';

export const SET_001 = {
  code: 'SET001',
  name: 'First Light',
  status: 'draft',
  releasedAt: null,
} as const;

function dso(id: string) {
  const d = DEEP_SKY_BY_ID.get(id);
  if (!d) throw new Error(`${id} is not in the deep-sky catalogue`);
  return d;
}

/** A moving body, or a detail on one: no fixed position, only a size. */
const body = (resolveArcsec: number | null, magnitude: number | null = null): CardOptics => ({
  resolveArcsec,
  magnitude,
  sizeArcmin: null,
});

/** A deep-sky object from the node's catalogue, seen whole. */
function deepSky(id: string): Pick<CardFacts, 'raHours' | 'decDeg'> & { optics: CardOptics } {
  const d = dso(id);
  return {
    raHours: d.ra,
    decDeg: d.dec,
    optics: { resolveArcsec: null, magnitude: d.mag, sizeArcmin: { major: d.major, minor: d.minor ?? d.major } },
  };
}

const NO_POSITION = { raHours: null, decDeg: null, surfaceLat: null, surfaceLon: null } as const;
const OFF_MOON = { surfaceLat: null, surfaceLon: null } as const;

const m45 = deepSky('m45');
const m42 = deepSky('m42');
const m1 = deepSky('m1');
const m31 = deepSky('m31');

const SPECIMEN = 'A specimen. It sits in a case, not in the sky; Node 01 has nothing to point at.';

export const SET_001_CARDS: AuthoredCard[] = [
  // The Objects, outward from Earth.
  authorKept(
    {
      designation: 'FIRST-LIGHT', name: 'First Light', objectType: 'first frame', rarity: 'legendary',
      catalogRef: 'Node 01 · 000001',
      blurb: 'The first image the observatory ever takes.',
    },
    'Whatever Node 01 points at first. Decided on the first clear night, not by vote.',
    { stats: [['OBSERVATION', '000001'], ['NODE', '01'], ['DATE', 'First clear night']], line: 'The first image the observatory ever takes.' },
  ),
  authorKept(
    {
      designation: 'IMILAC', name: 'Imilac', objectType: 'pallasite meteorite', rarity: 'legendary',
      catalogRef: 'Atacama, 1822',
      blurb: 'Olivine set in iron, fallen from a broken world.',
    },
    SPECIMEN,
    { stats: [['TYPE', 'Pallasite'], ['FOUND', '1822'], ['ORIGIN', 'Atacama']], line: 'Olivine set in iron, fallen from a broken world.', physical: true },
  ),
  authorKept(
    {
      designation: 'LUNAR-FRAGMENT', name: 'A Piece of the Moon', objectType: 'lunar meteorite', rarity: 'legendary',
      catalogRef: 'Class TBC',
      blurb: 'Thrown off the Moon, found on Earth.',
    },
    SPECIMEN,
    { stats: [['TYPE', 'Lunar meteorite'], ['CLASS', 'TBC'], ['FROM', '384,400 km']], line: 'Thrown off the Moon, found on Earth.', pairsWith: 'TYCHO', physical: true },
  ),
  authorCard(
    {
      designation: 'TYCHO', name: 'Tycho', objectType: 'lunar crater', rarity: 'rare',
      targetId: 'moon', catalogRef: 'IAU gazetteer',
      raHours: null, decDeg: null, surfaceLat: -43.31, surfaceLon: -11.36,
      blurb: 'The bright crater at the centre of the rays.',
    },
    body(arcsecFromKm(86, MOON_DISTANCE_KM)),
    { stats: [['DIAMETER', '86 km'], ['AGE', '~108 Myr'], ['DEPTH', '4.8 km']], line: 'The bright crater at the centre of the rays.', pairsWith: 'LUNAR-FRAGMENT' },
  ),
  authorCard(
    {
      designation: 'OLYMPUS-MONS', name: 'Olympus Mons', objectType: 'volcano on Mars', rarity: 'common',
      targetId: 'mars', catalogRef: 'IAU gazetteer', ...NO_POSITION,
      blurb: 'The tallest mountain known.',
    },
    body(arcsecFromKmAtAu(600, 0.6)),
    { stats: [['HEIGHT', '~22 km'], ['WIDTH', '~600 km'], ['TYPE', 'Shield volcano']], line: 'The tallest mountain known.' },
  ),
  authorCard(
    {
      designation: 'JUPITER', name: 'Jupiter', objectType: 'planet', rarity: 'rare',
      targetId: 'jupiter', catalogRef: 'JPL Horizons 599', ...NO_POSITION,
      blurb: 'The largest world, and the brightest in winter.',
    },
    body(arcsecFromKmAtAu(142_984, 4.2)),
    { stats: [['DIAMETER', '142,984 km'], ['DAY', '9 h 56 m'], ['OPPOSITION', '11 Feb 2027']], line: 'The largest world, and the brightest in winter.', pairsWith: 'DOUBLE-OPPOSITION' },
  ),
  authorCard(
    {
      designation: 'EUROPA', name: 'Europa', objectType: 'moon of Jupiter', rarity: 'common',
      targetId: 'jupiter', catalogRef: 'JPL Horizons 502', ...NO_POSITION,
      blurb: 'An ocean kept under a shell of ice.',
    },
    body(arcsecFromKmAtAu(3_122, 4.2)),
    { stats: [['DIAMETER', '3,122 km'], ['ORBIT', '3.55 days'], ['OCEAN', 'Beneath the ice']], line: 'An ocean kept under a shell of ice.' },
  ),
  authorCard(
    {
      designation: 'SATURN', name: 'The Rings of Saturn', objectType: 'ring system', rarity: 'epic',
      targetId: 'saturn', catalogRef: 'JPL Horizons 699', ...NO_POSITION,
      blurb: 'Wide as worlds, thin as a building.',
    },
    body(arcsecFromKmAtAu(282_000, 8.5)),
    { stats: [['OPPOSITION', '4 Oct 2026'], ['RINGS', '~282,000 km'], ['THICKNESS', '~10 m']], line: 'Wide as worlds, thin as a building.' },
  ),
  authorCard(
    {
      designation: 'KRAKEN-MARE', name: 'Kraken Mare', objectType: 'sea on Titan', rarity: 'common',
      targetId: 'saturn', catalogRef: 'IAU gazetteer', ...NO_POSITION,
      blurb: 'A sea on Titan, where it rains.',
    },
    body(arcsecFromKmAtAu(1_170, 8.5)),
    { stats: [['AREA', '~400,000 km²'], ['LIQUID', 'Methane'], ['TEMP', '−179 °C']], line: 'A sea on Titan, where it rains.' },
  ),
  authorCard(
    {
      designation: 'HALLEY', name: 'Halley', objectType: 'comet', rarity: 'legendary',
      targetId: 'halley', catalogRef: '1P/Halley', ...NO_POSITION,
      blurb: 'The card that waits. Its logbook stays open until 2061.',
    },
    // Near aphelion: far, dark and small.
    body(null, 25),
    { stats: [['PERIOD', '76 years'], ['NUCLEUS', '15 × 8 km'], ['RETURNS', '2061']], line: 'The card that waits. Its logbook stays open until 2061.', pairsWith: 'ORIONIDS' },
  ),
  authorKept(
    {
      designation: 'VOYAGER-1', name: 'Voyager 1', objectType: 'spacecraft', rarity: 'common',
      catalogRef: 'NASA 1977-084A',
      blurb: 'The farthest thing we ever made.',
    },
    'Beyond any telescope: a few metres of metal, 170 AU out.',
    { stats: [['LAUNCHED', '5 Sep 1977'], ['DISTANCE', '~170 AU'], ['SPEED', '~17 km/s']], line: 'The farthest thing we ever made.' },
  ),
  authorCard(
    {
      designation: 'M45', name: 'The Pleiades', objectType: 'star cluster', rarity: 'rare',
      targetId: 'm45', catalogRef: 'M45 (Seven Sisters)',
      raHours: m45.raHours, decDeg: m45.decDeg, ...OFF_MOON,
      blurb: 'Seven sisters, counted by every culture.',
    },
    m45.optics,
    { stats: [['DISTANCE', '444 ly'], ['AGE', '~100 Myr'], ['MAGNITUDE', '1.6']], line: 'Seven sisters, counted by every culture.', pairsWith: 'PLEIADES-OCCULTATION' },
  ),
  authorCard(
    {
      designation: 'M42', name: 'Orion Nebula', objectType: 'nebula', rarity: 'rare',
      targetId: 'm42', catalogRef: 'M42 (NGC 1976)',
      raHours: m42.raHours, decDeg: m42.decDeg, ...OFF_MOON,
      blurb: 'Where stars are being made tonight.',
    },
    m42.optics,
    { stats: [['DISTANCE', '1,344 ly'], ['SIZE', '24 ly'], ['MAGNITUDE', '4.0']], line: 'Where stars are being made tonight.' },
  ),
  authorCard(
    {
      designation: 'M1', name: 'The Crab', objectType: 'supernova remnant', rarity: 'epic',
      targetId: 'm1', catalogRef: 'M1 (NGC 1952)',
      raHours: m1.raHours, decDeg: m1.decDeg, ...OFF_MOON,
      blurb: 'A star that died in daylight, written down in 1054.',
    },
    m1.optics,
    { stats: [['DISTANCE', '~6,500 ly'], ['SEEN', '1054'], ['PULSAR', '30 turns/s']], line: 'A star that died in daylight, written down in 1054.' },
  ),
  authorCard(
    {
      designation: 'SGR-A', name: 'Sagittarius A*', objectType: 'black hole', rarity: 'common',
      targetId: 'sgr-a', catalogRef: 'EHT 2022',
      // 17h 45m 40s, −29° 00′ 28″.
      raHours: 17.7611, decDeg: -29.0078, ...OFF_MOON,
      blurb: 'The dark at the centre of the galaxy.',
    },
    { resolveArcsec: null, magnitude: null, sizeArcmin: null },
    { stats: [['MASS', '4.3M M☉'], ['DISTANCE', '26,000 ly'], ['IMAGED', '2022']], line: 'The dark at the centre of the galaxy.' },
  ),
  authorCard(
    {
      designation: 'M31', name: 'Andromeda', objectType: 'galaxy', rarity: 'rare',
      targetId: 'm31', catalogRef: 'M31 (NGC 224)',
      raHours: m31.raHours, decDeg: m31.decDeg, ...OFF_MOON,
      blurb: 'The farthest thing the naked eye can see.',
    },
    m31.optics,
    { stats: [['DISTANCE', '2.5 Mly'], ['STARS', '~1 trillion'], ['MAGNITUDE', '3.4']], line: 'The farthest thing the naked eye can see.' },
  ),

  // The Almanac, in the order the sky does them. Sealed at the end of each window.
  authorAlmanac(
    {
      designation: 'ORIONIDS', name: 'The Orionids', objectType: 'meteor shower', rarity: 'common',
      catalogRef: 'IAU MDC 8 ORI',
      blurb: "Halley's dust, falling through our sky.",
    },
    { start: '2026-10-21T00:00:00Z', end: '2026-10-23T00:00:00Z' },
    { stats: [['PEAK', '21–22 Oct 2026'], ['RATE', '~20/hr'], ['PARENT', '1P/Halley']], line: "Halley's dust, falling through our sky.", pairsWith: 'HALLEY' },
  ),
  authorAlmanac(
    {
      designation: 'HUNTERS-MOON', name: "Hunter's Moon", objectType: 'full moon', rarity: 'common',
      catalogRef: 'Full, 26 Oct 2026',
      blurb: 'The full Moon after the harvest.',
    },
    { start: '2026-10-25T12:00:00Z', end: '2026-10-27T00:00:00Z' },
    { stats: [['DATE', '26 Oct 2026'], ['PHASE', 'Full'], ['LIGHT', '100%']], line: 'The full Moon after the harvest.' },
  ),
  authorAlmanac(
    {
      designation: 'PLEIADES-OCCULTATION', name: 'The Moon Takes the Pleiades', objectType: 'occultation', rarity: 'rare',
      catalogRef: '24 Nov 2026',
      blurb: 'The full Moon passes over the seven sisters.',
    },
    { start: '2026-11-24T00:00:00Z', end: '2026-11-25T12:00:00Z' },
    { stats: [['DATE', '24 Nov 2026'], ['EVENT', 'Occultation'], ['TARGET', 'M45']], line: 'The full Moon passes over the seven sisters.', pairsWith: 'M45' },
  ),
  authorAlmanac(
    {
      designation: 'GEMINIDS', name: 'The Geminids', objectType: 'meteor shower', rarity: 'rare',
      catalogRef: 'IAU MDC 4 GEM',
      blurb: "The year's richest shower, under a dark sky.",
    },
    { start: '2026-12-13T00:00:00Z', end: '2026-12-15T12:00:00Z' },
    { stats: [['PEAK', '13–14 Dec 2026'], ['RATE', 'up to 120/hr'], ['MOON', 'New']], line: "The year's richest shower, under a dark sky." },
  ),
  authorAlmanac(
    {
      designation: 'CHRISTMAS-SUPERMOON', name: 'Christmas Eve Supermoon', objectType: 'supermoon', rarity: 'rare',
      catalogRef: 'Perigee, 24 Dec 2026',
      blurb: "The year's closest full Moon.",
    },
    { start: '2026-12-24T00:00:00Z', end: '2026-12-25T12:00:00Z' },
    { stats: [['DATE', '24 Dec 2026'], ['SIZE', '+14%'], ['LIGHT', '+30%']], line: "The year's closest full Moon." },
  ),
  authorAlmanac(
    {
      designation: 'DOUBLE-OPPOSITION', name: 'The Double Opposition', objectType: 'opposition', rarity: 'epic',
      catalogRef: 'Feb 2027',
      blurb: 'Two planets at their closest, eight days apart.',
    },
    { start: '2027-02-11T00:00:00Z', end: '2027-02-20T12:00:00Z' },
    { stats: [['JUPITER', '11 Feb 2027'], ['MARS', '19 Feb 2027'], ['NEXT MARS', '2029']], line: 'Two planets at their closest, eight days apart.', pairsWith: 'JUPITER' },
  ),
  authorAlmanac(
    {
      designation: 'SNOW-MOON-ECLIPSE', name: 'The Snow Moon Eclipse', objectType: 'lunar eclipse', rarity: 'epic',
      catalogRef: 'Penumbral, 20 Feb 2027',
      blurb: "A full Moon brushed by Earth's shadow.",
    },
    { start: '2027-02-20T00:00:00Z', end: '2027-02-21T12:00:00Z' },
    { stats: [['DATE', '20 Feb 2027'], ['ECLIPSE', 'Penumbral'], ['MOON', 'Super']], line: "A full Moon brushed by Earth's shadow." },
  ),
  authorAlmanac(
    {
      designation: 'GREAT-ECLIPSE', name: 'The Great Eclipse', objectType: 'solar eclipse', rarity: 'legendary',
      catalogRef: 'Total, 2 Aug 2027',
      blurb: 'The longest totality of the decade.',
    },
    { start: '2027-08-02T00:00:00Z', end: '2027-08-03T00:00:00Z' },
    { stats: [['DATE', '2 Aug 2027'], ['TOTALITY', '6+ min'], ['PATH', 'Spain to Egypt']], line: 'The longest totality of the decade.' },
  ),
];

export const SET_001_CARD_BY_DESIGNATION = new Map(SET_001_CARDS.map((c) => [c.seed.designation, c]));
