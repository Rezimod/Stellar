'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Moon, Circle, Sparkles, Orbit, Globe } from 'lucide-react';
import type { SkyDay } from '@/lib/sky-data';
import type { PlanetInfo } from '@/lib/planets';
import type { LucideIcon } from 'lucide-react';

const PLANET_META: Record<string, { name: string; icon: LucideIcon; color: string }> = {
  moon:    { name: 'Moon',    icon: Moon,     color: '#F59E0B' },
  mercury: { name: 'Mercury', icon: Circle,   color: '#94a3b8' },
  venus:   { name: 'Venus',   icon: Sparkles, color: '#FFD166' },
  mars:    { name: 'Mars',    icon: Circle,   color: '#ef4444' },
  jupiter: { name: 'Jupiter', icon: Orbit,    color: '#38F0FF' },
  saturn:  { name: 'Saturn',  icon: Globe,    color: '#a78bfa' },
};

function planetStatus(alt: number): 'Excellent' | 'Good' | 'Poor' {
  if (alt > 30) return 'Excellent';
  if (alt > 10) return 'Good';
  return 'Poor';
}

function dayBadge(day: SkyDay): 'Go' | 'Maybe' | 'Skip' {
  const nightHours = day.hours.filter(h => {
    const hr = new Date(h.time).getHours();
    return hr >= 20 || hr < 4;
  });
  const hours = nightHours.length > 0 ? nightHours : day.hours;
  const avg = hours.reduce((s, h) => s + h.cloudCover, 0) / hours.length;
  if (avg < 30) return 'Go';
  if (avg < 60) return 'Maybe';
  return 'Skip';
}

function fmtRiseTime(iso: string | Date | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso as string);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  } catch {
    return null;
  }
}

function formatDayLabel(dateStr: string, index: number): string {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

export default function HomeSkyPreview() {
  const [forecast, setForecast] = useState<SkyDay[] | null>(null);
  const [planets, setPlanets] = useState<PlanetInfo[] | null>(null);

  useEffect(() => {
    fetch('/api/sky/forecast?lat=41.6941&lng=44.8337')
      .then(r => r.ok ? r.json() : null)
      .then(d => setForecast(d))
      .catch(() => {});
    fetch('/api/sky/planets?lat=41.6941&lng=44.8337')
      .then(r => r.ok ? r.json() : null)
      .then(d => setPlanets(d))
      .catch(() => {});
  }, []);

  const loading = forecast === null || planets === null;

  // Derive tonight's sky condition from today's forecast
  const todayForecast = forecast?.[0];
  const nightHours = todayForecast?.hours.filter(h => {
    const hr = new Date(h.time).getHours();
    return hr >= 20 || hr < 4;
  }) ?? [];
  const tonightHours = nightHours.length > 0 ? nightHours : (todayForecast?.hours ?? []);
  const avgCloud = tonightHours.length > 0
    ? Math.round(tonightHours.reduce((s, h) => s + h.cloudCover, 0) / tonightHours.length)
    : null;
  const tonightVisibility =
    avgCloud === null ? null
    : avgCloud < 20 ? 'Excellent'
    : avgCloud < 50 ? 'Good'
    : avgCloud < 70 ? 'Fair'
    : 'Poor';

  // Best viewing window: first contiguous run of clear night hours
  const clearHours = tonightHours.filter(h => h.cloudCover < 40);
  const bestWindow: string | null = (() => {
    if (clearHours.length === 0) return null;
    const first = new Date(clearHours[0].time);
    const last = new Date(clearHours[clearHours.length - 1].time);
    const fmt = (d: Date) => `${d.getHours().toString().padStart(2, '0')}:00`;
    return `${fmt(first)}–${fmt(last)}`;
  })();

  // Visible planets sorted by altitude descending
  const visiblePlanets = planets
    ? [...planets].filter(p => p.altitude > -5).sort((a, b) => b.altitude - a.altitude)
    : [];

  if (loading) {
    return (
      <>
        {/* Banner skeleton */}
        <div style={{
          background: 'rgba(52,211,153,0.04)',
          border: '1px solid rgba(52,211,153,0.08)',
          borderRadius: 12,
          padding: '8px 16px',
          marginBottom: 12,
          height: 38,
          animation: 'pulse 2s infinite',
        }} />
        {/* Planet cards skeleton */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          {[0,1,2,3,4].map(i => (
            <div key={i} style={{
              minWidth: 140, height: 112, flexShrink: 0,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 16,
            }} />
          ))}
        </div>
        {/* Ribbon skeleton */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[0,1,2,3,4,5,6].map(i => (
            <div key={i} style={{
              width: 80, height: 52, flexShrink: 0,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 10,
            }} />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Sky condition banner */}
      <div style={{
        background: 'rgba(52,211,153,0.06)',
        border: '1px solid rgba(52,211,153,0.12)',
        borderRadius: 12,
        padding: '8px 16px',
        marginBottom: 12,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 14px' }}>
          {avgCloud !== null && (
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Cloud Cover: {avgCloud}%</span>
          )}
          {tonightVisibility && (
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
              Visibility: <span style={{ color: '#34d399' }}>{tonightVisibility}</span>
            </span>
          )}
          {bestWindow && (
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Best time: {bestWindow}</span>
          )}
        </div>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>📍 Tbilisi, Georgia</span>
      </div>

      {/* Planet cards horizontal scroll */}
      <div style={{
        display: 'flex',
        gap: 10,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
        marginBottom: 12,
        paddingBottom: 4,
      }}>
        {visiblePlanets.map(planet => {
          const meta = PLANET_META[planet.key] ?? { name: planet.key, icon: Sparkles, color: '#FFD166' };
          const status = planetStatus(planet.altitude);
          const riseTime = fmtRiseTime(planet.rise);
          const badge =
            status === 'Excellent' ? { bg: 'rgba(52,211,153,0.15)', color: '#34d399' }
            : status === 'Good'    ? { bg: 'rgba(255,209,102,0.15)', color: '#FFD166' }
            :                        { bg: 'rgba(148,163,184,0.15)', color: 'rgba(255,255,255,0.5)' };
          const timeLabel = planet.altitude > 0
            ? `Alt ${Math.round(planet.altitude)}°`
            : riseTime ? `Rises ${riseTime}` : 'Below horizon';
          return (
            <Link
              key={planet.key}
              href="/missions"
              style={{
                minWidth: 140,
                flexShrink: 0,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: 16,
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                transition: 'border-color 0.2s, transform 0.2s',
              }}
              onMouseOver={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'rgba(52,211,153,0.3)';
                el.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'rgba(255,255,255,0.08)';
                el.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${meta.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <meta.icon size={20} color={meta.color} strokeWidth={1.5} />
              </div>
              <p style={{ color: 'white', fontSize: 13, fontWeight: 600, marginTop: 8, marginBottom: 6 }}>{meta.name}</p>
              <span style={{
                background: badge.bg,
                color: badge.color,
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 999,
              }}>
                {status}
              </span>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 6, marginBottom: 0 }}>{timeLabel}</p>
            </Link>
          );
        })}
      </div>

      {/* 7-day forecast ribbon */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        {forecast.slice(0, 7).map((day, i) => {
          const badge = dayBadge(day);
          const bs =
            badge === 'Go'    ? { bg: 'rgba(52,211,153,0.15)', color: '#34d399' }
            : badge === 'Maybe' ? { bg: 'rgba(255,209,102,0.12)', color: '#FFD166' }
            :                     { bg: 'rgba(148,163,184,0.08)', color: 'rgba(148,163,184,0.7)' };
          return (
            <div key={day.date} style={{
              flex: '0 0 auto',
              width: 80,
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${i === 0 ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 10,
              padding: '8px 12px',
              textAlign: 'center',
            }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: '0 0 4px 0' }}>
                {formatDayLabel(day.date, i)}
              </p>
              <span style={{
                background: bs.bg,
                color: bs.color,
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: 999,
                whiteSpace: 'nowrap',
              }}>
                {badge}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
