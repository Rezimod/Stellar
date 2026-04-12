'use client';

import { useState, useEffect } from 'react';
import { useLocation } from '@/lib/location';
import type { SkyDay } from '@/lib/sky-data';
import type { PlanetInfo } from '@/lib/planets';

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

function formatDay(dateStr: string, index: number): string {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tom';
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
}

const PLANET_EMOJI: Record<string, string> = {
  moon: '🌙', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄',
};

function getDayStats(day: SkyDay) {
  const nightHours = day.hours.filter(h => {
    const hr = new Date(h.time).getHours();
    return hr >= 20 || hr < 4;
  });
  const hours = nightHours.length > 0 ? nightHours : day.hours;
  const avgCloud = hours.length > 0
    ? Math.round(hours.reduce((s, h) => s + h.cloudCover, 0) / hours.length)
    : null;
  const visibility =
    avgCloud === null ? null
    : avgCloud < 20   ? 'Excellent'
    : avgCloud < 50   ? 'Good'
    : avgCloud < 70   ? 'Fair'
    : 'Poor';
  const clearHours = hours.filter(h => h.cloudCover < 40);
  const bestWindow: string | null = (() => {
    if (clearHours.length === 0) return null;
    const first = new Date(clearHours[0].time);
    const last  = new Date(clearHours[clearHours.length - 1].time);
    const fmt   = (d: Date) => `${d.getHours().toString().padStart(2, '0')}:00`;
    return `${fmt(first)}–${fmt(last)}`;
  })();
  const status: 'Go' | 'Maybe' | 'Skip' =
    avgCloud === null ? 'Skip'
    : avgCloud < 30   ? 'Go'
    : avgCloud < 60   ? 'Maybe'
    : 'Skip';
  return { avgCloud, visibility, bestWindow, status };
}

export default function HomeSkyPreview() {
  const { location } = useLocation();
  const [forecast, setForecast] = useState<SkyDay[] | null>(null);
  const [planets,  setPlanets]  = useState<PlanetInfo[] | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [planetsLoading, setPlanetsLoading] = useState(false);

  useEffect(() => {
    const lat = location.lat || 41.6941;
    const lng = location.lon || 44.8337;
    setForecast(null);
    setPlanets(null);
    setSelectedDay(0);
    fetch(`/api/sky/forecast?lat=${lat}&lng=${lng}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setForecast(d))
      .catch(() => setForecast([]));
    fetch(`/api/sky/planets?lat=${lat}&lng=${lng}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setPlanets(d))
      .catch(() => setPlanets([]));
  }, [location.lat, location.lon]);

  function selectDay(index: number, dateStr: string) {
    setSelectedDay(index);
    const lat = location.lat || 41.6941;
    const lng = location.lon || 44.8337;
    setPlanetsLoading(true);
    const date = index === 0 ? new Date().toISOString() : `${dateStr}T21:00:00`;
    fetch(`/api/sky/planets?lat=${lat}&lng=${lng}&date=${encodeURIComponent(date)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setPlanets(d); setPlanetsLoading(false); })
      .catch(() => setPlanetsLoading(false));
  }

  if (forecast === null || planets === null) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[56, 44, 44].map((h, i) => (
          <div key={i} style={{
            height: h, borderRadius: 12,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
            animation: 'pulse 2s infinite',
          }} />
        ))}
      </div>
    );
  }

  const selectedForecast = forecast?.[selectedDay];
  const { avgCloud, visibility, bestWindow, status } = selectedForecast
    ? getDayStats(selectedForecast)
    : { avgCloud: null, visibility: null, bestWindow: null, status: 'Skip' as const };

  const statusStyle = {
    Go:    { bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)',  color: '#34d399'  },
    Maybe: { bg: 'rgba(255,209,102,0.1)',  border: 'rgba(255,209,102,0.2)',  color: '#FFD166'  },
    Skip:  { bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.15)', color: 'rgba(148,163,184,0.7)' },
  }[status];

  const visiblePlanets = [...(planets ?? [])]
    .filter(p => p.altitude > -5)
    .sort((a, b) => b.altitude - a.altitude)
    .slice(0, 5);

  const locationLabel = location.city
    ? `${location.city}${location.country ? `, ${location.country}` : ''}`
    : 'Global';

  const selectedLabel = selectedDay === 0 ? 'Tonight' : selectedDay === 1 ? 'Tomorrow' : formatDay(forecast[selectedDay]?.date ?? '', selectedDay);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Sky summary card — updates with selected day */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 8,
        background: statusStyle.bg,
        border: `1px solid ${statusStyle.border}`,
        borderRadius: 12,
        padding: '10px 14px',
        transition: 'background 0.3s, border-color 0.3s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{
            background: statusStyle.bg,
            border: `1px solid ${statusStyle.border}`,
            color: statusStyle.color,
            fontSize: 11, fontWeight: 700,
            padding: '2px 9px', borderRadius: 999,
          }}>
            {status === 'Go' ? '✦ Go' : status === 'Maybe' ? '◑ Maybe' : '✕ Skip'}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{selectedLabel}</span>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {avgCloud !== null && (
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>☁ {avgCloud}%</span>
            )}
            {visibility && (
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>👁 {visibility}</span>
            )}
            {bestWindow && (
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>⏱ {bestWindow}</span>
            )}
          </div>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>📍 {locationLabel}</span>
      </div>

      {/* Visible planets — update with selected day */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', minHeight: 32 }}>
        {planetsLoading ? (
          [0,1,2,3].map(i => (
            <div key={i} style={{ height: 30, width: 80, borderRadius: 999, background: 'rgba(255,255,255,0.03)', animation: 'pulse 2s infinite' }} />
          ))
        ) : visiblePlanets.length > 0 ? (
          visiblePlanets.map(p => {
            const alt = Math.round(p.altitude);
            const isUp = alt > 0;
            const quality = alt > 30 ? 'good' : alt > 10 ? 'ok' : 'low';
            const chipColor =
              quality === 'good' ? { text: '#34d399', border: 'rgba(52,211,153,0.25)', bg: 'rgba(52,211,153,0.07)' }
              : quality === 'ok' ? { text: '#FFD166', border: 'rgba(255,209,102,0.2)',  bg: 'rgba(255,209,102,0.06)' }
              :                    { text: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.1)', bg: 'rgba(255,255,255,0.03)' };
            return (
              <div key={p.key} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 999,
                background: chipColor.bg, border: `1px solid ${chipColor.border}`,
              }}>
                <span style={{ fontSize: 13 }}>{PLANET_EMOJI[p.key] ?? '✦'}</span>
                <span style={{ color: chipColor.text, fontSize: 12, fontWeight: 500 }}>
                  {p.key.charAt(0).toUpperCase() + p.key.slice(1)}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>
                  {isUp ? `${alt}°` : 'below'}
                </span>
              </div>
            );
          })
        ) : null}
      </div>

      {/* 7-day forecast ribbon — clickable */}
      {forecast.length > 0 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          {forecast.slice(0, 7).map((day, i) => {
            const badge = dayBadge(day);
            const isSelected = i === selectedDay;
            const bs =
              badge === 'Go'    ? { bg: 'rgba(52,211,153,0.12)',  color: '#34d399',               border: 'rgba(52,211,153,0.3)'  }
              : badge === 'Maybe' ? { bg: 'rgba(255,209,102,0.1)',  color: '#FFD166',               border: 'rgba(255,209,102,0.2)' }
              :                     { bg: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.3)', border: 'rgba(255,255,255,0.07)' };
            return (
              <button
                key={day.date}
                onClick={() => selectDay(i, day.date)}
                style={{
                  flex: '0 0 auto', minWidth: 56, cursor: 'pointer',
                  background: isSelected ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isSelected ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.05)'}`,
                  borderRadius: 10,
                  padding: '7px 8px',
                  textAlign: 'center',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  outline: 'none',
                  boxShadow: isSelected ? '0 0 0 1px rgba(52,211,153,0.25)' : 'none',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
              >
                <span style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)', fontSize: 10 }}>
                  {formatDay(day.date, i)}
                </span>
                <span style={{
                  background: bs.bg, color: bs.color,
                  border: `1px solid ${bs.border}`,
                  fontSize: 10, fontWeight: 700,
                  padding: '1px 6px', borderRadius: 999,
                }}>
                  {badge}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
