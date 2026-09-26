/**
 * First Light.
 *
 * A hundred cards in seven families, numbered outward from Earth: the Solar
 * System (from the observatory's own first frame and two fragments held in
 * the hand, out to a visitor from another star), the Stars, the Deep Sky, the
 * Galaxies and the Extremes are real things; the Frontier is ten worlds of
 * Sidera's own, fiction and labelled so; the Almanac is real dated events,
 * each sold until its event ends, then sealed. The first twenty-four are
 * written here; the rest by family in ./first-light/.
 *
 * Rarity is a decision made here and stored; it has nothing to do with whether
 * Node 01 can photograph the object — that is judged from the instrument and
 * the site (see build.ts). Fixed positions are J2000, from the node's own
 * catalogue (sky-field.ts) where it has the object. Lunar positions are the
 * IAU gazetteer's. Sizes for resolution are the object's real extent at a
 * typical distance.
 */

import { arcsecFromKm, arcsecFromKmAtAu, MOON_DISTANCE_KM } from '@/lib/sidera/observability';
import { authorAlmanac, authorCard, authorKept, type AuthoredCard } from './build';
import { DEEP_CARDS } from './first-light/deep';
import { EXTREME_CARDS } from './first-light/extremes';
import { FRONTIER_CARDS } from './first-light/frontier';
import { GALAXY_CARDS } from './first-light/galaxies';
import { NEAR_CARDS } from './first-light/near';
import { NO_POSITION, OFF_MOON, body, deepSky } from './first-light/shared';
import { STAR_CARDS } from './first-light/stars';

export const SET_001 = {
  code: 'SET001',
  name: 'First Light',
  status: 'draft',
  releasedAt: null,
} as const;

const m45 = deepSky('m45');
const m42 = deepSky('m42');
const m1 = deepSky('m1');
const m31 = deepSky('m31');

const SPECIMEN = 'A specimen. It sits in a case, not in the sky; Node 01 has nothing to point at.';

const FIRST_24: AuthoredCard[] = [
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
    { stats: [['DISTANCE', '444 ly'], ['AGE', '~100 Myr'], ['MAGNITUDE', '1.6']], line: 'Seven sisters, counted by every culture.', pairsWith: 'PLEIADES-OCCULTATION', family: 'deep' },
  ),
  authorCard(
    {
      designation: 'M42', name: 'Orion Nebula', objectType: 'nebula', rarity: 'rare',
      targetId: 'm42', catalogRef: 'M42 (NGC 1976)',
      raHours: m42.raHours, decDeg: m42.decDeg, ...OFF_MOON,
      blurb: 'Where stars are being made tonight.',
    },
    m42.optics,
    { stats: [['DISTANCE', '1,344 ly'], ['SIZE', '24 ly'], ['MAGNITUDE', '4.0']], line: 'Where stars are being made tonight.', family: 'deep' },
  ),
  authorCard(
    {
      designation: 'M1', name: 'The Crab', objectType: 'supernova remnant', rarity: 'epic',
      targetId: 'm1', catalogRef: 'M1 (NGC 1952)',
      raHours: m1.raHours, decDeg: m1.decDeg, ...OFF_MOON,
      blurb: 'A star that died in daylight, written down in 1054.',
    },
    m1.optics,
    { stats: [['DISTANCE', '~6,500 ly'], ['SEEN', '1054'], ['PULSAR', '30 turns/s']], line: 'A star that died in daylight, written down in 1054.', family: 'deep' },
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
    { stats: [['MASS', '4.3M M☉'], ['DISTANCE', '26,000 ly'], ['IMAGED', '2022']], line: 'The dark at the centre of the galaxy.', family: 'extremes' },
  ),
  authorCard(
    {
      designation: 'M31', name: 'Andromeda', objectType: 'galaxy', rarity: 'rare',
      targetId: 'm31', catalogRef: 'M31 (NGC 224)',
      raHours: m31.raHours, decDeg: m31.decDeg, ...OFF_MOON,
      blurb: 'The farthest thing the naked eye can see.',
    },
    m31.optics,
    { stats: [['DISTANCE', '2.5 Mly'], ['STARS', '~1 trillion'], ['MAGNITUDE', '3.4']], line: 'The farthest thing the naked eye can see.', family: 'galaxies' },
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

/** The set's order: each family outward from Earth, then the Frontier, then the Almanac by date. */
const ORDER = [
  // The Solar System
  'FIRST-LIGHT', 'IMILAC', 'LUNAR-FRAGMENT', 'TYCHO', 'SUN', 'MERCURY', 'VENUS', 'MARS', 'OLYMPUS-MONS', 'VALLES-MARINERIS',
  'JUPITER', 'IO', 'EUROPA', 'GANYMEDE', 'SATURN', 'KRAKEN-MARE', 'ENCELADUS', 'URANUS', 'NEPTUNE', 'PLUTO', 'HALLEY',
  'OUMUAMUA', 'VOYAGER-1',
  // The Stars
  'ALPHA-CEN', 'SIRIUS', 'VEGA', 'ARCTURUS', 'ALDEBARAN', 'POLARIS', 'MIRA', 'ALBIREO', 'BETELGEUSE', 'ANTARES', 'RIGEL',
  'ETA-CARINAE', 'TRAPPIST-1', '55-CANCRI-E', 'HD-189733B', 'KEPLER-16B',
  // The Deep Sky
  'M45', 'M44', 'HELIX', 'M57', 'CATS-EYE', 'M42', 'HORSEHEAD', 'ROSETTE', 'NORTH-AMERICA', 'VEIL', 'M8', 'M20', 'M16', 'M1',
  'BUTTERFLY', 'CARINA', 'JEWEL-BOX', 'DOUBLE-CLUSTER', 'OMEGA-CEN', 'M13', 'TARANTULA',
  // The Galaxies
  'MILKY-WAY', 'LMC', 'SMC', 'M31', 'M33', 'M81', 'M82', 'CEN-A', 'M101', 'M51', 'M104', 'M87', 'STEPHANS-QUINTET', 'CARTWHEEL',
  // The Extremes
  'SGR-A', 'CYGNUS-X1', 'MAGNETAR', 'SN-1987A', 'GW170817', 'TON-618', 'HUBBLE-DEEP-FIELD', 'CMB',
  // The Frontier
  'WORMHOLE', 'TWIN-SUNS', 'HOUR-SEA', 'ORBITAL-RING', 'DYSON-SWARM', 'ECUMENOPOLIS', 'FROZEN-CLOUDS', 'GREEN-MOON',
  'DERELICT', 'GENERATION-SHIP',
  // The Almanac
  'ORIONIDS', 'HUNTERS-MOON', 'PLEIADES-OCCULTATION', 'GEMINIDS', 'CHRISTMAS-SUPERMOON', 'DOUBLE-OPPOSITION',
  'SNOW-MOON-ECLIPSE', 'GREAT-ECLIPSE',
];

const AUTHORED = new Map(
  [...FIRST_24, ...NEAR_CARDS, ...STAR_CARDS, ...DEEP_CARDS, ...GALAXY_CARDS, ...EXTREME_CARDS, ...FRONTIER_CARDS].map((c) => [c.seed.designation, c]),
);
if (AUTHORED.size !== ORDER.length || ORDER.some((d) => !AUTHORED.has(d))) {
  throw new Error('First Light: ORDER and the authored cards disagree');
}

export const SET_001_CARDS: AuthoredCard[] = ORDER.map((d) => AUTHORED.get(d)!);

export const SET_001_CARD_BY_DESIGNATION = new Map(SET_001_CARDS.map((c) => [c.seed.designation, c]));
