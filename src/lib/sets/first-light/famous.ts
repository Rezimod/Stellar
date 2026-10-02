/**
 * The cards everyone knows (2026-10-02): the Moon and the Earth, the
 * telescopes and the ship that carried people there, the stars that make the
 * sky's shapes, the impacts that changed the world — and the Rare Sights, what
 * the sky does now and then that people travel to be under. Each is filed with
 * the family it belongs to on the shelf.
 */

import { arcsecFromKm, arcsecFromKmAtAu, MOON_DISTANCE_KM } from '@/lib/stellar/observability';
import { authorCard, authorKept, authorSight, type AuthoredCard } from '../build';
import { NO_POSITION, OFF_MOON, body, fixed } from './shared';

const near = { family: 'near' } as const;
const stars = { family: 'stars' } as const;

const MADE = 'A thing people made, moving too fast across the sky for Live Telescope V1 to follow.';
const HISTORY = 'A moment in history: there is nothing left in the sky to point at.';
const SIGHT = 'A sight of the sky, not an object to point at. Live Telescope V1 records one when it comes, weather allowing.';

const dipper = fixed(12.25, 55.0, 1.8, [1500, 700]);
const orion = fixed(5.58, 3.0, null, [1800, 1200]);
const crux = fixed(12.45, -60.0, null, [360, 360]);
const triangle = fixed(19.5, 30.0, null, [1800, 1500]);

export const FAMOUS_CARDS: AuthoredCard[] = [
  // ── The Solar System
  authorKept(
    { designation: 'EARTH', name: 'Earth', objectType: 'planet', rarity: 'common', catalogRef: 'Pale Blue Dot · Voyager 1, 1990', blurb: 'Home, seen from six billion kilometres.' },
    'Live Telescope V1 stands on it.',
    {
      ...near,
      stats: [['DIAMETER', '12,742 km'], ['AGE', '4.54 billion yr'], ['MOONS', '1']],
      line: 'Home, seen from six billion kilometres.',
      story: ['From Voyager 1, six billion km out, it is less than a pixel.', 'Every person who ever lived, on one blue point.'],
      glow: '#8fc4ff',
    },
  ),
  authorKept(
    { designation: 'EARTHRISE', name: 'Earthrise', objectType: 'photograph', rarity: 'epic', catalogRef: 'Apollo 8 · AS08-14-2383', blurb: 'The Earth rising over the Moon, seen for the first time.' },
    HISTORY,
    {
      ...near,
      stats: [['TAKEN', '24 Dec 1968'], ['BY', 'Bill Anders'], ['FROM', 'Lunar orbit']],
      line: 'The Earth rising over the Moon, seen for the first time.',
      story: ['The first time people saw the Earth rise over another world.', 'Taken on Christmas Eve, 1968, from orbit around the Moon.'],
      glow: '#9fd0ff',
    },
  ),
  authorKept(
    { designation: 'CHICXULUB', name: 'The Dinosaur Asteroid', objectType: 'impact', rarity: 'rare', catalogRef: 'Chicxulub crater, Yucatán', blurb: 'The strike that ended the age of dinosaurs.' },
    HISTORY,
    {
      ...near,
      stats: [['WHEN', '66 million yr ago'], ['IMPACTOR', '~10 km'], ['CRATER', '~180 km']],
      line: 'The strike that ended the age of dinosaurs.',
      story: ['An asteroid the size of a city struck what is now Mexico.', 'It ended the age of dinosaurs, and began ours.'],
      glow: '#ff9a5a',
    },
  ),
  authorKept(
    { designation: 'TUNGUSKA', name: 'The Tunguska Blast', objectType: 'airburst', rarity: 'common', catalogRef: 'Siberia, 30 Jun 1908', blurb: 'Something from space exploded over a forest.' },
    HISTORY,
    {
      ...near,
      stats: [['DATE', '30 Jun 1908'], ['TREES', '~80 million down'], ['AREA', '2,150 km²']],
      line: 'Something from space exploded over a forest.',
      story: ['A rock from space burst in the air above Siberia.', 'It flattened eighty million trees, and left no crater.'],
      glow: '#ffb070',
    },
  ),
  authorKept(
    { designation: 'SPUTNIK-1', name: 'Sputnik 1', objectType: 'satellite', rarity: 'common', catalogRef: '1957-001B', blurb: 'The first thing we ever put in orbit.' },
    HISTORY,
    {
      ...near,
      stats: [['LAUNCHED', '4 Oct 1957'], ['SIZE', '58 cm'], ['ORBITS', '~1,440']],
      line: 'The first thing we ever put in orbit.',
      story: ['A polished ball with four long antennas.', 'Its radio beep began the Space Age.'],
      glow: '#d8dde6',
    },
  ),
  authorKept(
    { designation: 'ISS', name: 'The Space Station', objectType: 'space station', rarity: 'common', catalogRef: 'ISS · 1998-067A', blurb: 'A home in orbit, crewed since 2000.' },
    MADE,
    {
      ...near,
      stats: [['ORBIT', '~400 km'], ['SPEED', '28,000 km/h'], ['CREWED SINCE', 'Nov 2000']],
      line: 'A home in orbit, crewed since 2000.',
      story: ['People have lived aboard without a break since November 2000.', 'It circles the Earth every 92 minutes; you can see it pass.'],
      glow: '#e6ecf5',
    },
  ),
  authorKept(
    { designation: 'HUBBLE', name: 'The Hubble Space Telescope', objectType: 'space telescope', rarity: 'common', catalogRef: '1990-037B', blurb: 'The telescope that showed us the universe.' },
    MADE,
    {
      ...near,
      stats: [['LAUNCHED', '24 Apr 1990'], ['MIRROR', '2.4 m'], ['ORBIT', '~540 km']],
      line: 'The telescope that showed us the universe.',
      story: ['Launched with a flawed mirror, mended by astronauts in 1993.', 'Many of the pictures on the backs of these cards are its own.'],
      glow: '#cfd8e6',
    },
  ),
  authorKept(
    { designation: 'JWST', name: 'The James Webb Space Telescope', objectType: 'space telescope', rarity: 'rare', catalogRef: '2021-130A', blurb: 'A golden eye on the first galaxies.' },
    'A million and a half kilometres away, and looking the other way.',
    {
      ...near,
      stats: [['LAUNCHED', '25 Dec 2021'], ['MIRROR', '6.5 m'], ['FROM EARTH', '1.5 million km']],
      line: 'A golden eye on the first galaxies.',
      story: ['It sees in infrared, through the dust that hides newborn stars.', 'It folded like origami to fit inside its rocket.'],
      glow: '#ffcf6a',
    },
  ),
  authorCard(
    {
      designation: 'MOON', name: 'The Moon', objectType: 'moon', rarity: 'rare',
      targetId: 'moon', catalogRef: 'JPL Horizons 301', ...NO_POSITION,
      blurb: 'Our companion, the same face toward us always.',
    },
    body(arcsecFromKm(3_475, MOON_DISTANCE_KM)),
    {
      ...near,
      stats: [['DIAMETER', '3,475 km'], ['DISTANCE', '384,400 km'], ['LIGHT', '1.3 s away']],
      line: 'Our companion, the same face toward us always.',
      story: ['It keeps the same face turned to us, always.', 'It drifts 3.8 cm farther away every year.'],
      glow: '#e8e4da',
      noun: 'the Moon',
    },
  ),
  authorCard(
    {
      designation: 'APOLLO-11', name: 'Apollo 11', objectType: 'Moon landing site', rarity: 'legendary',
      targetId: 'moon', catalogRef: 'Tranquility Base', raHours: null, decDeg: null, surfaceLat: 0.6741, surfaceLon: 23.473,
      blurb: 'Where people first walked on another world.',
    },
    // The descent stage left on the plain: about four metres across.
    body(arcsecFromKm(0.004, MOON_DISTANCE_KM)),
    {
      ...near,
      stats: [['LANDED', '20 Jul 1969'], ['CREW', '3'], ['ON THE MOON', '21 h 36 m']],
      line: 'Where people first walked on another world.',
      story: ['Two people walked on the Moon for the first time.', 'Their footprints are still there, in air that never moves.'],
      glow: '#f2ead8',
    },
  ),
  authorKept(
    { designation: 'SL9', name: 'Comet Shoemaker–Levy 9', objectType: 'comet impact on Jupiter', rarity: 'rare', catalogRef: 'D/1993 F2', blurb: 'A comet torn apart, then thrown into Jupiter.' },
    HISTORY,
    {
      ...near,
      stats: [['IMPACTS', '16–22 Jul 1994'], ['FRAGMENTS', '21'], ['SCARS', 'Wider than Earth']],
      line: 'A comet torn apart, then thrown into Jupiter.',
      story: ['Jupiter pulled it into a string of pieces two years before.', 'For the first time, we watched two worlds collide.'],
      glow: '#ffbd8a',
    },
  ),
  authorCard(
    {
      designation: 'TITAN', name: 'Titan', objectType: 'moon of Saturn', rarity: 'common',
      targetId: 'saturn', catalogRef: 'JPL Horizons 606', ...NO_POSITION,
      blurb: 'A moon with skies, rain and seas.',
    },
    body(arcsecFromKmAtAu(5_150, 8.5)),
    {
      ...near,
      stats: [['DIAMETER', '5,150 km'], ['AIR', '1.5 × Earth’s'], ['SEAS', 'Methane']],
      line: 'A moon with skies, rain and seas.',
      story: ['The only moon with a thick atmosphere.', 'It rains methane into lakes and seas.'],
      glow: '#ffcf7a',
      noun: 'Titan',
    },
  ),

  // ── The Stars: the shapes everyone learns first
  authorCard(
    {
      designation: 'BIG-DIPPER', name: 'The Big Dipper', objectType: 'asterism', rarity: 'common',
      targetId: 'big-dipper', catalogRef: 'Ursa Major', raHours: dipper.raHours, decDeg: dipper.decDeg, ...OFF_MOON,
      blurb: 'Seven stars that point the way north.',
    },
    dipper.optics,
    {
      ...stars,
      stats: [['STARS', '7'], ['SPAN', '~25°'], ['POINTS TO', 'Polaris']],
      line: 'Seven stars that point the way north.',
      story: ['Follow its two end stars and you reach the North Star.', 'Five of its seven stars travel through space together.'],
      glow: '#dbe6ff',
    },
  ),
  authorCard(
    {
      designation: 'ORION', name: 'Orion', objectType: 'constellation', rarity: 'common',
      targetId: 'orion', catalogRef: 'Ori', raHours: orion.raHours, decDeg: orion.decDeg, ...OFF_MOON,
      blurb: 'The hunter, known on every continent.',
    },
    orion.optics,
    {
      ...stars,
      stats: [['BELT', '3 stars'], ['BRIGHTEST', 'Rigel'], ['NEBULA', 'M42']],
      line: 'The hunter, known on every continent.',
      story: ['Three stars in a row make his belt.', 'A red giant at his shoulder, a blue one at his foot.'],
      glow: '#cfe0ff',
    },
  ),
  authorCard(
    {
      designation: 'SOUTHERN-CROSS', name: 'The Southern Cross', objectType: 'constellation', rarity: 'common',
      targetId: 'crux', catalogRef: 'Crux', raHours: crux.raHours, decDeg: crux.decDeg, ...OFF_MOON,
      blurb: 'The smallest constellation, and the best known in the south.',
    },
    crux.optics,
    {
      ...stars,
      stats: [['STARS', '4 bright'], ['SIZE', 'Smallest of 88'], ['ON FLAGS', '5 nations']],
      line: 'The smallest constellation, and the best known in the south.',
      story: ['The smallest of all eighty-eight constellations.', 'Sailors in the south steered by it.'],
      glow: '#c9dcff',
    },
  ),
  authorCard(
    {
      designation: 'SUMMER-TRIANGLE', name: 'The Summer Triangle', objectType: 'asterism', rarity: 'common',
      targetId: 'summer-triangle', catalogRef: 'Vega · Deneb · Altair', raHours: triangle.raHours, decDeg: triangle.decDeg, ...OFF_MOON,
      blurb: 'Three bright stars across the Milky Way.',
    },
    triangle.optics,
    {
      ...stars,
      stats: [['STARS', '3'], ['SPAN', '~35°'], ['THROUGH IT', 'The Milky Way']],
      line: 'Three bright stars across the Milky Way.',
      story: ['Three bright stars from three constellations.', 'The Milky Way runs straight through it.'],
      glow: '#e2ecff',
    },
  ),

  // ── The Rare Sights
  authorSight(
    { designation: 'TOTAL-ECLIPSE', name: 'Total Solar Eclipse', objectType: 'solar eclipse', rarity: 'epic', catalogRef: 'Totality', blurb: 'The Moon covers the Sun, and day becomes night.' },
    SIGHT,
    {
      stats: [['LONGEST', '7 min 32 s'], ['PATH', '~160 km wide'], ['SOMEWHERE', 'Every ~18 months']],
      line: 'The Moon covers the Sun, and day becomes night.',
      story: ['The Moon covers the Sun exactly, and day turns to night.', 'Only then can you see the Sun’s corona with your own eyes.'],
      glow: '#fff1cf',
    },
  ),
  authorSight(
    { designation: 'BLOOD-MOON', name: 'The Blood Moon', objectType: 'total lunar eclipse', rarity: 'rare', catalogRef: 'Totality', blurb: 'The full Moon turns copper in Earth’s shadow.' },
    SIGHT,
    {
      stats: [['COLOUR', 'Copper red'], ['TOTALITY', 'Up to 1 h 47 m'], ['WHY', 'Earth’s sunsets']],
      line: 'The full Moon turns copper in Earth’s shadow.',
      story: ['The Moon slides into Earth’s shadow and turns red.', 'The light on it is every sunset on Earth at once.'],
      glow: '#ff7a52',
    },
  ),
  authorSight(
    { designation: 'RING-OF-FIRE', name: 'Ring of Fire', objectType: 'annular eclipse', rarity: 'rare', catalogRef: 'Annularity', blurb: 'The Moon too small to hide the Sun.' },
    SIGHT,
    {
      stats: [['RING', 'Up to 12 min'], ['WHY', 'Moon farthest'], ['WATCH', 'With a filter']],
      line: 'The Moon too small to hide the Sun.',
      story: ['The Moon is too far away to cover the whole Sun.', 'A ring of fire is left burning around it.'],
      glow: '#ffb84a',
    },
  ),
  authorSight(
    { designation: 'AURORA', name: 'The Aurora', objectType: 'aurora', rarity: 'epic', catalogRef: 'Borealis · Australis', blurb: 'Curtains of light where the Sun’s wind meets the air.' },
    SIGHT,
    {
      stats: [['HEIGHT', '100–300 km'], ['GREEN', 'Oxygen'], ['CAUSE', 'The solar wind']],
      line: 'Curtains of light where the Sun’s wind meets the air.',
      story: ['Particles from the Sun strike the air, and it glows.', 'Green from oxygen, red higher up, violet from nitrogen.'],
      glow: '#7affc4',
    },
  ),
  authorSight(
    { designation: 'VENUS-TRANSIT', name: 'Transit of Venus', objectType: 'transit', rarity: 'epic', catalogRef: '2004 · 2012 · 2117', blurb: 'Venus crosses the face of the Sun.' },
    SIGHT,
    {
      stats: [['LAST', '6 Jun 2012'], ['NEXT', '11 Dec 2117'], ['LASTS', '~6 hours']],
      line: 'Venus crosses the face of the Sun.',
      story: ['Venus crosses the Sun as a small black dot.', 'Captain Cook sailed to Tahiti in 1769 to time one.'],
      glow: '#ffd27a',
    },
  ),
  authorSight(
    { designation: 'HALE-BOPP', name: 'Comet Hale–Bopp', objectType: 'great comet', rarity: 'rare', catalogRef: 'C/1995 O1', blurb: 'The great comet of 1997.' },
    SIGHT,
    {
      stats: [['TO THE EYE', '18 months'], ['NUCLEUS', '~60 km'], ['RETURNS', '~2,500 yr']],
      line: 'The great comet of 1997.',
      story: ['The great comet of 1997, seen by billions.', 'It stayed bright enough to see for a year and a half.'],
      glow: '#bfe0ff',
    },
  ),
  authorSight(
    { designation: 'LEONIDS', name: 'The Leonid Storm', objectType: 'meteor storm', rarity: 'rare', catalogRef: '55P/Tempel–Tuttle', blurb: 'The night the sky rained stars.' },
    SIGHT,
    {
      stats: [['STORMS', '1833 · 1966'], ['RATE', '~40 a second'], ['PARENT', '55P/Tempel–Tuttle']],
      line: 'The night the sky rained stars.',
      story: ['In 1833 meteors fell over America like snow.', 'Every thirty-three years the Leonids can storm again.'],
      glow: '#cfe0ff',
    },
  ),
  authorSight(
    { designation: 'PERSEIDS', name: 'The Perseids', objectType: 'meteor shower', rarity: 'common', catalogRef: '109P/Swift–Tuttle', blurb: 'The meteors of warm August nights.' },
    SIGHT,
    {
      stats: [['PEAK', '12–13 Aug'], ['RATE', '~100 an hour'], ['SPEED', '59 km/s']],
      line: 'The meteors of warm August nights.',
      story: ['The summer shower: warm nights and fast, bright meteors.', 'Dust from a comet twenty-six kilometres wide.'],
      glow: '#ffe3a8',
    },
  ),
];
