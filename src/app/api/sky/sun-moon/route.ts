import { NextRequest, NextResponse } from 'next/server';
import { Body, Observer, SearchRiseSet, Illumination, MoonPhase } from 'astronomy-engine';

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get('lat') ?? '41.6941');
  const lng = parseFloat(req.nextUrl.searchParams.get('lng') ?? '44.8337');
  const now = new Date();

  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);

  const observer = new Observer(lat, lng, 0);

  const sunRise = SearchRiseSet(Body.Sun, observer, +1, midnight, 1);
  const sunSet  = SearchRiseSet(Body.Sun, observer, -1, midnight, 1);

  const illum = Illumination(Body.Moon, now);
  const phaseAngle = illum.phase_angle; // 0 = new, 180 = full (degrees)
  const illuminationPct = Math.round((1 + Math.cos(phaseAngle * Math.PI / 180)) / 2 * 100);
  const moonPhaseDeg = MoonPhase(now); // 0-360: 0=new, 90=first qtr, 180=full, 270=last qtr

  return NextResponse.json({
    sunRise: sunRise ? sunRise.date.toISOString() : null,
    sunSet:  sunSet  ? sunSet.date.toISOString()  : null,
    illuminationPct,
    moonPhaseDeg: Math.round(moonPhaseDeg),
  });
}
