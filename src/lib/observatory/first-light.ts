/**
 * First Light — the sky on a particular night, for a particular person.
 *
 * A grandparent chooses an object and a birthday, and what comes back is a
 * poster. The trap in that idea is that a promise pinned to an exact date is a
 * promise the weather can break: a past date cannot be photographed at all, and
 * a future one may be solid cloud on the night that matters.
 *
 * So a First Light poster carries **two true things, each with its own date**:
 *
 *   1. The sky computed for the exact moment and place. Moon phase, what was
 *      above the horizon, where the chosen object stood. This half is exact,
 *      needs no telescope, and is never wrong.
 *   2. A real photograph of that object, carrying *its own* night, instrument
 *      and operator — taken whenever the sky allowed it.
 *
 * The second date is not an apology. *Saturn, photographed from Tbilisi on 14
 * March, the first clear sky after Nino turned seven* is a better sentence than
 * a fabricated one, and a real telescope waiting for weather is the brand.
 *
 * docs/stellar-v2-plan.md §5.3. This module is pure.
 */

import { Body, Equator, Horizon, Illumination, MoonPhase, Observer } from 'astronomy-engine';
import { getSunAltitude } from '@/lib/dark-window';
import { DEFAULT_OBSERVER } from '@/lib/observer-location';
import { SIM_TARGET_BY_ID, type SimTarget } from './sim-targets';

export type FirstLightTier = 'digital' | 'print' | 'framed';

export const FIRST_LIGHT_TIERS: Record<
  FirstLightTier,
  { label: string; priceTetri: number; note: string }
> = {
  digital: { label: 'Digital file', priceTetri: 6000, note: 'Delivered as a file, to print or keep.' },
  print: { label: 'A3 print', priceTetri: 14000, note: 'Printed in Tbilisi and posted.' },
  framed: { label: 'A3 framed', priceTetri: 22000, note: 'Framed in Tbilisi, collected or couriered.' },
};

/**
 * Photographed for this order rather than taken from what the network already
 * has. Costs what a deep-sky capture request costs, because that is exactly
 * what it becomes.
 */
export const COMMISSION_TETRI = 8000;

export function priceTetriFor(tier: FirstLightTier, commissioned: boolean): number {
  return FIRST_LIGHT_TIERS[tier].priceTetri + (commissioned ? COMMISSION_TETRI : 0);
}

/**
 * Where the person was.
 *
 * Across Georgia the sky barely differs — a couple of degrees of altitude, and
 * the Moon's phase is the same everywhere on Earth — so this list is mostly
 * about the sentence on the poster rather than the arithmetic behind it. It
 * says a true thing either way.
 */
export const BIRTH_PLACES = [
  { id: 'tbilisi', name: 'Tbilisi', lat: DEFAULT_OBSERVER.lat, lon: DEFAULT_OBSERVER.lon },
  { id: 'batumi', name: 'Batumi', lat: 41.6168, lon: 41.6367 },
  { id: 'kutaisi', name: 'Kutaisi', lat: 42.2662, lon: 42.7180 },
  { id: 'rustavi', name: 'Rustavi', lat: 41.5495, lon: 45.0 },
  { id: 'zugdidi', name: 'Zugdidi', lat: 42.5088, lon: 41.8709 },
  { id: 'gori', name: 'Gori', lat: 41.9847, lon: 44.1164 },
  { id: 'telavi', name: 'Telavi', lat: 41.9197, lon: 45.4731 },
  { id: 'poti', name: 'Poti', lat: 42.1462, lon: 41.6714 },
] as const;

export type BirthPlace = (typeof BIRTH_PLACES)[number];

export function placeById(id: string): BirthPlace | null {
  return BIRTH_PLACES.find((p) => p.id === id) ?? null;
}

export type SkyBody = {
  key: string;
  name: string;
  altitude: number;
  azimuth: number;
  /** Above the horizon at that moment, and therefore actually in the sky. */
  up: boolean;
};

export type SkyMoment = {
  at: string;
  place: BirthPlace;
  moon: {
    /** 0-360°, the Moon's elongation from the Sun. */
    angle: number;
    /** 0-1, the lit fraction of the disc. */
    illumination: number;
    phase: string;
    altitude: number;
    up: boolean;
  };
  /** Everything a naked eye could have found, whether or not it was up. */
  bodies: SkyBody[];
  /** Where the chosen object stood. Null when it is not a body we can place. */
  target: SkyBody | null;
};

const NAMED_BODIES: { key: string; name: string; body: Body }[] = [
  { key: 'mercury', name: 'Mercury', body: Body.Mercury },
  { key: 'venus', name: 'Venus', body: Body.Venus },
  { key: 'mars', name: 'Mars', body: Body.Mars },
  { key: 'jupiter', name: 'Jupiter', body: Body.Jupiter },
  { key: 'saturn', name: 'Saturn', body: Body.Saturn },
];

/**
 * The Moon's phase in the words people use.
 *
 * Named by elongation rather than by illuminated fraction, because a half-lit
 * disc is either first quarter or last quarter and the fraction alone cannot
 * tell them apart.
 */
export function moonPhaseName(angleDeg: number): string {
  const a = ((angleDeg % 360) + 360) % 360;
  if (a < 11.25 || a >= 348.75) return 'New Moon';
  if (a < 78.75) return 'Waxing Crescent';
  if (a < 101.25) return 'First Quarter';
  if (a < 168.75) return 'Waxing Gibbous';
  if (a < 191.25) return 'Full Moon';
  if (a < 258.75) return 'Waning Gibbous';
  if (a < 281.25) return 'Last Quarter';
  return 'Waning Crescent';
}

/** The sky over one place at one instant. Exact, and the half no weather can spoil. */
export function skyAt(input: { place: BirthPlace; at: Date; targetId?: string }): SkyMoment {
  const { place, at } = input;
  const observer = new Observer(place.lat, place.lon, 0);

  const moonAngle = MoonPhase(at);
  const moonHorizon = horizonOf(Body.Moon, at, observer);
  const illumination = safeIllumination(at);

  const bodies: SkyBody[] = [];
  for (const { key, name, body } of NAMED_BODIES) {
    const h = horizonOf(body, at, observer);
    if (!h) continue;
    bodies.push({ key, name, altitude: h.altitude, azimuth: h.azimuth, up: h.altitude > 0 });
  }

  return {
    at: at.toISOString(),
    place,
    moon: {
      angle: moonAngle,
      illumination,
      phase: moonPhaseName(moonAngle),
      altitude: moonHorizon?.altitude ?? 0,
      up: (moonHorizon?.altitude ?? -1) > 0,
    },
    bodies,
    target: input.targetId ? placeTarget(input.targetId, at, observer) : null,
  };
}

function placeTarget(targetId: string, at: Date, observer: Observer): SkyBody | null {
  const target = SIM_TARGET_BY_ID.get(targetId);
  if (!target) return null;

  const horizon = target.kind === 'fixed' ? fixedHorizon(target, at, observer) : bodyHorizon(target, at, observer);
  if (!horizon) return null;

  return {
    key: target.id,
    name: target.name,
    altitude: horizon.altitude,
    azimuth: horizon.azimuth,
    up: horizon.altitude > 0,
  };
}

function fixedHorizon(target: SimTarget, at: Date, observer: Observer) {
  if (target.ra === undefined || target.dec === undefined) return null;
  try {
    return Horizon(at, observer, target.ra, target.dec, 'normal');
  } catch {
    return null;
  }
}

const TARGET_BODIES: Partial<Record<string, Body>> = {
  moon: Body.Moon,
  venus: Body.Venus,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
};

function bodyHorizon(target: SimTarget, at: Date, observer: Observer) {
  const body = TARGET_BODIES[target.id];
  return body ? horizonOf(body, at, observer) : null;
}

function horizonOf(body: Body, at: Date, observer: Observer) {
  try {
    const eq = Equator(body, at, observer, true, true);
    return Horizon(at, observer, eq.ra, eq.dec, 'normal');
  } catch {
    return null;
  }
}

function safeIllumination(at: Date): number {
  try {
    return Illumination(Body.Moon, at).phase_fraction;
  } catch {
    return 0;
  }
}

/** The compass point an azimuth falls in, for a caption rather than a chart. */
export function compassPoint(azimuthDeg: number): string {
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const a = ((azimuthDeg % 360) + 360) % 360;
  return points[Math.round(a / 45) % 8];
}

/**
 * When, on that date, the object stood highest.
 *
 * A birthday is a date, not an hour, and someone picking one has no idea
 * whether Saturn was up at nine in the evening. Without this the product
 * quietly produces sheets that read "below the horizon", which is true and
 * useless. Sampled every quarter hour across the whole day, so it works for a
 * target that culminates at four in the morning as readily as one at dusk.
 *
 * Above the horizon is not enough: Orion is up all through a June afternoon
 * from Georgia, and an hour that suggested photographing it at half past noon
 * would be arithmetically true and completely useless. The hour has to be dark
 * as well, so the Sun must be at least 6° down.
 *
 * Null when no such hour exists — some things are simply not in the night sky
 * from here in some seasons, and saying so is better than offering an hour that
 * would not have worked either.
 */
const DARK_ENOUGH_DEG = -6

export function bestMomentOn(input: {
  place: BirthPlace
  /** Any instant on the date in question; only the UTC calendar day is used. */
  date: Date
  targetId: string
}): { at: Date; altitude: number } | null {
  const day = new Date(
    Date.UTC(
      input.date.getUTCFullYear(),
      input.date.getUTCMonth(),
      input.date.getUTCDate(),
      0,
      0,
      0,
    ),
  )

  let best: { at: Date; altitude: number } | null = null
  for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
    const at = new Date(day.getTime() + minutes * 60_000)
    const sky = skyAt({ place: input.place, at, targetId: input.targetId })
    if (!sky.target) return null
    if (!sky.target.up) continue
    if (getSunAltitude(input.place.lat, input.place.lon, at) > DARK_ENOUGH_DEG) continue
    if (!best || sky.target.altitude > best.altitude) {
      best = { at, altitude: sky.target.altitude }
    }
  }

  return best
}
