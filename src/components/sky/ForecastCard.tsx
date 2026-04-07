'use client';

import { SkyDay } from '@/lib/sky-data';
import { useTranslations } from 'next-intl';

interface Props {
  day: SkyDay;
  isToday: boolean;
}

function badge(cloudCover: number): 'go' | 'maybe' | 'skip' {
  if (cloudCover < 30) return 'go';
  if (cloudCover <= 60) return 'maybe';
  return 'skip';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function observationWindow(hours: SkyDay['hours']): string {
  const good = hours.filter(h => h.cloudCover < 30);
  if (good.length === 0) return '—';
  const first = good[0].time.slice(11, 16);
  const last = good[good.length - 1].time.slice(11, 16);
  return first === last ? first : `${first}–${last}`;
}

const badgeStyles = {
  go:    'bg-[#34d399]/20 text-[#34d399] border-[#34d399]/40',
  maybe: 'bg-[#FFD166]/20 text-[#FFD166] border-[#FFD166]/40',
  skip:  'bg-red-500/20 text-red-400 border-red-500/40',
};

export default function ForecastCard({ day, isToday }: Props) {
  const t = useTranslations('sky');

  const bestHour = day.hours.reduce((a, b) => a.cloudCover <= b.cloudCover ? a : b);
  const kind = badge(bestHour.cloudCover);
  const visKm = Math.round(bestHour.visibility / 1000);
  const window = observationWindow(day.hours);

  if (isToday) {
    return (
      <div className="glass-card p-5 sm:p-6 border-[#38F0FF]/20">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[#38F0FF] text-xs font-medium tracking-widest uppercase mb-1">{t('today')}</p>
            <p className="text-white text-lg font-semibold">{formatDate(day.date)}</p>
          </div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded text-sm font-semibold border ${badgeStyles[kind]}`}>
            {t(kind)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card p-3 text-center">
            <p className="text-[var(--text-dim)] text-[10px] uppercase tracking-wide mb-1">{t('cloudCover')}</p>
            <p className="text-white text-xl font-bold">{bestHour.cloudCover}%</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-[var(--text-dim)] text-[10px] uppercase tracking-wide mb-1">{t('visibility')}</p>
            <p className="text-white text-xl font-bold">{visKm} km</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-[var(--text-dim)] text-[10px] uppercase tracking-wide mb-1">{t('bestHours')}</p>
            <p className="text-white text-sm font-bold leading-tight pt-1">{window}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-white text-sm font-medium min-w-0 truncate">{formatDate(day.date)}</p>
        <span className={`inline-flex items-center flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium border ${badgeStyles[kind]}`}>
          {t(kind)}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
        <span>☁ {bestHour.cloudCover}%</span>
        <span>👁 {visKm} km</span>
      </div>
      {window !== '—' && (
        <p className="text-[10px] text-[var(--text-dim)]">{t('bestHours')}: {window}</p>
      )}
    </div>
  );
}
