'use client';

import { useState, useEffect } from 'react';
import { useLocation } from '@/lib/location';
import type { SkyDay, SkyHour } from '@/lib/sky-data';
import type { PlanetInfo } from '@/lib/planets';

// ── Data helpers ────────────────────────────────────────────────────────────

const PLANET_SYMBOL: Record<string, string> = {
  moon: '☽', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄',
};
const PLANET_COLOR: Record<string, string> = {
  moon: '#E2D5B0', mercury: '#A0A0B0', venus: '#F4D9A0',
  mars: '#E8836A', jupiter: '#C8A96E', saturn: '#D4BE8A',
};

function dayBadge(day: SkyDay): 'Go' | 'Maybe' | 'Skip' {
  const nh = day.hours.filter(h => { const hr = new Date(h.time).getHours(); return hr >= 20 || hr < 4; });
  const hrs = nh.length > 0 ? nh : day.hours;
  const avg = hrs.reduce((s, h) => s + h.cloudCover, 0) / hrs.length;
  return avg < 30 ? 'Go' : avg < 60 ? 'Maybe' : 'Skip';
}

function formatDay(dateStr: string, index: number): string {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tom';
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
}

function getNightStats(day: SkyDay) {
  const nh = day.hours.filter(h => { const hr = new Date(h.time).getHours(); return hr >= 20 || hr < 4; });
  const hrs = nh.length > 0 ? nh : day.hours;
  const avg = (key: keyof SkyHour) => hrs.length ? Math.round(hrs.reduce((s, h) => s + (h[key] as number), 0) / hrs.length) : null;
  const avgCloud = avg('cloudCover');
  const status: 'Go' | 'Maybe' | 'Skip' = avgCloud === null ? 'Skip' : avgCloud < 30 ? 'Go' : avgCloud < 60 ? 'Maybe' : 'Skip';
  return {
    avgCloud,
    avgHumidity: avg('humidity'),
    avgWind: avg('wind'),
    status,
  };
}

function getNightHours(day: SkyDay): SkyHour[] {
  return day.hours.filter(h => { const hr = new Date(h.time).getHours(); return hr >= 20 || hr < 4; });
}

function moonIllumination(date: Date): number {
  const phase = ((date.getTime() - new Date('2000-01-06').getTime()) % (29.53058867 * 86400000) + 29.53058867 * 86400000) % (29.53058867 * 86400000);
  return (1 - Math.cos((phase / (29.53058867 * 86400000)) * 2 * Math.PI)) / 2;
}

function moonPhaseName(illum: number): string {
  if (illum < 0.05) return 'New Moon';
  if (illum < 0.45) return 'Crescent';
  if (illum < 0.55) return 'Quarter';
  if (illum < 0.95) return 'Gibbous';
  return 'Full Moon';
}

function fmtTime(d: Date | string | null): string {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dt.getTime())) return '—';
  return `${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function NightTimeline({ hours, statusColor }: { hours: SkyHour[]; statusColor: string }) {
  const slots = [20, 21, 22, 23, 0, 1, 2, 3];
  const byHour: Record<number, number> = {};
  for (const h of hours) byHour[new Date(h.time).getHours()] = h.cloudCover;
  const nowHour = new Date().getHours();

  return (
    <div>
      <span style={{ display: 'block', color: 'rgba(255,255,255,0.22)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
        Night window  8pm – 4am
      </span>
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 48 }}>
        {slots.map(hr => {
          const cover = byHour[hr] ?? 100;
          const clear = Math.max(0, 1 - cover / 100);
          const barH = Math.max(4, Math.round(clear * 42));
          const isNow = hr === nowHour;
          const color = cover < 25 ? '#34d399' : cover < 55 ? '#86efac' : cover < 75 ? '#FFD166' : 'rgba(148,163,184,0.2)';
          const label = hr === 0 ? '12a' : hr < 4 ? `${hr}a` : `${hr}p`;
          return (
            <div key={hr} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', height: 42, display: 'flex', alignItems: 'flex-end', borderRadius: 4, background: 'rgba(255,255,255,0.03)', overflow: 'hidden', position: 'relative' }}>
                {isNow && <div style={{ position: 'absolute', inset: 0, border: `1px solid ${statusColor}40`, borderRadius: 4 }} />}
                <div style={{
                  width: '100%', height: barH,
                  background: cover < 55 ? `linear-gradient(to top, ${color}, ${color}99)` : color,
                  borderRadius: '2px 2px 0 0',
                  boxShadow: cover < 55 ? `0 0 8px ${color}60` : 'none',
                  transition: 'height 1s cubic-bezier(0.22,1,0.36,1)',
                }} />
              </div>
              <span style={{ color: isNow ? statusColor : 'rgba(255,255,255,0.18)', fontSize: 7.5, fontWeight: isNow ? 700 : 500 }}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, warn, icon }: { label: string; value: string; sub?: string; warn?: boolean; icon: string }) {
  return (
    <div style={{
      padding: '11px 12px',
      borderRadius: 12,
      background: warn ? 'rgba(255,180,0,0.04)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${warn ? 'rgba(255,180,0,0.18)' : 'rgba(255,255,255,0.07)'}`,
      display: 'flex', flexDirection: 'column', gap: 3,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 11, opacity: 0.5 }}>{icon}</span>
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <span style={{ color: warn ? '#FFD166' : 'rgba(255,255,255,0.88)', fontSize: 17, fontWeight: 800, fontFamily: 'monospace', lineHeight: 1 }}>{value}</span>
      {sub && <span style={{ color: warn ? 'rgba(255,180,0,0.5)' : 'rgba(255,255,255,0.2)', fontSize: 9 }}>{sub}</span>}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function HomeSkyPreview() {
  const { location } = useLocation();
  const [forecast, setForecast] = useState<SkyDay[] | null>(null);
  const [planets, setPlanets] = useState<PlanetInfo[] | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [planetsLoading, setPlanetsLoading] = useState(false);

  useEffect(() => {
    const lat = location.lat || 41.6941;
    const lng = location.lon || 44.8337;
    setForecast(null); setPlanets(null); setSelectedDay(0);
    fetch(`/api/sky/forecast?lat=${lat}&lng=${lng}`)
      .then(r => r.ok ? r.json() : null).then(setForecast).catch(() => setForecast([]));
    fetch(`/api/sky/planets?lat=${lat}&lng=${lng}`)
      .then(r => r.ok ? r.json() : null).then(setPlanets).catch(() => setPlanets([]));
  }, [location.lat, location.lon]);

  function selectDay(index: number, dateStr: string) {
    setSelectedDay(index);
    const lat = location.lat || 41.6941; const lng = location.lon || 44.8337;
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
        {[160, 120, 52].map((h, i) => (
          <div key={i} style={{ height: h, borderRadius: 18, background: 'rgba(255,255,255,0.025)', animation: 'pulse 2s ease-in-out infinite' }} />
        ))}
      </div>
    );
  }

  const sel = forecast?.[selectedDay];
  const { avgCloud, avgHumidity, avgWind, status } = sel ? getNightStats(sel) : { avgCloud: null, avgHumidity: null, avgWind: null, status: 'Skip' as const };
  const nightHours = sel ? getNightHours(sel) : [];

  const allPlanets = [...(planets ?? [])].filter(p => p.altitude > -5).sort((a, b) => b.altitude - a.altitude);
  const moon = allPlanets.find(p => p.key === 'moon');
  const visiblePlanets = allPlanets.filter(p => p.key !== 'moon').slice(0, 5);

  const locationLabel = location.city ? `${location.city}${location.country ? `, ${location.country}` : ''}` : 'Global';
  const selDate = selectedDay === 0 ? new Date() : new Date(`${forecast[selectedDay]?.date ?? ''}T21:00:00`);
  const moonIllum = moonIllumination(selDate);
  const moonPct = Math.round(moonIllum * 100);
  const moonWarn = moonIllum > 0.7 && status !== 'Skip';

  const SC = {
    Go:    { color: '#34d399', border: 'rgba(52,211,153,0.22)',   bg: 'rgba(52,211,153,0.06)',  nebula: 'radial-gradient(ellipse at 10% 0%, rgba(52,211,153,0.12) 0%, transparent 55%), radial-gradient(ellipse at 90% 100%, rgba(56,240,255,0.06) 0%, transparent 55%)' },
    Maybe: { color: '#FFD166', border: 'rgba(255,209,102,0.2)',   bg: 'rgba(255,209,102,0.05)', nebula: 'radial-gradient(ellipse at 10% 0%, rgba(255,209,102,0.10) 0%, transparent 55%)' },
    Skip:  { color: 'rgba(148,163,184,0.5)', border: 'rgba(255,255,255,0.07)', bg: 'transparent', nebula: 'none' },
  }[status];

  const dayLabel = selectedDay === 0 ? 'Tonight' : selectedDay === 1 ? 'Tomorrow' : formatDay(forecast[selectedDay]?.date ?? '', selectedDay);

  const stats = [
    { label: 'Cloud', icon: '☁', value: avgCloud !== null ? `${avgCloud}%` : '—', sub: avgCloud !== null ? (avgCloud < 30 ? 'Clear' : avgCloud < 60 ? 'Partly' : 'Overcast') : undefined, warn: (avgCloud ?? 0) > 60 },
    { label: 'Humidity', icon: '💧', value: avgHumidity !== null ? `${avgHumidity}%` : '—', sub: (avgHumidity ?? 0) > 85 ? 'Dew risk' : undefined, warn: (avgHumidity ?? 0) > 85 },
    { label: 'Wind', icon: '💨', value: avgWind !== null ? `${avgWind}km/h` : '—', sub: (avgWind ?? 0) > 25 ? 'Turbulent' : undefined, warn: (avgWind ?? 0) > 25 },
    { label: 'Moon', icon: '☽', value: `${moonPct}%`, sub: moonPhaseName(moonIllum), warn: moonWarn },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <style>{`
        @keyframes skyEnter { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes statusGlow { 0%,100% { box-shadow: 0 0 0 0 transparent; } 50% { box-shadow: 0 0 12px 2px ${SC.color}22; } }
      `}</style>

      {/* ── MAIN CARD ── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        borderRadius: 20,
        background: `linear-gradient(160deg, rgba(10,14,24,0.95) 0%, rgba(7,11,20,1) 100%)`,
        border: `1px solid ${SC.border}`,
        padding: '18px 16px 16px',
        animation: 'skyEnter 0.45s cubic-bezier(0.22,1,0.36,1) both, statusGlow 4s ease-in-out 1s infinite',
      }}>
        {/* Nebula bg */}
        <div style={{ position: 'absolute', inset: 0, background: SC.nebula, pointerEvents: 'none' }} />

        {/* Subtle star dots */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.4, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />

        <div style={{ position: 'relative' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
                padding: '3px 10px', borderRadius: 999,
                background: SC.bg, border: `1px solid ${SC.border}`,
                color: SC.color,
                boxShadow: `0 0 10px ${SC.color}30`,
              }}>{status.toUpperCase()}</span>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 500 }}>{dayLabel}</span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }}>
              <span>📍</span>{locationLabel}
            </span>
          </div>

          {/* Night timeline */}
          {nightHours.length > 0 && <NightTimeline hours={nightHours} statusColor={SC.color} />}

          {/* Condition stats 2x2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
            {stats.map(s => <StatCard key={s.label} {...s} />)}
          </div>

          {/* Moon warning strip */}
          {moonWarn && (
            <div style={{
              marginTop: 10, padding: '8px 12px', borderRadius: 10,
              background: 'rgba(255,209,102,0.05)', border: '1px solid rgba(255,209,102,0.18)',
              color: 'rgba(255,209,102,0.7)', fontSize: 11, lineHeight: 1.4,
            }}>
              ☽ Full moon ({moonPct}%) — faint deep-sky targets will be washed out
            </div>
          )}
        </div>
      </div>

      {/* ── PLANETS CARD ── */}
      {(visiblePlanets.length > 0 || moon || planetsLoading) && (
        <div style={{
          borderRadius: 18,
          background: 'linear-gradient(160deg, rgba(10,14,24,0.9) 0%, rgba(7,11,20,1) 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          overflow: 'hidden',
          animation: 'skyEnter 0.45s cubic-bezier(0.22,1,0.36,1) 0.08s both',
        }}>
          <div style={{
            padding: '11px 14px 9px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Planets tonight</span>
            <span style={{ color: 'rgba(255,255,255,0.14)', fontSize: 8.5, fontWeight: 600, letterSpacing: '0.06em' }}>Alt · Rise · Set · Dir</span>
          </div>

          {planetsLoading ? (
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[0, 1, 2].map(i => <div key={i} style={{ height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.02)', animation: 'pulse 2s ease-in-out infinite' }} />)}
            </div>
          ) : (
            <div style={{ padding: '4px 0' }}>
              {[moon, ...visiblePlanets].filter(Boolean).map((p, i) => {
                if (!p) return null;
                const quality = p.altitude > 30 ? 'good' : p.altitude > 10 ? 'ok' : 'low';
                const pColor = PLANET_COLOR[p.key] ?? 'rgba(255,255,255,0.4)';
                const altColor = quality === 'good' ? '#34d399' : quality === 'ok' ? '#FFD166' : 'rgba(148,163,184,0.35)';
                return (
                  <div key={p.key} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 14px',
                    opacity: quality === 'low' ? 0.4 : 1,
                    borderBottom: i < visiblePlanets.length ? '1px solid rgba(255,255,255,0.03)' : 'none',
                    transition: 'opacity 0.2s',
                  }}>
                    {/* Planet symbol with glow */}
                    <div style={{
                      width: 28, height: 28, flexShrink: 0, borderRadius: 8,
                      background: `${pColor}10`, border: `1px solid ${pColor}25`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, color: pColor,
                    }}>
                      {PLANET_SYMBOL[p.key] ?? '✦'}
                    </div>
                    {/* Name */}
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, minWidth: 52 }}>
                      {p.key.charAt(0).toUpperCase() + p.key.slice(1)}
                    </span>
                    {/* Altitude bar */}
                    <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                      <div style={{
                        height: '100%', width: `${Math.max(2, Math.min(100, (p.altitude / 90) * 100))}%`,
                        background: altColor, borderRadius: 2,
                        boxShadow: quality !== 'low' ? `0 0 4px ${altColor}80` : 'none',
                        transition: 'width 1s cubic-bezier(0.22,1,0.36,1)',
                      }} />
                    </div>
                    {/* Alt */}
                    <span style={{ color: altColor, fontSize: 11, fontWeight: 700, fontFamily: 'monospace', minWidth: 28, textAlign: 'right' }}>
                      {Math.round(p.altitude)}°
                    </span>
                    {/* Rise/Set */}
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9.5, fontFamily: 'monospace' }}>↑{fmtTime(p.rise)}</span>
                      <span style={{ color: 'rgba(255,255,255,0.14)', fontSize: 9.5, fontFamily: 'monospace' }}>↓{fmtTime(p.set)}</span>
                    </div>
                    {/* Direction */}
                    <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 9, fontWeight: 700, minWidth: 18, textAlign: 'right' }}>{p.azimuthDir}</span>
                  </div>
                );
              })}
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
          animation: 'skyEnter 0.45s cubic-bezier(0.22,1,0.36,1) 0.14s both',
        }}>
          {forecast.slice(0, 7).map((day, i) => {
            const badge = dayBadge(day);
            const { avgCloud: dc } = getNightStats(day);
            const sel2 = i === selectedDay;
            const bs = badge === 'Go'    ? { color: '#34d399',               border: 'rgba(52,211,153,0.3)',   bg: 'rgba(52,211,153,0.07)' }
                      : badge === 'Maybe' ? { color: '#FFD166',               border: 'rgba(255,209,102,0.25)', bg: 'rgba(255,209,102,0.06)' }
                      :                     { color: 'rgba(148,163,184,0.45)', border: 'rgba(255,255,255,0.07)', bg: 'rgba(255,255,255,0.02)' };
            return (
              <button key={day.date} onClick={() => selectDay(i, day.date)} style={{
                flex: '0 0 auto', minWidth: 54, cursor: 'pointer',
                background: sel2 ? bs.bg : 'rgba(255,255,255,0.015)',
                border: `1px solid ${sel2 ? bs.border : 'rgba(255,255,255,0.05)'}`,
                borderRadius: 12, padding: '9px 5px 8px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                outline: 'none', transition: 'all 0.22s ease',
                boxShadow: sel2 ? `0 0 12px ${bs.color}22` : 'none',
              }}>
                <span style={{ color: sel2 ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.28)', fontSize: 9.5, fontWeight: 600 }}>
                  {formatDay(day.date, i)}
                </span>
                {dc !== null && (
                  <div style={{ width: '70%', height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.06)' }}>
                    <div style={{ height: '100%', width: `${Math.round(100 - dc)}%`, borderRadius: 1, background: bs.color, transition: 'width 0.6s ease' }} />
                  </div>
                )}
                <span style={{
                  color: bs.color, fontSize: 9.5, fontWeight: 700,
                  background: sel2 ? `${bs.color}18` : 'transparent',
                  border: `1px solid ${sel2 ? bs.border : 'transparent'}`,
                  padding: '2px 6px', borderRadius: 999, transition: 'all 0.2s',
                }}>{badge}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
