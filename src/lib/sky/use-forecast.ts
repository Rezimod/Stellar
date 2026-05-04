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
}
interface RawSkyDay {
  date: string;
  hours: RawSkyHour[];
}

/** Average cloud cover across the evening / night window (20:00–04:00). */
function averageEveningCloud(hours: RawSkyHour[]): number {
  if (!hours?.length) return 50;
  const evening = hours.filter((h) => {
    const hr = parseInt(h.time.slice(11, 13), 10);
    return hr >= 20 || hr <= 4;
  });
  const pool = evening.length ? evening : hours;
  return Math.round(pool.reduce((s, h) => s + h.cloudCover, 0) / pool.length);
}

function toDay(d: RawSkyDay): ForecastDay {
  const cloudCoverPct = averageEveningCloud(d.hours);
  return {
    date: d.date,
    cloudCoverPct,
    badge: cloudCoverPct < 30 ? 'go' : cloudCoverPct < 70 ? 'maybe' : 'skip',
    recommendation: cloudCoverPct < 30 ? 'Deep sky' : cloudCoverPct < 70 ? 'Bright targets' : 'Stay in',
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
