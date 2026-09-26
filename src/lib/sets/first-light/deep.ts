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
    { designation: 'M16', name: 'Pillars of Creation', objectType: 'star-forming region', rarity: 'epic', catalogRef: 'M16 (Eagle Nebula)', blurb: 'Towers of dust where new stars are hatching.' },
    deepSky('m16'),
    {
      stats: [['DISTANCE', '~6,500 ly'], ['TALLEST', '~4 ly'], ['PICTURED', '1995']],
      story: ['Each pillar is taller than the gap to the next star.', 'Light from young stars is slowly eating them away.'],
      glow: '#e8c07a',
      noun: 'the Pillars of Creation',
    },
  ),
  deep(
    { designation: 'HORSEHEAD', name: 'The Horsehead', objectType: 'dark nebula', rarity: 'rare', catalogRef: 'Barnard 33', blurb: 'A dark horse’s head against a red glow.' },
    fixed(5.6819, -2.4583, 11.0, [8, 6]),
    {
      stats: [['DISTANCE', '~1,400 ly'], ['HEIGHT', '~3.5 ly'], ['FOUND', '1888']],
      story: ['Dust so thick it blots out the glow behind it.', 'First noticed on a photographic plate, not by eye.'],
      glow: '#ff6a6a',
    },
  ),
  deep(
    { designation: 'M57', name: 'The Ring Nebula', objectType: 'planetary nebula', rarity: 'common', catalogRef: 'M57 (NGC 6720)', blurb: 'A dying star’s smoke ring.' },
    deepSky('m57'),
    {
      stats: [['DISTANCE', '~2,300 ly'], ['SIZE', '~1.3 ly'], ['MAGNITUDE', '8.8']],
      story: ['The Sun will make one of these, in five billion years.', 'At its centre, the small hot core that is left.'],
      glow: '#8ad8c0',
      noun: 'the Ring Nebula',
    },
  ),
  deep(
    { designation: 'HELIX', name: 'The Helix', objectType: 'planetary nebula', rarity: 'rare', catalogRef: 'NGC 7293', blurb: 'The eye in the sky.' },
    fixed(22.4939, -20.8372, 7.6, [25, 25]),
    {
      stats: [['DISTANCE', '~650 ly'], ['SIZE', '~2.5 ly'], ['AGE', '~10,000 yr']],
      story: ['One of the nearest dying stars to us.', 'Its rim is combed with thousands of comet-like knots.'],
      glow: '#6ad0e0',
    },
  ),
  deep(
    { designation: 'CATS-EYE', name: 'The Cat’s Eye', objectType: 'planetary nebula', rarity: 'common', catalogRef: 'NGC 6543', blurb: 'Shell inside shell, like rings in a tree.' },
    fixed(17.9758, 66.6331, 8.1, [0.4, 0.4]),
    {
      stats: [['DISTANCE', '~3,300 ly'], ['SHELLS', '11 or more'], ['FIRST', 'Spectrum 1864']],
      story: ['Its star shed a shell every fifteen hundred years.', 'The first nebula shown to be glowing gas.'],
      glow: '#7ae0b0',
    },
  ),
  deep(
    { designation: 'M8', name: 'The Lagoon', objectType: 'emission nebula', rarity: 'common', catalogRef: 'M8 (NGC 6523)', blurb: 'A pink cloud split by a dark lane.' },
    deepSky('m8'),
    {
      stats: [['DISTANCE', '~4,100 ly'], ['SIZE', '~110 × 50 ly'], ['MAGNITUDE', '6.0']],
      story: ['Visible to the eye from a dark summer field.', 'At its heart, a bright knot called the Hourglass.'],
      glow: '#ff8ab0',
      noun: 'the Lagoon Nebula',
    },
  ),
  deep(
    { designation: 'M20', name: 'The Trifid', objectType: 'emission nebula', rarity: 'common', catalogRef: 'M20 (NGC 6514)', blurb: 'Red and blue, split three ways.' },
    deepSky('m20'),
    {
      stats: [['DISTANCE', '~5,200 ly'], ['LOBES', '3'], ['MAGNITUDE', '6.3']],
      story: ['Three kinds of nebula in one field.', 'Red glowing gas, blue scattered light, black dust.'],
      glow: '#ff7aa0',
      noun: 'the Trifid Nebula',
    },
  ),
  deep(
    { designation: 'VEIL', name: 'The Veil', objectType: 'supernova remnant', rarity: 'common', catalogRef: 'NGC 6960 · 6992', blurb: 'The drifting smoke of a star that exploded.' },
    fixed(20.9403, 31.717, 7.0, [180, 160]),
    {
      stats: [['DISTANCE', '~2,400 ly'], ['AGE', '~15,000 yr'], ['SPAN', '3°']],
      story: ['Six full Moons wide, and still expanding.', 'Braided threads of gas, lit by the shock.'],
      glow: '#8ac8ff',
    },
  ),
  deep(
    { designation: 'NORTH-AMERICA', name: 'The North America Nebula', objectType: 'emission nebula', rarity: 'common', catalogRef: 'NGC 7000', blurb: 'A continent drawn in glowing hydrogen.' },
    fixed(20.98, 44.33, 4.0, [120, 100]),
    {
      stats: [['DISTANCE', '~2,200 ly'], ['SPAN', '2°'], ['MAGNITUDE', '4.0']],
      story: ['Its dark "gulf" is dust in front of the glow.', 'Its bright wall is a line of new stars forming.'],
      glow: '#ff6a7a',
    },
  ),
  deep(
    { designation: 'ROSETTE', name: 'The Rosette', objectType: 'emission nebula', rarity: 'common', catalogRef: 'NGC 2237', blurb: 'A red rose with a star cluster at its heart.' },
    fixed(6.5333, 4.95, 9.0, [80, 60]),
    {
      stats: [['DISTANCE', '~5,200 ly'], ['SIZE', '~130 ly'], ['CLUSTER', 'NGC 2244']],
      story: ['Young stars at its centre blew the hollow.', 'Dark knots in its petals are stars still forming.'],
      glow: '#ff5a6a',
    },
  ),
  deep(
    { designation: 'BUTTERFLY', name: 'The Butterfly', objectType: 'planetary nebula', rarity: 'rare', catalogRef: 'NGC 6302', blurb: 'Wings of gas from one of the hottest stars known.' },
    fixed(17.2294, -37.1025, 9.6, [3, 1.5]),
    {
      stats: [['DISTANCE', '~3,400 ly'], ['CORE', '~200,000 °C'], ['WINGS', '~2 ly']],
      story: ['A dark belt of dust pinches it at the waist.', 'Its gas flies outward at 900,000 km an hour.'],
      glow: '#ffb07a',
    },
  ),
  deep(
    { designation: 'CARINA', name: 'The Carina Nebula', objectType: 'star-forming region', rarity: 'rare', catalogRef: 'NGC 3372', blurb: 'Cliffs of dust in the brightest nebula in the sky.' },
    fixed(10.7508, -59.8667, 1.0, [120, 120]),
    {
      stats: [['DISTANCE', '~7,500 ly'], ['SIZE', '~300 ly'], ['MAGNITUDE', '1.0']],
      story: ['Four times the size of the Orion Nebula.', 'Home to some of the most massive stars known.'],
      glow: '#ffa060',
      pairsWith: 'ETA-CARINAE',
    },
  ),
  deep(
    { designation: 'TARANTULA', name: 'The Tarantula', objectType: 'emission nebula', rarity: 'rare', catalogRef: 'NGC 2070', blurb: 'The busiest star factory near us.' },
    fixed(5.6442, -69.1006, 8.0, [40, 25]),
    {
      stats: [['DISTANCE', '~160,000 ly'], ['SIZE', '~600 ly'], ['CORE', 'R136']],
      story: ['It lies in another galaxy, and still we see it.', 'Its core holds the most massive star known.'],
      glow: '#ff7ac0',
    },
  ),

  // The clusters.
  deep(
    { designation: 'M13', name: 'The Hercules Cluster', objectType: 'globular cluster', rarity: 'common', catalogRef: 'M13 (NGC 6205)', blurb: 'Hundreds of thousands of old stars in one ball.' },
    deepSky('m13'),
    {
      stats: [['DISTANCE', '~22,000 ly'], ['STARS', '~300,000'], ['MESSAGE', 'Sent 1974']],
      story: ['Older than almost everything in the galaxy.', 'In 1974 a radio message was aimed at it.'],
      glow: '#ffe2b0',
      noun: 'the Hercules Cluster',
    },
  ),
  deep(
    { designation: 'OMEGA-CEN', name: 'Omega Centauri', objectType: 'globular cluster', rarity: 'rare', catalogRef: 'NGC 5139', blurb: 'Ten million stars, perhaps a galaxy’s core.' },
    fixed(13.4467, -47.4794, 3.9, [36, 36]),
    {
      stats: [['DISTANCE', '~17,000 ly'], ['STARS', '~10 million'], ['MAGNITUDE', '3.9']],
      story: ['The largest cluster of stars around our galaxy.', 'It may be the heart of a galaxy we swallowed.'],
      glow: '#ffd08a',
    },
  ),
  deep(
    { designation: 'DOUBLE-CLUSTER', name: 'The Double Cluster', objectType: 'open clusters', rarity: 'common', catalogRef: 'NGC 869 · 884', blurb: 'Two star clusters, side by side.' },
    deepSky('ngc869'),
    {
      stats: [['DISTANCE', '~7,500 ly'], ['AGE', '~14 Myr'], ['MAGNITUDE', '3.7']],
      story: ['Two young clusters born near each other.', 'A few red supergiants glow among the blue.'],
      glow: '#bcd4ff',
    },
  ),
  deep(
    { designation: 'M44', name: 'The Beehive', objectType: 'open cluster', rarity: 'common', catalogRef: 'M44 (Praesepe)', blurb: 'A swarm of stars, seen since antiquity.' },
    deepSky('m44'),
    {
      stats: [['DISTANCE', '~577 ly'], ['STARS', '~1,000'], ['MAGNITUDE', '3.7']],
      story: ['To the eye, a small cloud in Cancer.', 'Galileo was the first to see it was stars.'],
      glow: '#fff0c8',
    },
  ),
  deep(
    { designation: 'JEWEL-BOX', name: 'The Jewel Box', objectType: 'open cluster', rarity: 'common', catalogRef: 'NGC 4755', blurb: 'Blue-white gems around one ruby.' },
    fixed(12.8944, -60.3333, 4.2, [10, 10]),
    {
      stats: [['DISTANCE', '~6,400 ly'], ['STARS', '~100'], ['MAGNITUDE', '4.2']],
      story: ['A letter A of bright young stars.', 'One red supergiant sits among them like a ruby.'],
      glow: '#a8c8ff',
    },
  ),
];
