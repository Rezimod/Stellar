import { Body, Equator, Horizon, Illumination, Observer } from 'astronomy-engine';
import { STARS } from './star-catalog';
import { precessJ2000ToDate } from './sky/catalog';

/**
 * Canvas convention: a square SVG viewBox "0 0 W H".
 * We project the hemisphere (zenith = center) using a simple stereographic-ish mapping
 * where altitude 90° → center, altitude 0° → outer circle (horizon).
 * Azimuth rotates clockwise from North (top).
 *
 * radiusFrac = 1 - altitude/90  (clamped). Objects below horizon have radiusFrac > 1.
 */
export interface ChartPoint {
  x: number;
  y: number;
  aboveHorizon: boolean;
}

export function projectAltAz(
  altDeg: number,
  azDeg: number,
  cx: number,
  cy: number,
  chartRadius: number,
  minAlt: number = -30
): ChartPoint {
  const altClamped = Math.max(minAlt, Math.min(90, altDeg));
  const r = (1 - altClamped / 90) * chartRadius;
  const azRad = (azDeg * Math.PI) / 180;
  const x = cx + r * Math.sin(azRad);
  const y = cy - r * Math.cos(azRad);
  return { x, y, aboveHorizon: altDeg > 0 };
}

export interface ChartStar extends ChartPoint {
  name?: string;
  mag: number;
  tone: 'hot' | 'warm' | 'cool';
}

export function getChartStars(
  lat: number,
  lon: number,
  date: Date,
  cx: number,
  cy: number,
  chartRadius: number,
  magnitudeCutoff = 3.2
): ChartStar[] {
  const observer = new Observer(lat, lon, 0);
  const out: ChartStar[] = [];

  for (const [raHours, decDeg, mag, name] of STARS) {
    if (mag > magnitudeCutoff) continue;

    try {
      const od = precessJ2000ToDate(raHours, decDeg, date);
      const horiz = Horizon(date, observer, od.raHours, od.decDeg, 'normal');
      if (horiz.altitude < -25) continue;
      const p = projectAltAz(horiz.altitude, horiz.azimuth, cx, cy, chartRadius);
      out.push({
        ...p,
        name,
        mag,
        tone: mag < 1 ? 'warm' : mag < 2 ? 'hot' : 'cool',
      });
    } catch {
      continue;
    }
  }
  return out;
}

export interface ChartPlanet extends ChartPoint {
  key: string;
  altitude: number;
  azimuth: number;
  rise: Date | null;
  transit: Date | null;
  set: Date | null;
  magnitude: number;
}

const PLANET_MISSION_KEYS = ['moon', 'jupiter', 'saturn', 'venus', 'mars', 'mercury'];

export function getChartPlanets(
  lat: number,
  lon: number,
  date: Date,
  cx: number,
  cy: number,
  chartRadius: number
): ChartPlanet[] {
  const observer = new Observer(lat, lon, 0);
  const bodyMap: Record<string, Body> = {
    moon:    Body.Moon,
    mercury: Body.Mercury,
    venus:   Body.Venus,
    mars:    Body.Mars,
    jupiter: Body.Jupiter,
    saturn:  Body.Saturn,
  };
  const out: ChartPlanet[] = [];

  for (const key of PLANET_MISSION_KEYS) {
    const body = bodyMap[key];
    if (!body) continue;
    try {
      const eq = Equator(body, date, observer, true, true);
      const horiz = Horizon(date, observer, eq.ra, eq.dec, 'normal');
      const p = projectAltAz(horiz.altitude, horiz.azimuth, cx, cy, chartRadius, -8);
      let magnitude = 99;
      try { magnitude = Illumination(body, date).mag; } catch { /* ignore */ }
      out.push({
        ...p,
        key,
        altitude: horiz.altitude,
        azimuth: horiz.azimuth,
        rise: null,
        transit: null,
        set: null,
        magnitude,
      });
    } catch { continue; }
  }
  return out;
}

export const DEEP_SKY_TARGETS: Record<string, { raHours: number; decDeg: number }> = {
  pleiades:  { raHours: 3.79,  decDeg: 24.12 },
  orion:     { raHours: 5.59,  decDeg: -5.39 },
  andromeda: { raHours: 0.71,  decDeg: 41.27 },
  crab:      { raHours: 5.58,  decDeg: 22.01 },
};

export interface ChartDeepSky extends ChartPoint {
  id: string;
  altitude: number;
  azimuth: number;
  magnitude?: number;
}

const DEEP_SKY_MAG: Record<string, number> = {
  pleiades:  1.6,
  orion:     4.0,
  andromeda: 3.4,
  crab:      8.4,
};

export function getChartDeepSky(
  lat: number,
  lon: number,
  date: Date,
  cx: number,
  cy: number,
  chartRadius: number
): ChartDeepSky[] {
  const observer = new Observer(lat, lon, 0);
  const out: ChartDeepSky[] = [];
  for (const [id, coord] of Object.entries(DEEP_SKY_TARGETS)) {
    try {
      const od = precessJ2000ToDate(coord.raHours, coord.decDeg, date);
      const horiz = Horizon(date, observer, od.raHours, od.decDeg, 'normal');
      const p = projectAltAz(horiz.altitude, horiz.azimuth, cx, cy, chartRadius, -8);
      out.push({ ...p, id, altitude: horiz.altitude, azimuth: horiz.azimuth, magnitude: DEEP_SKY_MAG[id] });
    } catch { continue; }
  }
  return out;
}
