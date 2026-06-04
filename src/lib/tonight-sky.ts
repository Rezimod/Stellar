import { Body, Illumination } from 'astronomy-engine';
import { getVisiblePlanets, type PlanetInfo } from '@/lib/planets';
import { getTonightDarkWindow } from '@/lib/dark-window';
import { calculateSkyScore, type SkyScoreResult } from '@/lib/sky-score';
import { fetchOpenMeteo } from '@/lib/open-meteo';
import { getUpcomingEvents, type AstroEvent } from '@/lib/astro-events';
import { activeMeteorShower, type ActiveShower } from '@/lib/meteor-showers';

/**
 * getTonightSky — the single source of truth for "what's the sky doing here, now".
 *
 * Home, /sky, the Finder, Missions and ASTRA all read this one superset so the
 * planet positions, dark window, moon and observability score are computed once
 * and agree everywhere. Each surface picks the fields it needs from the payload;
 * none re-derives the astronomy. The legacy /api/sky/{finder,timeline,targets,
 * tonight} routes are migrated onto this as they are touched.
 */

export interface TonightSkyMoon {
  /** Synodic phase 0–1 (0 = new, 0.5 = full, 1 = next new). */
  phase: number | null;
  /** Illuminated fraction, 0–100 %. */
  illumination: number;
  phaseName: string;
  altitude: number;
  azimuth: number;
  azimuthDir: string;
  rise: string | null;
  set: string | null;
  visible: boolean;
}

export interface TonightSkyTarget {
  key: string;
  name: string;
  altitude: number;
  azimuth: number;
  azimuthDir: string;
  magnitude: number;
  /** Human placement, e.g. "high in the southeast" — drives the Home hero line. */
  placement: string;
}

export interface TonightSky {
  observer: { lat: number; lon: number; at: string };
  score: SkyScoreResult;
  /** True when live weather couldn't be fetched and the score used neutral inputs. */
  scoreStale: boolean;
  moon: TonightSkyMoon | null;
  /** Visible planets (excludes the Moon), sorted by altitude descending. */
  planets: PlanetInfo[];
  /** The single best thing to point at right now, or null if nothing is up. */
  bestTarget: TonightSkyTarget | null;
  darkWindow: { start: string; end: string; isCurrentlyDark: boolean } | null;
  events: AstroEvent[];
  meteorShower: ActiveShower | null;
}

const DIR_LONG: Record<string, string> = {
  N: 'north', NE: 'northeast', E: 'east', SE: 'southeast',
  S: 'south', SW: 'southwest', W: 'west', NW: 'northwest',
};

function placementText(altitude: number, azimuthDir: string): string {
  const dir = DIR_LONG[azimuthDir] ?? azimuthDir.toLowerCase();
  const height = altitude >= 50 ? 'high' : altitude >= 25 ? 'well placed' : 'low';
  return `${height} in the ${dir}`;
}

function toTarget(p: PlanetInfo): TonightSkyTarget {
  return {
    key: p.key,
    name: p.name,
    altitude: p.altitude,
    azimuth: p.azimuth,
    azimuthDir: p.azimuthDir,
    magnitude: p.magnitude,
    placement: placementText(p.altitude, p.azimuthDir),
  };
}

function moonPhaseName(phase: number | null | undefined): string {
  if (phase == null) return 'Moon';
  if (phase < 0.03 || phase > 0.97) return 'New Moon';
  if (phase < 0.22) return 'Waxing Crescent';
  if (phase < 0.28) return 'First Quarter';
  if (phase < 0.47) return 'Waxing Gibbous';
  if (phase < 0.53) return 'Full Moon';
  if (phase < 0.72) return 'Waning Gibbous';
  if (phase < 0.78) return 'Last Quarter';
  return 'Waning Crescent';
}

function toIso(d: Date | string | null): string | null {
  if (d == null) return null;
  const dt = typeof d === 'string' ? new Date(d) : d;
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
}

async function fetchScore(
  lat: number,
  lon: number,
  moonIllumination: number | undefined,
): Promise<{ score: SkyScoreResult; stale: boolean }> {
  // Neutral inputs so the score always has a real shape even offline.
  let cloudCover = 30;
  let visibility = 20000;
  let humidity = 50;
  let windSpeed = 5;
  let stale = true;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=cloud_cover,visibility,relative_humidity_2m,wind_speed_10m&timezone=auto`;
    const { data } = await fetchOpenMeteo<{ current: Record<string, number> }>(url, { revalidate: 300 });
    const c = data.current;
    cloudCover = c.cloud_cover ?? cloudCover;
    visibility = c.visibility ?? visibility;
    humidity = c.relative_humidity_2m ?? humidity;
    windSpeed = c.wind_speed_10m ?? windSpeed;
    stale = false;
  } catch {
    // keep neutral inputs, mark stale
  }

  return {
    score: calculateSkyScore({ cloudCover, visibility, humidity, windSpeed, moonIllumination }),
    stale,
  };
}

export async function getTonightSky(
  lat: number,
  lon: number,
  at: Date = new Date(),
): Promise<TonightSky> {
  const dark = getTonightDarkWindow(lat, lon, at);
  // Sample planets at the most representative moment of tonight (inside the
  // dark window if we're already in it, otherwise its midpoint).
  const sampleAt = dark.evalTime;
  const all = getVisiblePlanets(lat, lon, sampleAt);

  const moonRow = all.find((p) => p.key === 'moon') ?? null;
  let moonIllumination: number | undefined;
  try {
    moonIllumination = Math.round(Illumination(Body.Moon, at).phase_fraction * 100);
  } catch {
    moonIllumination = undefined;
  }

  const moon: TonightSkyMoon | null = moonRow
    ? {
        phase: moonRow.phase ?? null,
        illumination: moonIllumination ?? Math.round((moonRow.phase ?? 0) <= 0.5
          ? (moonRow.phase ?? 0) * 200
          : (1 - (moonRow.phase ?? 0)) * 200),
        phaseName: moonPhaseName(moonRow.phase),
        altitude: moonRow.altitude,
        azimuth: moonRow.azimuth,
        azimuthDir: moonRow.azimuthDir,
        rise: toIso(moonRow.rise),
        set: toIso(moonRow.set),
        visible: moonRow.visible,
      }
    : null;

  const planets = all
    .filter((p) => p.key !== 'moon' && p.visible)
    .sort((a, b) => b.altitude - a.altitude);

  // Best thing to point at right now: the highest planet that's comfortably up,
  // else the Moon when it's the only naked-eye target above the horizon.
  const topPlanet = planets.find((p) => p.altitude > 10);
  const bestTarget: TonightSkyTarget | null = topPlanet
    ? toTarget(topPlanet)
    : moonRow && moonRow.visible && moonRow.altitude > 0
      ? toTarget(moonRow)
      : null;

  const { score, stale } = await fetchScore(lat, lon, moonIllumination);

  return {
    observer: { lat, lon, at: at.toISOString() },
    score,
    scoreStale: stale,
    moon,
    planets,
    bestTarget,
    darkWindow:
      dark.duskStart && dark.dawnEnd
        ? {
            start: dark.duskStart.toISOString(),
            end: dark.dawnEnd.toISOString(),
            isCurrentlyDark: dark.isCurrentlyDark,
          }
        : null,
    events: getUpcomingEvents(at, 30).slice(0, 5),
    meteorShower: activeMeteorShower(at),
  };
}
