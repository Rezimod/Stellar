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

export type BodyPosition = {
  name: string;
  altitude: number;
  azimuth: number;
  azimuthDir: string;
  visible: boolean;
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
    visible: horiz.altitude > 0,
    magnitude: Math.round(magnitude * 10) / 10,
    constellation,
    rise: rise ? rise.toISOString() : null,
    set: set ? set.toISOString() : null,
    moonPhase,
  };
}

/** Everything currently above the horizon, brightest/highest first. Excludes the Sun if it's up (daytime). */
export function getVisibleNow(lat: number, lon: number, date = new Date()): BodyPosition[] {
  return Object.keys(BODIES)
    .map((name) => getBodyPosition(name, lat, lon, date))
    .filter((p): p is BodyPosition => p !== null && p.visible && p.name !== 'Sun')
    .sort((a, b) => b.altitude - a.altitude);
}

export const SUPPORTED_BODIES = Object.keys(BODIES);
