'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Cloud, Wind, Eye, Droplets } from 'lucide-react';
import { SkyDay, SkyHour } from '@/lib/sky-data';
import type { PlanetInfo } from "@/lib/planets";
import { useLocation } from '@/hooks/useLocation';

// ── Moon Phase SVG ────────────────────────────────────────────────────────────

function MoonPhaseSVG({ phaseDeg, size = 56 }: { phaseDeg: number; size?: number }) {
  const r = size / 2;
  const R = r - 2;
  const id = `mp-${size}-${Math.round(phaseDeg)}`;

  // illuminated fraction 0 → 1 as phase goes 0 → 360
  const illum = (1 - Math.cos(phaseDeg * Math.PI / 180)) / 2;
  // terminatorRx: -R (new moon) → 0 (quarter) → +R (full moon)
  const terminatorRx = R * (2 * illum - 1);
  const isWaxing = phaseDeg <= 180;

  if (illum < 0.01) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
        <circle cx={r} cy={r} r={R} fill="#0a1525" stroke="rgba(255,255,255,0.12)" strokeWidth="0.75" />
      </svg>
    );
  }

  if (illum > 0.99) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
        <defs>
          <radialGradient id={`full-${id}`} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="rgba(255,252,230,0.98)" />
            <stop offset="100%" stopColor="rgba(220,210,170,0.85)" />
          </radialGradient>
        </defs>
        <circle cx={r} cy={r} r={R} fill={`url(#full-${id})`} />
        <circle cx={r} cy={r} r={R} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.75" />
      </svg>
    );
  }

  const litFill = 'rgba(240,235,200,0.88)';
  const darkFill = '#0a1525';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <defs>
        <clipPath id={`clip-${id}`}>
          <circle cx={r} cy={r} r={R} />
        </clipPath>
      </defs>
      {/* Dark background */}
      <circle cx={r} cy={r} r={R} fill={darkFill} />
      {/* Lit hemisphere + terminator */}
      <g clipPath={`url(#clip-${id})`}>
        {isWaxing ? (
          <>
            {/* Right half always lit for waxing */}
            <rect x={r} y={r - R} width={R} height={R * 2} fill={litFill} />
            {/* Terminator ellipse: negative terminatorRx removes lit area (crescent), positive adds (gibbous) */}
            <ellipse
              cx={r} cy={r}
              rx={Math.abs(terminatorRx)} ry={R}
              fill={terminatorRx > 0 ? litFill : darkFill}
            />
          </>
        ) : (
          <>
            {/* Left half always lit for waning */}
            <rect x={r - R} y={r - R} width={R} height={R * 2} fill={litFill} />
            {/* Terminator ellipse */}
            <ellipse
              cx={r} cy={r}
              rx={Math.abs(terminatorRx)} ry={R}
              fill={terminatorRx > 0 ? litFill : darkFill}
            />
          </>
        )}
      </g>
      {/* Border */}
      <circle cx={r} cy={r} r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.75" />
    </svg>
  );
}

// ── Sky condition helpers ─────────────────────────────────────────────────────

function eveningStats(hours: SkyDay['hours']): {
  best: SkyHour; window: string; state: 'go' | 'maybe' | 'skip';
} {
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

function phaseName(phaseDeg: number, locale: string): string {
  const en: Record<string, string> = {
    new: 'New Moon', waxCrescent: 'Waxing Crescent', firstQtr: 'First Quarter',
    waxGibbous: 'Waxing Gibbous', full: 'Full Moon', wanGibbous: 'Waning Gibbous',
    lastQtr: 'Last Quarter', wanCrescent: 'Waning Crescent',
  };
  const ka: Record<string, string> = {
    new: 'ახალმთვარე', waxCrescent: 'მომატებული ნამგალა', firstQtr: 'პირველი მეოთხედი',
    waxGibbous: 'მომატებული გიბოსი', full: 'სავსემთვარე', wanGibbous: 'კლებადი გიბოსი',
    lastQtr: 'ბოლო მეოთხედი', wanCrescent: 'კლებადი ნამგალა',
  };
  const names = locale === 'ka' ? ka : en;
  if (phaseDeg < 22.5)  return names.new;
  if (phaseDeg < 67.5)  return names.waxCrescent;
  if (phaseDeg < 112.5) return names.firstQtr;
  if (phaseDeg < 157.5) return names.waxGibbous;
  if (phaseDeg < 202.5) return names.full;
  if (phaseDeg < 247.5) return names.wanGibbous;
  if (phaseDeg < 292.5) return names.lastQtr;
  if (phaseDeg < 337.5) return names.wanCrescent;
  return names.new;
}

function visibilityLabel(km: number): string {
  if (km >= 20) return 'Excellent';
  if (km >= 10) return 'Good';
  if (km >= 5)  return 'Fair';
  return 'Poor';
}

// ── Observing Window Bar ──────────────────────────────────────────────────────

function ObservingWindowBar({
  hours,
  sunSet,
  sunRise,
}: {
  hours: SkyDay['hours'];
  sunSet: string | null;
  sunRise: string | null;
}) {
  // Show a 12-hour window: 18:00 to 06:00 (evening through dawn)
  const START_H = 18; // 6 PM
  const TOTAL_H = 12; // 12-hour window

  function toPercent(isoOrHHMM: string | null): number | null {
    if (!isoOrHHMM) return null;
    let h: number, m: number;
    if (isoOrHHMM.includes('T')) {
      const d = new Date(isoOrHHMM);
      h = d.getHours();
      m = d.getMinutes();
    } else {
      [h, m] = isoOrHHMM.split(':').map(Number);
    }
    // Normalize to 0-12h window starting at START_H
    const hourOffset = ((h - START_H + 24) % 24);
    const minuteDecimal = m / 60;
    return Math.max(0, Math.min(100, ((hourOffset + minuteDecimal) / TOTAL_H) * 100));
  }

  const setPercent  = toPercent(sunSet);
  const risePercent = toPercent(sunRise); // next morning
  // After midnight, rise is in range 0-6 → offset 6-12h in window
  const riseAdjusted = risePercent !== null && risePercent < 50
    ? risePercent + ((6 / TOTAL_H) * 100) // rough correction: add 6h in percent
    : risePercent;

  // Build hourly cloud cover for 18:00–06:00
  const windowHours = hours.filter(h => {
    const hr = parseInt(h.time.slice(11, 13));
    return hr >= 18 || hr <= 6;
  });

  const segments = windowHours.map((h, i) => {
    const cover = h.cloudCover;
    const pct = 100 / TOTAL_H;
    const alpha = cover < 30 ? 0.05 : cover < 60 ? 0.25 : 0.5;
    const color = cover < 30 ? '#34D399' : cover < 60 ? '#F59E0B' : '#EF4444';
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: `${i * pct}%`,
          width: `${pct}%`,
          top: 0, bottom: 0,
          background: color,
          opacity: alpha,
        }}
      />
    );
  });

  function formatSunTime(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--color-text-muted)' }}>
        Observing Window
      </p>
      {/* Bar */}
      <div className="relative h-5 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Cloud cover segments */}
        {segments}
        {/* Sunset marker */}
        {setPercent !== null && (
          <div
            style={{
              position: 'absolute',
              left: `${setPercent}%`,
              top: 0,
              bottom: 0,
              width: 1.5,
              background: 'rgba(245,158,11,0.7)',
            }}
          />
        )}
        {/* Sunrise marker */}
        {riseAdjusted !== null && riseAdjusted < 98 && (
          <div
            style={{
              position: 'absolute',
              left: `${riseAdjusted}%`,
              top: 0,
              bottom: 0,
              width: 1.5,
              background: 'rgba(245,158,11,0.7)',
            }}
          />
        )}
      </div>
      {/* Labels */}
      <div className="flex justify-between text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
        <span>{sunSet ? formatSunTime(sunSet) : '18:00'}</span>
        <span style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>00:00</span>
        <span>{sunRise ? formatSunTime(sunRise) : '06:00'}</span>
      </div>
    </div>
  );
}

// ── Card data types ───────────────────────────────────────────────────────────

interface SunMoonData {
  sunRise: string | null;
  sunSet: string | null;
  illuminationPct: number;
  moonPhaseDeg: number;
}

interface CardData {
  state: 'go' | 'maybe' | 'skip';
  cloudCover: number;
  humidity: number;
  temp: number;
  wind: number;
  window: string;
  nextClear: string;
  planets: PlanetInfo[];
  today: SkyDay;
}

// ── Border / badge config ─────────────────────────────────────────────────────

const cardBorder = {
  go:    { border: '1px solid rgba(52,211,153,0.3)',  boxShadow: '0 0 30px rgba(52,211,153,0.06)' },
  maybe: { border: '1px solid rgba(245,158,11,0.25)', boxShadow: '0 0 20px rgba(245,158,11,0.04)' },
  skip:  { border: '1px solid rgba(255,255,255,0.08)' },
};

const badgeStyle = {
  go:    { bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.4)', color: '#34D399', label: 'Clear Sky' },
  maybe: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', color: '#F59E0B', label: 'Partly Cloudy' },
  skip:  { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)',   color: '#EF4444', label: 'Overcast' },
};

// ── Main component ────────────────────────────────────────────────────────────

export default function TonightHighlights() {
  const t = useTranslations('sky');
  const locale = useLocale();
  const { lat, lng, ready } = useLocation();
  const [card, setCard] = useState<CardData | null>(null);
  const [moonData, setMoonData] = useState<SunMoonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const compute = useCallback(async (lat: number, lng: number) => {
    try {
      const [forecastRes, planetsRes, moonRes] = await Promise.all([
        fetch(`/api/sky/forecast?lat=${lat}&lng=${lng}`),
        fetch(`/api/sky/planets?lat=${lat}&lng=${lng}`),
        fetch(`/api/sky/sun-moon?lat=${lat}&lng=${lng}`),
      ]);
      const days = await forecastRes.json() as SkyDay[];
      const planets = await planetsRes.json() as PlanetInfo[];
      const moon = await moonRes.json() as SunMoonData;
      if (!days.length) { setError(true); setLoading(false); return; }

      const today = days[0];
      const { best, window, state } = eveningStats(today.hours);

      setCard({
        state, today,
        cloudCover: best.cloudCover,
        humidity: best.humidity,
        temp: Math.round(best.temp),
        wind: Math.round(best.wind),
        window,
        nextClear: nextClearDate(days, locale),
        planets: planets.filter(p => p.visible).sort((a, b) => b.altitude - a.altitude).slice(0, 3),
      });
      setMoonData(moon);
      setLoading(false);
    } catch {
      setError(true);
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    if (ready) compute(lat, lng);
  }, [ready, lat, lng, compute]);

  if (!ready || loading) {
    return (
      <div
        className="glass-card p-5 h-[180px] flex items-center justify-center gap-2"
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="w-4 h-4 rounded-full border-2 border-[#34d399] border-t-transparent animate-spin flex-shrink-0" />
        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {!ready ? 'Detecting your location…' : 'Loading sky data…'}
        </span>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="glass-card p-5 flex flex-col items-center gap-3 text-center"
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t('forecastError')}</p>
        <button
          onClick={() => { setError(false); setLoading(true); compute(lat, lng); }}
          className="px-4 py-2 rounded-lg text-sm transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
        >
          {t('retry')}
        </button>
      </div>
    );
  }

  const { state, cloudCover, humidity, wind, window, nextClear, planets, today } = card;
  const badge = badgeStyle[state];
  const visKm = Math.round(card.today.hours.reduce((a, b) => a.cloudCover <= b.cloudCover ? a : b).visibility / 1000);

  return (
    <div className="glass-card p-5" style={cardBorder[state]}>
      {/* Top row: label + badge */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-text-muted)' }}>
          {t('tonightHighlight')}
        </span>
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
          style={{ background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{
              background: badge.color,
              animation: state === 'go' ? 'breathe 2s ease-in-out infinite' : undefined,
              boxShadow: state === 'go' ? `0 0 6px ${badge.color}` : undefined,
            }}
          />
          {badge.label}
        </span>
      </div>

      {/* 3-column body */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Column 1: Moon Phase */}
        <div className="flex flex-col items-center gap-2 sm:border-r sm:border-white/[0.05] sm:pr-4">
          {moonData ? (
            <>
              <MoonPhaseSVG phaseDeg={moonData.moonPhaseDeg} size={56} />
              <div className="text-center">
                <p className="text-white text-sm font-semibold">{phaseName(moonData.moonPhaseDeg, locale)}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {moonData.illuminationPct}% illuminated
                </p>
              </div>
            </>
          ) : (
            <div className="w-14 h-14 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
          )}
        </div>

        {/* Column 2: Observing Window */}
        <div className="flex flex-col gap-3 sm:border-r sm:border-white/[0.05] sm:pr-4">
          <ObservingWindowBar
            hours={today.hours}
            sunSet={moonData?.sunSet ?? null}
            sunRise={moonData?.sunRise ?? null}
          />
          {state !== 'skip' && window ? (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Best Hours
              </p>
              <p className="text-sm font-mono font-bold" style={{ color: 'var(--color-nebula-teal)' }}>{window}</p>
            </div>
          ) : state === 'skip' && nextClear ? (
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Next clear: {nextClear}
            </p>
          ) : null}

          {/* Visible planets row */}
          {planets.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-auto">
              {planets.map(p => (
                <span
                  key={p.key}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34D399' }}
                >
                  <span className="w-1 h-1 rounded-full bg-[#34D399]" />
                  {p.key.charAt(0).toUpperCase() + p.key.slice(1)} {p.altitude}°
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Column 3: Key Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
          {[
            { icon: <Cloud size={13} strokeWidth={1.5} />, label: 'Cloud Cover', value: `${cloudCover}%`,
              color: cloudCover < 30 ? '#34D399' : cloudCover < 60 ? '#F59E0B' : '#EF4444' },
            { icon: <Droplets size={13} strokeWidth={1.5} />, label: 'Humidity', value: `${humidity}%`,
              color: 'var(--color-text-primary)' },
            { icon: <Eye size={13} strokeWidth={1.5} />, label: 'Visibility', value: visibilityLabel(visKm),
              color: visKm >= 10 ? '#34D399' : visKm >= 5 ? '#F59E0B' : '#EF4444' },
            { icon: <Wind size={13} strokeWidth={1.5} />, label: 'Wind', value: `${wind} km/h`,
              color: 'var(--color-text-primary)' },
          ].map(({ icon, label, value, color }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                {icon}
                <span className="text-[10px] uppercase tracking-wide">{label}</span>
              </div>
              <p className="text-sm font-semibold font-mono" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
