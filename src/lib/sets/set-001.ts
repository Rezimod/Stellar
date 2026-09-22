/**
 * Set 001.
 *
 * Twenty-four cards: sixteen of the best-known things in the real sky, and
 * eight from fiction. Rarity is a decision made here and stored; it has
 * nothing to do with whether Node 01 can photograph the object. For the real
 * cards that is judged from the instrument and the site (see build.ts); the
 * fiction cards are original designs that exist in no sky, and say so.
 *
 * Sources. Fixed positions are J2000. Stars come from src/lib/sky/stars.ts and
 * deep-sky objects from the node's own catalogue (sky-field.ts); the two in
 * neither — the Eagle Nebula and M87 — are from the NGC/IC catalogue. Lunar
 * positions are the IAU gazetteer's. Sizes for resolution are the object's
 * real extent at a typical distance.
 */

import { BRIGHT_STARS } from '@/lib/sky/stars';
import { DEEP_SKY_BY_ID } from '@/lib/observatory/sky-field';
import { arcsecFromKm, arcsecFromKmAtAu, MOON_DISTANCE_KM } from '@/lib/sidera/observability';
import { authorCard, authorFiction, type AuthoredCard, type CardFacts, type CardOptics } from './build';

export const SET_001 = {
  code: 'SET001',
  name: 'Set 001',
  status: 'draft',
  releasedAt: null,
} as const;

function star(id: string) {
  const s = BRIGHT_STARS.find((x) => x.id === id);
  if (!s) throw new Error(`${id} is not in BRIGHT_STARS`);
  return s;
}

function dso(id: string) {
  const d = DEEP_SKY_BY_ID.get(id);
  if (!d) throw new Error(`${id} is not in the deep-sky catalogue`);
  return d;
}

/** A moving body: no fixed position, only a size. */
const body = (resolveArcsec: number | null, magnitude: number | null = null): CardOptics => ({
  resolveArcsec,
  magnitude,
  sizeArcmin: null,
});

/** A deep-sky object from the node's catalogue, seen whole. */
function deepSky(id: string): Pick<CardFacts, 'raHours' | 'decDeg'> & { optics: CardOptics } {
  const d = dso(id);
  return {
    raHours: d.ra,
    decDeg: d.dec,
    optics: { resolveArcsec: null, magnitude: d.mag, sizeArcmin: { major: d.major, minor: d.minor ?? d.major } },
  };
}

/** A star, seen as a point. */
function point(id: string): Pick<CardFacts, 'raHours' | 'decDeg'> & { optics: CardOptics } {
  const s = star(id);
  return { raHours: s.ra, decDeg: s.dec, optics: { resolveArcsec: null, magnitude: s.mag, sizeArcmin: null } };
}

const NO_POSITION = { raHours: null, decDeg: null, surfaceLat: null, surfaceLon: null } as const;
const OFF_MOON = { surfaceLat: null, surfaceLon: null } as const;

const m42 = deepSky('m42');
const m45 = deepSky('m45');
const m31 = deepSky('m31');
const sirius = point('sirius');
const polaris = point('polaris');
const betelgeuse = point('betelgeuse');

export const SET_001_CARDS: AuthoredCard[] = [
  // The Moon.
  authorCard(
    {
      designation: 'MOON', name: 'The Moon', objectType: "Earth's moon", rarity: 'common',
      targetId: 'moon', catalogRef: 'JPL Horizons 301', ...NO_POSITION,
      blurb: 'Our closest neighbour, 384,000 km away. Every crater you can see is older than the dinosaurs.',
    },
    body(arcsecFromKm(3_474, MOON_DISTANCE_KM)),
  ),
  authorCard(
    {
      designation: 'TRANQUILITY-BASE', name: 'Tranquility Base', objectType: 'lunar landing site',
      rarity: 'legendary', targetId: 'moon', catalogRef: 'Apollo 11 lunar module site (LROC)',
      raHours: null, decDeg: null, surfaceLat: 0.67408, surfaceLon: 23.47297,
      blurb: 'Where Apollo 11 landed on 20 July 1969. The lander’s base is still standing there.',
    },
    // The descent stage, legs included.
    body(arcsecFromKm(0.0094, MOON_DISTANCE_KM)),
  ),

  // The planets.
  authorCard(
    {
      designation: 'VENUS', name: 'Venus', objectType: 'planet', rarity: 'common',
      targetId: 'venus', catalogRef: 'JPL Horizons 299', ...NO_POSITION,
      blurb: 'The brightest planet in the sky, hidden under clouds of acid. It shows phases like the Moon.',
    },
    body(arcsecFromKmAtAu(12_104, 0.7)),
  ),
  authorCard(
    {
      designation: 'MARS', name: 'Mars', objectType: 'planet', rarity: 'common',
      targetId: 'mars', catalogRef: 'JPL Horizons 499', ...NO_POSITION,
      blurb: 'The red planet: rust-coloured dust, polar ice caps and the tallest volcano in the solar system.',
    },
    body(arcsecFromKmAtAu(6_779, 0.6)),
  ),
  authorCard(
    {
      designation: 'JUPITER', name: 'Jupiter', objectType: 'planet', rarity: 'rare',
      targetId: 'jupiter', catalogRef: 'JPL Horizons 599', ...NO_POSITION,
      blurb: 'The giant. More than a thousand Earths would fit inside, and its Great Red Spot is a storm older than any country.',
    },
    body(arcsecFromKmAtAu(142_984, 4.2)),
  ),
  authorCard(
    {
      designation: 'SATURN', name: 'Saturn', objectType: 'planet', rarity: 'epic',
      targetId: 'saturn', catalogRef: 'JPL Horizons 699', ...NO_POSITION,
      blurb: 'The ringed planet. The rings are ice, some pieces as small as sand, some as big as houses.',
    },
    body(arcsecFromKmAtAu(120_536, 8.5)),
  ),
  authorCard(
    {
      designation: 'PLUTO', name: 'Pluto', objectType: 'dwarf planet', rarity: 'rare',
      targetId: 'pluto', catalogRef: 'JPL Horizons 999', ...NO_POSITION,
      blurb: 'The small world at the edge, with a giant ice heart on its surface. A year there lasts 248 of ours.',
    },
    body(arcsecFromKmAtAu(2_377, 35), 14.5),
  ),
  authorCard(
    {
      designation: 'HALLEY', name: "Halley's Comet", objectType: 'comet', rarity: 'epic',
      targetId: 'halley', catalogRef: '1P/Halley', ...NO_POSITION,
      blurb: 'The famous comet that returns every 76 years. Next time it lights up our sky is 2061.',
    },
    // Near aphelion: far, dark and small.
    body(null, 25),
  ),

  // Stars.
  authorCard(
    {
      designation: 'SIRIUS', name: 'Sirius', objectType: 'star', rarity: 'common',
      targetId: 'sirius', catalogRef: 'HIP 32349 (α Canis Majoris)',
      raHours: sirius.raHours, decDeg: sirius.decDeg, ...OFF_MOON,
      blurb: 'The brightest star in the night sky, the Dog Star. It has a tiny white-dwarf companion.',
    },
    sirius.optics,
  ),
  authorCard(
    {
      designation: 'POLARIS', name: 'Polaris', objectType: 'star', rarity: 'common',
      targetId: 'polaris', catalogRef: 'HIP 11767 (α Ursae Minoris)',
      raHours: polaris.raHours, decDeg: polaris.decDeg, ...OFF_MOON,
      blurb: 'The North Star. The whole sky turns around it, which is how sailors found their way home.',
    },
    polaris.optics,
  ),
  authorCard(
    {
      designation: 'BETELGEUSE', name: 'Betelgeuse', objectType: 'red supergiant', rarity: 'rare',
      targetId: 'betelgeuse', catalogRef: 'HIP 27989 (α Orionis)',
      raHours: betelgeuse.raHours, decDeg: betelgeuse.decDeg, ...OFF_MOON,
      blurb: 'Orion’s red shoulder, a star so big it would swallow Jupiter’s orbit. One day it will explode.',
    },
    betelgeuse.optics,
  ),

  // Deep sky.
  authorCard(
    {
      designation: 'M42', name: 'Orion Nebula', objectType: 'nebula', rarity: 'common',
      targetId: 'm42', catalogRef: 'M42 (NGC 1976)',
      raHours: m42.raHours, decDeg: m42.decDeg, ...OFF_MOON,
      blurb: 'A cloud where new stars are being born, 1,350 light-years away. You can see it with bare eyes.',
    },
    m42.optics,
  ),
  authorCard(
    {
      designation: 'M45', name: 'Pleiades', objectType: 'star cluster', rarity: 'common',
      targetId: 'm45', catalogRef: 'M45 (Seven Sisters)',
      raHours: m45.raHours, decDeg: m45.decDeg, ...OFF_MOON,
      blurb: 'The Seven Sisters, young blue stars travelling together. Almost every culture has a story about them.',
    },
    m45.optics,
  ),
  authorCard(
    {
      designation: 'M31', name: 'Andromeda Galaxy', objectType: 'galaxy', rarity: 'rare',
      targetId: 'm31', catalogRef: 'M31 (NGC 224)',
      raHours: m31.raHours, decDeg: m31.decDeg, ...OFF_MOON,
      blurb: 'Our neighbour galaxy, a trillion stars 2.5 million light-years away. It is on its way to meet us.',
    },
    m31.optics,
  ),
  authorCard(
    {
      designation: 'M16', name: 'Pillars of Creation', objectType: 'nebula', rarity: 'epic',
      targetId: 'm16', catalogRef: 'M16 (NGC 6611), Eagle Nebula',
      // 18h 18m 48s, −13° 49′.
      raHours: 18.3133, decDeg: -13.8167, ...OFF_MOON,
      blurb: 'Towers of gas and dust in the Eagle Nebula, each light-years tall, with stars forming at their tips.',
    },
    { resolveArcsec: null, magnitude: 6.0, sizeArcmin: { major: 7, minor: 7 } },
  ),
  authorCard(
    {
      designation: 'M87', name: 'M87 Black Hole', objectType: 'black hole', rarity: 'legendary',
      targetId: 'm87', catalogRef: 'M87* (Event Horizon Telescope, 2019)',
      // 12h 30m 49s, +12° 23′.
      raHours: 12.5137, decDeg: 12.3911, ...OFF_MOON,
      blurb: 'The first black hole ever photographed, 6.5 billion times the mass of the Sun. It took a telescope the size of Earth.',
    },
    // The ring is 42 micro-arcseconds across.
    { resolveArcsec: 0.000042, magnitude: 8.6, sizeArcmin: null },
  ),

  // Fiction. Original designs; no sky has them.
  authorFiction({
    designation: 'TWIN-SUN', name: 'Twin-Sun World', objectType: 'fictional world', rarity: 'rare',
    catalogRef: 'Sidera fiction 01',
    blurb: 'A desert planet with two suns. Every evening has two sunsets.',
  }),
  authorFiction({
    designation: 'TIDE-WORLD', name: 'Tide World', objectType: 'fictional world', rarity: 'common',
    catalogRef: 'Sidera fiction 02',
    blurb: 'A planet made of ocean, where the tides rise higher than mountains.',
  }),
  authorFiction({
    designation: 'RING-HABITAT', name: 'The Ring Habitat', objectType: 'fictional habitat', rarity: 'epic',
    catalogRef: 'Sidera fiction 03',
    blurb: 'A world built as a ring around a star, with sky, sea and forests on the inside.',
  }),
  authorFiction({
    designation: 'UNIT-7', name: 'Unit-7', objectType: 'fictional robot', rarity: 'common',
    catalogRef: 'Sidera fiction 04',
    blurb: 'A small service robot left alone on a quiet world. It still waters its one plant.',
  }),
  authorFiction({
    designation: 'SENTINEL', name: 'The Sentinel', objectType: 'fictional robot', rarity: 'rare',
    catalogRef: 'Sidera fiction 05',
    blurb: 'A tall machine that has watched the same horizon for ten thousand years.',
  }),
  authorFiction({
    designation: 'BLACK-SLAB', name: 'The Black Slab', objectType: 'fictional artifact', rarity: 'epic',
    catalogRef: 'Sidera fiction 06',
    blurb: 'A perfect black block no one made. It appears when the planets line up.',
  }),
  authorFiction({
    designation: 'DERELICT', name: 'The Derelict', objectType: 'fictional starship', rarity: 'rare',
    catalogRef: 'Sidera fiction 07',
    blurb: 'A vast ship drifting between stars. A few of its lights are still on.',
  }),
  authorFiction({
    designation: 'WORMHOLE', name: 'The Wormhole', objectType: 'fictional phenomenon', rarity: 'legendary',
    catalogRef: 'Sidera fiction 08',
    blurb: 'A doorway through space. Look into it and you see a galaxy on the other side.',
  }),
];

export const SET_001_CARD_BY_DESIGNATION = new Map(SET_001_CARDS.map((c) => [c.seed.designation, c]));
