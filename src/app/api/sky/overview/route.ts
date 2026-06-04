import { NextRequest, NextResponse } from 'next/server';
import { getTonightSky } from '@/lib/tonight-sky';
import { DEFAULT_LAT, DEFAULT_LON } from '@/lib/observer-location';

/**
 * Unified "tonight's sky" payload — the single source of truth consumed by
 * Home, /sky, the Finder, Missions and ASTRA. See src/lib/tonight-sky.ts.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lat = parseFloat(sp.get('lat') ?? String(DEFAULT_LAT));
  const lon = parseFloat(sp.get('lon') ?? sp.get('lng') ?? String(DEFAULT_LON));

  if (!isFinite(lat) || !isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  const dateParam = sp.get('date');
  let at = new Date();
  if (dateParam) {
    const parsed = new Date(dateParam);
    if (!Number.isNaN(parsed.getTime())) at = parsed;
  }

  try {
    const sky = await getTonightSky(lat, lon, at);
    return NextResponse.json(sky, {
      headers: { 'Cache-Control': 'public, max-age=180, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to compute sky' }, { status: 500 });
  }
}
