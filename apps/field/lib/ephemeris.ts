import {
  Body,
  Observer,
  Equator,
  Horizon,
  Illumination,
  MoonPhase,
  SearchRiseSet,
  Constellation,
} from 'astronomy-engine';

/**
 * Local ephemeris — pure on-device computation, zero network. This is what the
 * offline tool-calling agent calls to answer "is Saturn up right now?" at a
 * dark-sky site with no signal. No cloud, no API key, deterministic.
 */

const BODIES: Record<string, Body> = {
  sun: Body.Sun,
  moon: Body.Moon,
  mercury: Body.Mercury,
  venus: Body.Venus,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
  uranus: Body.Uranus,
  neptune: Body.Neptune,
};

const AZ_DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
function azDir(az: number): string {
  return AZ_DIRS[Math.round(az / 45) % 8];
}

/** Sun altitude in degrees — drives the daylight/observable check. */
export function sunAltitude(lat: number, lon: number, date = new Date()): number {
  const observer = new Observer(lat, lon, 0);
  const eq = Equator(Body.Sun, date, observer, true, true);
  return Horizon(date, observer, eq.ra, eq.dec, 'normal').altitude;
}

export type BodyPosition = {
  name: string;
  altitude: number;
  azimuth: number;
  azimuthDir: string;
  /** Geometrically above the horizon (altitude > 0). */
  aboveHorizon: boolean;
  /** Sky is dark enough to actually observe (Sun below civil twilight). */
  daylight: boolean;
  /** Practically viewable now: above the horizon AND not daylight. */
  observable: boolean;
  magnitude: number;
  constellation: string | null;
  rise: string | null;
  set: string | null;
  moonPhase: number | null;
};

function resolveBody(name: string): { key: string; body: Body } | null {
  const key = name.trim().toLowerCase();
  if (key in BODIES) return { key, body: BODIES[key] };
  return null;
}

export function getBodyPosition(name: string, lat: number, lon: number, date = new Date()): BodyPosition | null {
  const resolved = resolveBody(name);
  if (!resolved) return null;
  const { key, body } = resolved;
  const observer = new Observer(lat, lon, 0);

  const eq = Equator(body, date, observer, true, true);
  const horiz = Horizon(date, observer, eq.ra, eq.dec, 'normal');

  // Daylight check: the Sun above civil twilight (−6°) washes the sky out.
  const sunAlt = sunAltitude(lat, lon, date);
  const daylight = sunAlt > -6;
  const aboveHorizon = horiz.altitude > 0;

  let magnitude = 0;
  try { magnitude = Illumination(body, date).mag; } catch { /* Sun has no Illumination */ }

  let rise: Date | null = null;
  let set: Date | null = null;
  try { rise = SearchRiseSet(body, observer, +1, date, 1)?.date ?? null; } catch { /* circumpolar / never rises */ }
  try { set = SearchRiseSet(body, observer, -1, date, 1)?.date ?? null; } catch { /* circumpolar / never sets */ }

  let constellation: string | null = null;
  try { constellation = Constellation(eq.ra, eq.dec)?.name ?? null; } catch { /* ignore */ }

  let moonPhase: number | null = null;
  if (key === 'moon') {
    try { moonPhase = Math.round(((MoonPhase(date) % 360) / 360) * 100) / 100; } catch { /* ignore */ }
  }

  return {
    name: key.charAt(0).toUpperCase() + key.slice(1),
    altitude: Math.round(horiz.altitude * 10) / 10,
    azimuth: Math.round(horiz.azimuth),
    azimuthDir: azDir(horiz.azimuth),
    aboveHorizon,
    daylight,
    observable: aboveHorizon && !daylight,
    magnitude: Math.round(magnitude * 10) / 10,
    constellation,
    rise: rise ? rise.toISOString() : null,
    set: set ? set.toISOString() : null,
    moonPhase,
  };
}

/** Everything currently above the horizon, brightest/highest first (excludes the Sun). */
export function getVisibleNow(lat: number, lon: number, date = new Date()): BodyPosition[] {
  return Object.keys(BODIES)
    .map((name) => getBodyPosition(name, lat, lon, date))
    .filter((p): p is BodyPosition => p !== null && p.aboveHorizon && p.name !== 'Sun')
    .sort((a, b) => b.altitude - a.altitude);
}

export const SUPPORTED_BODIES = Object.keys(BODIES);
