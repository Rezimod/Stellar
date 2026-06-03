import { NextRequest, NextResponse } from 'next/server';
import { fetchSkyForecast } from '@/lib/sky-data';
import { skyForecastRateLimit, checkRateLimit } from '@/lib/rate-limit';
import { DEFAULT_LAT, DEFAULT_LON } from '@/lib/observer-location';

const DEFAULT_LNG = DEFAULT_LON;

export async function GET(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  const { success, remaining } = await checkRateLimit(skyForecastRateLimit, ip);
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Try again in a minute.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': String(remaining) } },
    );
  }

  const { searchParams } = req.nextUrl;
  const lat = parseFloat(searchParams.get('lat') ?? String(DEFAULT_LAT));
  const lng = parseFloat(searchParams.get('lng') ?? searchParams.get('lon') ?? String(DEFAULT_LNG));

  if (!isFinite(lat) || !isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  try {
    const data = await fetchSkyForecast(lat, lng);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=600, s-maxage=1800, stale-while-revalidate=3600' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
