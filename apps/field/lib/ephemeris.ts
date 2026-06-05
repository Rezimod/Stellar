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

export type DsoPosition = {
  altitude: number;
  azimuth: number;
  azimuthDir: string;
  aboveHorizon: boolean;
  daylight: boolean;
  observable: boolean;
};

/** Live alt/az for a fixed RA(hours)/Dec(deg) catalog object — deep-sky or star. */
export function getDsoPosition(ra: number, dec: number, lat: number, lon: number, date = new Date()): DsoPosition {
  const observer = new Observer(lat, lon, 0);
  const horiz = Horizon(date, observer, ra, dec, 'normal');
  const sunAlt = sunAltitude(lat, lon, date);
  const daylight = sunAlt > -6;
  const aboveHorizon = horiz.altitude > 0;
  return {
    altitude: Math.round(horiz.altitude * 10) / 10,
    azimuth: Math.round(horiz.azimuth),
    azimuthDir: azDir(horiz.azimuth),
    aboveHorizon,
    daylight,
    observable: aboveHorizon && !daylight,
  };
}

const PHASE_NAMES = [
  'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
  'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent',
];
function moonPhaseName(deg: number): string {
  return PHASE_NAMES[Math.round(deg / 45) % 8];
}

export type MoonConditions = {
  altitude: number;
  azimuthDir: string;
  aboveHorizon: boolean;
  /** Illuminated fraction, 0–100%. */
  illumination: number;
  phaseName: string;
  /** How much the Moon washes out faint deep-sky targets right now. */
  interference: 'none' | 'low' | 'moderate' | 'high';
};

/** Moon brightness + position → how much it interferes with faint-object observing now. */
export function getMoonConditions(lat: number, lon: number, date = new Date()): MoonConditions {
  const p = getBodyPosition('moon', lat, lon, date);
  const deg = (((MoonPhase(date) % 360) + 360) % 360);
  const illumination = Math.round(((1 - Math.cos((deg * Math.PI) / 180)) / 2) * 100);
  const aboveHorizon = p?.aboveHorizon ?? false;
  let interference: MoonConditions['interference'];
  if (!aboveHorizon) interference = 'none';
  else if (illumination < 25) interference = 'low';
  else if (illumination < 55) interference = 'moderate';
  else interference = 'high';
  return {
    altitude: p?.altitude ?? 0,
    azimuthDir: p?.azimuthDir ?? '—',
    aboveHorizon,
    illumination,
    phaseName: moonPhaseName(deg),
    interference,
  };
}

export type DarkWindow = {
  isDarkNow: boolean;
  /** ISO time astronomical darkness (Sun < −18°) begins, or null if already dark / never. */
  darkStart: string | null;
  /** ISO time darkness ends (dawn), or null. */
  darkEnd: string | null;
  sunAltitude: number;
};

/** Tonight's astronomical-dark window (Sun below −18°), sampled over the next 24h. */
export function getDarkWindow(lat: number, lon: number, date = new Date()): DarkWindow {
  const DARK = -18;
  const STEP = 15 * 60 * 1000;
  const nowAlt = sunAltitude(lat, lon, date);
  const isDarkNow = nowAlt < DARK;
  let darkStart: Date | null = isDarkNow ? date : null;
  let darkEnd: Date | null = null;
  let started = isDarkNow;
  for (let i = 1; i <= 96; i += 1) {
    const t = new Date(date.getTime() + i * STEP);
    const a = sunAltitude(lat, lon, t);
    if (!started && a < DARK) {
      darkStart = t;
      started = true;
    } else if (started && a >= DARK) {
      darkEnd = t;
      break;
    }
  }
  return {
    isDarkNow,
    darkStart: darkStart ? darkStart.toISOString() : null,
    darkEnd: darkEnd ? darkEnd.toISOString() : null,
    sunAltitude: Math.round(nowAlt * 10) / 10,
  };
}

/** Everything currently above the horizon, brightest/highest first (excludes the Sun). */
export function getVisibleNow(lat: number, lon: number, date = new Date()): BodyPosition[] {
  return Object.keys(BODIES)
    .map((name) => getBodyPosition(name, lat, lon, date))
    .filter((p): p is BodyPosition => p !== null && p.aboveHorizon && p.name !== 'Sun')
    .sort((a, b) => b.altitude - a.altitude);
}

export type TonightTargets = {
  /** ISO time the targets are computed for (dark-window start), or null if already dark. */
  fromTime: string | null;
  alreadyDark: boolean;
  bodies: { name: string; altitude: number; direction: string; magnitude: number }[];
};

/**
 * What's worth pointing a telescope at *tonight* — bodies above the horizon once
 * the sky is actually dark (computed at the astronomical-dark start, not "now").
 * This is what a "best target tonight" question really means.
 */
export function getTonightTargets(lat: number, lon: number, date = new Date()): TonightTargets {
  const dw = getDarkWindow(lat, lon, date);
  const at = dw.isDarkNow ? date : dw.darkStart ? new Date(dw.darkStart) : date;
  const list = getVisibleNow(lat, lon, at);
  return {
    fromTime: dw.isDarkNow ? null : dw.darkStart,
    alreadyDark: dw.isDarkNow,
    bodies: list.slice(0, 6).map((b) => ({ name: b.name, altitude: b.altitude, direction: b.azimuthDir, magnitude: b.magnitude })),
  };
}

export const SUPPORTED_BODIES = Object.keys(BODIES);
