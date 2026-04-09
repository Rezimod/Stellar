'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { SkyDay, SkyHour } from '@/lib/sky-data';
import type { PlanetInfo } from "@/lib/planets";
import { useLocation } from '@/hooks/useLocation';

const PLANET_EMOJIS: Record<string, string> = {
  moon: '🌕', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄',
};

function eveningStats(hours: SkyDay['hours']): { best: SkyHour; window: string; state: 'go' | 'maybe' | 'skip' } {
  const evening = hours.filter(h => {
    const hr = parseInt(h.time.slice(11, 13));
    return hr >= 19 && hr <= 23;
  });
  const pool = evening.length > 0 ? evening : hours;
  const best = pool.reduce((a, b) => a.cloudCover <= b.cloudCover ? a : b);
  const clear = pool.filter(h => h.cloudCover < 30);
  const window = clear.length > 0
    ? `${clear[0].time.slice(11, 16)}–${clear[clear.length - 1].time.slice(11, 16)}`
    : '';
  const state = best.cloudCover < 30 ? 'go' : best.cloudCover <= 60 ? 'maybe' : 'skip';
  return { best, window, state };
}

function nextClearDate(days: SkyDay[], locale: string): string {
  const next = days.slice(1).find(d => {
    const best = d.hours.reduce((a, b) => a.cloudCover <= b.cloudCover ? a : b);
    return best.cloudCover < 30;
  });
  if (!next) return '';
  return new Date(next.date + 'T12:00:00').toLocaleDateString(locale, {
    weekday: 'long', month: 'short', day: 'numeric',
  });
}

const borderStyle = {
  go:    { border: '1px solid rgba(52,211,153,0.3)', boxShadow: '0 0 24px rgba(52,211,153,0.06)' },
  maybe: { border: '1px solid rgba(255,209,102,0.3)', boxShadow: '0 0 24px rgba(255,209,102,0.06)' },
  skip:  { border: '1px solid rgba(255,255,255,0.1)' },
};
const labelColor = {
  go:    'text-[#34d399]/60',
  maybe: 'text-[#FFD166]/60',
  skip:  'text-white/20',
};
const badgeStyles = {
  go:    'bg-[#34d399]/20 text-[#34d399] border-[#34d399]/40',
  maybe: 'bg-[#FFD166]/20 text-[#FFD166] border-[#FFD166]/40',
  skip:  'bg-red-500/20 text-red-400 border-red-500/40',
};
const badgeLabel = { go: '● GO', maybe: '◐ MAYBE', skip: '✕ SKIP' };

interface CardData {
  state: 'go' | 'maybe' | 'skip';
  cloudCover: number;
  temp: number;
  wind: number;
  window: string;
  nextClear: string;
  planets: PlanetInfo[];
}

export default function TonightHighlights() {
  const t = useTranslations('sky');
  const pt = useTranslations('planets');
  const locale = useLocale();
  const { lat, lng, ready } = useLocation();
  const [card, setCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);

  const compute = useCallback(async (lat: number, lng: number) => {
    try {
      const [forecastRes, planetsRes] = await Promise.all([
        fetch(`/api/sky/forecast?lat=${lat}&lng=${lng}`),
        fetch(`/api/sky/planets?lat=${lat}&lng=${lng}`),
      ]);
      const days = await forecastRes.json() as SkyDay[];
      const planets = await planetsRes.json() as PlanetInfo[];
      if (!days.length) { setLoading(false); return; }

      const today = days[0];
      const { best, window, state } = eveningStats(today.hours);

      setCard({
        state,
        cloudCover: best.cloudCover,
        temp: best.temp,
        wind: best.wind,
        window,
        nextClear: nextClearDate(days, locale),
        planets: planets.filter(p => p.visible).sort((a, b) => b.altitude - a.altitude).slice(0, 2),
      });
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    if (ready) compute(lat, lng);
  }, [ready, lat, lng, compute]);

  if (loading) {
    return <div className="glass-card h-[120px] animate-pulse" />;
  }
  if (!card) return null;

  const { state, cloudCover, temp, wind, window, nextClear, planets } = card;

  return (
    <div className="glass-card p-5" style={borderStyle[state]}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className={`text-[10px] uppercase tracking-widest font-medium ${labelColor[state]}`}>
          {t('tonightHighlight')}
        </span>
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${badgeStyles[state]}`}>
          {badgeLabel[state]}
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mt-3 text-sm text-white/80">
        <span className="flex items-center gap-1.5 flex-shrink-0">☁ {cloudCover}%</span>
        <span className="flex items-center gap-1.5 flex-shrink-0">🌡 {Math.round(temp)}°C</span>
        <span className="flex items-center gap-1.5 flex-shrink-0">💨 {Math.round(wind)} km/h</span>
      </div>

      {/* Window / next clear */}
      <div className="mt-2">
        {state !== 'skip' && window ? (
          <p className="text-[#38F0FF] text-xs font-medium">
            {state === 'go' ? 'Best window' : 'Clearest window'}: {window}
          </p>
        ) : state === 'skip' ? (
          nextClear
            ? <p className="text-slate-400 text-xs">Next clear night: {nextClear}</p>
            : <p className="text-slate-500 text-xs">Cloudy all week — check back tomorrow</p>
        ) : null}
      </div>

      {/* Visible planets */}
      {state !== 'skip' && planets.length > 0 && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/[0.05]">
          {planets.map(p => (
            <span key={p.key} className="flex items-center gap-1.5 text-xs text-white">
              <span>{PLANET_EMOJIS[p.key] ?? '✦'}</span>
              <span>{pt(p.key as Parameters<typeof pt>[0])} ({p.altitude}°)</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
