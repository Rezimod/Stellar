// "Up Now?" daily game — pure, server-safe sky geometry. No React, no fetch.
//
// 12 rounds/day: 4 solar system + 4 bright stars + 4 deep-sky objects, the
// same 12 ids worldwide for a given UTC date (seeded by date only — never by
// location). Every round asks: is this object above the horizon right now,
// from the player's coordinates? Pure altitude > 0, nothing else. Deep-sky
// rounds additionally show the object's real photo and ask the player to
// identify it first (getIdentifyChoices) — purely a bonus/educational layer,
// scored client-side only; it never touches the Stars payout.
//
// RA/Dec for stars and deep-sky objects is reused from the existing sky
// catalogs wherever it already exists (BRIGHT_STARS, CATALOG_BY_ID,
// DEEP_SKY_TARGETS) — only genuinely missing objects get a new literal here.

import {
  Body, Observer, Equator, Horizon, SearchRiseSet,
} from 'astronomy-engine';
import { CATALOG_BY_ID, raDecToAzAlt, computeRiseSet } from '@/lib/sky/catalog';
import { BRIGHT_STARS } from '@/lib/sky/stars';
import { DEEP_SKY_TARGETS } from '@/lib/sky-chart';

export const UP_NOW_ROUNDS_PER_DAY = 12;
export const UP_NOW_STARS_BASE = 10;
export const UP_NOW_STARS_STREAK_BONUS = 15;
export const UP_NOW_STREAK_BONUS_THRESHOLD = 7;

export type UpNowBucket = 'solar' | 'star' | 'deepsky';
export type UpNowSubtype =
  | 'sun' | 'moon' | 'planet'
  | 'star'
  | 'nebula' | 'cluster' | 'galaxy';

const SOLAR_IDS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'] as const;

const STAR_IDS = [
  'sirius', 'vega', 'deneb', 'altair', 'arcturus', 'capella', 'rigel',
  'betelgeuse', 'aldebaran', 'antares', 'spica', 'regulus', 'procyon',
  'polaris', 'fomalhaut', 'castor', 'pollux',
] as const;

// Restricted to objects with a real astrophoto on disk (public/images/dso) —
// every deep-sky round shows the actual photo and asks the player to
// identify it before asking whether it's up. No object without a real photo
// enters this bucket, so the identify step never has to fall back to text.
const DEEPSKY_IDS = ['m42', 'm45', 'm31', 'm13', 'm57', 'm51', 'm8', 'm1', 'ngc869'] as const;

export const DEEPSKY_PHOTO: Record<string, string> = {
  m42: '/images/dso/m42.jpg',
  m45: '/images/dso/m45.jpg',
  m31: '/images/dso/m31.jpg',
  m13: '/images/dso/m13-cluster.jpg',
  m57: '/images/dso/m57-ring.jpg',
  m51: '/images/dso/m51.jpg',
  m8: '/images/dso/m8.jpg',
  m1: '/images/dso/m1.jpg',
  ngc869: '/images/dso/ngc869.jpg',
};

export const UP_NOW_BUCKET: Record<string, UpNowBucket> = Object.fromEntries([
  ...SOLAR_IDS.map((id) => [id, 'solar' as const]),
  ...STAR_IDS.map((id) => [id, 'star' as const]),
  ...DEEPSKY_IDS.map((id) => [id, 'deepsky' as const]),
]);

export const UP_NOW_SUBTYPE: Record<string, UpNowSubtype> = {
  sun: 'sun',
  moon: 'moon',
  mercury: 'planet', venus: 'planet', mars: 'planet', jupiter: 'planet',
  saturn: 'planet', uranus: 'planet', neptune: 'planet',
  ...Object.fromEntries(STAR_IDS.map((id) => [id, 'star' as const])),
  m42: 'nebula', m45: 'cluster', m31: 'galaxy', m13: 'cluster',
  m57: 'nebula', m51: 'galaxy', m8: 'nebula', m1: 'nebula', ngc869: 'cluster',
};

const SOLAR_BODY: Partial<Record<string, Body>> = {
  sun: Body.Sun, moon: Body.Moon, mercury: Body.Mercury, venus: Body.Venus,
  mars: Body.Mars, jupiter: Body.Jupiter, saturn: Body.Saturn,
  uranus: Body.Uranus, neptune: Body.Neptune,
};

interface FixedCoords { ra: number; dec: number }

// Deep-sky objects with no RA/Dec anywhere else in the repo. Standard
// published J2000 values (arcminute precision — far tighter than an
// altitude-above/below game needs).
const NEW_DEEPSKY_COORDS: Record<string, FixedCoords> = {
  m13: { ra: 16.694, dec: 36.460 },    // Hercules Cluster
  m51: { ra: 13.498, dec: 47.195 },    // Whirlpool Galaxy
  ngc869: { ra: 2.345, dec: 57.133 },  // Double Cluster (NGC 869/884 midpoint)
  m8: { ra: 18.063, dec: -24.383 },    // Lagoon Nebula
};

const BRIGHT_STAR_BY_ID = new Map(BRIGHT_STARS.map((s) => [s.id, s]));

function fixedCoordsFor(id: string): FixedCoords | null {
  const star = BRIGHT_STAR_BY_ID.get(id);
  if (star) return { ra: star.ra, dec: star.dec };
  const catalogEntry = CATALOG_BY_ID.get(id);
  if (catalogEntry) return { ra: catalogEntry.ra, dec: catalogEntry.dec };
  if (id === 'm45') return { ra: DEEP_SKY_TARGETS.pleiades.raHours, dec: DEEP_SKY_TARGETS.pleiades.decDeg };
  if (id === 'm1') return { ra: DEEP_SKY_TARGETS.crab.raHours, dec: DEEP_SKY_TARGETS.crab.decDeg };
  const added = NEW_DEEPSKY_COORDS[id];
  if (added) return added;
  return null;
}

/** xmur3-style string hash → 32-bit seed. */
function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** mulberry32 — deterministic PRNG from a 32-bit seed. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleWithoutReplacement<T>(arr: readonly T[], n: number, rng: () => number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && pool.length; i++) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}

/** Deterministic 12-id lineup for a given UTC date ("2026-08-05") — same for
 *  every player worldwide. 4 solar + 4 star + 4 deep-sky, then shuffled. */
export function getDailyObjectIds(utcDateString: string): string[] {
  const rng = mulberry32(hashSeed(utcDateString));
  const picked = [
    ...sampleWithoutReplacement(SOLAR_IDS, 4, rng),
    ...sampleWithoutReplacement(STAR_IDS, 4, rng),
    ...sampleWithoutReplacement(DEEPSKY_IDS, 4, rng),
  ];
  return sampleWithoutReplacement(picked, picked.length, rng);
}

/** Deterministic 4-choice lineup (the correct id + 3 distractors, shuffled)
 *  for a deep-sky identify round — same choices for every player on a given
 *  UTC date, so the round is comparable worldwide like the rest of the day's
 *  puzzle. Seeded off date+objectId so different deep-sky rounds on the same
 *  day don't all draw the same distractors. */
export function getIdentifyChoices(objectId: string, utcDateString: string): string[] {
  const rng = mulberry32(hashSeed(`${utcDateString}:${objectId}`));
  const distractors = sampleWithoutReplacement(
    DEEPSKY_IDS.filter((id) => id !== objectId),
    3,
    rng,
  );
  return sampleWithoutReplacement([objectId, ...distractors], 4, rng);
}

/** Altitude in degrees, or throws for an unknown id — callers control the id
 *  list (getDailyObjectIds), so an unknown id here is a programming error. */
export function computeAltitude(objectId: string, lat: number, lon: number, atDate: Date): number {
  const body = SOLAR_BODY[objectId];
  if (body !== undefined) {
    const observer = new Observer(lat, lon, 0);
    const eq = Equator(body, atDate, observer, true, true);
    return Horizon(atDate, observer, eq.ra, eq.dec, 'normal').altitude;
  }
  const coords = fixedCoordsFor(objectId);
  if (!coords) throw new Error(`up-now: unknown object id "${objectId}"`);
  return raDecToAzAlt(coords.ra, coords.dec, lat, lon, atDate).altitude;
}

export type RiseSetHint =
  | { kind: 'rise'; atIso: string }
  | { kind: 'set'; atIso: string }
  | { kind: 'circumpolarAlways' }
  | { kind: 'circumpolarNever' };

/** Short factual rise/set fact for the review screen. Null (never a guess)
 *  if the geometry can't be resolved for this id/location. */
export function getRiseSetHint(objectId: string, lat: number, lon: number, atDate: Date): RiseSetHint | null {
  try {
    const body = SOLAR_BODY[objectId];
    if (body !== undefined) {
      const observer = new Observer(lat, lon, 0);
      const altitude = computeAltitude(objectId, lat, lon, atDate);
      if (altitude > 0) {
        const set = SearchRiseSet(body, observer, -1, atDate, 2);
        return set ? { kind: 'set', atIso: set.date.toISOString() } : null;
      }
      const rise = SearchRiseSet(body, observer, +1, atDate, 2);
      return rise ? { kind: 'rise', atIso: rise.date.toISOString() } : null;
    }

    const coords = fixedCoordsFor(objectId);
    if (!coords) return null;
    const rs = computeRiseSet(coords.ra, coords.dec, lat, lon, atDate);
    if (rs.circumpolar === 'always') return { kind: 'circumpolarAlways' };
    if (rs.circumpolar === 'never') return { kind: 'circumpolarNever' };
    const altitude = computeAltitude(objectId, lat, lon, atDate);
    if (altitude > 0 && rs.set) return { kind: 'set', atIso: rs.set.toISOString() };
    if (altitude <= 0 && rs.rise) return { kind: 'rise', atIso: rs.rise.toISOString() };
    return null;
  } catch {
    return null;
  }
}
