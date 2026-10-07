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
      designation: 'ALPHA-CEN', name: 'Alpha Centauri', objectType: 'triple star', rarity: 'common',
      targetId: 'alpha-cen', catalogRef: 'α Cen A · B · Proxima',
      raHours: alphaCen.raHours, decDeg: alphaCen.decDeg, ...OFF_MOON,
      blurb: 'Seen only from the south, the third-brightest star at night.',
    },
    alphaCen.optics,
    {
      ...stars,
      stats: [['DISTANCE', '4.37 ly'], ['STARS', '3'], ['MAGNITUDE', '−0.27']],
      line: 'Seen only from the south, the third-brightest star at night.',
      story: ['Proxima is too faint to see without a telescope.', 'At our fastest probe’s speed, the trip would take millennia.'],
      glow: '#ffe6a8',
    },
  ),
  authorCard(
    {
      designation: 'SIRIUS', name: 'Sirius', objectType: 'star', rarity: 'rare',
      targetId: 'sirius', catalogRef: 'α Canis Majoris',
      raHours: sirius.raHours, decDeg: sirius.decDeg, ...OFF_MOON,
      blurb: 'Just 8.6 light-years away, one of our nearest neighbours.',
    },
    sirius.optics,
    {
      ...stars,
      stats: [['DISTANCE', '8.6 ly'], ['MAGNITUDE', '−1.46'], ['COMPANION', 'White dwarf']],
      line: 'Just 8.6 light-years away, one of our nearest neighbours.',
      story: ['It gives off about 25 times the Sun’s light.', 'Look for it low in winter, below Orion.'],
      glow: '#cfe4ff',
      noun: 'Sirius',
    },
  ),
  authorCard(
    {
      designation: 'VEGA', name: 'Vega', objectType: 'star', rarity: 'common',
      targetId: 'vega', catalogRef: 'α Lyrae',
      raHours: vega.raHours, decDeg: vega.decDeg, ...OFF_MOON,
      blurb: 'Blue-white and spinning so fast it bulges.',
    },
    vega.optics,
    {
      ...stars,
      stats: [['DISTANCE', '25 ly'], ['MAGNITUDE', '0.03'], ['DISC', 'Ring of dust']],
      line: 'Blue-white and spinning so fast it bulges.',
      story: ['It is about 25 light-years away.', 'A disc of dust surrounds it.'],
      glow: '#bcd4ff',
    },
  ),
  authorCard(
    {
      designation: 'ARCTURUS', name: 'Arcturus', objectType: 'orange giant', rarity: 'common',
      targetId: 'arcturus', catalogRef: 'α Boötis',
      raHours: arcturus.raHours, decDeg: arcturus.decDeg, ...OFF_MOON,
      blurb: 'Its light switched on the Chicago World’s Fair in 1933.',
    },
    arcturus.optics,
    {
      ...stars,
      stats: [['DISTANCE', '37 ly'], ['SIZE', '25 × Sun'], ['MAGNITUDE', '−0.05']],
      line: 'Its light switched on the Chicago World’s Fair in 1933.',
      story: ['The brightest star north of the celestial equator.', 'It is about 37 light-years away.'],
      glow: '#ffb370',
    },
  ),
  authorCard(
    {
      designation: 'ALDEBARAN', name: 'Aldebaran', objectType: 'orange giant', rarity: 'common',
      targetId: 'aldebaran', catalogRef: 'α Tauri',
      raHours: aldebaran.raHours, decDeg: aldebaran.decDeg, ...OFF_MOON,
      blurb: 'The Moon often passes in front of it.',
    },
    aldebaran.optics,
    {
      ...stars,
      stats: [['DISTANCE', '65 ly'], ['SIZE', '44 × Sun'], ['MAGNITUDE', '0.86']],
      line: 'The Moon often passes in front of it.',
      story: ['About 44 times the width of the Sun.', 'Its name means “the follower” in Arabic.'],
      glow: '#ff9e5e',
    },
  ),
  authorCard(
    {
      designation: 'POLARIS', name: 'Polaris', objectType: 'star', rarity: 'rare',
      targetId: 'polaris', catalogRef: 'α Ursae Minoris',
      raHours: polaris.raHours, decDeg: polaris.decDeg, ...OFF_MOON,
      blurb: 'Really three stars, one of them a pulsing giant.',
    },
    polaris.optics,
    {
      ...stars,
      stats: [['DISTANCE', '~430 ly'], ['FROM POLE', '0.6°'], ['MAGNITUDE', '1.98']],
      line: 'Really three stars, one of them a pulsing giant.',
      story: ['It sits less than a degree from the true pole.', 'It is about 430 light-years away.'],
      glow: '#fff3d6',
      noun: 'Polaris',
    },
  ),
  authorCard(
    {
      designation: 'MIRA', name: 'Mira', objectType: 'variable red giant', rarity: 'common',
      targetId: 'mira', catalogRef: 'ο Ceti',
      raHours: mira.raHours, decDeg: mira.decDeg, ...OFF_MOON,
      blurb: 'It races through space at 130 km a second.',
    },
    mira.optics,
    {
      ...stars,
      stats: [['DISTANCE', '~300 ly'], ['PERIOD', '332 days'], ['TAIL', '13 ly']],
      line: 'It races through space at 130 km a second.',
      story: ['It swells and shrinks over about eleven months.', 'One of the first stars seen to change in brightness.'],
      glow: '#ff7a5a',
    },
  ),
  authorCard(
    {
      designation: 'BETELGEUSE', name: 'Betelgeuse', objectType: 'red supergiant', rarity: 'rare',
      targetId: 'betelgeuse', catalogRef: 'α Orionis',
      raHours: betelgeuse.raHours, decDeg: betelgeuse.decDeg, ...OFF_MOON,
      blurb: 'About 550 light-years away, near the end of its life.',
    },
    betelgeuse.optics,
    {
      ...stars,
      stats: [['DISTANCE', '~550 ly'], ['SIZE', '~760 × Sun'], ['DIMMED', '2019–20']],
      line: 'About 550 light-years away, near the end of its life.',
      story: ['Big telescopes can show it as a disc.', 'It is only about ten million years old.'],
      glow: '#ff6a3a',
      noun: 'Betelgeuse',
    },
  ),
  authorCard(
    {
      designation: 'ANTARES', name: 'Antares', objectType: 'red supergiant', rarity: 'common',
      targetId: 'antares', catalogRef: 'α Scorpii',
      raHours: antares.raHours, decDeg: antares.decDeg, ...OFF_MOON,
      blurb: 'Low in the south on summer evenings.',
    },
    antares.optics,
    {
      ...stars,
      stats: [['DISTANCE', '~550 ly'], ['SIZE', '~680 × Sun'], ['MAGNITUDE', '1.06']],
      line: 'Low in the south on summer evenings.',
      story: ['It is about 550 light-years away.', 'It sits in the most colourful clouds in the sky.'],
      glow: '#ff5a3a',
    },
  ),
  authorCard(
    {
      designation: 'RIGEL', name: 'Rigel', objectType: 'blue supergiant', rarity: 'common',
      targetId: 'rigel', catalogRef: 'β Orionis',
      raHours: rigel.raHours, decDeg: rigel.decDeg, ...OFF_MOON,
      blurb: 'About 860 light-years away, only eight million years old.',
    },
    rigel.optics,
    {
      ...stars,
      stats: [['DISTANCE', '~860 ly'], ['LIGHT', '~120,000 × Sun'], ['MAGNITUDE', '0.13']],
      line: 'About 860 light-years away, only eight million years old.',
      story: ['About 79 times the width of the Sun.', 'It is really a system of several stars.'],
      glow: '#a8c8ff',
    },
  ),
  authorCard(
    {
      designation: 'ETA-CARINAE', name: 'Eta Carinae', objectType: 'hypergiant', rarity: 'common',
      targetId: 'eta-carinae', catalogRef: 'η Carinae',
      raHours: etaCar.raHours, decDeg: etaCar.decDeg, ...OFF_MOON,
      blurb: '7,500 light-years away, and certain to explode one day.',
    },
    etaCar.optics,
    {
      ...stars,
      stats: [['DISTANCE', '~7,500 ly'], ['MASS', '~100 × Sun'], ['ERUPTED', '1843']],
      line: '7,500 light-years away, and certain to explode one day.',
      story: ['It is really two massive stars in a tight orbit.', 'It cannot be seen from most of the north.'],
      glow: '#ffb0a0',
      pairsWith: 'CARINA',
    },
  ),
  authorKept(
    {
      designation: 'TRAPPIST-1', name: 'TRAPPIST-1', objectType: 'planetary system', rarity: 'common',
      catalogRef: '2MASS J23062928−0502285',
      blurb: 'A year on the innermost planet lasts a day and a half.',
    },
    `${EXOPLANET} Its star is magnitude 18.8, too faint for Live Telescope V1 under a city sky.`,
    {
      ...stars,
      stats: [['DISTANCE', '40 ly'], ['PLANETS', '7'], ['TEMPERATE', '3']],
      line: 'A year on the innermost planet lasts a day and a half.',
      story: ['Its star is barely bigger than Jupiter.', 'It is about 40 light-years away.'],
      glow: '#ff8a6a',
    },
  ),
];
