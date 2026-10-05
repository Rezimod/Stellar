/**
 * The Solar System, beyond the cards in set-001.ts: the Sun, every
 * planet, the moons that matter most, Pluto, and the first visitor from
 * another star. Planet sizes for resolution are the disc at a typical
 * distance from Earth.
 */

import { arcsecFromKmAtAu } from '@/lib/stellar/observability';
import { authorCard, authorKept, type AuthoredCard } from '../build';
import { NO_POSITION, body } from './shared';

const near = { family: 'near' } as const;

export const NEAR_CARDS: AuthoredCard[] = [
  authorKept(
    {
      designation: 'SUN', name: 'The Sun', objectType: 'star', rarity: 'rare',
      catalogRef: 'G2V',
      blurb: 'Its light took thousands of years to climb out of the core.',
    },
    'Live Telescope V1 never points at the Sun: without a solar filter it would burn the camera.',
    {
      ...near,
      stats: [['DIAMETER', '1.39M km'], ['SURFACE', '5,500 °C'], ['LIGHT', '8 min 20 s']],
      line: 'Its light took thousands of years to climb out of the core.',
      story: ['Every eight minutes, its light reaches you.', 'Everything that lives is running on it.'],
      glow: '#ffb45a',
    },
  ),
  authorCard(
    {
      designation: 'MERCURY', name: 'Mercury', objectType: 'planet', rarity: 'common',
      targetId: 'mercury', catalogRef: 'JPL Horizons 199', ...NO_POSITION,
      blurb: 'Ice hides in polar craters that sunlight never reaches.',
    },
    body(arcsecFromKmAtAu(4_879, 0.9)),
    {
      ...near,
      stats: [['DIAMETER', '4,879 km'], ['YEAR', '88 days'], ['SOLAR DAY', '176 days']],
      line: 'Ice hides in polar craters that sunlight never reaches.',
      story: ['A year shorter than its own day.', 'It never strays far from the dusk.'],
      glow: '#c9c2b8',
      noun: 'Mercury',
    },
  ),
  authorCard(
    {
      designation: 'VENUS', name: 'Venus', objectType: 'planet', rarity: 'common',
      targetId: 'venus', catalogRef: 'JPL Horizons 299', ...NO_POSITION,
      blurb: 'It spins backwards: there the Sun rises in the west.',
    },
    body(arcsecFromKmAtAu(12_104, 0.7)),
    {
      ...near,
      stats: [['DIAMETER', '12,104 km'], ['SURFACE', '465 °C'], ['DAY', '243 days']],
      line: 'It spins backwards: there the Sun rises in the west.',
      story: ['Hot enough at the ground to melt lead.', 'From here, the evening star.'],
      glow: '#ffe7b0',
      noun: 'Venus',
    },
  ),
  authorCard(
    {
      designation: 'MARS', name: 'Mars', objectType: 'planet', rarity: 'rare',
      targetId: 'mars', catalogRef: 'JPL Horizons 499', ...NO_POSITION,
      blurb: 'Two small moons, Phobos and Deimos, circle it.',
    },
    body(arcsecFromKmAtAu(6_779, 0.6)),
    {
      ...near,
      stats: [['DIAMETER', '6,779 km'], ['DAY', '24 h 37 m'], ['MOONS', '2']],
      line: 'Two small moons, Phobos and Deimos, circle it.',
      story: ['Once it had rivers and a sky that held rain.', 'The next world people will stand on.'],
      glow: '#ff8a5c',
      noun: 'Mars',
    },
  ),
  authorCard(
    {
      designation: 'VALLES-MARINERIS', name: 'Valles Marineris', objectType: 'canyon on Mars', rarity: 'common',
      targetId: 'mars', catalogRef: 'IAU gazetteer', ...NO_POSITION,
      blurb: 'Named for Mariner 9, the probe that found it in 1972.',
    },
    body(arcsecFromKmAtAu(4_000, 0.6)),
    {
      ...near,
      stats: [['LENGTH', '~4,000 km'], ['DEPTH', 'up to 7 km'], ['WIDTH', 'up to 200 km']],
      line: 'Named for Mariner 9, the probe that found it in 1972.',
      story: ['Laid across America, it would reach coast to coast.', 'Morning fog still pools along its floor.'],
      glow: '#e8946a',
      noun: 'Valles Marineris',
    },
  ),
  authorCard(
    {
      designation: 'IO', name: 'Io', objectType: 'moon of Jupiter', rarity: 'rare',
      targetId: 'jupiter', catalogRef: 'JPL Horizons 501', ...NO_POSITION,
      blurb: 'It circles its planet in less than two days.',
    },
    body(arcsecFromKmAtAu(3_643, 4.2)),
    {
      ...near,
      stats: [['DIAMETER', '3,643 km'], ['VOLCANOES', '~400 active'], ['ORBIT', '1.77 days']],
      line: 'It circles its planet in less than two days.',
      story: ['Squeezed by Jupiter, it never cools.', 'Its fountains of sulfur rise hundreds of kilometres.'],
      glow: '#ffd35a',
    },
  ),
  authorCard(
    {
      designation: 'GANYMEDE', name: 'Ganymede', objectType: 'moon of Jupiter', rarity: 'common',
      targetId: 'jupiter', catalogRef: 'JPL Horizons 503', ...NO_POSITION,
      blurb: 'Galileo spotted it in January 1610.',
    },
    body(arcsecFromKmAtAu(5_268, 4.2)),
    {
      ...near,
      stats: [['DIAMETER', '5,268 km'], ['ORBIT', '7.15 days'], ['FIELD', 'Its own magnetic']],
      line: 'Galileo spotted it in January 1610.',
      story: ['The only moon with a magnetic field of its own.', 'Beneath its grooves, a buried salt ocean.'],
      glow: '#cbbca6',
    },
  ),
  authorCard(
    {
      designation: 'ENCELADUS', name: 'Enceladus', objectType: 'moon of Saturn', rarity: 'rare',
      targetId: 'saturn', catalogRef: 'JPL Horizons 602', ...NO_POSITION,
      blurb: 'Its spray feeds one of Saturn’s rings.',
    },
    body(arcsecFromKmAtAu(504, 8.5)),
    {
      ...near,
      stats: [['DIAMETER', '504 km'], ['REFLECTS', '~99% of light'], ['JETS', '~100 geysers']],
      line: 'Its spray feeds one of Saturn’s rings.',
      story: ['The whitest thing in the Solar System.', 'Its geysers feed one of Saturn’s rings.'],
      glow: '#dff4ff',
    },
  ),
  authorCard(
    {
      designation: 'URANUS', name: 'Uranus', objectType: 'planet', rarity: 'common',
      targetId: 'uranus', catalogRef: 'JPL Horizons 799', ...NO_POSITION,
      blurb: 'Herschel found it in 1781, the first planet found by telescope.',
    },
    body(arcsecFromKmAtAu(51_118, 19), 5.7),
    {
      ...near,
      stats: [['DIAMETER', '51,118 km'], ['TILT', '98°'], ['YEAR', '84 years']],
      line: 'Herschel found it in 1781, the first planet found by telescope.',
      story: ['Something vast once knocked it over.', 'Each pole gets forty-two years of sun.'],
      glow: '#a8f0f0',
      noun: 'Uranus',
    },
  ),
  authorCard(
    {
      designation: 'NEPTUNE', name: 'Neptune', objectType: 'planet', rarity: 'rare',
      targetId: 'neptune', catalogRef: 'JPL Horizons 899', ...NO_POSITION,
      blurb: 'Voyager 2 is the only craft to visit, in 1989.',
    },
    body(arcsecFromKmAtAu(49_528, 29), 7.8),
    {
      ...near,
      stats: [['DIAMETER', '49,528 km'], ['WINDS', '~2,000 km/h'], ['YEAR', '165 years']],
      line: 'Voyager 2 is the only craft to visit, in 1989.',
      story: ['Predicted on paper before anyone saw it.', 'The fastest winds on any planet blow there.'],
      glow: '#5a8cff',
      noun: 'Neptune',
    },
  ),
  authorCard(
    {
      designation: 'PLUTO', name: 'Pluto', objectType: 'dwarf planet', rarity: 'epic',
      targetId: 'pluto', catalogRef: '134340 Pluto', ...NO_POSITION,
      blurb: 'Its discoverer’s ashes flew past it on New Horizons.',
    },
    body(arcsecFromKmAtAu(2_377, 34), 14.4),
    {
      ...near,
      stats: [['DIAMETER', '2,377 km'], ['YEAR', '248 years'], ['VISITED', '14 Jul 2015']],
      line: 'Its discoverer’s ashes flew past it on New Horizons.',
      story: ['A plain of nitrogen ice, shaped like a heart.', 'Seen close once, for a single afternoon.'],
      glow: '#f2c9a8',
    },
  ),
  authorKept(
    {
      designation: 'OUMUAMUA', name: 'ʻOumuamua', objectType: 'interstellar object', rarity: 'rare',
      catalogRef: '1I/2017 U1',
      blurb: 'Its name is Hawaiian for a scout from far away.',
    },
    'Gone: it left the inner Solar System in 2018 and is far too faint for any telescope now.',
    {
      ...near,
      stats: [['FOUND', '19 Oct 2017'], ['SPEED', '26 km/s'], ['ORIGIN', 'Another star']],
      line: 'Its name is Hawaiian for a scout from far away.',
      story: ['It came from between the stars, and did not stay.', 'We saw it for eleven weeks.'],
      glow: '#d69a78',
    },
  ),
];
