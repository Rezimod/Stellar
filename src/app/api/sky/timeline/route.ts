// src/app/api/sky/timeline/route.ts
// Returns observable objects within tonight's astronomical dark window.
// An object is "observable" only when it is above the horizon AND the sky is
// astronomically dark (sun below -18°). The dark window calculation reuses the
// same SearchAltitude(Sun, -18°) pattern as /api/sky/sun-moon.

import { NextResponse } from 'next/server';
import {
  Body,
  Equator,
  Horizon,
  Observer,
  AstroTime,
  SearchRiseSet,
  SearchAltitude,
} from 'astronomy-engine';

// J2000 RA (hours) / Dec (degrees) for fixed deep-sky targets.
const DEEP_SKY = [
  { name: 'Orion (M42)', ra: 5.5881, dec: -5.3911, color: '#8465CB' },
  { name: 'Andromeda', ra: 0.7123, dec: 41.2692, color: '#5DCAA5' },
];

const PLANET_BODIES = [
  { name: 'Jupiter', body: Body.Jupiter, color: '#FFD166' },
  { name: 'Venus', body: Body.Venus, color: '#F0E5C0' },
  { name: 'Mars', body: Body.Mars, color: '#C84A2E' },
  { name: 'Saturn', body: Body.Saturn, color: '#D4A954' },
  { name: 'Mercury', body: Body.Mercury, color: '#A8A290' },
];

const SAMPLE_INTERVAL_MS = 5 * 60 * 1000;

interface ObservableObjectPayload {
  name: string;
  color: string;
  visibleStart: string;
  visibleEnd: string;
  peakAt: string;
  peakAlt: number;
  peakAzimuth: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lon = parseFloat(searchParams.get('lon') ?? '');

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: 'lat and lon required' }, { status: 400 });
  }

  const observer = new Observer(lat, lon, 0);
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);

  let darkStart: Date | null = null;
  let darkEnd: Date | null = null;
  try {
    const sunSet = SearchRiseSet(Body.Sun, observer, -1, midnight, 1);
    const duskSearchStart = sunSet?.date ?? midnight;
    const duskHit = SearchAltitude(Body.Sun, observer, -1, duskSearchStart, 1, -18);
    if (duskHit) {
      darkStart = duskHit.date;
      const dawnHit = SearchAltitude(Body.Sun, observer, +1, duskHit.date, 1, -18);
      if (dawnHit) darkEnd = dawnHit.date;
    }
  } catch {
    // High-latitude summer: sun never reaches -18°. Leave nulls.
  }

  if (!darkStart || !darkEnd) {
    return NextResponse.json(
      { darkWindow: null, objects: [], excludedCount: 0 },
      { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800' } },
    );
  }

  const samples: Date[] = [];
  for (let t = darkStart.getTime(); t <= darkEnd.getTime(); t += SAMPLE_INTERVAL_MS) {
    samples.push(new Date(t));
  }

  type Target =
    | { name: string; color: string; kind: 'planet'; body: Body }
    | { name: string; color: string; kind: 'dso'; ra: number; dec: number };

  const allTargets: Target[] = [
    ...PLANET_BODIES.map((p): Target => ({ name: p.name, color: p.color, kind: 'planet', body: p.body })),
    ...DEEP_SKY.map((d): Target => ({ name: d.name, color: d.color, kind: 'dso', ra: d.ra, dec: d.dec })),
  ];

  const objects: ObservableObjectPayload[] = [];
  let excludedCount = 0;

  for (const target of allTargets) {
    let visibleStart: Date | null = null;
    let visibleEnd: Date | null = null;
    let peakAt: Date | null = null;
    let peakAlt = -90;
    let peakAzimuth = 0;

    for (const t of samples) {
      const time = new AstroTime(t);
      let ra: number;
      let dec: number;
      if (target.kind === 'planet') {
        const eq = Equator(target.body, time, observer, true, true);
        ra = eq.ra;
        dec = eq.dec;
      } else {
        ra = target.ra;
        dec = target.dec;
      }
      const horiz = Horizon(time, observer, ra, dec, 'normal');
      if (horiz.altitude > 0) {
        if (visibleStart === null) visibleStart = t;
        visibleEnd = t;
        if (horiz.altitude > peakAlt) {
          peakAlt = horiz.altitude;
          peakAzimuth = horiz.azimuth;
          peakAt = t;
        }
      }
    }

    if (visibleStart && visibleEnd && peakAt) {
      objects.push({
        name: target.name,
        color: target.color,
        visibleStart: visibleStart.toISOString(),
        visibleEnd: visibleEnd.toISOString(),
        peakAt: peakAt.toISOString(),
        peakAlt: Math.round(peakAlt * 10) / 10,
        peakAzimuth: Math.round(peakAzimuth),
      });
    } else {
      excludedCount++;
    }
  }

  objects.sort((a, b) => new Date(a.peakAt).getTime() - new Date(b.peakAt).getTime());

  return NextResponse.json(
    {
      darkWindow: { start: darkStart.toISOString(), end: darkEnd.toISOString() },
      objects,
      excludedCount,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800' } },
  );
}
