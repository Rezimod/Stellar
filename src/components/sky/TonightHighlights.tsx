'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { SkyDay, SkyHour } from '@/lib/sky-data';
import type { PlanetInfo } from "@/lib/planets";
import { useLocation } from '@/lib/location';
import type { SkyScoreResult } from '@/lib/sky-score';
import { LOCATIONS } from '@/lib/darksky-locations';
import LocationPicker from '@/components/LocationPicker';

// ── Moon Phase SVG ────────────────────────────────────────────────────────────

function MoonPhaseSVG({ phaseDeg, size = 56 }: { phaseDeg: number; size?: number }) {
  const r = size / 2;
  const R = r - 1;
  const id = `mp-${size}-${Math.round(phaseDeg)}`;

  const illum = (1 - Math.cos(phaseDeg * Math.PI / 180)) / 2;
  const terminatorRx = R * (2 * illum - 1);
  const isWaxing = phaseDeg <= 180;

  if (illum < 0.01) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
        <circle cx={r} cy={r} r={R} fill="oklch(0.18 0.012 260)" stroke="oklch(0.94 0.015 80 / 0.18)" strokeWidth="0.75" />
      </svg>
    );
  }

  if (illum > 0.99) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
        <defs>
          <radialGradient id={`full-${id}`} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="oklch(0.96 0.04 85)" />
            <stop offset="100%" stopColor="oklch(0.84 0.05 80)" />
          </radialGradient>
        </defs>
        <circle cx={r} cy={r} r={R} fill={`url(#full-${id})`} />
      </svg>
    );
  }

  const litFill = 'oklch(0.92 0.04 85)';
  const darkFill = 'oklch(0.18 0.012 260)';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <defs>
        <clipPath id={`clip-${id}`}>
          <circle cx={r} cy={r} r={R} />
        </clipPath>
      </defs>
      <circle cx={r} cy={r} r={R} fill={darkFill} />
      <g clipPath={`url(#clip-${id})`}>
        {isWaxing ? (
          <>
            <rect x={r} y={r - R} width={R} height={R * 2} fill={litFill} />
            <ellipse cx={r} cy={r} rx={Math.abs(terminatorRx)} ry={R}
              fill={terminatorRx > 0 ? litFill : darkFill} />
          </>
        ) : (
          <>
            <rect x={r - R} y={r - R} width={R} height={R * 2} fill={litFill} />
            <ellipse cx={r} cy={r} rx={Math.abs(terminatorRx)} ry={R}
              fill={terminatorRx > 0 ? litFill : darkFill} />
          </>
        )}
      </g>
      <circle cx={r} cy={r} r={R} fill="none" stroke="oklch(0.94 0.015 80 / 0.18)" strokeWidth="0.75" />
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

// ── Observing window timeline bar (compact, dusk → dawn) ──────────────────────

function ObservingWindowBar({
  hours, sunSet, sunRise,
}: {
  hours: SkyDay['hours']; sunSet: string | null; sunRise: string | null;
}) {
  const START_H = 18;
  const TOTAL_H = 12;

  function toPercent(iso: string | null): number | null {
    if (!iso) return null;
    const d = new Date(iso);
    const hourOffset = ((d.getHours() - START_H + 24) % 24);
    return Math.max(0, Math.min(100, ((hourOffset + d.getMinutes() / 60) / TOTAL_H) * 100));
  }

  const setPct  = toPercent(sunSet);
  const risePct = toPercent(sunRise);
  const riseAdjusted = risePct !== null && risePct < 50
    ? risePct + ((6 / TOTAL_H) * 100)
    : risePct;

  const windowHours = hours.filter(h => {
    const hr = parseInt(h.time.slice(11, 13));
    return hr >= 18 || hr <= 6;
  });

  function fmt(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-[0.14em] font-medium" style={{ color: 'oklch(0.94 0.015 80 / 0.45)' }}>
          Observing window — dusk to dawn
        </span>
      </div>
      <div className="relative h-2 overflow-hidden" style={{ background: 'oklch(0.94 0.015 80 / 0.04)' }}>
        {windowHours.map((h, i) => {
          const cover = h.cloudCover;
          const pct = 100 / TOTAL_H;
          const opacity = cover < 30 ? 0.85 : cover < 60 ? 0.5 : 0.25;
          const color = cover < 30 ? 'oklch(0.78 0.15 160)' : cover < 60 ? 'oklch(0.78 0.15 75)' : 'oklch(0.62 0.18 28)';
          return (
            <div key={i} style={{
              position: 'absolute', left: `${i * pct}%`, width: `${pct}%`,
              top: 0, bottom: 0, background: color, opacity,
            }} />
          );
        })}
        {setPct !== null && (
          <div style={{ position: 'absolute', left: `${setPct}%`, top: -2, bottom: -2, width: 1, background: 'oklch(0.78 0.15 75)' }} />
        )}
        {riseAdjusted !== null && riseAdjusted < 99 && (
          <div style={{ position: 'absolute', left: `${riseAdjusted}%`, top: -2, bottom: -2, width: 1, background: 'oklch(0.78 0.15 75)' }} />
        )}
      </div>
      <div
        className="flex justify-between text-[11px] tabular-nums"
        style={{ color: 'oklch(0.94 0.015 80 / 0.45)', fontFamily: 'var(--font-mono)' }}
      >
        <span>{sunSet ? fmt(sunSet) : '18:00'} sunset</span>
        <span style={{ opacity: 0.5 }}>00:00</span>
        <span>{sunRise ? fmt(sunRise) : '06:00'} sunrise</span>
      </div>
    </div>
  );
}

// ── Data shape ────────────────────────────────────────────────────────────────

interface SunMoonData {
  sunRise: string | null; sunSet: string | null;
  illuminationPct: number; moonPhaseDeg: number;
}

interface CardData {
  state: 'go' | 'maybe' | 'skip';
  cloudCover: number; humidity: number; temp: number; wind: number;
  window: string; nextClear: string;
  planets: PlanetInfo[]; today: SkyDay; skyScore: SkyScoreResult | null;
}

// ── Verdict + score color (functional, not decorative) ────────────────────────

const verdictColor = {
  go:    'oklch(0.78 0.15 160)',
  maybe: 'oklch(0.78 0.15 75)',
  skip:  'oklch(0.62 0.18 28)',
} as const;

const verdictLabel = {
  go:    'CLEAR',
  maybe: 'PARTIAL',
  skip:  'OVERCAST',
} as const;

const verdictTagline = {
  go:    'Go observe.',
  maybe: 'Pick your moment.',
  skip:  'Stay in tonight.',
} as const;

function scoreCaption(grade: string): string {
  if (grade === 'Exceptional') return 'Exceptional — best in months.';
  if (grade === 'Excellent')   return 'Excellent — deep-sky targets accessible.';
  if (grade === 'Good')        return 'Good — planets and bright clusters.';
  if (grade === 'Fair')        return 'Fair — moon and bright planets only.';
  return 'Poor — atmosphere working against you.';
}

// ── Bortle estimate ───────────────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateBortle(lat: number, lon: number): number {
  let minDist = Infinity;
  let nearest = 5;
  for (const loc of LOCATIONS) {
    const d = haversineKm(lat, lon, loc.lat, loc.lon);
    if (d < minDist) { minDist = d; nearest = loc.bortle; }
  }
  return minDist <= 50 ? nearest : 5;
}

function bortleLabel(b: number): string {
  if (b <= 2) return 'Pristine';
  if (b <= 4) return 'Rural';
  if (b <= 6) return 'Suburban';
  return 'City';
}

// ── Main hero ─────────────────────────────────────────────────────────────────

export default function TonightHighlights() {
  const t = useTranslations('sky');
  const locale = useLocale();
  const { location, loading: locationLoading } = useLocation();
  const { lat, lon: lng } = location;
  const ready = !locationLoading;
  const [card, setCard] = useState<CardData | null>(null);
  const [moonData, setMoonData] = useState<SunMoonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const compute = useCallback(async (lat: number, lng: number) => {
    try {
      const [forecastRes, planetsRes, moonRes, scoreRes] = await Promise.all([
        fetch(`/api/sky/forecast?lat=${lat}&lng=${lng}`),
        fetch(`/api/sky/planets?lat=${lat}&lng=${lng}`),
        fetch(`/api/sky/sun-moon?lat=${lat}&lng=${lng}`),
        fetch(`/api/sky/score?lat=${lat}&lon=${lng}`),
      ]);
      const days = await forecastRes.json() as SkyDay[];
      const planets = await planetsRes.json() as PlanetInfo[];
      const moon = await moonRes.json() as SunMoonData;
      if (!days.length) { setError(true); setLoading(false); return; }

      let skyScore: SkyScoreResult | null = null;
      if (scoreRes.ok) {
        const data = await scoreRes.json() as SkyScoreResult;
        if (typeof data.score === 'number') skyScore = data;
      }

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
        planets: planets.filter(p => p.visible).sort((a, b) => b.altitude - a.altitude).slice(0, 4),
        skyScore,
      });
      setMoonData(moon);
      setLoading(false);
    } catch {
      setError(true);
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => { if (ready) compute(lat, lng); }, [ready, lat, lng, compute]);

  if (!ready || loading) {
    return (
      <div className="py-12 flex items-center gap-3">
        <div className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" style={{ color: 'oklch(0.78 0.15 160)' }} />
        <span className="text-sm" style={{ color: 'oklch(0.94 0.015 80 / 0.55)' }}>
          {!ready ? 'Detecting your location…' : 'Reading the sky…'}
        </span>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="py-12 flex flex-col gap-3 max-w-md">
        <p className="text-sm" style={{ color: 'oklch(0.94 0.015 80 / 0.7)' }}>{t('forecastError')}</p>
        <button
          onClick={() => { setError(false); setLoading(true); compute(lat, lng); }}
          className="self-start px-4 py-2 text-sm transition-colors"
          style={{
            background: 'transparent',
            border: '1px solid oklch(0.94 0.015 80 / 0.2)',
            color: 'oklch(0.94 0.015 80 / 0.85)',
          }}
        >
          {t('retry')}
        </button>
      </div>
    );
  }

  const { state, cloudCover, humidity, wind, window: obsWindow, nextClear, planets, today, skyScore } = card;
  const visKm = Math.round(today.hours.reduce((a, b) => a.cloudCover <= b.cloudCover ? a : b).visibility / 1000);
  const bortle = estimateBortle(lat, lng);

  const today_date = new Date();
  const dateLabel = today_date.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });

  // Inline sentence summary for the dusk go/no-go reader
  const summary = state === 'go'
    ? `Cloud ${cloudCover}% · seeing ${visKm >= 10 ? 'good' : 'fair'} · waning into clear evening${moonData ? ` · ${phaseName(moonData.moonPhaseDeg, locale).toLowerCase()} ${moonData.illuminationPct}%` : ''}.`
    : state === 'maybe'
    ? `Cloud ${cloudCover}% · gaps in the cover · best window narrow${nextClear ? ` · next clear night ${nextClear}` : ''}.`
    : `Cloud ${cloudCover}% · solid overcast${nextClear ? ` · next clear night ${nextClear}` : ''}.`;

  return (
    <section className="flex flex-col gap-8 pt-2">
      {/* ── Page slug: date / location / coords ─────────────────── */}
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <div className="text-[11px] uppercase tracking-[0.18em] font-semibold" style={{ color: 'oklch(0.94 0.015 80 / 0.6)' }}>
          {dateLabel}
        </div>
        <LocationPicker compact />
        <div className="text-[11px] tabular-nums" style={{ color: 'oklch(0.94 0.015 80 / 0.45)', fontFamily: 'var(--font-mono)' }}>
          {lat.toFixed(2)}°{lat >= 0 ? 'N' : 'S'} {Math.abs(lng).toFixed(2)}°{lng >= 0 ? 'E' : 'W'}
        </div>
        <div className="text-[11px] tabular-nums" style={{ color: 'oklch(0.94 0.015 80 / 0.45)', fontFamily: 'var(--font-mono)' }}>
          Bortle {bortle} · {bortleLabel(bortle)}
        </div>
      </div>

      {/* ── Verdict block ────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Verdict + tagline + summary */}
        <div className="col-span-12 md:col-span-8 flex flex-col gap-4">
          <div className="flex items-baseline gap-4 flex-wrap">
            <h1
              className="leading-none tracking-tight"
              style={{
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontWeight: 500,
                fontSize: 'clamp(56px, 9vw, 96px)',
                color: verdictColor[state],
              }}
            >
              {verdictLabel[state]}
            </h1>
            <span
              className="text-base sm:text-lg font-medium"
              style={{ color: 'oklch(0.94 0.015 80 / 0.92)' }}
            >
              {verdictTagline[state]}
            </span>
          </div>

          {state !== 'skip' && obsWindow && (
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'oklch(0.94 0.015 80 / 0.55)' }}>
                Best window
              </span>
              <span
                className="tabular-nums"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'clamp(24px, 3.4vw, 32px)',
                  fontWeight: 500,
                  color: 'oklch(0.94 0.015 80 / 0.92)',
                  letterSpacing: '-0.01em',
                }}
              >
                {obsWindow}
              </span>
            </div>
          )}

          <p
            className="text-[15px] leading-relaxed max-w-[60ch]"
            style={{ color: 'oklch(0.94 0.015 80 / 0.7)' }}
          >
            {summary}
          </p>
        </div>

        {/* Score number — right aligned, large */}
        <div className="col-span-12 md:col-span-4 flex md:justify-end">
          {skyScore && (
            <div className="flex flex-col md:items-end gap-1">
              <div className="flex items-baseline gap-2">
                <span
                  className="tabular-nums leading-none"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'clamp(64px, 8vw, 88px)',
                    fontWeight: 500,
                    color: 'oklch(0.94 0.015 80 / 0.95)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {skyScore.score}
                </span>
                <span
                  className="text-base tabular-nums"
                  style={{ fontFamily: 'var(--font-mono)', color: 'oklch(0.94 0.015 80 / 0.4)' }}
                >
                  /100
                </span>
              </div>
              <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'oklch(0.94 0.015 80 / 0.55)' }}>
                Sky score · {skyScore.grade}
              </div>
              <p className="text-[12px] mt-1 max-w-[28ch] md:text-right" style={{ color: 'oklch(0.94 0.015 80 / 0.45)' }}>
                {scoreCaption(skyScore.grade)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Hairline rule ────────────────────────────────────────── */}
      <div style={{ height: 1, background: 'oklch(0.94 0.015 80 / 0.10)' }} />

      {/* ── Below-the-fold detail row: window timeline + moon + planets ── */}
      <div className="grid grid-cols-12 gap-x-8 gap-y-6">
        {/* Window timeline — spans 7 cols on desktop */}
        <div className="col-span-12 md:col-span-7">
          <ObservingWindowBar
            hours={today.hours}
            sunSet={moonData?.sunSet ?? null}
            sunRise={moonData?.sunRise ?? null}
          />
        </div>

        {/* Moon block — spans 2 cols */}
        <div className="col-span-6 md:col-span-2 flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.14em]" style={{ color: 'oklch(0.94 0.015 80 / 0.45)' }}>
            Moon
          </span>
          {moonData ? (
            <div className="flex items-center gap-3">
              <MoonPhaseSVG phaseDeg={moonData.moonPhaseDeg} size={36} />
              <div className="flex flex-col">
                <span className="text-[13px] font-medium" style={{ color: 'oklch(0.94 0.015 80 / 0.92)' }}>
                  {phaseName(moonData.moonPhaseDeg, locale)}
                </span>
                <span className="text-[11px] tabular-nums" style={{ color: 'oklch(0.94 0.015 80 / 0.5)', fontFamily: 'var(--font-mono)' }}>
                  {moonData.illuminationPct}% illuminated
                </span>
              </div>
            </div>
          ) : (
            <div className="h-9 w-9 rounded-full" style={{ background: 'oklch(0.94 0.015 80 / 0.05)' }} />
          )}
        </div>

        {/* Atmosphere stats — spans 3 cols, inline rows */}
        <div className="col-span-6 md:col-span-3 flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-[0.14em]" style={{ color: 'oklch(0.94 0.015 80 / 0.45)' }}>
            Atmosphere
          </span>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[12px] tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>
            <dt style={{ color: 'oklch(0.94 0.015 80 / 0.5)' }}>Cloud</dt>
            <dd className="text-right" style={{ color: 'oklch(0.94 0.015 80 / 0.92)' }}>{cloudCover}%</dd>
            <dt style={{ color: 'oklch(0.94 0.015 80 / 0.5)' }}>Humidity</dt>
            <dd className="text-right" style={{ color: 'oklch(0.94 0.015 80 / 0.92)' }}>{humidity}%</dd>
            <dt style={{ color: 'oklch(0.94 0.015 80 / 0.5)' }}>Wind</dt>
            <dd className="text-right" style={{ color: 'oklch(0.94 0.015 80 / 0.92)' }}>{wind} km/h</dd>
            <dt style={{ color: 'oklch(0.94 0.015 80 / 0.5)' }}>Visibility</dt>
            <dd className="text-right" style={{ color: 'oklch(0.94 0.015 80 / 0.92)' }}>{visKm} km</dd>
          </dl>
        </div>
      </div>

      {/* ── Planet rail ─────────────────────────────────────────── */}
      {planets.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.14em]" style={{ color: 'oklch(0.94 0.015 80 / 0.45)' }}>
            Planets up now
          </span>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {planets.map(p => (
              <div key={p.key} className="flex items-baseline gap-2">
                <span className="text-[14px] font-medium" style={{ color: 'oklch(0.94 0.015 80 / 0.92)' }}>
                  {p.key.charAt(0).toUpperCase() + p.key.slice(1)}
                </span>
                <span className="text-[12px] tabular-nums" style={{ color: 'oklch(0.94 0.015 80 / 0.5)', fontFamily: 'var(--font-mono)' }}>
                  {p.altitude}° alt
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
