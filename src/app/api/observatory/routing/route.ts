import { NextRequest, NextResponse } from 'next/server';
import { routeFrom } from '@/lib/observatory/routing';

export const dynamic = 'force-dynamic';

/**
 * Public: this answers "whose sky is open" and reveals nothing a node page
 * does not already show.
 */
export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get('lat'));
  const lon = Number(req.nextUrl.searchParams.get('lon'));

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }

  return NextResponse.json(await routeFrom(lat, lon));
}
