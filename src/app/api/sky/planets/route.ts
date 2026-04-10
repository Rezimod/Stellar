import { NextRequest, NextResponse } from 'next/server';
import { getVisiblePlanets } from '@/lib/planets';

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get('lat') ?? '41.6941');
  const lng = parseFloat(req.nextUrl.searchParams.get('lng') ?? '44.8337');

  if (!isFinite(lat) || !isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  try {
    const planets = getVisiblePlanets(lat, lng, new Date());
    return NextResponse.json(planets);
  } catch (err) {
    console.error('[api/sky/planets] getVisiblePlanets threw:', err);
    return NextResponse.json([], { headers: { 'X-Warning': 'planet-calc-failed' } });
  }
}
