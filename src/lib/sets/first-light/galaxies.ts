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
    { designation: 'MILKY-WAY', name: 'The Milky Way', objectType: 'our galaxy', rarity: 'common', catalogRef: 'The Galaxy · core in Sagittarius', blurb: 'A third of humanity can no longer see it at night.' },
    fixed(17.7611, -29.0078, null, [1800, 600]),
    {
      stats: [['STARS', '~200 billion'], ['SIZE', '~100,000 ly'], ['ONE TURN', '~230 Myr']],
      story: ['It is about 100,000 light-years across.', 'At its centre sits a black hole of four million Suns.'],
      glow: '#ffd8a8',
    },
  ),
  galaxy(
    { designation: 'M51', name: 'The Whirlpool', objectType: 'spiral galaxy', rarity: 'common', catalogRef: 'M51 (NGC 5194)', blurb: 'About 27 million light-years away, in the Hunting Dogs.' },
    deepSky('m51'),
    {
      stats: [['DISTANCE', '~27 Mly'], ['COMPANION', 'NGC 5195'], ['SPIRAL SEEN', '1845']],
      story: ['Lord Rosse drew its spiral in 1845.', 'Binoculars show it as a faint smudge.'],
      glow: '#a8c0ff',
      noun: 'the Whirlpool',
    },
  ),
  galaxy(
    { designation: 'M104', name: 'The Sombrero', objectType: 'spiral galaxy', rarity: 'common', catalogRef: 'M104 (NGC 4594)', blurb: 'About 31 million light-years away, in Virgo.' },
    deepSky('m104'),
    {
      stats: [['DISTANCE', '~31 Mly'], ['GLOBULARS', '~2,000'], ['MAGNITUDE', '8.0']],
      story: ['Its bulge is packed with old stars.', 'Its black ring is dust, where new stars form.'],
      glow: '#ffe0b0',
      noun: 'the Sombrero',
    },
  ),
  galaxy(
    { designation: 'M101', name: 'The Pinwheel', objectType: 'spiral galaxy', rarity: 'common', catalogRef: 'M101 (NGC 5457)', blurb: 'About 21 million light-years away.' },
    deepSky('m101'),
    {
      stats: [['DISTANCE', '~21 Mly'], ['SIZE', '~170,000 ly'], ['SUPERNOVA', '2023']],
      story: ['It may hold a trillion stars.', 'It lies near the handle of the Big Dipper.'],
      glow: '#b0c8ff',
    },
  ),
  galaxy(
    { designation: 'M33', name: 'The Triangulum', objectType: 'spiral galaxy', rarity: 'common', catalogRef: 'M33 (NGC 598)', blurb: 'About 2.7 million light-years away.' },
    deepSky('m33'),
    {
      stats: [['DISTANCE', '~2.7 Mly'], ['SIZE', '~60,000 ly'], ['STARS', '~40 billion']],
      story: ['The third-largest galaxy in our Local Group.', 'Its biggest nursery, NGC 604, is 1,500 light-years wide.'],
      glow: '#9ab8ff',
    },
  ),
  galaxy(
    { designation: 'LMC', name: 'The Large Magellanic Cloud', objectType: 'dwarf galaxy', rarity: 'common', catalogRef: 'LMC', blurb: 'It is falling toward us, and will merge with us.' },
    fixed(5.3929, -69.7561, 0.9, [645, 550]),
    {
      stats: [['DISTANCE', '~160,000 ly'], ['SIZE', '~32,000 ly'], ['STARS', '~30 billion']],
      story: ['After our own, the brightest galaxy in the sky.', 'It holds the busiest star nursery near us.'],
      glow: '#c8d0ff',
      pairsWith: 'SMC',
    },
  ),
  galaxy(
    { designation: 'SMC', name: 'The Small Magellanic Cloud', objectType: 'dwarf galaxy', rarity: 'common', catalogRef: 'SMC (NGC 292)', blurb: 'About 200,000 light-years away.' },
    fixed(0.8773, -72.8286, 2.7, [320, 205]),
    {
      stats: [['DISTANCE', '~200,000 ly'], ['SIZE', '~7,000 ly'], ['BESIDE IT', '47 Tucanae']],
      story: ['It holds a few hundred million stars.', 'It travels through space beside its bigger neighbour.'],
      glow: '#b8c8ff',
      pairsWith: 'LMC',
    },
  ),
  galaxy(
    { designation: 'CEN-A', name: 'Centaurus A', objectType: 'elliptical galaxy', rarity: 'common', catalogRef: 'NGC 5128', blurb: 'About twelve million light-years away.' },
    fixed(13.4247, -43.0192, 6.8, [25.7, 20]),
    {
      stats: [['DISTANCE', '~12 Mly'], ['BLACK HOLE', '~55M × Sun'], ['JETS', '~1 Mly long']],
      story: ['The nearest giant elliptical galaxy to us.', 'From the south, binoculars show it as a soft glow.'],
      glow: '#ffc890',
    },
  ),
  galaxy(
    { designation: 'CARTWHEEL', name: 'The Cartwheel', objectType: 'ring galaxy', rarity: 'common', catalogRef: 'ESO 350-40', blurb: '500 million light-years away, in the Sculptor.' },
    fixed(0.6283, -33.7161, 15.2, [1.1, 0.9]),
    {
      stats: [['DISTANCE', '~500 Mly'], ['RING', '~150,000 ly'], ['CAUSE', 'A collision']],
      story: ['Its ring is still spreading outward.', 'Webb photographed it in 2022.'],
      glow: '#8ab4ff',
    },
  ),
  galaxy(
    { designation: 'M82', name: 'The Cigar', objectType: 'starburst galaxy', rarity: 'common', catalogRef: 'M82 (NGC 3034)', blurb: 'It shines five times brighter than the whole Milky Way.' },
    deepSky('m82'),
    {
      stats: [['DISTANCE', '~12 Mly'], ['STAR BIRTH', '10 × Milky Way'], ['NEIGHBOUR', 'M81']],
      story: ['It lies about 12 million light-years away.', 'A supernova went off in it in 2014.'],
      glow: '#ff9a8a',
      noun: 'the Cigar',
    },
  ),
  galaxy(
    { designation: 'M87', name: 'M87', objectType: 'giant elliptical galaxy', rarity: 'common', catalogRef: 'M87 (Virgo A)', blurb: 'Thousands of star clusters swarm around it.' },
    fixed(12.5137, 12.3911, 8.6, [8.3, 6.6]),
    {
      stats: [['DISTANCE', '~54 Mly'], ['BLACK HOLE', '6.5B × Sun'], ['IMAGED', '2019']],
      story: ['The biggest galaxy near the heart of the Virgo cluster.', 'It is about 54 million light-years away.'],
      glow: '#ffcf8a',
    },
  ),
];
