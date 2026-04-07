import { NextRequest, NextResponse } from 'next/server';
import { fetchSkyForecast } from '@/lib/sky-data';

const DEFAULT_LAT = 41.6941;
const DEFAULT_LNG = 44.8337;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat = parseFloat(searchParams.get('lat') ?? String(DEFAULT_LAT));
  const lng = parseFloat(searchParams.get('lng') ?? String(DEFAULT_LNG));

  try {
    const data = await fetchSkyForecast(lat, lng);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
