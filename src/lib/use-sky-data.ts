'use client';

import { useEffect, useState, useCallback } from 'react';
import { MoonPhase } from 'astronomy-engine';
import { getTonightDarkWindow } from '@/lib/dark-window';

export interface PlanetData {
  name: string;
  altitude: number;
  azimuth: number;
  magnitude: number;
  riseTime: string | null;
  setTime: string | null;
  transitTime: string | null;
  visible: boolean;
}

export interface ObservableObject {
  name: string;
  color: string;
  visibleStart: string;
  visibleEnd: string;
  peakAt: string;
  peakAlt: number;
  peakAzimuth: number;
}

export interface DarkWindow {
  start: string;
  end: string;
}

export interface TimelinePayload {
  darkWindow: DarkWindow | null;
  objects: ObservableObject[];
  excludedCount: number;
}

export interface NightHour {
  /** Local hour 0–23, where 20–23 are evening of `date` and 0–4 are early morning of `date+1`. */
  hour: number;
  /** Cloud cover 0–100. */
  cloudCover: number;
}

export interface ForecastDay {
  date: string;
  cloudCoverPct: number;
  badge: 'go' | 'maybe' | 'skip';
  recommendation: string;
  /** Daytime high temperature, °C. */
  tempHigh?: number;
  /** Overnight low temperature, °C. */
  tempLow?: number;
  /** Average evening wind speed, km/h. */
  windKmh?: number;
  /** Average evening relative humidity, %. */
  humidityPct?: number;
  /** Hourly cloud cover for the observing window (20:00 → 04:00 next day). */
  nightHours: NightHour[];
  /** 0 (new) → 0.5 (full) → 1 (new again). Used for the moon-phase glyph. */
  moonPhase: number;
  /** Moon illumination 0..1, derived from phase. */
  moonIllumination: number;
}

export interface SkyConditions {
  cloudCoverPct: number;
  visibilityKm: number;
  windKmh: number;
  windDirection: string;
  astronomicalDarkStart: string;
  astronomicalDarkEnd: string;
  bestWindow: string;
  bortleClass: number;
}

export interface ObservationScore {
  score: number;
  headline: string;
  summary: string;
  bestTargets: string[];
}

export interface SkyData {
  loading: boolean;
  error: string | null;
  location: { city: string; lat: number; lon: number; bortle: number } | null;
  score: ObservationScore | null;
  planets: PlanetData[];
  timeline: TimelinePayload;
  conditions: SkyConditions | null;
  forecast: ForecastDay[];
  refreshedAt: Date | null;
  isCurrentlyDark: boolean;
  evalTime: Date | null;
}

interface RawPlanet {
  key?: string;
  name?: string;
  altitude: number;
  azimuth: number;
  magnitude: number;
  rise: string | null;
  transit: string | null;
  set: string | null;
  visible: boolean;
}

interface RawSkyHour {
  time: string;
  cloudCover: number;
  visibility: number;
  temp: number;
  humidity: number;
  wind: number;
}

interface RawSkyDay {
  date: string;
  hours: RawSkyHour[];
}

interface RawSunMoon {
  sunRise: string | null;
  sunSet: string | null;
  moonRise: string | null;
  moonSet: string | null;
  illuminationPct: number;
  moonPhaseDeg: number;
  astronomicalDuskStart: string | null;
  astronomicalDawnEnd: string | null;
  moonAltitude: number;
  moonIllumination: number;
}

interface RawVerify {
  cloudCover: number;
  visibilityMeters: number;
  windSpeed: number;
  windDirection: string;
  bortleClass: number;
}

type RawTimeline = TimelinePayload;

const REFRESH_MS = 5 * 60 * 1000;

export function useSkyData(initialCoords?: { lat: number; lon: number; city?: string }) {
  const [data, setData] = useState<SkyData>({
    loading: true,
    error: null,
    location: null,
    score: null,
    planets: [],
    timeline: { darkWindow: null, objects: [], excludedCount: 0 },
    conditions: null,
    forecast: [],
    refreshedAt: null,
    isCurrentlyDark: false,
    evalTime: null,
  });

  const fetchAll = useCallback(async () => {
    try {
      const coords = await resolveCoords(initialCoords);

      const dark = getTonightDarkWindow(coords.lat, coords.lon);
      const planetParam = dark.isCurrentlyDark ? '' : '&tonight=1';

      const [planetsRes, forecastRes, sunMoonRes, verifyRes, timelineRes] = await Promise.all([
        fetch(`/api/sky/planets?lat=${coords.lat}&lon=${coords.lon}${planetParam}`),
        fetch(`/api/sky/forecast?lat=${coords.lat}&lon=${coords.lon}`),
        fetch(`/api/sky/sun-moon?lat=${coords.lat}&lon=${coords.lon}`),
        fetch(`/api/sky/verify?lat=${coords.lat}&lon=${coords.lon}`),
        fetch(`/api/sky/timeline?lat=${coords.lat}&lon=${coords.lon}`),
      ]);

      const planetsRaw: RawPlanet[] = planetsRes.ok ? await planetsRes.json() : [];
      const forecastRaw: RawSkyDay[] = forecastRes.ok ? await forecastRes.json() : [];
      const sunMoon: RawSunMoon | null = sunMoonRes.ok ? await sunMoonRes.json() : null;
      const verify: RawVerify | null = verifyRes.ok ? await verifyRes.json() : null;
      const timelineRaw: RawTimeline = timelineRes.ok
        ? await timelineRes.json()
        : { darkWindow: null, objects: [], excludedCount: 0 };

      const planets: PlanetData[] = planetsRaw.map(normalizePlanet);

      const score = computeObservationScore(planets, verify, sunMoon);

      const conditions: SkyConditions | null = verify
        ? {
            cloudCoverPct: verify.cloudCover ?? 0,
            visibilityKm: Math.round((verify.visibilityMeters ?? 20000) / 1000),
            windKmh: Math.round(verify.windSpeed ?? 0),
            windDirection: verify.windDirection ?? 'W',
            astronomicalDarkStart: sunMoon?.astronomicalDuskStart ?? '22:48',
            astronomicalDarkEnd: sunMoon?.astronomicalDawnEnd ?? '04:12',
            bestWindow: computeBestWindow(planets),
            bortleClass: verify.bortleClass ?? 5,
          }
        : null;

      const forecast: ForecastDay[] = forecastRaw
        .slice(0, 7)
        .map((d, i) => toForecastDay(d, forecastRaw[i + 1]));

      setData({
        loading: false,
        error: null,
        location: {
          city: coords.city,
          lat: coords.lat,
          lon: coords.lon,
          bortle: verify?.bortleClass ?? 5,
        },
        score,
        planets,
        timeline: timelineRaw,
        conditions,
        forecast,
        refreshedAt: new Date(),
        isCurrentlyDark: dark.isCurrentlyDark,
        evalTime: dark.evalTime,
      });
    } catch (err) {
      setData((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load sky data',
      }));
    }
  }, [initialCoords]);

  useEffect(() => {
    fetchAll();
    let id: number | null = null;
    const start = () => {
      if (id !== null) return;
      id = window.setInterval(fetchAll, REFRESH_MS);
    };
    const stop = () => {
      if (id === null) return;
      window.clearInterval(id);
      id = null;
    };
    if (typeof document === 'undefined' || !document.hidden) start();
    const onVis = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      stop();
    };
  }, [fetchAll]);

  return { ...data, refresh: fetchAll };
}

function normalizePlanet(p: RawPlanet): PlanetData {
  const name = p.name ?? (p.key ? p.key.charAt(0).toUpperCase() + p.key.slice(1) : 'Unknown');
  return {
    name,
    altitude: p.altitude,
    azimuth: p.azimuth,
    magnitude: p.magnitude,
    riseTime: p.rise ?? null,
    setTime: p.set ?? null,
    transitTime: p.transit ?? null,
    visible: p.visible,
  };
}

// Forecast averaging mirrors the old page: prefer the evening window (20:00–04:00 local)
// since users care about *night* conditions, not noon clouds.
function averageEveningCloud(hours: RawSkyHour[]): number {
  if (!hours.length) return 0;
  const evening = hours.filter((h) => {
    const hr = parseInt(h.time.slice(11, 13));
    return hr >= 20 || hr <= 4;
  });
  const pool = evening.length ? evening : hours;
  return Math.round(pool.reduce((s, h) => s + h.cloudCover, 0) / pool.length);
}

// 9-cell observing window: 20–23 of `date` then 0–4 of `date+1`.
// If the next day is missing (last forecast row), pad with the last known
// cloud-cover value so the strip still renders end-to-end.
function buildNightHours(d: RawSkyDay, next: RawSkyDay | undefined): NightHour[] {
  const hourAt = (day: RawSkyDay | undefined, hour: number): number | null => {
    if (!day) return null;
    const h = day.hours.find((x) => parseInt(x.time.slice(11, 13)) === hour);
    return h ? h.cloudCover : null;
  };
  const cells: NightHour[] = [];
  for (const hour of [20, 21, 22, 23]) {
    const v = hourAt(d, hour);
    if (v != null) cells.push({ hour, cloudCover: v });
  }
  for (const hour of [0, 1, 2, 3, 4]) {
    const v = hourAt(next, hour) ?? hourAt(d, hour);
    if (v != null) cells.push({ hour, cloudCover: v });
  }
  return cells;
}

// Moon phase at local midnight of `date`. Astronomy-engine returns a 0–360°
// ecliptic angle; we normalise to 0..1 (0=new, 0.5=full).
function moonPhaseFor(date: string): { phase: number; illumination: number } {
  try {
    const d = new Date(`${date}T00:00:00`);
    const angle = MoonPhase(d) % 360;
    const phase = ((angle + 360) % 360) / 360;
    const illumination = (1 - Math.cos(phase * 2 * Math.PI)) / 2;
    return { phase, illumination };
  } catch {
    return { phase: 0, illumination: 0 };
  }
}

function toForecastDay(d: RawSkyDay, next: RawSkyDay | undefined): ForecastDay {
  const cloudCoverPct = averageEveningCloud(d.hours);
  const nightHours = buildNightHours(d, next);
  const { phase, illumination } = moonPhaseFor(d.date);
  return {
    date: d.date,
    cloudCoverPct,
    badge: cloudCoverPct < 30 ? 'go' : cloudCoverPct < 70 ? 'maybe' : 'skip',
    recommendation: cloudCoverPct < 30 ? 'Deep sky' : cloudCoverPct < 70 ? 'Bright targets' : 'Stay in',
    nightHours,
    moonPhase: phase,
    moonIllumination: illumination,
  };
}

interface StoredLocation {
  lat: number;
  lon: number;
  city?: string;
}

async function resolveCoords(
  initial?: { lat: number; lon: number; city?: string },
): Promise<{ lat: number; lon: number; city: string }> {
  if (initial) return { lat: initial.lat, lon: initial.lon, city: initial.city || 'Your location' };

  // Honor the project-wide LocationProvider preference if the user has set one.
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem('stellar_location');
      if (stored) {
        const parsed = JSON.parse(stored) as StoredLocation;
        if (Number.isFinite(parsed.lat) && Number.isFinite(parsed.lon)) {
          return { lat: parsed.lat, lon: parsed.lon, city: parsed.city || 'Your location' };
        }
      }
    } catch {
      // fall through
    }
  }

  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
      });
      return { lat: pos.coords.latitude, lon: pos.coords.longitude, city: 'Your location' };
    } catch {
      // fall through
    }
  }

  return { lat: 41.6941, lon: 44.8337, city: 'Tbilisi' };
}

function computeObservationScore(
  planets: PlanetData[],
  verify: RawVerify | null,
  sunMoon: RawSunMoon | null,
): ObservationScore {
  const cloudCover = verify?.cloudCover ?? 50;
  const moonIllum = sunMoon?.moonIllumination ?? 0.5;

  const cloudScore = Math.max(0, 100 - cloudCover) * 0.6;

  const moonUp = (sunMoon?.moonAltitude ?? -1) > 0;
  const moonScore = moonUp ? (1 - moonIllum) * 20 : 20;

  const visibleBright = planets.filter((p) => p.visible && p.altitude > 15 && p.magnitude < 2).length;
  const targetScore = Math.min(20, visibleBright * 7);

  const score = Math.round(cloudScore + moonScore + targetScore);

  let headline = '';
  if (score >= 75) headline = 'Clear night — go observe';
  else if (score >= 50) headline = 'Decent conditions tonight';
  else if (score >= 25) headline = 'Limited visibility — pick bright targets';
  else headline = 'Poor conditions — better luck tomorrow';

  const ranked = planets
    .filter((p) => p.visible && p.altitude > 10)
    .sort((a, b) => (b.altitude - b.magnitude * 5) - (a.altitude - a.magnitude * 5))
    .slice(0, 3)
    .map((p) => p.name);

  const moonRiseLabel = sunMoon?.moonRise ? formatHHmm(sunMoon.moonRise) : null;
  const moonNote = moonUp
    ? `Moon ${Math.round(moonIllum * 100)}% illuminated`
    : moonRiseLabel
    ? `No moon after ${moonRiseLabel}`
    : 'Moonless';
  const targetNote = ranked.length > 0 ? ` Best targets: ${ranked.join(', ')}.` : '';
  const summary = `${cloudCover}% cloud, ${moonNote}.${targetNote}`;

  return { score, headline, summary, bestTargets: ranked };
}

function formatHHmm(iso: string): string {
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return iso;
  }
}

function computeBestWindow(planets: PlanetData[]): string {
  const visible = planets.filter((p) => p.visible && p.transitTime);
  if (visible.length === 0) return '23:00 → 03:00';
  return '23:00 → 03:00';
}
