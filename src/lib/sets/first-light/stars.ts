/**
 * The Stars: the nearest, the brightest, the patterns that give the sky its
 * shape, the giants near their end — and one system of other worlds. A
 * star is a point to any telescope on Earth, so it is judged by position and
 * brightness alone; a double by its separation.
 */

import { authorCard, authorKept, type AuthoredCard } from '../build';
import { OFF_MOON, fixed } from './shared';

const stars = { family: 'stars' } as const;
const EXOPLANET = 'A planet of another star: no telescope on Earth can show it, only the light of its star.';

const alphaCen = fixed(14.66, -60.8354, -0.27);
const sirius = fixed(6.7525, -16.7161, -1.46);
const vega = fixed(18.6156, 38.7837, 0.03);
const arcturus = fixed(14.261, 19.1824, -0.05);
const aldebaran = fixed(4.5987, 16.5093, 0.86);
const polaris = fixed(2.5303, 89.2641, 1.98);
const mira = fixed(2.3224, -2.9776, null);
const betelgeuse = fixed(5.9195, 7.4071, 0.5);
const antares = fixed(16.4901, -26.432, 1.06);
const rigel = fixed(5.2423, -8.2016, 0.13);
const etaCar = fixed(10.7503, -59.6844, 4.5);

export const STAR_CARDS: AuthoredCard[] = [
  authorCard(
    {
      designation: 'ALPHA-CEN', name: 'Alpha Centauri', objectType: 'triple star', rarity: 'rare',
      targetId: 'alpha-cen', catalogRef: 'α Cen A · B · Proxima',
      raHours: alphaCen.raHours, decDeg: alphaCen.decDeg, ...OFF_MOON,
      blurb: 'The nearest stars to the Sun.',
    },
    alphaCen.optics,
    {
      ...stars,
      stats: [['DISTANCE', '4.37 ly'], ['STARS', '3'], ['MAGNITUDE', '−0.27']],
      line: 'The nearest stars to the Sun.',
      story: ['Two suns and a small red third, next door.', 'Their light left home four years ago.'],
      glow: '#ffe6a8',
    },
  ),
  authorCard(
    {
      designation: 'SIRIUS', name: 'Sirius', objectType: 'star', rarity: 'common',
      targetId: 'sirius', catalogRef: 'α Canis Majoris',
      raHours: sirius.raHours, decDeg: sirius.decDeg, ...OFF_MOON,
      blurb: 'The brightest star in the night sky.',
    },
    sirius.optics,
    {
      ...stars,
      stats: [['DISTANCE', '8.6 ly'], ['MAGNITUDE', '−1.46'], ['COMPANION', 'White dwarf']],
      line: 'The brightest star in the night sky.',
      story: ['Its rising once told Egypt the Nile would flood.', 'Beside it circles the ember of a dead star.'],
      glow: '#cfe4ff',
      noun: 'Sirius',
    },
  ),
  authorCard(
    {
      designation: 'VEGA', name: 'Vega', objectType: 'star', rarity: 'common',
      targetId: 'vega', catalogRef: 'α Lyrae',
      raHours: vega.raHours, decDeg: vega.decDeg, ...OFF_MOON,
      blurb: 'The blue-white star overhead on summer nights.',
    },
    vega.optics,
    {
      ...stars,
      stats: [['DISTANCE', '25 ly'], ['MAGNITUDE', '0.03'], ['DISC', 'Ring of dust']],
      line: 'The blue-white star overhead on summer nights.',
      story: ['The star that set the zero of brightness.', 'In twelve thousand years it will be the pole star.'],
      glow: '#bcd4ff',
    },
  ),
  authorCard(
    {
      designation: 'ARCTURUS', name: 'Arcturus', objectType: 'orange giant', rarity: 'common',
      targetId: 'arcturus', catalogRef: 'α Boötis',
      raHours: arcturus.raHours, decDeg: arcturus.decDeg, ...OFF_MOON,
      blurb: 'The bright orange star of spring evenings.',
    },
    arcturus.optics,
    {
      ...stars,
      stats: [['DISTANCE', '37 ly'], ['SIZE', '25 × Sun'], ['MAGNITUDE', '−0.05']],
      line: 'The bright orange star of spring evenings.',
      story: ['Follow the Plough’s handle and arc to it.', 'An old star, passing through our part of the galaxy.'],
      glow: '#ffb370',
    },
  ),
  authorCard(
    {
      designation: 'ALDEBARAN', name: 'Aldebaran', objectType: 'orange giant', rarity: 'common',
      targetId: 'aldebaran', catalogRef: 'α Tauri',
      raHours: aldebaran.raHours, decDeg: aldebaran.decDeg, ...OFF_MOON,
      blurb: 'The eye of the Bull.',
    },
    aldebaran.optics,
    {
      ...stars,
      stats: [['DISTANCE', '65 ly'], ['SIZE', '44 × Sun'], ['MAGNITUDE', '0.86']],
      line: 'The eye of the Bull.',
      story: ['It sits in front of the Hyades, not among them.', 'Pioneer 10 is heading its way, two million years out.'],
      glow: '#ff9e5e',
    },
  ),
  authorCard(
    {
      designation: 'POLARIS', name: 'Polaris', objectType: 'star', rarity: 'common',
      targetId: 'polaris', catalogRef: 'α Ursae Minoris',
      raHours: polaris.raHours, decDeg: polaris.decDeg, ...OFF_MOON,
      blurb: 'The star the whole sky turns around.',
    },
    polaris.optics,
    {
      ...stars,
      stats: [['DISTANCE', '~430 ly'], ['FROM POLE', '0.6°'], ['MAGNITUDE', '1.98']],
      line: 'The star the whole sky turns around.',
      story: ['Every other star wheels; this one waits.', 'Sailors crossed oceans by its height.'],
      glow: '#fff3d6',
      noun: 'Polaris',
    },
  ),
  authorCard(
    {
      designation: 'MIRA', name: 'Mira', objectType: 'variable red giant', rarity: 'common',
      targetId: 'mira', catalogRef: 'ο Ceti',
      raHours: mira.raHours, decDeg: mira.decDeg, ...OFF_MOON,
      blurb: 'The wonderful star, that comes and goes.',
    },
    mira.optics,
    {
      ...stars,
      stats: [['DISTANCE', '~300 ly'], ['PERIOD', '332 days'], ['TAIL', '13 ly']],
      line: 'The wonderful star, that comes and goes.',
      story: ['Bright one season, gone from the eye the next.', 'Behind it trails a tail thirteen light-years long.'],
      glow: '#ff7a5a',
    },
  ),
  authorCard(
    {
      designation: 'BETELGEUSE', name: 'Betelgeuse', objectType: 'red supergiant', rarity: 'epic',
      targetId: 'betelgeuse', catalogRef: 'α Orionis',
      raHours: betelgeuse.raHours, decDeg: betelgeuse.decDeg, ...OFF_MOON,
      blurb: 'Orion’s shoulder, near the end of its life.',
    },
    betelgeuse.optics,
    {
      ...stars,
      stats: [['DISTANCE', '~550 ly'], ['SIZE', '~760 × Sun'], ['DIMMED', '2019–20']],
      line: 'Orion’s shoulder, near the end of its life.',
      story: ['Put it where the Sun is, and it swallows Mars.', 'One day it explodes, bright enough to cast shadows.'],
      glow: '#ff6a3a',
      noun: 'Betelgeuse',
    },
  ),
  authorCard(
    {
      designation: 'ANTARES', name: 'Antares', objectType: 'red supergiant', rarity: 'rare',
      targetId: 'antares', catalogRef: 'α Scorpii',
      raHours: antares.raHours, decDeg: antares.decDeg, ...OFF_MOON,
      blurb: 'The rival of Mars, the Scorpion’s heart.',
    },
    antares.optics,
    {
      ...stars,
      stats: [['DISTANCE', '~550 ly'], ['SIZE', '~680 × Sun'], ['MAGNITUDE', '1.06']],
      line: 'The rival of Mars, the Scorpion’s heart.',
      story: ['Named because it glows as red as the planet.', 'It sits in the most colourful clouds in the sky.'],
      glow: '#ff5a3a',
    },
  ),
  authorCard(
    {
      designation: 'RIGEL', name: 'Rigel', objectType: 'blue supergiant', rarity: 'common',
      targetId: 'rigel', catalogRef: 'β Orionis',
      raHours: rigel.raHours, decDeg: rigel.decDeg, ...OFF_MOON,
      blurb: 'Orion’s foot, blazing blue-white.',
    },
    rigel.optics,
    {
      ...stars,
      stats: [['DISTANCE', '~860 ly'], ['LIGHT', '~120,000 × Sun'], ['MAGNITUDE', '0.13']],
      line: 'Orion’s foot, blazing blue-white.',
      story: ['Far brighter than Betelgeuse, and far younger.', 'It lights a faint blue cloud called the Witch Head.'],
      glow: '#a8c8ff',
    },
  ),
  authorCard(
    {
      designation: 'ETA-CARINAE', name: 'Eta Carinae', objectType: 'hypergiant', rarity: 'epic',
      targetId: 'eta-carinae', catalogRef: 'η Carinae',
      raHours: etaCar.raHours, decDeg: etaCar.decDeg, ...OFF_MOON,
      blurb: 'A star that nearly tore itself apart.',
    },
    etaCar.optics,
    {
      ...stars,
      stats: [['DISTANCE', '~7,500 ly'], ['MASS', '~100 × Sun'], ['ERUPTED', '1843']],
      line: 'A star that nearly tore itself apart.',
      story: ['In 1843 it became the second-brightest star.', 'It survived, wrapped in the cloud it threw off.'],
      glow: '#ffb0a0',
      pairsWith: 'CARINA',
    },
  ),
  authorKept(
    {
      designation: 'TRAPPIST-1', name: 'TRAPPIST-1', objectType: 'planetary system', rarity: 'rare',
      catalogRef: '2MASS J23062928−0502285',
      blurb: 'Seven Earth-sized worlds around one small star.',
    },
    `${EXOPLANET} Its star is magnitude 18.8, too faint for Live Telescope V1 under a city sky.`,
    {
      ...stars,
      stats: [['DISTANCE', '40 ly'], ['PLANETS', '7'], ['TEMPERATE', '3']],
      line: 'Seven Earth-sized worlds around one small star.',
      story: ['From any one of them, the others hang like moons.', 'Three sit where water could stay liquid.'],
      glow: '#ff8a6a',
    },
  ),
];
