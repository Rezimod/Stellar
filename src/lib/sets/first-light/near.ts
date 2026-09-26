/**
 * The Solar System, beyond the cards in set-001.ts: the Sun, every
 * planet, the moons that matter most, Pluto, and the first visitor from
 * another star. Planet sizes for resolution are the disc at a typical
 * distance from Earth.
 */

import { arcsecFromKmAtAu } from '@/lib/sidera/observability';
import { authorCard, authorKept, type AuthoredCard } from '../build';
import { NO_POSITION, body } from './shared';

const near = { family: 'near' } as const;

export const NEAR_CARDS: AuthoredCard[] = [
  authorKept(
    {
      designation: 'SUN', name: 'The Sun', objectType: 'star', rarity: 'rare',
      catalogRef: 'G2V',
      blurb: 'The star we live beside.',
    },
    'Node 01 never points at the Sun: without a solar filter it would burn the camera.',
    {
      ...near,
      stats: [['DIAMETER', '1.39M km'], ['SURFACE', '5,500 °C'], ['LIGHT', '8 min 20 s']],
      line: 'The star we live beside.',
      story: ['Every eight minutes, its light reaches you.', 'Everything that lives is running on it.'],
      glow: '#ffb45a',
    },
  ),
  authorCard(
    {
      designation: 'MERCURY', name: 'Mercury', objectType: 'planet', rarity: 'common',
      targetId: 'mercury', catalogRef: 'JPL Horizons 199', ...NO_POSITION,
      blurb: 'The small, scorched world nearest the Sun.',
    },
    body(arcsecFromKmAtAu(4_879, 0.9)),
    {
      ...near,
      stats: [['DIAMETER', '4,879 km'], ['YEAR', '88 days'], ['SOLAR DAY', '176 days']],
      line: 'The small, scorched world nearest the Sun.',
      story: ['A year shorter than its own day.', 'It never strays far from the dusk.'],
      glow: '#c9c2b8',
      noun: 'Mercury',
    },
  ),
  authorCard(
    {
      designation: 'VENUS', name: 'Venus', objectType: 'planet', rarity: 'common',
      targetId: 'venus', catalogRef: 'JPL Horizons 299', ...NO_POSITION,
      blurb: 'The brightest planet, under a lid of cloud.',
    },
    body(arcsecFromKmAtAu(12_104, 0.7)),
    {
      ...near,
      stats: [['DIAMETER', '12,104 km'], ['SURFACE', '465 °C'], ['DAY', '243 days']],
      line: 'The brightest planet, under a lid of cloud.',
      story: ['Hot enough at the ground to melt lead.', 'From here, the evening star.'],
      glow: '#ffe7b0',
      noun: 'Venus',
    },
  ),
  authorCard(
    {
      designation: 'MARS', name: 'Mars', objectType: 'planet', rarity: 'rare',
      targetId: 'mars', catalogRef: 'JPL Horizons 499', ...NO_POSITION,
      blurb: 'Rust, ice caps and a day nearly ours.',
    },
    body(arcsecFromKmAtAu(6_779, 0.6)),
    {
      ...near,
      stats: [['DIAMETER', '6,779 km'], ['DAY', '24 h 37 m'], ['MOONS', '2']],
      line: 'Rust, ice caps and a day nearly ours.',
      story: ['Once it had rivers and a sky that held rain.', 'The next world people will stand on.'],
      glow: '#ff8a5c',
      noun: 'Mars',
    },
  ),
  authorCard(
    {
      designation: 'VALLES-MARINERIS', name: 'Valles Marineris', objectType: 'canyon on Mars', rarity: 'common',
      targetId: 'mars', catalogRef: 'IAU gazetteer', ...NO_POSITION,
      blurb: 'A canyon as long as a continent is wide.',
    },
    body(arcsecFromKmAtAu(4_000, 0.6)),
    {
      ...near,
      stats: [['LENGTH', '~4,000 km'], ['DEPTH', 'up to 7 km'], ['WIDTH', 'up to 200 km']],
      line: 'A canyon as long as a continent is wide.',
      story: ['Laid across America, it would reach coast to coast.', 'Morning fog still pools along its floor.'],
      glow: '#e8946a',
      noun: 'Valles Marineris',
    },
  ),
  authorCard(
    {
      designation: 'IO', name: 'Io', objectType: 'moon of Jupiter', rarity: 'rare',
      targetId: 'jupiter', catalogRef: 'JPL Horizons 501', ...NO_POSITION,
      blurb: 'The most volcanic world known.',
    },
    body(arcsecFromKmAtAu(3_643, 4.2)),
    {
      ...near,
      stats: [['DIAMETER', '3,643 km'], ['VOLCANOES', '~400 active'], ['ORBIT', '1.77 days']],
      line: 'The most volcanic world known.',
      story: ['Squeezed by Jupiter, it never cools.', 'Its fountains of sulfur rise hundreds of kilometres.'],
      glow: '#ffd35a',
    },
  ),
  authorCard(
    {
      designation: 'GANYMEDE', name: 'Ganymede', objectType: 'moon of Jupiter', rarity: 'common',
      targetId: 'jupiter', catalogRef: 'JPL Horizons 503', ...NO_POSITION,
      blurb: 'The largest moon, larger than Mercury.',
    },
    body(arcsecFromKmAtAu(5_268, 4.2)),
    {
      ...near,
      stats: [['DIAMETER', '5,268 km'], ['ORBIT', '7.15 days'], ['FIELD', 'Its own magnetic']],
      line: 'The largest moon, larger than Mercury.',
      story: ['The only moon with a magnetic field of its own.', 'Beneath its grooves, a buried salt ocean.'],
      glow: '#cbbca6',
    },
  ),
  authorCard(
    {
      designation: 'ENCELADUS', name: 'Enceladus', objectType: 'moon of Saturn', rarity: 'rare',
      targetId: 'saturn', catalogRef: 'JPL Horizons 602', ...NO_POSITION,
      blurb: 'A small white moon spraying its ocean into space.',
    },
    body(arcsecFromKmAtAu(504, 8.5)),
    {
      ...near,
      stats: [['DIAMETER', '504 km'], ['REFLECTS', '~99% of light'], ['JETS', '~100 geysers']],
      line: 'A small white moon spraying its ocean into space.',
      story: ['The whitest thing in the Solar System.', 'Its geysers feed one of Saturn’s rings.'],
      glow: '#dff4ff',
    },
  ),
  authorCard(
    {
      designation: 'URANUS', name: 'Uranus', objectType: 'planet', rarity: 'common',
      targetId: 'uranus', catalogRef: 'JPL Horizons 799', ...NO_POSITION,
      blurb: 'The ice giant that rolls on its side.',
    },
    body(arcsecFromKmAtAu(51_118, 19), 5.7),
    {
      ...near,
      stats: [['DIAMETER', '51,118 km'], ['TILT', '98°'], ['YEAR', '84 years']],
      line: 'The ice giant that rolls on its side.',
      story: ['Something vast once knocked it over.', 'Each pole gets forty-two years of sun.'],
      glow: '#a8f0f0',
      noun: 'Uranus',
    },
  ),
  authorCard(
    {
      designation: 'NEPTUNE', name: 'Neptune', objectType: 'planet', rarity: 'rare',
      targetId: 'neptune', catalogRef: 'JPL Horizons 899', ...NO_POSITION,
      blurb: 'The last planet, found by arithmetic.',
    },
    body(arcsecFromKmAtAu(49_528, 29), 7.8),
    {
      ...near,
      stats: [['DIAMETER', '49,528 km'], ['WINDS', '~2,000 km/h'], ['YEAR', '165 years']],
      line: 'The last planet, found by arithmetic.',
      story: ['Predicted on paper before anyone saw it.', 'The fastest winds on any planet blow there.'],
      glow: '#5a8cff',
      noun: 'Neptune',
    },
  ),
  authorCard(
    {
      designation: 'PLUTO', name: 'Pluto', objectType: 'dwarf planet', rarity: 'epic',
      targetId: 'pluto', catalogRef: '134340 Pluto', ...NO_POSITION,
      blurb: 'A small, far world with a heart of ice.',
    },
    body(arcsecFromKmAtAu(2_377, 34), 14.4),
    {
      ...near,
      stats: [['DIAMETER', '2,377 km'], ['YEAR', '248 years'], ['VISITED', '14 Jul 2015']],
      line: 'A small, far world with a heart of ice.',
      story: ['A plain of nitrogen ice, shaped like a heart.', 'Seen close once, for a single afternoon.'],
      glow: '#f2c9a8',
    },
  ),
  authorKept(
    {
      designation: 'OUMUAMUA', name: 'ʻOumuamua', objectType: 'interstellar object', rarity: 'rare',
      catalogRef: '1I/2017 U1',
      blurb: 'The first visitor from another star.',
    },
    'Gone: it left the inner Solar System in 2018 and is far too faint for any telescope now.',
    {
      ...near,
      stats: [['FOUND', '19 Oct 2017'], ['SPEED', '26 km/s'], ['ORIGIN', 'Another star']],
      line: 'The first visitor from another star.',
      story: ['It came from between the stars, and did not stay.', 'We saw it for eleven weeks.'],
      glow: '#d69a78',
    },
  ),
];
