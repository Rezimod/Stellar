import { NextRequest, NextResponse } from 'next/server';
import {
  Body,
  Observer,
  SearchRiseSet,
  SearchAltitude,
  Illumination,
  MoonPhase,
  Equator,
  Horizon,
} from 'astronomy-engine';
import { DEFAULT_LAT, DEFAULT_LON } from '@/lib/observer-location';

function fmtHHmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get('lat') ?? String(DEFAULT_LAT));
  const lng = parseFloat(req.nextUrl.searchParams.get('lng') ?? req.nextUrl.searchParams.get('lon') ?? String(DEFAULT_LON));
  const now = new Date();

  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);

  const observer = new Observer(lat, lng, 0);

  const sunRise = SearchRiseSet(Body.Sun, observer, +1, midnight, 1);
  const sunSet  = SearchRiseSet(Body.Sun, observer, -1, midnight, 1);
  const moonRise = SearchRiseSet(Body.Moon, observer, +1, midnight, 1);
  const moonSet  = SearchRiseSet(Body.Moon, observer, -1, midnight, 1);

  // Astronomical twilight: sun at -18°. Search forward from sunset for dusk start,
  // and forward from there for dawn end (the next time sun crosses -18° going up).
  let astronomicalDuskStart: string | null = null;
  let astronomicalDawnEnd: string | null = null;
  try {
    const duskSearchStart = sunSet?.date ?? midnight;
    const duskHit = SearchAltitude(Body.Sun, observer, -1, duskSearchStart, 1, -18);
    if (duskHit) {
      astronomicalDuskStart = fmtHHmm(duskHit.date);
      const dawnHit = SearchAltitude(Body.Sun, observer, +1, duskHit.date, 1, -18);
      if (dawnHit) astronomicalDawnEnd = fmtHHmm(dawnHit.date);
    }
  } catch {
    // High-latitude summers: sun never reaches -18°. Leave nulls; UI falls back.
  }

  const illum = Illumination(Body.Moon, now);
  const phaseAngle = illum.phase_angle;
  const illuminationPct = Math.round((1 + Math.cos(phaseAngle * Math.PI / 180)) / 2 * 100);
  const moonPhaseDeg = MoonPhase(now);

  // Current moon altitude — used by the score formula to apply moon penalty only when up.
  let moonAltitude = 0;
  try {
    const eq = Equator(Body.Moon, now, observer, true, true);
    const horiz = Horizon(now, observer, eq.ra, eq.dec, 'normal');
    moonAltitude = Math.round(horiz.altitude * 10) / 10;
  } catch {
    // ignore — moonAltitude stays 0
  }

  return NextResponse.json({
    sunRise: sunRise ? sunRise.date.toISOString() : null,
    sunSet:  sunSet  ? sunSet.date.toISOString()  : null,
    moonRise: moonRise ? moonRise.date.toISOString() : null,
    moonSet:  moonSet  ? moonSet.date.toISOString()  : null,
    illuminationPct,
    moonPhaseDeg: Math.round(moonPhaseDeg),
    astronomicalDuskStart,
    astronomicalDawnEnd,
    moonAltitude,
    moonIllumination: illuminationPct / 100,
  }, {
    headers: { 'Cache-Control': 'public, max-age=600, s-maxage=1800, stale-while-revalidate=3600' },
  });
}
