'use client';

import { useEffect, useState } from 'react';
import type { ForecastDay } from '@/lib/use-sky-data';

interface UseForecast {
  days: ForecastDay[];
  loading: boolean;
  error: string | null;
}

interface RawSkyHour {
  time: string;
  cloudCover: number;
  temp?: number;
  wind?: number;
  humidity?: number;
}
interface RawSkyDay {
  date: string;
  hours: RawSkyHour[];
}

function eveningHours(hours: RawSkyHour[]): RawSkyHour[] {
  const evening = hours.filter((h) => {
    const hr = parseInt(h.time.slice(11, 13), 10);
    return hr >= 20 || hr <= 4;
  });
  return evening.length ? evening : hours;
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function toDay(d: RawSkyDay): ForecastDay {
  if (!d.hours?.length) {
    return {
      date: d.date,
      cloudCoverPct: 50,
      badge: 'maybe',
      recommendation: 'Bright targets',
    };
  }

  const evening = eveningHours(d.hours);
  const cloudCoverPct = Math.round(avg(evening.map((h) => h.cloudCover)));

  // Daytime high uses every hour we have. Overnight low uses the night
  // window only — so the displayed temps match what the observer will
  // actually feel under the eyepiece.
  const temps = d.hours.map((h) => h.temp).filter((v): v is number => typeof v === 'number');
  const eveningTemps = evening.map((h) => h.temp).filter((v): v is number => typeof v === 'number');
  const windValues = evening.map((h) => h.wind).filter((v): v is number => typeof v === 'number');
  const humidityValues = evening.map((h) => h.humidity).filter((v): v is number => typeof v === 'number');

  return {
    date: d.date,
    cloudCoverPct,
    badge: cloudCoverPct < 30 ? 'go' : cloudCoverPct < 70 ? 'maybe' : 'skip',
    recommendation: cloudCoverPct < 30 ? 'Deep sky' : cloudCoverPct < 70 ? 'Bright targets' : 'Stay in',
    tempHigh: temps.length ? Math.round(Math.max(...temps)) : undefined,
    tempLow: eveningTemps.length ? Math.round(Math.min(...eveningTemps)) : undefined,
    windKmh: windValues.length ? Math.round(avg(windValues)) : undefined,
    humidityPct: humidityValues.length ? Math.round(avg(humidityValues)) : undefined,
  };
}

/**
 * Lightweight 7-day cloud-cover outlook. Hits only /api/sky/forecast, so it
 * doesn't drag in the planets / sun-moon / verify / timeline endpoints the
 * full useSkyData hook fans out to.
 */
export function useForecast(lat: number, lon: number): UseForecast {
  const [state, setState] = useState<UseForecast>({ days: [], loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    (async () => {
      try {
        const res = await fetch(`/api/sky/forecast?lat=${lat}&lon=${lon}`);
        if (!res.ok) throw new Error('forecast fetch failed');
        const raw: RawSkyDay[] = await res.json();
        if (cancelled) return;
        const days = raw.slice(0, 7).map(toDay);
        setState({ days, loading: false, error: null });
      } catch (err) {
        if (cancelled) return;
        setState({ days: [], loading: false, error: err instanceof Error ? err.message : 'failed' });
      }
    })();

    return () => { cancelled = true; };
  }, [lat, lon]);

  return state;
}
