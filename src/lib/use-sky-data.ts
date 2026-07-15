'use client';

import { useEffect, useState, useCallback } from 'react';
import { MoonPhase } from 'astronomy-engine';
import { useLocale } from 'next-intl';
import { getTonightDarkWindow } from '@/lib/dark-window';
import { useLocation } from '@/lib/location';
import { LOCATION_UPDATED_EVENT } from '@/lib/observer-location';

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

// Cross-component fetch cache. The homepage mounts two sky consumers (the hero
// cards + Tonight-at-a-glance); navigations re-mount the sky page. Caching raw
// JSON by URL for a short window dedupes those overlapping requests and shares
// in-flight promises so identical calls never run twice.
const RAW_TTL = 2 * 60 * 1000;
const rawCache = new Map<string, { at: number; p: Promise<unknown> }>();

function cachedJson<T>(url: string): Promise<T | null> {
  const now = Date.now();
  const hit = rawCache.get(url);
  if (hit && now - hit.at < RAW_TTL) return hit.p as Promise<T | null>;
  const p = fetch(url)
    .then((r) => (r.ok ? (r.json() as Promise<T>) : null))
    .catch(() => null);
  rawCache.set(url, { at: now, p });
  return p;
}

export function useSkyData() {
  const locale = useLocale() === 'ka' ? 'ka' : 'en';
  const { location, locationReady } = useLocation();
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
    if (!locationReady) return;
    try {
      const coords = {
        lat: location.lat,
        lon: location.lon,
        city: location.city || (locale === 'ka' ? 'შენი მდებარეობა' : 'Your location'),
      };

      const dark = getTonightDarkWindow(coords.lat, coords.lon);
      const planetParam = dark.isCurrentlyDark ? '' : '&tonight=1';

      const [planetsRaw, forecastRaw, sunMoon, verify, timelineRaw] = await Promise.all([
        cachedJson<RawPlanet[]>(`/api/sky/planets?lat=${coords.lat}&lon=${coords.lon}${planetParam}`).then((v) => v ?? []),
        cachedJson<RawSkyDay[]>(`/api/sky/forecast?lat=${coords.lat}&lon=${coords.lon}`).then((v) => v ?? []),
        cachedJson<RawSunMoon>(`/api/sky/sun-moon?lat=${coords.lat}&lon=${coords.lon}`),
        cachedJson<RawVerify>(`/api/sky/verify?lat=${coords.lat}&lon=${coords.lon}`),
        cachedJson<RawTimeline>(`/api/sky/timeline?lat=${coords.lat}&lon=${coords.lon}`).then(
          (v) => v ?? { darkWindow: null, objects: [], excludedCount: 0 },
        ),
      ]);

      const planets: PlanetData[] = planetsRaw.map(normalizePlanet);

      const score = computeObservationScore(planets, verify, sunMoon, locale);

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
        .map((d, i) => toForecastDay(d, forecastRaw[i + 1], locale));

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
  }, [location.lat, location.lon, location.city, locationReady, locale]);

  useEffect(() => {
    if (!locationReady) return;
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
  }, [fetchAll, locationReady]);

  useEffect(() => {
    const onLocation = () => {
      if (locationReady) void fetchAll();
    };
    window.addEventListener(LOCATION_UPDATED_EVENT, onLocation);
    return () => window.removeEventListener(LOCATION_UPDATED_EVENT, onLocation);
  }, [fetchAll, locationReady]);

  return { ...data, refresh: fetchAll };
}

/**
 * Lightweight sky hook — fetches only the forecast + planets (2 calls instead
 * of the full 5) for surfaces that just need "what's the next few nights /
 * what's up right now," like the homepage hero cards. Shares the same cached
 * fetch layer as useSkyData, so it never double-fetches.
 */
export function useSkyForecast() {
  const locale = useLocale() === 'ka' ? 'ka' : 'en';
  const { location, locationReady } = useLocation();
  const [state, setState] = useState<{ loading: boolean; forecast: ForecastDay[]; planets: PlanetData[] }>({
    loading: true,
    forecast: [],
    planets: [],
  });

  const fetchLite = useCallback(async () => {
    if (!locationReady) return;
    const lat = location.lat;
    const lon = location.lon;
    const dark = getTonightDarkWindow(lat, lon);
    const planetParam = dark.isCurrentlyDark ? '' : '&tonight=1';

    const [planetsRaw, forecastRaw] = await Promise.all([
      cachedJson<RawPlanet[]>(`/api/sky/planets?lat=${lat}&lon=${lon}${planetParam}`).then((v) => v ?? []),
      cachedJson<RawSkyDay[]>(`/api/sky/forecast?lat=${lat}&lon=${lon}`).then((v) => v ?? []),
    ]);

    const planets = planetsRaw.map(normalizePlanet);
    const forecast = forecastRaw.slice(0, 7).map((d, i) => toForecastDay(d, forecastRaw[i + 1], locale));
    setState({ loading: false, forecast, planets });
  }, [location.lat, location.lon, locationReady, locale]);

  useEffect(() => {
    if (!locationReady) return;
    void fetchLite();
    let id: number | null = null;
    const start = () => {
      if (id === null) id = window.setInterval(() => void fetchLite(), REFRESH_MS);
    };
    const stop = () => {
      if (id !== null) {
        window.clearInterval(id);
        id = null;
      }
    };
    if (typeof document === 'undefined' || !document.hidden) start();
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      stop();
    };
  }, [fetchLite, locationReady]);

  useEffect(() => {
    const onLocation = () => {
      if (locationReady) void fetchLite();
    };
    window.addEventListener(LOCATION_UPDATED_EVENT, onLocation);
    return () => window.removeEventListener(LOCATION_UPDATED_EVENT, onLocation);
  }, [fetchLite, locationReady]);

  return state;
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

// Night-window weather (20:00–04:00) — the conditions that actually matter
// for an observer. Overnight low temp + average wind/humidity over the window.
function eveningWeather(d: RawSkyDay, next: RawSkyDay | undefined): {
  tempLow: number | undefined;
  windKmh: number | undefined;
  humidityPct: number | undefined;
} {
  const isEvening = (t: string) => {
    const hr = parseInt(t.slice(11, 13));
    return hr >= 20 || hr <= 4;
  };
  const pool = [
    ...d.hours.filter((h) => parseInt(h.time.slice(11, 13)) >= 20),
    ...(next ?? d).hours.filter((h) => parseInt(h.time.slice(11, 13)) <= 4),
  ].filter((h) => isEvening(h.time));
  const src = pool.length ? pool : d.hours;
  if (!src.length) return { tempLow: undefined, windKmh: undefined, humidityPct: undefined };
  const tempLow = Math.round(Math.min(...src.map((h) => h.temp)));
  const windKmh = Math.round(src.reduce((s, h) => s + h.wind, 0) / src.length);
  const humidityPct = Math.round(src.reduce((s, h) => s + h.humidity, 0) / src.length);
  return { tempLow, windKmh, humidityPct };
}

function toForecastDay(
  d: RawSkyDay,
  next: RawSkyDay | undefined,
  locale: 'en' | 'ka' = 'en',
): ForecastDay {
  const nightHours = buildNightHours(d, next);
  // Average the same 20:00→04:00 cells the UI strips render, so the number,
  // the badge, and the hourly visual always describe the same night. The
  // same-day fallback only fires when the night window has no data at all.
  const cloudCoverPct = nightHours.length
    ? Math.round(nightHours.reduce((s, h) => s + h.cloudCover, 0) / nightHours.length)
    : averageEveningCloud(d.hours);
  const { phase, illumination } = moonPhaseFor(d.date);
  const { tempLow, windKmh, humidityPct } = eveningWeather(d, next);
  return {
    date: d.date,
    cloudCoverPct,
    tempLow,
    windKmh,
    humidityPct,
    badge: cloudCoverPct < 30 ? 'go' : cloudCoverPct < 70 ? 'maybe' : 'skip',
    recommendation:
      locale === 'ka'
        ? cloudCoverPct < 30
          ? 'ღრმა ცა'
          : cloudCoverPct < 70
            ? 'ნათელი სამიზნეები'
            : 'სახლში დარჩი'
        : cloudCoverPct < 30
          ? 'Deep sky'
          : cloudCoverPct < 70
            ? 'Bright targets'
            : 'Stay in',
    nightHours,
    moonPhase: phase,
    moonIllumination: illumination,
  };
}

function computeObservationScore(
  planets: PlanetData[],
  verify: RawVerify | null,
  sunMoon: RawSunMoon | null,
  locale: 'en' | 'ka' = 'en',
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
  if (locale === 'ka') {
    if (score >= 75) headline = 'მოწმენდილია — დროა გახვიდე დასაკვირვებლად';
    else if (score >= 50) headline = 'ამაღამ პირობები მისაღებია';
    else if (score >= 25) headline = 'ხილვადობა შეზღუდულია — აირჩიე ნათელი სამიზნეები';
    else headline = 'პირობები სუსტია — სცადე ხვალ';
  } else {
    if (score >= 75) headline = 'Clear night — go observe';
    else if (score >= 50) headline = 'Decent conditions tonight';
    else if (score >= 25) headline = 'Limited visibility — pick bright targets';
    else headline = 'Poor conditions — better luck tomorrow';
  }

  const ranked = planets
    .filter((p) => p.visible && p.altitude > 10)
    .sort((a, b) => (b.altitude - b.magnitude * 5) - (a.altitude - a.magnitude * 5))
    .slice(0, 3)
    .map((p) => p.name);

  const moonRiseLabel = sunMoon?.moonRise ? formatHHmm(sunMoon.moonRise) : null;
  const moonNote = moonUp
    ? locale === 'ka'
      ? `მთვარე განათებულია ${Math.round(moonIllum * 100)}%-ით`
      : `Moon ${Math.round(moonIllum * 100)}% illuminated`
    : moonRiseLabel
    ? locale === 'ka'
      ? `მთვარე აღარ გამოჩნდება ${moonRiseLabel}-ის შემდეგ`
      : `No moon after ${moonRiseLabel}`
    : locale === 'ka'
      ? 'მთვარის გარეშე'
      : 'Moonless';
  const targetNote = ranked.length > 0
    ? locale === 'ka'
      ? ` საუკეთესო სამიზნეებია: ${ranked.join(', ')}.`
      : ` Best targets: ${ranked.join(', ')}.`
    : '';
  const summary = locale === 'ka'
    ? `${cloudCover}% ღრუბლიანობა, ${moonNote}.${targetNote}`
    : `${cloudCover}% cloud, ${moonNote}.${targetNote}`;

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
