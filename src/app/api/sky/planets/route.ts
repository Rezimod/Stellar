import { NextRequest, NextResponse } from 'next/server';
import { getVisiblePlanets } from '@/lib/planets';

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get('lat') ?? '41.6941');
  const lng = parseFloat(req.nextUrl.searchParams.get('lng') ?? '44.8337');
  const planets = getVisiblePlanets(lat, lng, new Date());
  return NextResponse.json(planets);
}
