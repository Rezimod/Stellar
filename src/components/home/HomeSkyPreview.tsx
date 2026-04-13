'use client';

import { useState, useEffect } from 'react';
import { useLocation } from '@/lib/location';
import type { SkyDay, SkyHour } from '@/lib/sky-data';
import type { PlanetInfo } from '@/lib/planets';

const PLANET_SYMBOL: Record<string, string> = {
  moon: '☽', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄',
};

const PLANET_COLOR: Record<string, string> = {
  moon: '#E2D5B0', mercury: '#B5B5C3', venus: '#F4D9A0',
  mars: '#E8836A', jupiter: '#C8A96E', saturn: '#D4BE8A',
};

function dayBadge(day: SkyDay): 'Go' | 'Maybe' | 'Skip' {
  const nightHours = day.hours.filter(h => { const hr = new Date(h.time).getHours(); return hr >= 20 || hr < 4; });
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

function getDayStats(day: SkyDay) {
  const nightHours = day.hours.filter(h => { const hr = new Date(h.time).getHours(); return hr >= 20 || hr < 4; });
  const hours = nightHours.length > 0 ? nightHours : day.hours;
  const avgCloud = hours.length > 0
    ? Math.round(hours.reduce((s, h) => s + h.cloudCover, 0) / hours.length)
    : null;
  const avgHumidity = hours.length > 0
    ? Math.round(hours.reduce((s, h) => s + h.humidity, 0) / hours.length)
    : null;
  const avgWind = hours.length > 0
    ? Math.round(hours.reduce((s, h) => s + h.wind, 0) / hours.length)
    : null;
  const avgTemp = hours.length > 0
    ? Math.round(hours.reduce((s, h) => s + h.temp, 0) / hours.length)
    : null;
  const status: 'Go' | 'Maybe' | 'Skip' =
    avgCloud === null ? 'Skip'
    : avgCloud < 30 ? 'Go'
    : avgCloud < 60 ? 'Maybe'
    : 'Skip';
  return { avgCloud, avgHumidity, avgWind, avgTemp, status };
}

// Night hours 20:00–23:00 + 00:00–04:00
function getNightHours(day: SkyDay): SkyHour[] {
  return day.hours.filter(h => {
    const hr = new Date(h.time).getHours();
    return hr >= 20 || hr < 4;
  });
}

function cloudColor(cover: number): string {
  if (cover < 25) return '#34d399';
  if (cover < 50) return '#86efac';
  if (cover < 70) return '#FFD166';
  return 'rgba(148,163,184,0.25)';
}

// Simple moon illumination from date (0–1)
function moonIllumination(date: Date): number {
  const knownNewMoon = new Date('2000-01-06').getTime();
  const synodicPeriod = 29.53058867 * 86400000;
  const phase = ((date.getTime() - knownNewMoon) % synodicPeriod + synodicPeriod) % synodicPeriod;
  return (1 - Math.cos((phase / synodicPeriod) * 2 * Math.PI)) / 2;
}

function moonPhaseName(illum: number): string {
  if (illum < 0.05) return 'New';
  if (illum < 0.45) return 'Crescent';
  if (illum < 0.55) return 'Quarter';
  if (illum < 0.95) return 'Gibbous';
  return 'Full';
}

function fmtTime(d: Date | string | null): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '—';
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

// Night timeline: 8 bars for 20–23 + 00–03
function NightTimeline({ hours }: { hours: SkyHour[] }) {
  const slots = [20, 21, 22, 23, 0, 1, 2, 3];
  const byHour: Record<number, number> = {};
  for (const h of hours) {
    byHour[new Date(h.time).getHours()] = h.cloudCover;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Night window (8pm – 4am)
      </span>
      <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 40 }}>
        {slots.map(hr => {
          const cover = byHour[hr] ?? 100;
          const barH = Math.max(4, Math.round((1 - cover / 100) * 36));
          const color = cloudColor(cover);
          const label = hr === 0 ? '12a' : hr < 4 ? `${hr}a` : `${hr}p`;
          return (
            <div key={hr} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{
                width: '100%', height: 36,
                display: 'flex', alignItems: 'flex-end',
                background: 'rgba(255,255,255,0.03)', borderRadius: 4,
              }}>
                <div style={{
                  width: '100%', height: barH,
                  background: color,
                  borderRadius: 4,
                  opacity: cover < 70 ? 1 : 0.4,
                  transition: 'height 0.8s cubic-bezier(0.22,1,0.36,1)',
                  boxShadow: cover < 50 ? `0 0 6px ${color}55` : 'none',
                }} />
              </div>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 8, fontWeight: 500 }}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Planet row in the list
function PlanetRow({ planet, index }: { planet: PlanetInfo; index: number }) {
  const quality = planet.altitude > 30 ? 'good' : planet.altitude > 10 ? 'ok' : 'low';
  const color = PLANET_COLOR[planet.key] ?? 'rgba(255,255,255,0.5)';
  const dimmed = quality === 'low';
  const symbol = PLANET_SYMBOL[planet.key] ?? '✦';
  const name = planet.key.charAt(0).toUpperCase() + planet.key.slice(1);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 12px',
      background: index % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
      borderRadius: 10,
      opacity: dimmed ? 0.45 : 1,
      transition: 'opacity 0.2s',
    }}>
      {/* Symbol + name */}
      <div style={{ width: 22, textAlign: 'center', fontSize: 16, color, flexShrink: 0 }}>
        {symbol}
      </div>
      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, minWidth: 54 }}>{name}</span>

      {/* Altitude bar */}
      <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
        <div style={{
          height: '100%',
          width: `${Math.max(2, Math.min(100, (planet.altitude / 90) * 100))}%`,
          background: quality === 'good' ? '#34d399' : quality === 'ok' ? '#FFD166' : 'rgba(148,163,184,0.3)',
          borderRadius: 2,
          transition: 'width 1s cubic-bezier(0.22,1,0.36,1)',
        }} />
      </div>

      {/* Alt value */}
      <span style={{
        color: quality === 'good' ? '#34d399' : quality === 'ok' ? '#FFD166' : 'rgba(148,163,184,0.4)',
        fontSize: 11, fontWeight: 700, fontFamily: 'monospace', minWidth: 30, textAlign: 'right',
      }}>
        {Math.round(planet.altitude)}°
      </span>

      {/* Rise / Set */}
      <div style={{ display: 'flex', gap: 6, marginLeft: 4 }}>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: 'monospace' }}>
          ↑{fmtTime(planet.rise)}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10, fontFamily: 'monospace' }}>
          ↓{fmtTime(planet.set)}
        </span>
      </div>

      {/* Direction */}
      <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 9.5, minWidth: 20, textAlign: 'right', fontWeight: 600 }}>
        {planet.azimuthDir}
      </span>
    </div>
  );
}

export default function HomeSkyPreview() {
  const { location } = useLocation();
  const [forecast, setForecast] = useState<SkyDay[] | null>(null);
  const [planets, setPlanets] = useState<PlanetInfo[] | null>(null);
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[130, 100, 52].map((h, i) => (
          <div key={i} style={{
            height: h, borderRadius: 16,
            background: 'rgba(255,255,255,0.02)',
            animation: 'pulse 2s ease-in-out infinite',
          }} />
        ))}
      </div>
    );
  }

  const selectedForecast = forecast?.[selectedDay];
  const { avgCloud, avgHumidity, avgWind, status } = selectedForecast
    ? getDayStats(selectedForecast)
    : { avgCloud: null, avgHumidity: null, avgWind: null, status: 'Skip' as const };

  const nightHours = selectedForecast ? getNightHours(selectedForecast) : [];

  const visiblePlanets = [...(planets ?? [])]
    .filter(p => p.altitude > -5)
    .sort((a, b) => b.altitude - a.altitude)
    .slice(0, 6);

  const moon = visiblePlanets.find(p => p.key === 'moon');
  const planetsNoMoon = visiblePlanets.filter(p => p.key !== 'moon');

  const locationLabel = location.city
    ? `${location.city}${location.country ? `, ${location.country}` : ''}`
    : 'Global';

  const selectedDate = selectedDay === 0
    ? new Date()
    : new Date(`${forecast[selectedDay]?.date ?? ''}T21:00:00`);
  const moonIllum = moonIllumination(selectedDate);
  const moonPct = Math.round(moonIllum * 100);
  const moonName = moonPhaseName(moonIllum);

  const STATUS_STYLE = {
    Go:    { color: '#34d399', border: 'rgba(52,211,153,0.25)',  bg: 'rgba(52,211,153,0.08)',  label: 'Go' },
    Maybe: { color: '#FFD166', border: 'rgba(255,209,102,0.22)', bg: 'rgba(255,209,102,0.07)', label: 'Maybe' },
    Skip:  { color: 'rgba(148,163,184,0.6)', border: 'rgba(255,255,255,0.08)', bg: 'rgba(255,255,255,0.02)', label: 'Skip' },
  }[status];

  const moonWarning = moonIllum > 0.7 && status !== 'Skip';

  const stats: { label: string; value: string; sub?: string; warn?: boolean }[] = [
    { label: 'Cloud', value: avgCloud !== null ? `${avgCloud}%` : '—', warn: (avgCloud ?? 0) > 60 },
    { label: 'Humidity', value: avgHumidity !== null ? `${avgHumidity}%` : '—', warn: (avgHumidity ?? 0) > 85 },
    { label: 'Wind', value: avgWind !== null ? `${avgWind}km/h` : '—', warn: (avgWind ?? 0) > 25 },
    { label: 'Moon', value: `${moonPct}%`, sub: moonName, warn: moonWarning },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── MAIN CONDITIONS CARD ── */}
      <div style={{
        borderRadius: 18,
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        padding: '16px 16px 14px',
        display: 'flex', flexDirection: 'column', gap: 14,
        animation: 'fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both',
      }}>

        {/* Header row: status + location */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
              padding: '3px 10px', borderRadius: 999,
              background: STATUS_STYLE.bg,
              border: `1px solid ${STATUS_STYLE.border}`,
              color: STATUS_STYLE.color,
            }}>
              {STATUS_STYLE.label.toUpperCase()}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
              {selectedDay === 0 ? 'Tonight' : selectedDay === 1 ? 'Tomorrow' : formatDay(forecast[selectedDay]?.date ?? '', selectedDay)}
            </span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 9 }}>📍</span>{locationLabel}
          </span>
        </div>

        {/* Night timeline */}
        {nightHours.length > 0 && <NightTimeline hours={nightHours} />}

        {/* Condition pills */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {stats.map(s => (
            <div key={s.label} style={{
              padding: '8px 6px',
              borderRadius: 10,
              background: s.warn ? 'rgba(255,180,0,0.05)' : 'rgba(255,255,255,0.025)',
              border: `1px solid ${s.warn ? 'rgba(255,180,0,0.18)' : 'rgba(255,255,255,0.06)'}`,
              textAlign: 'center',
              display: 'flex', flexDirection: 'column', gap: 2,
            }}>
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 8.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {s.label}
              </span>
              <span style={{
                color: s.warn ? '#FFD166' : 'rgba(255,255,255,0.8)',
                fontSize: 13, fontWeight: 700, fontFamily: 'monospace', lineHeight: 1,
              }}>
                {s.value}
              </span>
              {s.sub && (
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 8.5 }}>{s.sub}</span>
              )}
            </div>
          ))}
        </div>

        {/* Moon warning */}
        {moonWarning && (
          <div style={{
            padding: '7px 11px',
            borderRadius: 9,
            background: 'rgba(255,209,102,0.05)',
            border: '1px solid rgba(255,209,102,0.15)',
            fontSize: 11, color: 'rgba(255,209,102,0.75)',
          }}>
            Bright moon ({moonPct}%) — faint deep-sky objects will be washed out
          </div>
        )}
      </div>

      {/* ── PLANET LIST ── */}
      {(planetsNoMoon.length > 0 || planetsLoading) && (
        <div style={{
          borderRadius: 18,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
          animation: 'fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) 0.06s both',
        }}>
          {/* Header */}
          <div style={{
            padding: '10px 12px 8px',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Planets tonight
            </span>
            <div style={{ display: 'flex', gap: 10, fontSize: 8.5, color: 'rgba(255,255,255,0.15)', fontWeight: 500 }}>
              <span>Alt</span><span>Rise / Set</span><span>Dir</span>
            </div>
          </div>

          {planetsLoading ? (
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.02)', animation: 'pulse 2s ease-in-out infinite' }} />
              ))}
            </div>
          ) : (
            <div style={{ padding: '4px 4px' }}>
              {/* Moon row at top if visible */}
              {moon && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                }}>
                  <span style={{ fontSize: 16, color: '#E2D5B0', width: 22, textAlign: 'center', flexShrink: 0 }}>☽</span>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, minWidth: 54 }}>Moon</span>
                  <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${Math.max(2, Math.min(100, (moon.altitude / 90) * 100))}%`, background: '#E2D5B0', borderRadius: 2 }} />
                  </div>
                  <span style={{ color: '#E2D5B0', fontSize: 11, fontWeight: 700, fontFamily: 'monospace', minWidth: 30, textAlign: 'right' }}>
                    {Math.round(moon.altitude)}°
                  </span>
                  <div style={{ display: 'flex', gap: 6, marginLeft: 4 }}>
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: 'monospace' }}>↑{fmtTime(moon.rise)}</span>
                    <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10, fontFamily: 'monospace' }}>↓{fmtTime(moon.set)}</span>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 9.5, minWidth: 20, textAlign: 'right', fontWeight: 600 }}>{moon.azimuthDir}</span>
                </div>
              )}
              {planetsNoMoon.map((p, i) => <PlanetRow key={p.key} planet={p} index={i} />)}
            </div>
          )}
        </div>
      )}

      {/* ── 7-DAY STRIP ── */}
      {forecast.length > 0 && (
        <div style={{
          display: 'flex', gap: 5,
          overflowX: 'auto', scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          animation: 'fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) 0.12s both',
        }}>
          {forecast.slice(0, 7).map((day, i) => {
            const badge = dayBadge(day);
            const { avgCloud: dc } = getDayStats(day);
            const isSelected = i === selectedDay;
            const bs =
              badge === 'Go'    ? { color: '#34d399',              border: 'rgba(52,211,153,0.3)',   activeBg: 'rgba(52,211,153,0.08)' }
            : badge === 'Maybe' ? { color: '#FFD166',              border: 'rgba(255,209,102,0.25)', activeBg: 'rgba(255,209,102,0.07)' }
            :                     { color: 'rgba(148,163,184,0.5)', border: 'rgba(255,255,255,0.07)', activeBg: 'rgba(255,255,255,0.03)' };

            return (
              <button
                key={day.date}
                onClick={() => selectDay(i, day.date)}
                style={{
                  flex: '0 0 auto', minWidth: 56, cursor: 'pointer',
                  background: isSelected ? bs.activeBg : 'rgba(255,255,255,0.015)',
                  border: `1px solid ${isSelected ? bs.border : 'rgba(255,255,255,0.05)'}`,
                  borderRadius: 13,
                  padding: '10px 6px 9px',
                  textAlign: 'center',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                  outline: 'none',
                  boxShadow: isSelected ? `0 0 14px ${bs.color}22` : 'none',
                  transition: 'all 0.22s ease',
                }}
              >
                <span style={{
                  color: isSelected ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.3)',
                  fontSize: 10, fontWeight: 600,
                }}>
                  {formatDay(day.date, i)}
                </span>
                {dc !== null && (
                  <div style={{ width: '75%', height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.06)' }}>
                    <div style={{
                      height: '100%', width: `${Math.round(100 - dc)}%`, borderRadius: 1,
                      background: bs.color, transition: 'width 0.6s ease',
                    }} />
                  </div>
                )}
                <span style={{
                  color: bs.color, fontSize: 10, fontWeight: 700,
                  background: isSelected ? `${bs.color}18` : 'transparent',
                  border: `1px solid ${isSelected ? bs.border : 'transparent'}`,
                  padding: '2px 7px', borderRadius: 999,
                  transition: 'all 0.2s',
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
