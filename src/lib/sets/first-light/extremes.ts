/**
 * The Extremes: black holes, dead stars, collisions, and the oldest light.
 * Most of it is too far, too faint or too brief for Node 01, and the cards say
 * which.
 */

import { authorCard, authorKept, type AuthoredCard } from '../build';
import { OFF_MOON, fixed } from './shared';

const extremes = { family: 'extremes' } as const;

const cygX1 = fixed(19.9728, 35.2017, 8.9);
const ton618 = fixed(12.4736, 31.4772, 15.9);
const sn1987a = fixed(5.5919, -69.2698, 15.0);
const hdf = fixed(12.6139, 62.2161, 29.0, [2.6, 2.6]);

export const EXTREME_CARDS: AuthoredCard[] = [
  authorCard(
    {
      designation: 'CYGNUS-X1', name: 'Cygnus X-1', objectType: 'black hole binary', rarity: 'rare',
      targetId: 'cygnus-x1', catalogRef: 'HDE 226868',
      raHours: cygX1.raHours, decDeg: cygX1.decDeg, ...OFF_MOON,
      blurb: 'The first black hole anyone was sure of.',
    },
    cygX1.optics,
    {
      ...extremes,
      stats: [['DISTANCE', '~7,200 ly'], ['BLACK HOLE', '~21 × Sun'], ['FOUND', '1964']],
      line: 'The first black hole anyone was sure of.',
      story: ['A blue giant, feeding a partner no one can see.', 'Hawking bet it was not a black hole, and lost.'],
      glow: '#8ab8ff',
    },
  ),
  authorCard(
    {
      designation: 'TON-618', name: 'TON 618', objectType: 'quasar', rarity: 'legendary',
      targetId: 'ton-618', catalogRef: 'Tonantzintla 618',
      raHours: ton618.raHours, decDeg: ton618.decDeg, ...OFF_MOON,
      blurb: 'One of the largest black holes known, blazing as a quasar.',
    },
    ton618.optics,
    {
      ...extremes,
      stats: [['LIGHT TRAVEL', '~10.8 Gyr'], ['BLACK HOLE', '~40B × Sun'], ['SHINES', '~140T × Sun']],
      line: 'One of the largest black holes known, blazing as a quasar.',
      story: ['Its light set out before the Earth existed.', 'The gas falling in outshines a hundred galaxies.'],
      glow: '#e8f0ff',
    },
  ),
  authorKept(
    {
      designation: 'MAGNETAR', name: 'The Magnetar', objectType: 'magnetar', rarity: 'epic',
      catalogRef: 'SGR 1806−20',
      blurb: 'The strongest magnet in the universe.',
    },
    'Seen in X-rays and gamma rays; in visible light it is hidden behind the galaxy’s dust.',
    {
      ...extremes,
      stats: [['DISTANCE', '~42,000 ly'], ['FIELD', '~10¹⁵ gauss'], ['FLARE', '27 Dec 2004']],
      line: 'The strongest magnet in the universe.',
      story: ['A city-sized star, its crust cracking under its own field.', 'Its 2004 flare reached us from across the galaxy.'],
      glow: '#b89aff',
    },
  ),
  authorCard(
    {
      designation: 'SN-1987A', name: 'Supernova 1987A', objectType: 'supernova', rarity: 'rare',
      targetId: 'sn-1987a', catalogRef: 'SN 1987A · LMC',
      raHours: sn1987a.raHours, decDeg: sn1987a.decDeg, ...OFF_MOON,
      blurb: 'The nearest exploding star seen since the telescope.',
    },
    sn1987a.optics,
    {
      ...extremes,
      stats: [['DISTANCE', '~168,000 ly'], ['SEEN', '23 Feb 1987'], ['NEUTRINOS', '~25 caught']],
      line: 'The nearest exploding star seen since the telescope.',
      story: ['Its ghost particles arrived hours before its light.', 'Its blast now lights a ring of pearls.'],
      glow: '#ffb8d0',
    },
  ),
  authorKept(
    {
      designation: 'GW170817', name: 'The Golden Collision', objectType: 'kilonova', rarity: 'epic',
      catalogRef: 'GW170817 · NGC 4993',
      blurb: 'Two dead stars collide, and gold is made.',
    },
    'It faded within weeks in 2017; what is left is far too faint to photograph.',
    {
      ...extremes,
      stats: [['DISTANCE', '~130 Mly'], ['DATE', '17 Aug 2017'], ['MADE', 'Gold, platinum']],
      line: 'Two dead stars collide, and gold is made.',
      story: ['First felt as a ripple in space, then seen as light.', 'The gold in your ring was made in a crash like this.'],
      glow: '#ffd060',
    },
  ),
  authorCard(
    {
      designation: 'HUBBLE-DEEP-FIELD', name: 'The Deep Field', objectType: 'deep field', rarity: 'legendary',
      targetId: 'hubble-deep-field', catalogRef: 'HDF · Ursa Major',
      raHours: hdf.raHours, decDeg: hdf.decDeg, ...OFF_MOON,
      blurb: 'A tiny dark patch of sky, full of galaxies.',
    },
    hdf.optics,
    {
      ...extremes,
      stats: [['GALAXIES', '~3,000'], ['PATCH', '1/24M of sky'], ['EXPOSURE', '10 days']],
      line: 'A tiny dark patch of sky, full of galaxies.',
      story: ['A speck of sky where nothing seemed to be.', 'Ten days of looking found three thousand galaxies.'],
      glow: '#ffd6a8',
    },
  ),
  authorKept(
    {
      designation: 'CMB', name: 'The Oldest Light', objectType: 'cosmic microwave background', rarity: 'epic',
      catalogRef: 'CMB',
      blurb: 'The afterglow of the Big Bang.',
    },
    'It is everywhere in the sky at once, and only in microwaves.',
    {
      ...extremes,
      stats: [['RELEASED', '380,000 yr in'], ['TEMPERATURE', '2.725 K'], ['FOUND', '1965']],
      line: 'The afterglow of the Big Bang.',
      story: ['Light from when the universe first turned clear.', 'Part of the static on an old television was this.'],
      glow: '#ffb070',
    },
  ),
];
