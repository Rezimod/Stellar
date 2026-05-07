'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { SkyDay } from '@/lib/sky-data';
import ForecastCard from './ForecastCard';
import { useLocation } from '@/lib/location';

export default function ForecastGrid() {
  const t = useTranslations('sky');
  const { location, loading: locationLoading } = useLocation();
  const { lat, lon: lng } = location;
  const ready = !locationLoading;
  const [days, setDays] = useState<SkyDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback((lat: number, lng: number) => {
    setLoading(true);
    setError(false);
    fetch(`/api/sky/forecast?lat=${lat}&lng=${lng}`)
      .then(r => {
        if (!r.ok) throw new Error();
        return r.json() as Promise<SkyDay[]>;
      })
      .then(data => { setDays(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  useEffect(() => {
    if (ready) load(lat, lng);
  }, [ready, lat, lng, load]);

  if (!ready || loading) {
    return (
      <div className="flex flex-col gap-4">
        {!ready && (
          <div className="flex items-center gap-2 px-1">
            <div className="w-3 h-3 rounded-full border border-[var(--seafoam)] border-t-transparent animate-spin flex-shrink-0" />
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Detecting your location…</span>
          </div>
        )}
        {/* Today skeleton */}
        <div className="glass-card p-5 animate-pulse h-36" />
        {/* Grid skeleton */}
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card h-28 animate-pulse flex-shrink-0" style={{ minWidth: 120 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-5 flex flex-col items-center gap-3 text-center"
        style={{ border: '1px solid rgba(255, 179, 71,0.2)' }}>
        <p className="text-sm" style={{ color: 'var(--color-solar-amber)' }}>{t('forecastError')}</p>
        <button
          onClick={() => load(lat, lng)}
          className="px-4 py-2 rounded-lg text-sm transition-colors"
          style={{ background: 'rgba(255, 179, 71,0.1)', border: '1px solid rgba(255, 179, 71,0.25)', color: 'var(--terracotta)' }}
        >
          {t('retry')}
        </button>
      </div>
    );
  }

  const [today, ...rest] = days;

  return (
    <div className="flex flex-col gap-4">
      {today && <ForecastCard day={today} isToday />}

      {/* 6 upcoming days — horizontal scroll on mobile, wrap on sm+ */}
      <div
        className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1"
        style={{ scrollbarWidth: 'none' }}
      >
        {rest.map(day => (
          <ForecastCard key={day.date} day={day} isToday={false} />
        ))}
      </div>
    </div>
  );
}
