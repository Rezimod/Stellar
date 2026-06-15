import { NextRequest, NextResponse } from 'next/server';
import * as satellite from 'satellite.js';
import { DEFAULT_LAT, DEFAULT_LON } from '@/lib/observer-location';

// Next ISS pass for the observer, computed from live orbital elements (TLE).
// We propagate the ISS over the next 24h and return the first pass that rises
// above MIN_ELEVATION. This is a real geometric prediction — not live tracking —
// so the UI labels it as a scheduled pass, never "tracking now".

const CELESTRAK_TLE =
  'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE';
const MIN_ELEVATION_DEG = 10; // horizon clutter below this; not worth pointing
const STEP_SECONDS = 30;
const HORIZON_HOURS = 24;

interface TleCache {
  line1: string;
  line2: string;
  fetchedAt: number;
}
let tleCache: TleCache | null = null;
const TLE_TTL_MS = 2 * 60 * 60 * 1000; // TLEs drift slowly; 2h is plenty

async function getTle(): Promise<TleCache | null> {
  if (tleCache && Date.now() - tleCache.fetchedAt < TLE_TTL_MS) return tleCache;
  try {
    const res = await fetch(CELESTRAK_TLE, { next: { revalidate: 7200 } });
    if (!res.ok) return tleCache; // serve stale on failure
    const text = (await res.text()).trim();
    const lines = text.split('\n').map((l) => l.trim());
    // Format: name \n line1 \n line2
    const line1 = lines.find((l) => l.startsWith('1 '));
    const line2 = lines.find((l) => l.startsWith('2 '));
    if (!line1 || !line2) return tleCache;
    tleCache = { line1, line2, fetchedAt: Date.now() };
    return tleCache;
  } catch {
    return tleCache;
  }
}

const degToRad = (d: number) => (d * Math.PI) / 180;
const radToDeg = (r: number) => (r * 180) / Math.PI;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat = parseFloat(searchParams.get('lat') ?? String(DEFAULT_LAT));
  const lon = parseFloat(searchParams.get('lon') ?? searchParams.get('lng') ?? String(DEFAULT_LON));

  if (!isFinite(lat) || !isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  const tle = await getTle();
  if (!tle) {
    return NextResponse.json({ pass: null, source: 'unavailable' });
  }

  let satrec: satellite.SatRec;
  try {
    satrec = satellite.twoline2satrec(tle.line1, tle.line2);
  } catch {
    return NextResponse.json({ pass: null, source: 'unavailable' });
  }

  const observerGd = {
    longitude: degToRad(lon),
    latitude: degToRad(lat),
    height: 0.37, // observer altitude in km — close enough for a pass time
  };

  const elevationAt = (date: Date): { el: number; az: number } | null => {
    const pv = satellite.propagate(satrec, date);
    if (!pv || typeof pv.position === 'boolean' || !pv.position) return null;
    const gmst = satellite.gstime(date);
    const ecf = satellite.eciToEcf(pv.position, gmst);
    const look = satellite.ecfToLookAngles(observerGd, ecf);
    return { el: radToDeg(look.elevation), az: radToDeg(look.azimuth) };
  };

  // Walk forward in fixed steps; find the first window above MIN_ELEVATION and
  // record its culmination (peak elevation).
  const start = Date.now();
  const end = start + HORIZON_HOURS * 60 * 60 * 1000;
  let inPass = false;
  let passStart: number | null = null;
  let peakEl = -90;
  let peakAz = 0;
  let peakTime = 0;

  for (let t = start; t <= end; t += STEP_SECONDS * 1000) {
    const d = new Date(t);
    const look = elevationAt(d);
    if (!look) continue;
    if (look.el >= MIN_ELEVATION_DEG) {
      if (!inPass) { inPass = true; passStart = t; peakEl = -90; }
      if (look.el > peakEl) { peakEl = look.el; peakAz = look.az; peakTime = t; }
    } else if (inPass) {
      // Pass just ended — return it.
      return NextResponse.json({
        source: 'celestrak',
        tleFetchedAt: new Date(tle.fetchedAt).toISOString(),
        pass: {
          startsAt: new Date(passStart!).toISOString(),
          peakAt: new Date(peakTime).toISOString(),
          peakElevation: Math.round(peakEl),
          peakAzimuth: Math.round((peakAz + 360) % 360),
        },
      });
    }
  }

  // No pass crossed below the threshold within the window (edge case).
  return NextResponse.json({ source: 'celestrak', pass: null });
}
