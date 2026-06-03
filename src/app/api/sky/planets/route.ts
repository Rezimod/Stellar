import { NextRequest, NextResponse } from 'next/server';
import { getVisiblePlanets, getWindowPlanets } from '@/lib/planets';
import { getTonightDarkWindow } from '@/lib/dark-window';
import { DEFAULT_LAT, DEFAULT_LON } from '@/lib/observer-location';

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get('lat') ?? String(DEFAULT_LAT));
  const lng = parseFloat(req.nextUrl.searchParams.get('lng') ?? req.nextUrl.searchParams.get('lon') ?? String(DEFAULT_LON));

  if (!isFinite(lat) || !isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  try {
    const tonight = req.nextUrl.searchParams.get('tonight') === '1';
    if (tonight) {
      const dark = getTonightDarkWindow(lat, lng);
      const start = dark.duskStart ?? dark.evalTime;
      const end = dark.dawnEnd ?? new Date(start.getTime() + 6 * 3600 * 1000);
      const planets = getWindowPlanets(lat, lng, start, end);
      return NextResponse.json(planets, {
        headers: { 'Cache-Control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=3600' },
      });
    }

    const dateParam = req.nextUrl.searchParams.get('date');
    const date = dateParam ? new Date(dateParam) : new Date();
    const planets = getVisiblePlanets(lat, lng, isNaN(date.getTime()) ? new Date() : date);
    return NextResponse.json(planets, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=3600' },
    });
  } catch (err) {
    console.error('[api/sky/planets] getVisiblePlanets threw:', err);
    return NextResponse.json([], { headers: { 'X-Warning': 'planet-calc-failed' } });
  }
}
