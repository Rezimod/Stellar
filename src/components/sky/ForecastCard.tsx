'use client';

import { useState } from 'react';
import { Cloud, Stars, CloudMoon, CloudRain, Wind, Eye, Thermometer, Clock } from 'lucide-react';
import { SkyDay } from '@/lib/sky-data';
import { useTranslations, useLocale } from 'next-intl';

interface Props {
  day: SkyDay;
  isToday: boolean;
}

type SkyKind = 'go' | 'maybe' | 'skip';

function badge(cloudCover: number): SkyKind {
  if (cloudCover < 30) return 'go';
  if (cloudCover <= 60) return 'maybe';
  return 'skip';
}

function formatDate(dateStr: string, locale: string, short = false): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(locale, short
    ? { weekday: 'short', day: 'numeric' }
    : { weekday: 'short', month: 'short', day: 'numeric' });
}

function observationWindow(hours: SkyDay['hours']): string {
  const good = hours.filter(h => h.cloudCover < 30);
  if (good.length === 0) return '';
  const first = good[0].time.slice(11, 16);
  const last = good[good.length - 1].time.slice(11, 16);
  return first === last ? first : `${first}–${last}`;
}

const kindConfig: Record<SkyKind, {
  badge: { bg: string; border: string; color: string; label: string };
  border: string;
  barColor: string;
}> = {
  go:    {
    badge:   { bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)', color: '#34D399', label: 'GO' },
    border:  'rgba(52,211,153,0.2)',
    barColor: '#34D399',
  },
  maybe: {
    badge:   { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', color: '#F59E0B', label: 'MAYBE' },
    border:  'rgba(245,158,11,0.15)',
    barColor: '#F59E0B',
  },
  skip:  {
    badge:   { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', color: '#EF4444', label: 'SKIP' },
    border:  'rgba(255,255,255,0.06)',
    barColor: '#EF4444',
  },
};

function SkyIcon({ kind, size = 20 }: { kind: SkyKind; size?: number }) {
  if (kind === 'go') return <Stars size={size} color="#34D399" strokeWidth={1.5} />;
  if (kind === 'maybe') return <CloudMoon size={size} color="#F59E0B" strokeWidth={1.5} />;
  return <Cloud size={size} color="#94A3B8" strokeWidth={1.5} />;
}

function StatRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
      {icon}
      <span>{value}</span>
    </div>
  );
}

export default function ForecastCard({ day, isToday }: Props) {
  const t = useTranslations('sky');
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);

  const bestHour = day.hours.reduce((a, b) => a.cloudCover <= b.cloudCover ? a : b);
  const kind = badge(bestHour.cloudCover);
  const cfg = kindConfig[kind];
  const visKm = Math.round(bestHour.visibility / 1000);
  const window = observationWindow(day.hours);

  const nightHours = day.hours.filter(h => {
    const hr = parseInt(h.time.slice(11, 13));
    return hr >= 20 || hr <= 4;
  });
  const temps = nightHours.map(h => h.temp);
  const minTemp = temps.length ? Math.round(Math.min(...temps)) : Math.round(bestHour.temp);
  const maxTemp = temps.length ? Math.round(Math.max(...temps)) : Math.round(bestHour.temp);

  if (isToday) {
    return (
      <div
        className="card-base p-5"
        style={{
          borderColor: `rgba(99,102,241,0.25)`,
          boxShadow: '0 0 0 1px rgba(99,102,241,0.06), 0 4px 16px rgba(0,0,0,0.3)',
          transition: 'transform 200ms ease-out',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.01)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; }}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: 'var(--color-nebula-teal)' }}>
              {t('today')}
            </p>
            <p className="text-white text-base font-semibold">{formatDate(day.date, locale)}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <SkyIcon kind={kind} size={22} />
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold tracking-wide"
              style={{ background: cfg.badge.bg, border: `1px solid ${cfg.badge.border}`, color: cfg.badge.color }}
            >
              {cfg.badge.label}
            </span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>{t('cloudCover')}</p>
            <p className="text-white text-xl font-bold font-mono" style={{ color: cfg.badge.color }}>{bestHour.cloudCover}%</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>{t('visibility')}</p>
            <p className="text-white text-xl font-bold font-mono">{visKm} km</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Thermometer size={13} color="var(--color-text-muted)" strokeWidth={1.5} />
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{minTemp}–{maxTemp}°C</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Wind size={13} color="var(--color-text-muted)" strokeWidth={1.5} />
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{Math.round(bestHour.wind)} km/h</span>
          </div>
        </div>

        {/* Cloud cover bar */}
        <div className="mb-3">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${bestHour.cloudCover}%`,
                background: `linear-gradient(90deg, ${cfg.barColor}99, ${cfg.barColor})`,
              }}
            />
          </div>
        </div>

        {/* Best window */}
        {window && (
          <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            <Clock size={11} color="var(--color-nebula-teal)" strokeWidth={2} />
            <span className="text-[11px] uppercase tracking-widest font-medium" style={{ color: 'var(--color-nebula-teal)' }}>
              {t('bestHours')}
            </span>
            <span className="text-xs font-mono text-white ml-1">{window}</span>
          </div>
        )}

        {/* Hourly detail toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest mt-2 transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <span>{expanded ? '▲' : '▼'}</span>
          {expanded ? 'Hide hourly detail' : 'Show hourly detail'}
        </button>

        {expanded && (
          <div className="mt-3 pt-3 flex flex-col gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Evening · hour by hour
            </p>
            <div className="flex flex-col gap-1">
              {day.hours
                .filter(h => {
                  const hr = parseInt(h.time.slice(11, 13));
                  return hr >= 19 || hr <= 5;
                })
                .sort((a, b) => {
                  const ha = parseInt(a.time.slice(11, 13));
                  const hb = parseInt(b.time.slice(11, 13));
                  // Evening first (19-23), then post-midnight (0-5)
                  const ia = ha >= 19 ? ha - 19 : ha + 5;
                  const ib = hb >= 19 ? hb - 19 : hb + 5;
                  return ia - ib;
                })
                .map(h => {
                  const hr = h.time.slice(11, 16);
                  const cc = h.cloudCover;
                  const barColor = cc < 30 ? '#34D399' : cc < 60 ? '#F59E0B' : '#EF4444';
                  return (
                    <div key={h.time} className="flex items-center gap-3">
                      <span className="text-xs font-mono w-10 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                        {hr}
                      </span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <div className="h-full rounded-full" style={{ width: `${cc}%`, background: barColor, opacity: 0.7 }} />
                      </div>
                      <span className="text-[10px] w-8 text-right font-mono" style={{ color: barColor }}>
                        {cc}%
                      </span>
                      <span className="text-[10px] w-12 text-right" style={{ color: 'var(--color-text-muted)' }}>
                        {Math.round(h.temp)}°C
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Non-today compact card
  return (
    <div
      className="card-base p-3.5 flex flex-col gap-2.5 flex-shrink-0"
      style={{
        borderColor: cfg.border,
        minWidth: 120,
        transition: 'transform 200ms ease-out, border-color 200ms',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.02)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; }}
    >
      {/* Day + date */}
      <p className="text-white text-xs font-semibold truncate">{formatDate(day.date, locale, true)}</p>

      {/* Sky icon centered */}
      <div className="flex items-center justify-between gap-2">
        <SkyIcon kind={kind} size={18} />
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
          style={{ background: cfg.badge.bg, border: `1px solid ${cfg.badge.border}`, color: cfg.badge.color }}
        >
          {cfg.badge.label}
        </span>
      </div>

      {/* Mini stats */}
      <StatRow icon={<Cloud size={11} strokeWidth={1.5} />} value={`${bestHour.cloudCover}%`} />
      <StatRow icon={<Eye size={11} strokeWidth={1.5} />} value={`${visKm} km`} />

      {/* Cloud cover bar */}
      <div className="h-1 rounded-full overflow-hidden mt-auto" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${bestHour.cloudCover}%`,
            background: cfg.barColor,
            opacity: 0.7,
          }}
        />
      </div>

      {window && (
        <p className="text-[10px] font-mono" style={{ color: 'var(--color-nebula-teal)', opacity: 0.8 }}>{window}</p>
      )}
    </div>
  );
}
