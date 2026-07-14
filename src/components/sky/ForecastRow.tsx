// src/components/sky/ForecastRow.tsx
'use client';

import { useLocale } from 'next-intl';
import type { ForecastDay } from '@/lib/use-sky-data';

interface ForecastRowProps {
  forecast: ForecastDay[];
}

export function ForecastRow({ forecast }: ForecastRowProps) {
  const dateLocale = useLocale() === 'ka' ? 'ka-GE' : 'en-US';

  if (forecast.length === 0) {
    return (
      <div className="forecast-row">
        <div
          className="forecast-day"
          style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-dim)' }}
        >
          Loading forecast…
        </div>
      </div>
    );
  }

  return (
    <div className="forecast-row">
      {forecast.map((day, i) => {
        const date = new Date(day.date);
        const isToday = i === 0;
        const dayLabel = isToday
          ? 'Tonight'
          : date.toLocaleDateString(dateLocale, { weekday: 'short' });

        return (
          <div key={day.date} className={`forecast-day ${isToday ? 'tonight' : ''}`}>
            <div className="label">{dayLabel}</div>
            <div className={`badge badge-${day.badge}`}>{day.badge.toUpperCase()}</div>
            <div className="cloud">{Math.round(day.cloudCoverPct)}%</div>
            <div className="sub">{day.recommendation}</div>
          </div>
        );
      })}
    </div>
  );
}
