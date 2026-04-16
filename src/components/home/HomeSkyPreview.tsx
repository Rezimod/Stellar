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
  const nowIdx = slots.indexOf(nowHour);

  function segColor(cover: number): string {
    if (cover < 30) return 'rgba(52,211,153,0.65)';
    if (cover < 60) return 'rgba(251,191,36,0.5)';
    return 'rgba(255,255,255,0.07)';
  }

  return (
    <div>
      <span style={{ display: 'block', color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
        Night window  8pm – 4am
      </span>
      {/* Segmented heatmap strip */}
      <div style={{ display: 'flex', gap: 2 }}>
        {slots.map((hr, idx) => {
          const cover = byHour[hr] ?? 100;
          const isNow = nowIdx === idx;
          return (
            <div key={hr} style={{
              flex: 1, height: 18, borderRadius: 3,
              background: segColor(cover),
              position: 'relative',
              outline: isNow ? `1.5px solid ${statusColor}` : 'none',
              outlineOffset: 1,
              transition: 'opacity 0.3s',
            }} />
          );
        })}
      </div>
      {/* Time anchors */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: 9 }}>8pm</span>
        <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: 9 }}>12am</span>
        <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: 9 }}>4am</span>
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 10, marginTop: 7 }}>
        {[
          { color: 'rgba(52,211,153,0.65)', label: 'Clear' },
          { color: 'rgba(251,191,36,0.5)', label: 'Partly cloudy' },
          { color: 'rgba(255,255,255,0.15)', label: 'Overcast' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 6, borderRadius: 2, background: item.color }} />
            <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: 9 }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, warn, icon }: { label: string; value: string; sub?: string; warn?: boolean; icon: string }) {
  return (
    <div style={{
      padding: '14px 14px 12px',
      borderRadius: 12,
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{icon}</span>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <span style={{
        color: warn ? 'rgba(239,68,68,0.8)' : 'rgba(255,255,255,0.92)',
        fontSize: 26, fontWeight: 600, fontFamily: 'monospace', lineHeight: 1,
      }}>{value}</span>
      {sub && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{sub}</span>}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface SkyScoreData { score: number; grade: string; emoji: string }

export default function HomeSkyPreview() {
  const { location } = useLocation();
  const [forecast, setForecast] = useState<SkyDay[] | null>(null);
  const [planets, setPlanets] = useState<PlanetInfo[] | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [planetsLoading, setPlanetsLoading] = useState(false);
  const [skyScore, setSkyScore] = useState<SkyScoreData | null>(null);

  useEffect(() => {
    const lat = location.lat || 41.6941;
    const lng = location.lon || 44.8337;
    setForecast(null); setPlanets(null); setSelectedDay(0);
    fetch(`/api/sky/forecast?lat=${lat}&lng=${lng}`)
      .then(r => r.ok ? r.json() : null).then(setForecast).catch(() => setForecast([]));
    fetch(`/api/sky/planets?lat=${lat}&lng=${lng}`)
      .then(r => r.ok ? r.json() : null).then(setPlanets).catch(() => setPlanets([]));
    fetch(`/api/sky/score?lat=${lat}&lon=${lng}`)
      .then(r => r.ok ? r.json() : null).then(d => { if (d?.score != null) setSkyScore(d); }).catch(() => {});
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
    Go:    { color: '#34d399', border: 'rgba(52,211,153,0.22)',   bg: 'rgba(52,211,153,0.06)',  nebula: 'radial-gradient(ellipse at 10% 0%, rgba(52,211,153,0.12) 0%, transparent 55%), radial-gradient(ellipse at 90% 100%, rgba(99,102,241,0.06) 0%, transparent 55%)' },
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

  const scoreColor = !skyScore ? '#94a3b8' : skyScore.score >= 70 ? '#34d399' : skyScore.score >= 50 ? '#FBBF24' : '#64748b';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <style>{`
        @keyframes skyEnter { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
@keyframes planetSlideIn { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:translateX(0); } }
        @keyframes scoreIn { from { opacity:0; transform:scale(0.85); } to { opacity:1; transform:scale(1); } }
      `}</style>

      {/* ── SKY SCORE ROW ── */}
      {skyScore && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
          borderRadius: 14, background: 'rgba(12,18,33,0.5)',
          border: `1px solid ${scoreColor}22`,
          animation: 'scoreIn 0.5s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          {/* Circular score */}
          <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
            <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
              <circle cx="32" cy="32" r="26" fill="none" stroke={scoreColor} strokeWidth="5"
                strokeDasharray={`${2 * Math.PI * 26}`}
                strokeDashoffset={`${2 * Math.PI * 26 * (1 - skyScore.score / 100)}`}
                strokeLinecap="round" />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column',
            }}>
              <span style={{ color: scoreColor, fontSize: 18, fontWeight: 700, lineHeight: 1, fontFamily: 'monospace' }}>
                {skyScore.score}
              </span>
            </div>
          </div>
          {/* Label */}
          <div style={{ flex: 1 }}>
            <div style={{ color: scoreColor, fontWeight: 600, fontSize: 14 }}>
              {skyScore.emoji} {skyScore.grade} Sky Tonight
            </div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 }}>
              Sky Score {skyScore.score}/100
            </div>
          </div>
          {/* Share */}
          <button
            onClick={() => {
              const text = `Tonight's Sky Score: ${skyScore.score}/100 ${skyScore.emoji} — ${skyScore.grade} conditions for stargazing · stellarrclub.vercel.app`;
              if (navigator.share) { navigator.share({ text }).catch(() => {}); }
              else { window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank'); }
            }}
            style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            Share ↗
          </button>
        </div>
      )}

      {/* ── MAIN CARD ── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        borderRadius: 16,
        background: 'rgba(12, 18, 33, 0.6)',
        border: `1px solid ${SC.border}`,
        padding: '16px 16px 14px',
        animation: 'skyEnter 0.45s cubic-bezier(0.22,1,0.36,1) both',
      }}>
        {/* Nebula bg */}
        <div style={{ position: 'absolute', inset: 0, background: SC.nebula, pointerEvents: 'none' }} />

        <div style={{ position: 'relative' }}>
          {/* Header row: status badge + day + location */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                padding: '3px 10px', borderRadius: 999,
                background: SC.bg, border: `1px solid ${SC.border}`,
                color: SC.color,
              }}>{status.toUpperCase()}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 500 }}>{dayLabel}</span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }}>
              <span>📍</span>{locationLabel}
            </span>
          </div>

          {/* Night timeline */}
          {nightHours.length > 0 && <NightTimeline hours={nightHours} statusColor={SC.color} />}

          {/* Condition stats 2x2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
            {stats.map(s => <StatCard key={s.label} {...s} />)}
          </div>

          {/* Moon warning strip */}
          {moonWarn && (
            <div style={{
              marginTop: 10, padding: '8px 12px', borderRadius: 10,
              background: 'rgba(255,209,102,0.05)', border: '1px solid rgba(255,209,102,0.15)',
              color: 'rgba(255,209,102,0.65)', fontSize: 11, lineHeight: 1.4,
            }}>
              ☽ Full moon ({moonPct}%) — faint deep-sky targets will be washed out
            </div>
          )}
        </div>
      </div>

      {/* ── PLANETS CARD ── */}
      {(visiblePlanets.length > 0 || moon || planetsLoading) && (
        <div style={{
          borderRadius: 16,
          background: 'rgba(12, 18, 33, 0.5)',
          border: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
          animation: 'skyEnter 0.45s cubic-bezier(0.22,1,0.36,1) 0.1s both',
        }}>
          <div style={{
            padding: '11px 14px 9px',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Planets tonight</span>
            <span style={{ color: 'rgba(255,255,255,0.14)', fontSize: 9, fontWeight: 600, letterSpacing: '0.06em' }}>Alt · Rise · Set · Dir</span>
          </div>

          {planetsLoading ? (
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[0, 1, 2].map(i => <div key={i} style={{ height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.02)', animation: 'pulse 2s ease-in-out infinite' }} />)}
            </div>
          ) : (
            <div style={{ padding: '4px 0' }}>
              {[moon, ...visiblePlanets].filter(Boolean).map((p, rowIdx) => {
                if (!p) return null;
                const quality = p.altitude > 30 ? 'good' : p.altitude > 10 ? 'ok' : 'low';
                const pColor = PLANET_COLOR[p.key] ?? 'rgba(255,255,255,0.4)';
                const altColor = quality === 'good' ? '#34d399' : quality === 'ok' ? '#FFD166' : 'rgba(148,163,184,0.35)';
                const totalRows = [moon, ...visiblePlanets].filter(Boolean).length;
                return (
                  <div key={p.key} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 14px',
                    opacity: quality === 'low' ? 0.35 : 1,
                    borderBottom: rowIdx < totalRows - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                    transition: 'background 0.2s',
                    animation: `planetSlideIn 0.4s ease forwards`,
                    animationDelay: `${rowIdx * 0.08}s`,
                    animationFillMode: 'both',
                  }}
                  onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    {/* Planet symbol */}
                    <div style={{
                      width: 32, height: 32, flexShrink: 0, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, color: pColor,
                    }}>
                      {PLANET_SYMBOL[p.key] ?? '✦'}
                    </div>
                    {/* Name */}
                    <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: 500, minWidth: 52 }}>
                      {p.key.charAt(0).toUpperCase() + p.key.slice(1)}
                    </span>
                    {/* Altitude bar */}
                    {quality !== 'low' ? (
                      <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.04)', borderRadius: 2 }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.max(2, Math.min(100, (p.altitude / 90) * 100))}%`,
                          background: `linear-gradient(to right, rgba(99,102,241,0.4), rgba(99,102,241,0.8))`,
                          borderRadius: 2,
                          transition: 'width 0.8s ease-out',
                        }} />
                      </div>
                    ) : (
                      <div style={{ flex: 1 }} />
                    )}
                    {/* Alt value */}
                    <span style={{ color: quality === 'low' ? 'rgba(148,163,184,0.35)' : altColor, fontSize: 12, fontWeight: 600, fontFamily: 'monospace', minWidth: 32, textAlign: 'right' }}>
                      {quality === 'low' ? <span style={{ fontSize: 9 }}>below</span> : `${Math.round(p.altitude)}°`}
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
