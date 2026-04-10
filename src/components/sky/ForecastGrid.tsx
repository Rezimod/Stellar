'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { SkyDay } from '@/lib/sky-data';
import ForecastCard from './ForecastCard';
import { useLocation } from '@/hooks/useLocation';

export default function ForecastGrid() {
  const t = useTranslations('sky');
  const { lat, lng, ready } = useLocation();
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
            <div className="w-3 h-3 rounded-full border border-[#34d399] border-t-transparent animate-spin flex-shrink-0" />
            <span className="text-slate-500 text-xs">Detecting your location…</span>
          </div>
        )}
        <div className="glass-card p-5 animate-pulse">
          <div className="h-3 w-12 bg-white/10 rounded mb-2" />
          <div className="h-5 w-32 bg-white/10 rounded mb-4" />
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map(i => <div key={i} className="glass-card p-3 h-16 animate-pulse" />)}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-4 h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-5 border-[#FFD166]/30 flex flex-col items-center gap-3 text-center">
        <p className="text-[#FFD166] text-sm">{t('forecastError')}</p>
        <button
          onClick={() => load(lat, lng)}
          className="px-4 py-2 rounded-lg bg-[#FFD166]/10 border border-[#FFD166]/30 text-[#FFD166] text-sm hover:bg-[#FFD166]/20 transition-colors"
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {rest.map(day => (
          <ForecastCard key={day.date} day={day} isToday={false} />
        ))}
      </div>
    </div>
  );
}
