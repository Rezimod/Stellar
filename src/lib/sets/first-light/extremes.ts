/**
 * The Extremes: black holes, dead stars, collisions, and the oldest light.
 * Most of it is too far, too faint or too brief for Live Telescope V1, and the cards say
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
      designation: 'TON-618', name: 'TON 618', objectType: 'quasar', rarity: 'legendary',
      targetId: 'ton-618', catalogRef: 'Tonantzintla 618',
      raHours: ton618.raHours, decDeg: ton618.decDeg, ...OFF_MOON,
      blurb: 'About eleven billion light-years away, blazing as a quasar.',
    },
    ton618.optics,
    {
      ...extremes,
      stats: [['LIGHT TRAVEL', '~10.8 Gyr'], ['BLACK HOLE', '~40B × Sun'], ['SHINES', '~140T × Sun']],
      line: 'About eleven billion light-years away, blazing as a quasar.',
      story: ['One of the most massive black holes known.', 'It lies in the Hunting Dogs.'],
      glow: '#e8f0ff',
    },
  ),
  authorCard(
    {
      designation: 'SN-1987A', name: 'Supernova 1987A', objectType: 'supernova', rarity: 'rare',
      targetId: 'sn-1987a', catalogRef: 'SN 1987A · LMC',
      raHours: sn1987a.raHours, decDeg: sn1987a.decDeg, ...OFF_MOON,
      blurb: 'It went off in a neighbour galaxy, the Large Magellanic Cloud.',
    },
    sn1987a.optics,
    {
      ...extremes,
      stats: [['DISTANCE', '~168,000 ly'], ['SEEN', '23 Feb 1987'], ['NEUTRINOS', '~25 caught']],
      line: 'It went off in a neighbour galaxy, the Large Magellanic Cloud.',
      story: ['First seen on 24 February 1987.', 'Its star was a blue supergiant, not a red one.'],
      glow: '#ffb8d0',
    },
  ),
  authorCard(
    {
      designation: 'HUBBLE-DEEP-FIELD', name: 'The Deep Field', objectType: 'deep field', rarity: 'legendary',
      targetId: 'hubble-deep-field', catalogRef: 'HDF · Ursa Major',
      raHours: hdf.raHours, decDeg: hdf.decDeg, ...OFF_MOON,
      blurb: 'Some of its galaxies are 12 billion years old.',
    },
    hdf.optics,
    {
      ...extremes,
      stats: [['GALAXIES', '~3,000'], ['PATCH', '1/24M of sky'], ['EXPOSURE', '10 days']],
      line: 'Some of its galaxies are 12 billion years old.',
      story: ['The patch is smaller than a grain of sand at arm’s length.', 'It was taken in December 1995.'],
      glow: '#ffd6a8',
    },
  ),
  authorKept(
    {
      designation: 'CMB', name: 'The Oldest Light', objectType: 'cosmic microwave background', rarity: 'epic',
      catalogRef: 'CMB',
      blurb: 'Found by accident in 1965 with a radio horn.',
    },
    'It is everywhere in the sky at once, and only in microwaves.',
    {
      ...extremes,
      stats: [['RELEASED', '380,000 yr in'], ['TEMPERATURE', '2.725 K'], ['FOUND', '1965']],
      line: 'Found by accident in 1965 with a radio horn.',
      story: ['Released about 380,000 years after the Big Bang.', 'It fills the whole sky, in every direction.'],
      glow: '#ffb070',
    },
  ),
];
