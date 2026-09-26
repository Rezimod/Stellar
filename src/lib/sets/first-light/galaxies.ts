/**
 * The Galaxies: our own, our neighbours, and the famous shapes further out —
 * whirlpools, hats, rings and collisions.
 */

import { authorCard, type AuthoredCard, type CardFacts, type CardOptics, type Extras } from '../build';
import { OFF_MOON, deepSky, fixed } from './shared';

type Place = Pick<CardFacts, 'raHours' | 'decDeg'> & { optics: CardOptics };
type Facts = Pick<CardFacts, 'designation' | 'name' | 'objectType' | 'rarity' | 'catalogRef' | 'blurb'>;

function galaxy(facts: Facts, at: Place, extras: Omit<Extras, 'family' | 'line'>): AuthoredCard {
  return authorCard(
    { ...facts, targetId: facts.designation.toLowerCase(), raHours: at.raHours, decDeg: at.decDeg, ...OFF_MOON },
    at.optics,
    { ...extras, family: 'galaxies', line: facts.blurb },
  );
}

export const GALAXY_CARDS: AuthoredCard[] = [
  galaxy(
    { designation: 'MILKY-WAY', name: 'The Milky Way', objectType: 'our galaxy', rarity: 'epic', catalogRef: 'The Galaxy · core in Sagittarius', blurb: 'Home: two hundred billion suns, seen from inside.' },
    fixed(17.7611, -29.0078, null, [1800, 600]),
    {
      stats: [['STARS', '~200 billion'], ['SIZE', '~100,000 ly'], ['ONE TURN', '~230 Myr']],
      story: ['The river of light is our galaxy, edge on.', 'The Sun has gone round it about twenty times.'],
      glow: '#ffd8a8',
    },
  ),
  galaxy(
    { designation: 'M51', name: 'The Whirlpool', objectType: 'spiral galaxy', rarity: 'rare', catalogRef: 'M51 (NGC 5194)', blurb: 'A perfect spiral, pulling a smaller galaxy along.' },
    deepSky('m51'),
    {
      stats: [['DISTANCE', '~27 Mly'], ['COMPANION', 'NGC 5195'], ['SPIRAL SEEN', '1845']],
      story: ['The first galaxy anyone saw was a spiral.', 'Its companion is stirring up its arms.'],
      glow: '#a8c0ff',
      noun: 'the Whirlpool',
    },
  ),
  galaxy(
    { designation: 'M104', name: 'The Sombrero', objectType: 'spiral galaxy', rarity: 'rare', catalogRef: 'M104 (NGC 4594)', blurb: 'A bright bulge with a dark brim of dust.' },
    deepSky('m104'),
    {
      stats: [['DISTANCE', '~31 Mly'], ['GLOBULARS', '~2,000'], ['MAGNITUDE', '8.0']],
      story: ['We see it almost exactly edge on.', 'Its black ring is dust, where new stars form.'],
      glow: '#ffe0b0',
      noun: 'the Sombrero',
    },
  ),
  galaxy(
    { designation: 'M101', name: 'The Pinwheel', objectType: 'spiral galaxy', rarity: 'common', catalogRef: 'M101 (NGC 5457)', blurb: 'A wide, lopsided spiral, face on.' },
    deepSky('m101'),
    {
      stats: [['DISTANCE', '~21 Mly'], ['SIZE', '~170,000 ly'], ['SUPERNOVA', '2023']],
      story: ['Almost twice the width of the Milky Way.', 'Stars exploded in it in 2011 and again in 2023.'],
      glow: '#b0c8ff',
    },
  ),
  galaxy(
    { designation: 'M33', name: 'The Triangulum', objectType: 'spiral galaxy', rarity: 'common', catalogRef: 'M33 (NGC 598)', blurb: 'The third great spiral of our Local Group.' },
    deepSky('m33'),
    {
      stats: [['DISTANCE', '~2.7 Mly'], ['SIZE', '~60,000 ly'], ['STARS', '~40 billion']],
      story: ['On the darkest nights, the farthest thing the eye can see.', 'A loose, young spiral, full of pink nurseries.'],
      glow: '#9ab8ff',
    },
  ),
  galaxy(
    { designation: 'LMC', name: 'The Large Magellanic Cloud', objectType: 'dwarf galaxy', rarity: 'common', catalogRef: 'LMC', blurb: 'A small galaxy in orbit around ours.' },
    fixed(5.3929, -69.7561, 0.9, [645, 550]),
    {
      stats: [['DISTANCE', '~160,000 ly'], ['SIZE', '~32,000 ly'], ['STARS', '~30 billion']],
      story: ['From the southern hemisphere, a torn-off piece of the Milky Way.', 'Supernova 1987A exploded here.'],
      glow: '#c8d0ff',
      pairsWith: 'SMC',
    },
  ),
  galaxy(
    { designation: 'SMC', name: 'The Small Magellanic Cloud', objectType: 'dwarf galaxy', rarity: 'common', catalogRef: 'SMC (NGC 292)', blurb: 'The Large Cloud’s smaller partner.' },
    fixed(0.8773, -72.8286, 2.7, [320, 205]),
    {
      stats: [['DISTANCE', '~200,000 ly'], ['SIZE', '~7,000 ly'], ['NEIGHBOUR', '47 Tucanae']],
      story: ['Named for Magellan’s crew, known long before.', 'Our galaxy is slowly pulling it apart.'],
      glow: '#b8c8ff',
      pairsWith: 'LMC',
    },
  ),
  galaxy(
    { designation: 'CEN-A', name: 'Centaurus A', objectType: 'elliptical galaxy', rarity: 'rare', catalogRef: 'NGC 5128', blurb: 'A galaxy wrapped in the dust of one it ate.' },
    fixed(13.4247, -43.0192, 6.8, [25.7, 20]),
    {
      stats: [['DISTANCE', '~12 Mly'], ['BLACK HOLE', '~55M × Sun'], ['JETS', '~1 Mly long']],
      story: ['The dark band is a spiral galaxy it swallowed.', 'Its centre fires jets longer than the galaxy.'],
      glow: '#ffc890',
    },
  ),
  galaxy(
    { designation: 'CARTWHEEL', name: 'The Cartwheel', objectType: 'ring galaxy', rarity: 'epic', catalogRef: 'ESO 350-40', blurb: 'A galaxy rippled into a ring by a collision.' },
    fixed(0.6283, -33.7161, 15.2, [1.1, 0.9]),
    {
      stats: [['DISTANCE', '~500 Mly'], ['RING', '~150,000 ly'], ['CAUSE', 'A collision']],
      story: ['A smaller galaxy fell straight through its middle.', 'The ripple set off a ring of new stars.'],
      glow: '#8ab4ff',
    },
  ),
  galaxy(
    { designation: 'M81', name: 'Bode’s Galaxy', objectType: 'spiral galaxy', rarity: 'common', catalogRef: 'M81 (NGC 3031)', blurb: 'A grand spiral near the Plough.' },
    deepSky('m81'),
    {
      stats: [['DISTANCE', '~12 Mly'], ['SIZE', '~90,000 ly'], ['MAGNITUDE', '6.9']],
      story: ['Found by Bode in 1774, a smudge in a small telescope.', 'It shares its patch of sky with the Cigar.'],
      glow: '#ffe4b8',
      pairsWith: 'M82',
      noun: 'Bode’s Galaxy',
    },
  ),
  galaxy(
    { designation: 'M82', name: 'The Cigar', objectType: 'starburst galaxy', rarity: 'common', catalogRef: 'M82 (NGC 3034)', blurb: 'A galaxy making stars ten times faster than ours.' },
    deepSky('m82'),
    {
      stats: [['DISTANCE', '~12 Mly'], ['STAR BIRTH', '10 × Milky Way'], ['NEIGHBOUR', 'M81']],
      story: ['A close pass by M81 set it ablaze with new stars.', 'Winds of red gas pour out above and below.'],
      glow: '#ff9a8a',
      pairsWith: 'M81',
      noun: 'the Cigar',
    },
  ),
  galaxy(
    { designation: 'STEPHANS-QUINTET', name: 'Stephan’s Quintet', objectType: 'galaxy group', rarity: 'rare', catalogRef: 'Hickson 92', blurb: 'Five galaxies, four of them in a slow collision.' },
    fixed(22.5997, 33.96, 13.0, [3.5, 3.5]),
    {
      stats: [['DISTANCE', '~290 Mly'], ['GALAXIES', '5'], ['FOUND', '1877']],
      story: ['One of the five is far nearer: a stranger in the photo.', 'A shock wave larger than our galaxy runs between them.'],
      glow: '#ffd0a0',
    },
  ),
  galaxy(
    { designation: 'M87', name: 'M87', objectType: 'giant elliptical galaxy', rarity: 'epic', catalogRef: 'M87 (Virgo A)', blurb: 'The galaxy whose black hole was photographed first.' },
    fixed(12.5137, 12.3911, 8.6, [8.3, 6.6]),
    {
      stats: [['DISTANCE', '~54 Mly'], ['BLACK HOLE', '6.5B × Sun'], ['IMAGED', '2019']],
      story: ['From its heart, a jet of plasma near the speed of light.', 'In 2019 we saw the shadow of its black hole.'],
      glow: '#ffcf8a',
    },
  ),
];
