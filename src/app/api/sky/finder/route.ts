import { NextRequest, NextResponse } from 'next/server';
import { Body, Equator, Horizon, Observer, SearchAltitude, SearchRiseSet } from 'astronomy-engine';
import { getVisiblePlanets, type PlanetInfo } from '@/lib/planets';
import { fetchSkyForecast } from '@/lib/sky-data';
import { azimuthToCompass, altitudeToFists } from '@/lib/sky/directions';

const ORDER = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'] as const;
type ObjectId = (typeof ORDER)[number];

function computeSun(lat: number, lon: number, date: Date): PlanetInfo | null {
  try {
    const observer = new Observer(lat, lon, 0);
    const eq = Equator(Body.Sun, date, observer, true, true);
    const horiz = Horizon(date, observer, eq.ra, eq.dec, 'normal');
    let rise: Date | null = null;
    let set: Date | null = null;
    try { rise = SearchRiseSet(Body.Sun, observer, +1, date, 1)?.date ?? null; } catch { /* ignore */ }
    try { set  = SearchRiseSet(Body.Sun, observer, -1, date, 1)?.date ?? null; } catch { /* ignore */ }
    return {
      key: 'sun',
      name: 'Sun',
      altitude: horiz.altitude,
      azimuth: horiz.azimuth,
      azimuthDir: '',
      rise,
      set,
      transit: null,
      magnitude: -26.7,
      visible: horiz.altitude > 0,
      phase: null,
    };
  } catch (err) {
    console.error('[api/sky/finder] sun failed:', err);
    return null;
  }
}

interface FinderObject {
  id: ObjectId;
  name: string;
  altitude: number;
  azimuth: number;
  magnitude: number;
  visible: boolean;
  nakedEye: boolean;
  compassDirection: string;
  fistsAboveHorizon: number;
  riseTime: string | null;
  setTime: string | null;
  phase: number | null;
}

interface TwilightTimes {
  civilDusk: string | null;
  nauticalDusk: string | null;
  astronomicalDusk: string | null;
  astronomicalDawn: string | null;
  nauticalDawn: string | null;
  civilDawn: string | null;
}

interface FinderResponse {
  observerLocation: { lat: number; lon: number; name: string | null };
  generatedAt: string;
  conditions: {
    cloudCoverPct: number;
    quality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    summary: string;
  };
  objects: FinderObject[];
  twilight: TwilightTimes;
}

function computeTwilight(observer: Observer, now: Date): TwilightTimes {
  // For each twilight altitude, look forward up to 1 day for the next time
  // the Sun crosses that altitude going DOWN (dusk) and up to 1 day after
  // that for the matching dawn going UP. Falls back to null on failure.
  const lookFor = (dir: 1 | -1, alt: number, start: Date): Date | null => {
    try {
      const hit = SearchAltitude(Body.Sun, observer, dir, start, 1, alt);
      return hit?.date ?? null;
    } catch {
      return null;
    }
  };
  const civilDusk = lookFor(-1, -6, now);
  const nauticalDusk = lookFor(-1, -12, now);
  const astronomicalDusk = lookFor(-1, -18, now);
  const astronomicalDawn = astronomicalDusk ? lookFor(+1, -18, astronomicalDusk) : null;
  const nauticalDawn = astronomicalDawn ? lookFor(+1, -12, astronomicalDawn) : null;
  const civilDawn = nauticalDawn ? lookFor(+1, -6, nauticalDawn) : null;
  return {
    civilDusk: civilDusk?.toISOString() ?? null,
    nauticalDusk: nauticalDusk?.toISOString() ?? null,
    astronomicalDusk: astronomicalDusk?.toISOString() ?? null,
    astronomicalDawn: astronomicalDawn?.toISOString() ?? null,
    nauticalDawn: nauticalDawn?.toISOString() ?? null,
    civilDawn: civilDawn?.toISOString() ?? null,
  };
}

function toIso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString();
  if (typeof d === 'string') return d;
  return null;
}

function cloudQuality(pct: number): { quality: FinderResponse['conditions']['quality']; summary: string } {
  if (pct < 20) return { quality: 'Excellent', summary: 'Clear night — go observe' };
  if (pct < 50) return { quality: 'Good', summary: 'Decent conditions tonight' };
  if (pct < 75) return { quality: 'Fair', summary: 'Limited visibility — pick bright targets' };
  return { quality: 'Poor', summary: 'Mostly clouded out tonight' };
}

function eveningCloud(forecastDay: { hours: { time: string; cloudCover: number }[] } | undefined): number {
  if (!forecastDay?.hours?.length) return 50;
  const evening = forecastDay.hours.filter((h) => {
    const hr = parseInt(h.time.slice(11, 13), 10);
    return hr >= 20 || hr <= 4;
  });
  const pool = evening.length ? evening : forecastDay.hours;
  return Math.round(pool.reduce((s, h) => s + h.cloudCover, 0) / pool.length);
}

export async function GET(req: NextRequest) {
  const latRaw = req.nextUrl.searchParams.get('lat');
  const lonRaw = req.nextUrl.searchParams.get('lon') ?? req.nextUrl.searchParams.get('lng');
  const lat = parseFloat(latRaw ?? '');
  const lon = parseFloat(lonRaw ?? '');

  if (!isFinite(lat) || !isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: 'lat and lon required as query params' }, { status: 400 });
  }

  const now = new Date();

  let planets: PlanetInfo[] = [];
  try {
    planets = getVisiblePlanets(lat, lon, now);
  } catch (err) {
    console.error('[api/sky/finder] planets failed:', err);
  }

  const sun = computeSun(lat, lon, now);
  if (sun) planets = [sun, ...planets];

  let cloudCoverPct = 50;
  try {
    const forecast = await fetchSkyForecast(lat, lon);
    cloudCoverPct = eveningCloud(forecast[0]);
  } catch (err) {
    console.warn('[api/sky/finder] forecast failed:', err instanceof Error ? err.message : err);
  }

  const byKey = new Map<string, PlanetInfo>(planets.map((p) => [p.key.toLowerCase(), p]));

  const objects: FinderObject[] = ORDER.map((id) => {
    const p = byKey.get(id);
    if (!p) {
      return {
        id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        altitude: 0,
        azimuth: 0,
        magnitude: 0,
        visible: false,
        nakedEye: false,
        compassDirection: 'N',
        fistsAboveHorizon: 0,
        riseTime: null,
        setTime: null,
        phase: null,
      };
    }
    return {
      id,
      name: p.name,
      altitude: p.altitude,
      azimuth: p.azimuth,
      magnitude: p.magnitude,
      visible: p.altitude > 0,
      nakedEye: p.magnitude <= 6,
      compassDirection: azimuthToCompass(p.azimuth),
      fistsAboveHorizon: altitudeToFists(p.altitude),
      riseTime: toIso(p.rise),
      setTime: toIso(p.set),
      phase: p.phase ?? null,
    };
  });

  const cond = cloudQuality(cloudCoverPct);

  let twilight: TwilightTimes = {
    civilDusk: null, nauticalDusk: null, astronomicalDusk: null,
    astronomicalDawn: null, nauticalDawn: null, civilDawn: null,
  };
  try {
    twilight = computeTwilight(new Observer(lat, lon, 0), now);
  } catch (err) {
    console.warn('[api/sky/finder] twilight failed:', err instanceof Error ? err.message : err);
  }

  const body: FinderResponse = {
    observerLocation: { lat, lon, name: null },
    generatedAt: now.toISOString(),
    conditions: {
      cloudCoverPct,
      quality: cond.quality,
      summary: cond.summary,
    },
    objects,
    twilight,
  };

  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  });
}
