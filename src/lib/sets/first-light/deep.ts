/**
 * The Deep Sky: nebulae where stars are born and where they end, and the
 * clusters they gather in. Seen whole, so each is judged by position, total
 * brightness and extent against a city sky.
 */

import { authorCard, type AuthoredCard, type CardFacts, type CardOptics, type Extras } from '../build';
import { OFF_MOON, deepSky, fixed } from './shared';

type Place = Pick<CardFacts, 'raHours' | 'decDeg'> & { optics: CardOptics };
type Facts = Pick<CardFacts, 'designation' | 'name' | 'objectType' | 'rarity' | 'catalogRef' | 'blurb'> & { targetId?: string };

function deep(facts: Facts, at: Place, extras: Omit<Extras, 'family' | 'line'>): AuthoredCard {
  return authorCard(
    { ...facts, targetId: facts.targetId ?? facts.designation.toLowerCase(), raHours: at.raHours, decDeg: at.decDeg, ...OFF_MOON },
    at.optics,
    { ...extras, family: 'deep', line: facts.blurb },
  );
}

export const DEEP_CARDS: AuthoredCard[] = [
  deep(
    { designation: 'M16', name: 'Pillars of Creation', objectType: 'star-forming region', rarity: 'rare', catalogRef: 'M16 (Eagle Nebula)', blurb: 'Hubble’s 1995 picture made them famous.' },
    deepSky('m16'),
    {
      stats: [['DISTANCE', '~6,500 ly'], ['TALLEST', '~4 ly'], ['PICTURED', '1995']],
      story: ['The pillars stand about 7,000 light-years away.', 'Webb saw them again in infrared in 2022.'],
      glow: '#e8c07a',
      noun: 'the Pillars of Creation',
    },
  ),
  deep(
    { designation: 'HORSEHEAD', name: 'The Horsehead', objectType: 'dark nebula', rarity: 'common', catalogRef: 'Barnard 33', blurb: 'It will wear away in about five million years.' },
    fixed(5.6819, -2.4583, 11.0, [8, 6]),
    {
      stats: [['DISTANCE', '~1,400 ly'], ['HEIGHT', '~3.5 ly'], ['FOUND', '1888']],
      story: ['It is about 1,400 light-years away.', 'Behind it glows red hydrogen gas.'],
      glow: '#ff6a6a',
    },
  ),
  deep(
    { designation: 'M57', name: 'The Ring Nebula', objectType: 'planetary nebula', rarity: 'rare', catalogRef: 'M57 (NGC 6720)', blurb: 'Found in 1779, between two stars of the Lyre.' },
    deepSky('m57'),
    {
      stats: [['DISTANCE', '~2,300 ly'], ['SIZE', '~1.3 ly'], ['MAGNITUDE', '8.8']],
      story: ['It lies about 2,500 light-years away.', 'Even a small telescope shows its hollow centre.'],
      glow: '#8ad8c0',
      noun: 'the Ring Nebula',
    },
  ),
  deep(
    { designation: 'HELIX', name: 'The Helix', objectType: 'planetary nebula', rarity: 'common', catalogRef: 'NGC 7293', blurb: 'About 650 light-years away, nearly as wide as the full Moon.' },
    fixed(22.4939, -20.8372, 7.6, [25, 25]),
    {
      stats: [['DISTANCE', '~650 ly'], ['SIZE', '~2.5 ly'], ['AGE', '~10,000 yr']],
      story: ['Its glow is gas lit by the hot core left behind.', 'Within tens of thousands of years it will fade.'],
      glow: '#6ad0e0',
    },
  ),
  deep(
    { designation: 'CATS-EYE', name: 'The Cat’s Eye', objectType: 'planetary nebula', rarity: 'common', catalogRef: 'NGC 6543', blurb: 'Hubble’s 1994 picture of it stunned astronomers.' },
    fixed(17.9758, 66.6331, 8.1, [0.4, 0.4]),
    {
      stats: [['DISTANCE', '~3,300 ly'], ['SHELLS', '11 or more'], ['FIRST', 'Spectrum 1864']],
      story: ['It lies over 3,000 light-years away.', 'X-rays show hot gas at its heart.'],
      glow: '#7ae0b0',
    },
  ),
  deep(
    { designation: 'M8', name: 'The Lagoon', objectType: 'emission nebula', rarity: 'common', catalogRef: 'M8 (NGC 6523)', blurb: 'About 4,100 light-years away, toward the galaxy’s centre.' },
    deepSky('m8'),
    {
      stats: [['DISTANCE', '~4,100 ly'], ['SIZE', '~110 × 50 ly'], ['MAGNITUDE', '6.0']],
      story: ['A young cluster sits inside it.', 'In the sky it spans about three full Moons.'],
      glow: '#ff8ab0',
      noun: 'the Lagoon Nebula',
    },
  ),
  deep(
    { designation: 'M20', name: 'The Trifid', objectType: 'emission nebula', rarity: 'common', catalogRef: 'M20 (NGC 6514)', blurb: 'Found by Messier in 1764.' },
    deepSky('m20'),
    {
      stats: [['DISTANCE', '~5,200 ly'], ['LOBES', '3'], ['MAGNITUDE', '6.3']],
      story: ['It is about 4,000 light-years away.', 'New stars are still forming in its dark lanes.'],
      glow: '#ff7aa0',
      noun: 'the Trifid Nebula',
    },
  ),
  deep(
    { designation: 'VEIL', name: 'The Veil', objectType: 'supernova remnant', rarity: 'common', catalogRef: 'NGC 6960 · 6992', blurb: 'Its brightest strand is called the Witch’s Broom.' },
    fixed(20.9403, 31.717, 7.0, [180, 160]),
    {
      stats: [['DISTANCE', '~2,400 ly'], ['AGE', '~15,000 yr'], ['SPAN', '3°']],
      story: ['It lies about 2,400 light-years away.', 'A filter makes its threads stand out in a small telescope.'],
      glow: '#8ac8ff',
    },
  ),
  deep(
    { designation: 'ROSETTE', name: 'The Rosette', objectType: 'emission nebula', rarity: 'common', catalogRef: 'NGC 2237', blurb: 'Look for it beside Orion, in the Unicorn.' },
    fixed(6.5333, 4.95, 9.0, [80, 60]),
    {
      stats: [['DISTANCE', '~5,200 ly'], ['SIZE', '~130 ly'], ['CLUSTER', 'NGC 2244']],
      story: ['It lies about 5,000 light-years away.', 'Its hollow holds a cluster you can see in binoculars.'],
      glow: '#ff5a6a',
    },
  ),
  deep(
    { designation: 'CARINA', name: 'The Carina Nebula', objectType: 'star-forming region', rarity: 'common', catalogRef: 'NGC 3372', blurb: 'Too far south to rise for most of Europe.' },
    fixed(10.7508, -59.8667, 1.0, [120, 120]),
    {
      stats: [['DISTANCE', '~7,500 ly'], ['SIZE', '~300 ly'], ['MAGNITUDE', '1.0']],
      story: ['It lies about 7,500 light-years away.', 'Eta Carinae, an unstable giant, sits inside it.'],
      glow: '#ffa060',
      pairsWith: 'ETA-CARINAE',
    },
  ),
  deep(
    { designation: 'TARANTULA', name: 'The Tarantula', objectType: 'emission nebula', rarity: 'common', catalogRef: 'NGC 2070', blurb: 'As close as Orion’s nebula, it would cast shadows.' },
    fixed(5.6442, -69.1006, 8.0, [40, 25]),
    {
      stats: [['DISTANCE', '~160,000 ly'], ['SIZE', '~600 ly'], ['CORE', 'R136']],
      story: ['It is about 160,000 light-years away.', 'Supernova 1987A went off at its edge.'],
      glow: '#ff7ac0',
    },
  ),

  // The clusters.
  deep(
    { designation: 'M13', name: 'The Hercules Cluster', objectType: 'globular cluster', rarity: 'rare', catalogRef: 'M13 (NGC 6205)', blurb: 'Halley spotted it in 1714.' },
    deepSky('m13'),
    {
      stats: [['DISTANCE', '~22,000 ly'], ['STARS', '~300,000'], ['MESSAGE', 'Sent 1974']],
      story: ['Older than almost everything in the galaxy.', 'It lies over 20,000 light-years away.'],
      glow: '#ffe2b0',
      noun: 'the Hercules Cluster',
    },
  ),
  deep(
    { designation: 'OMEGA-CEN', name: 'Omega Centauri', objectType: 'globular cluster', rarity: 'common', catalogRef: 'NGC 5139', blurb: 'Halley saw it was a cluster, in 1677.' },
    fixed(13.4467, -47.4794, 3.9, [36, 36]),
    {
      stats: [['DISTANCE', '~17,000 ly'], ['STARS', '~10 million'], ['MAGNITUDE', '3.9']],
      story: ['It is about 17,000 light-years away.', 'Its stars were born at different times, unlike most clusters.'],
      glow: '#ffd08a',
    },
  ),
  deep(
    { designation: 'M44', name: 'The Beehive', objectType: 'open cluster', rarity: 'common', catalogRef: 'M44 (Praesepe)', blurb: 'The Moon and planets often pass right through it.' },
    deepSky('m44'),
    {
      stats: [['DISTANCE', '~577 ly'], ['STARS', '~1,000'], ['MAGNITUDE', '3.7']],
      story: ['One of the nearest clusters to the Sun.', 'Its stars formed together, long before the Pleiades.'],
      glow: '#fff0c8',
    },
  ),
];
