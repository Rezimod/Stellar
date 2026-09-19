/**
 * Set 001.
 *
 * Twenty real objects: the Moon's surface, the planets and one of their moons,
 * three stars, and five deep-sky objects. Rarity is a decision made here and
 * stored; it has nothing to do with whether Node 01 can photograph the
 * object. Seven of the twenty it cannot, and the reasons are physical — too
 * small to resolve, too diffuse for a city sky, or never above the horizon
 * from Tbilisi.
 *
 * Sources. Fixed positions are J2000. Stars come from src/lib/sky/stars.ts and
 * deep-sky objects from the node's own catalogue (sky-field.ts); the one object
 * in neither, Omega Centauri, is from Harris (2010). Lunar positions are the
 * IAU gazetteer's. Sizes for resolution are the object's real extent at a
 * typical distance: a planet near opposition, the Moon at its mean distance.
 */

import { BRIGHT_STARS } from '@/lib/sky/stars';
import { DEEP_SKY_BY_ID } from '@/lib/observatory/sky-field';
import { arcsecFromKm, arcsecFromKmAtAu, MOON_DISTANCE_KM } from '@/lib/sidera/observability';
import { TYCHO_CARD } from '@/lib/sidera/tycho';
import { authorCard, type AuthoredCard, type CardFacts, type CardOptics } from './build';

export const SET_001 = {
  code: 'SET001',
  name: 'Set 001',
  status: 'draft',
  releasedAt: null,
} as const;

const atMoon = (km: number) => arcsecFromKm(km, MOON_DISTANCE_KM);

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
const body = (resolveArcsec: number, magnitude: number | null = null): CardOptics => ({
  resolveArcsec,
  magnitude,
  sizeArcmin: null,
});

/** A lunar feature, resolved at its own diameter. */
const lunar = (km: number): CardOptics => body(atMoon(km));

/** A deep-sky object from the node's catalogue, seen whole. */
function deepSky(id: string): Pick<CardFacts, 'raHours' | 'decDeg'> & { optics: CardOptics } {
  const d = dso(id);
  return {
    raHours: d.ra,
    decDeg: d.dec,
    optics: { resolveArcsec: null, magnitude: d.mag, sizeArcmin: { major: d.major, minor: d.minor ?? d.major } },
  };
}

const NO_POSITION = { raHours: null, decDeg: null, surfaceLat: null, surfaceLon: null } as const;
const OFF_MOON = { surfaceLat: null, surfaceLon: null } as const;

const m42 = deepSky('m42');
const m57 = deepSky('m57');
const m13 = deepSky('m13');
const m101 = deepSky('m101');
const albireo = star('albireo');
const mizar = star('mizar');
const canopus = star('canopus');

export const SET_001_CARDS: AuthoredCard[] = [
  // The Moon.
  TYCHO_CARD,
  authorCard(
    {
      designation: 'COPERNICUS', name: 'Copernicus', objectType: 'lunar crater', rarity: 'common',
      targetId: 'moon', catalogRef: 'IAU Copernicus (lunar crater)',
      raHours: null, decDeg: null, surfaceLat: 9.62, surfaceLon: -20.08,
      blurb:
        'A crater 93 km across on the southern edge of Mare Imbrium, with terraced walls and a ' +
        'cluster of central peaks. About 800 million years old; the youngest era of lunar history ' +
        'is named after it.',
    },
    lunar(93),
  ),
  authorCard(
    {
      designation: 'PLATO', name: 'Plato', objectType: 'lunar crater', rarity: 'common',
      targetId: 'moon', catalogRef: 'IAU Plato (lunar crater)',
      raHours: null, decDeg: null, surfaceLat: 51.62, surfaceLon: -9.38,
      blurb:
        'A walled plain 101 km across on the northern shore of Mare Imbrium. Lava filled its floor ' +
        'long ago, which is why it reads as one of the darkest patches on the near side.',
    },
    lunar(101),
  ),
  authorCard(
    {
      designation: 'CLAVIUS', name: 'Clavius', objectType: 'lunar crater', rarity: 'rare',
      targetId: 'moon', catalogRef: 'IAU Clavius (lunar crater)',
      raHours: null, decDeg: null, surfaceLat: -58.62, surfaceLon: -14.73,
      blurb:
        'One of the largest craters on the near side, 231 km across, in the southern highlands. ' +
        'A curving chain of smaller craters crosses its floor, largest to smallest.',
    },
    lunar(231),
  ),
  authorCard(
    {
      designation: 'TRANQUILITY-BASE', name: 'Tranquility Base', objectType: 'lunar landing site',
      rarity: 'legendary', targetId: 'moon', catalogRef: 'Apollo 11 lunar module site (LROC)',
      raHours: null, decDeg: null, surfaceLat: 0.67408, surfaceLon: 23.47297,
      blurb:
        'Where the Apollo 11 lunar module set down on 20 July 1969. The descent stage is still ' +
        'there, about nine metres across its legs. From Tbilisi nothing smaller than about 5 km ' +
        'on the Moon can be told apart, so Node 01 records the plain, not the site.',
    },
    // The descent stage, legs included.
    lunar(0.0094),
  ),

  // The planets, and what is on or around them.
  authorCard(
    {
      designation: 'VENUS', name: 'Venus', objectType: 'planet', rarity: 'common',
      targetId: 'venus', catalogRef: 'JPL Horizons 299',
      ...NO_POSITION,
      blurb:
        'Wrapped in cloud that shows no detail in visible light. What the telescope records is ' +
        'its phase, which Galileo used in 1610 as evidence that Venus goes round the Sun.',
    },
    // Near greatest elongation, about 0.7 AU.
    body(arcsecFromKmAtAu(12_104, 0.7)),
  ),
  authorCard(
    {
      designation: 'MARS', name: 'Mars', objectType: 'planet', rarity: 'common',
      targetId: 'mars', catalogRef: 'JPL Horizons 499',
      ...NO_POSITION,
      blurb:
        'A small ochre disc for most of its two-year cycle. Only for a few weeks around opposition ' +
        'is it large enough to show a polar cap and the darker markings.',
    },
    body(arcsecFromKmAtAu(6_779, 0.6)),
  ),
  authorCard(
    {
      designation: 'JUPITER', name: 'Jupiter', objectType: 'planet', rarity: 'common',
      targetId: 'jupiter', catalogRef: 'JPL Horizons 599',
      ...NO_POSITION,
      blurb:
        'The largest planet, its disc crossed by two dark cloud belts. The four Galilean moons ' +
        'change places from one night to the next.',
    },
    body(arcsecFromKmAtAu(142_984, 4.2)),
  ),
  authorCard(
    {
      designation: 'GREAT-RED-SPOT', name: 'Great Red Spot', objectType: 'atmospheric feature',
      rarity: 'rare', targetId: 'jupiter', catalogRef: 'Jupiter, South Tropical Zone',
      ...NO_POSITION,
      blurb:
        'A storm in Jupiter’s southern hemisphere, watched continuously since 1831 and shrinking ' +
        'for most of that time. It is on the visible face for about five hours of every ten.',
    },
    // Its short axis, north to south.
    body(arcsecFromKmAtAu(11_000, 4.2)),
  ),
  authorCard(
    {
      designation: 'EUROPA', name: 'Europa', objectType: 'moon of Jupiter', rarity: 'epic',
      targetId: 'jupiter', catalogRef: 'JPL Horizons 502',
      ...NO_POSITION,
      blurb:
        'An ice shell over a salt-water ocean, 3,122 km across. At Jupiter’s distance its disc is ' +
        'about one arcsecond, finer than the Tbilisi air allows; Node 01 records it as a point of ' +
        'light beside the planet.',
    },
    body(arcsecFromKmAtAu(3_122, 4.2), 5.3),
  ),
  authorCard(
    {
      designation: 'SATURN', name: 'Saturn', objectType: 'planet', rarity: 'legendary',
      targetId: 'saturn', catalogRef: 'JPL Horizons 699',
      ...NO_POSITION,
      blurb:
        'Smaller in the eyepiece than anyone expects, and unmistakable. The rings turned edge-on ' +
        'to Earth in March 2025 and are opening again.',
    },
    body(arcsecFromKmAtAu(120_536, 8.5)),
  ),
  authorCard(
    {
      designation: 'PLUTO', name: 'Pluto', objectType: 'dwarf planet', rarity: 'legendary',
      targetId: 'pluto', catalogRef: 'JPL Horizons 999',
      ...NO_POSITION,
      blurb:
        'Found on photographic plates in 1930. At 35 AU its disc is a tenth of an arcsecond; a ' +
        'stacked frame could show it as one faint star among many, but not as a world.',
    },
    body(arcsecFromKmAtAu(2_377, 35), 14.5),
  ),

  // Stars.
  authorCard(
    {
      designation: 'ALBIREO', name: 'Albireo', objectType: 'double star', rarity: 'rare',
      targetId: 'albireo', catalogRef: 'HIP 95947 (β Cygni)',
      raHours: albireo.ra, decDeg: albireo.dec, ...OFF_MOON,
      blurb:
        'A gold star and a blue one, 34 arcseconds apart at the foot of the Swan. Whether the two ' +
        'are bound to each other or only share a line of sight is still argued.',
    },
    { resolveArcsec: 34.4, magnitude: albireo.mag, sizeArcmin: null },
  ),
  authorCard(
    {
      designation: 'MIZAR', name: 'Mizar', objectType: 'double star', rarity: 'common',
      targetId: 'mizar', catalogRef: 'HIP 65378 (ζ Ursae Majoris)',
      raHours: mizar.ra, decDeg: mizar.dec, ...OFF_MOON,
      blurb:
        'The bend of the Plough’s handle. In a telescope it splits into two stars 14 arcseconds ' +
        'apart; in 1857 it became the first double star ever photographed.',
    },
    { resolveArcsec: 14.4, magnitude: mizar.mag, sizeArcmin: null },
  ),
  authorCard(
    {
      designation: 'CANOPUS', name: 'Canopus', objectType: 'star', rarity: 'rare',
      targetId: 'canopus', catalogRef: 'HIP 30438 (α Carinae)',
      raHours: canopus.ra, decDeg: canopus.dec, ...OFF_MOON,
      blurb:
        'The second-brightest star in the night sky. It lies too far south to rise over Tbilisi ' +
        'at all.',
    },
    { resolveArcsec: null, magnitude: canopus.mag, sizeArcmin: null },
  ),

  // Deep sky.
  authorCard(
    {
      designation: 'M42', name: 'Orion Nebula', objectType: 'emission nebula', rarity: 'common',
      targetId: 'm42', catalogRef: 'M42 (NGC 1976)',
      raHours: m42.raHours, decDeg: m42.decDeg, ...OFF_MOON,
      blurb:
        'The nearest large nursery of stars, about 1,350 light-years away. The four stars of the ' +
        'Trapezium at its heart light the gas around them.',
    },
    m42.optics,
  ),
  authorCard(
    {
      designation: 'M13', name: 'Hercules Cluster', objectType: 'globular cluster', rarity: 'common',
      targetId: 'm13', catalogRef: 'M13 (NGC 6205)',
      raHours: m13.raHours, decDeg: m13.decDeg, ...OFF_MOON,
      blurb:
        'Several hundred thousand old stars in a ball about 150 light-years wide, 22,000 ' +
        'light-years away. In 1974 the Arecibo radio message was sent in its direction.',
    },
    m13.optics,
  ),
  authorCard(
    {
      designation: 'M57', name: 'Ring Nebula', objectType: 'planetary nebula', rarity: 'epic',
      targetId: 'm57', catalogRef: 'M57 (NGC 6720)',
      raHours: m57.raHours, decDeg: m57.decDeg, ...OFF_MOON,
      blurb:
        'The outer layers of a dying star, blown off and lit by the white dwarf left at the centre. ' +
        'Small and bright enough to hold its shape under a city sky.',
    },
    m57.optics,
  ),
  authorCard(
    {
      designation: 'M101', name: 'Pinwheel Galaxy', objectType: 'spiral galaxy', rarity: 'epic',
      targetId: 'm101', catalogRef: 'M101 (NGC 5457)',
      raHours: m101.raHours, decDeg: m101.decDeg, ...OFF_MOON,
      blurb:
        'A spiral seen face-on, 21 million light-years away. Its light is spread so thin that a ' +
        'city sky swallows the arms; it needs a dark site and hours of exposure.',
    },
    m101.optics,
  ),
  authorCard(
    {
      designation: 'NGC5139', name: 'Omega Centauri', objectType: 'globular cluster', rarity: 'epic',
      targetId: 'ngc5139', catalogRef: 'NGC 5139 (Harris 2010)',
      // 13h 26m 47.2s, −47° 28′ 46″.
      raHours: 13.4465, decDeg: -47.4795, ...OFF_MOON,
      blurb:
        'The largest globular cluster of the Milky Way, some ten million stars, 17,000 light-years ' +
        'away. From Tbilisi it grazes the southern horizon, under a degree up at best.',
    },
    { resolveArcsec: null, magnitude: 3.9, sizeArcmin: { major: 36, minor: 36 } },
  ),
];

export const SET_001_CARD_BY_DESIGNATION = new Map(SET_001_CARDS.map((c) => [c.seed.designation, c]));
