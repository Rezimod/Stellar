'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarDays, Cloud, CloudMoon, Cloudy, Info, MoonStar } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ForecastDay } from '@/lib/use-sky-data';
import { MoonGlyph } from './visuals';

type QualityKey = 'excellent' | 'good' | 'fair' | 'poor';

/**
 * Per-night sky-quality score, 0–100. Cloud cover dominates (it's what our
 * forecast actually measures), moonlight trims the top end — a clear but
 * full-moon night still loses points for washed-out deep-sky targets.
 */
function dayScore(day: ForecastDay): number {
  const clarity = Math.max(0, 100 - Math.max(0, Math.min(100, day.cloudCoverPct)));
  const moonDark = 1 - Math.max(0, Math.min(1, day.moonIllumination));
  return Math.max(0, Math.min(100, Math.round(clarity * 0.78 + moonDark * 22)));
}

/** Score → verdict tier key + ring colour, matching the legend buckets. */
function scoreTier(score: number): { key: QualityKey; color: string } {
  if (score >= 80) return { key: 'excellent', color: '#34D399' };
  if (score >= 60) return { key: 'good', color: '#FBBF24' };
  if (score >= 40) return { key: 'fair', color: '#FB923C' };
  return { key: 'poor', color: '#F87171' };
}

/** Cloud cover → plain-language sky-cover description key. */
function cloudKey(pct: number): string {
  if (pct <= 10) return 'clear';
  if (pct <= 25) return 'few';
  if (pct <= 50) return 'scattered';
  if (pct <= 70) return 'broken';
  if (pct <= 85) return 'mostly';
  return 'cloudy';
}

const WX_ICON: Record<string, LucideIcon> = {
  clear: MoonStar,
  few: CloudMoon,
  scattered: Cloud,
  broken: Cloud,
  mostly: Cloudy,
  cloudy: Cloudy,
};

const LEGEND: Array<{ color: string; range: string; key: QualityKey }> = [
  { color: '#34D399', range: '80–100', key: 'excellent' },
  { color: '#FBBF24', range: '60–79', key: 'good' },
  { color: '#FB923C', range: '40–59', key: 'fair' },
  { color: '#F87171', range: '0–39', key: 'poor' },
];

/** Circular 0–100 score ring with the number centred. */
function ScoreGauge({ score, color }: { score: number; color: string }) {
  const size = 74;
  const sw = 5;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, score / 100));
  return (
    <span className="forecast7__gauge" aria-hidden="true">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={sw} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="forecast7__gauge-num" style={{ color }}>{score}</span>
    </span>
  );
}

interface SevenDayForecastProps {
  days: ForecastDay[];
  loading?: boolean;
  /** Optional location label to anchor the section header. */
  locationLabel?: string;
  /** `grid` = full-width 7-column section. `rail` = compact vertical list for the sidebar. */
  variant?: 'grid' | 'rail';
}

/**
 * 7-night observation outlook.
 *
 * Each day rolls up its hourly cloud cover into a single Go / Maybe / Skip
 * verdict, plus the evening-window temperature, wind, and humidity an
 * observer cares about under the eyepiece. The lead icon is picked from
 * cloud cover (not weather code) — that's the variable our forecast
 * actually pivots on.
 */
export function SevenDayForecast({ days, loading = false, locationLabel, variant = 'grid' }: SevenDayForecastProps) {
  const t = useTranslations('sky.forecast7');
  const locale = useLocale();
  const [howOpen, setHowOpen] = useState(false);

  const dayFmt = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(locale, { weekday: 'short' });
    } catch {
      return new Intl.DateTimeFormat('en', { weekday: 'short' });
    }
  }, [locale]);
  const dateFmt = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
    } catch {
      return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' });
    }
  }, [locale]);

  const isRail = variant === 'rail';

  return (
    <section className={`forecast7${isRail ? ' forecast7--rail' : ''}`} aria-label={t('label')}>
      <div className="forecast7__head">
        <span className="forecast7__label">
          {!isRail && <CalendarDays size={13} aria-hidden="true" />}
          {t('label')}
        </span>
        {locationLabel && (
          <span className="forecast7__loc">
            {locationLabel}
            {isRail && <> · {t('clouds')}</>}
          </span>
        )}
      </div>
      {loading && days.length === 0 ? (
        <div className={isRail ? 'forecast7__rail-list' : 'forecast7__skeleton'} aria-hidden="true">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className={isRail ? 'forecast7__rskel' : 'forecast7__skel'} />
          ))}
        </div>
      ) : days.length === 0 ? (
        <div className="forecast7__empty">{t('empty')}</div>
      ) : isRail ? (
        <ol className="forecast7__rail-list">
          {days.slice(0, 7).map((d, i) => (
            <OutlookRow key={d.date} day={d} isToday={i === 0} dayFmt={dayFmt} dateFmt={dateFmt} t={t} />
          ))}
        </ol>
      ) : (
        <>
          <div className="forecast7__row">
            {days.slice(0, 7).map((d, i) => (
              <DayCard key={d.date} day={d} isToday={i === 0} dayFmt={dayFmt} dateFmt={dateFmt} t={t} />
            ))}
          </div>
          <div className="forecast7__legend">
            <span className="forecast7__legend-title">{t('index')}</span>
            <ul className="forecast7__legend-scale">
              {LEGEND.map((b) => (
                <li key={b.range} className="forecast7__legend-item">
                  <span className="forecast7__legend-dot" style={{ background: b.color }} aria-hidden="true" />
                  <span>{b.range}</span>
                  <b>{t(`verdict.${b.key}`)}</b>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="forecast7__legend-how"
              onClick={() => setHowOpen((v) => !v)}
              aria-expanded={howOpen}
            >
              <Info size={12} aria-hidden="true" /> {t('howItWorks')}
            </button>
          </div>
          {howOpen && <p className="forecast7__legend-note">{t('howNote')}</p>}
        </>
      )}
    </section>
  );
}

/** Compact one-line outlook row for the sidebar rail — when · moon · cloud bar · %. */
function OutlookRow({
  day,
  isToday,
  dayFmt,
  dateFmt,
  t,
}: {
  day: ForecastDay;
  isToday: boolean;
  dayFmt: Intl.DateTimeFormat;
  dateFmt: Intl.DateTimeFormat;
  t: ReturnType<typeof useTranslations>;
}) {
  const date = new Date(day.date);
  const cloudPct = Math.max(0, Math.min(100, day.cloudCoverPct));

  return (
    <li
      className={`forecast7__rrow forecast7__rrow--${day.badge}${isToday ? ' is-today' : ''}`}
      aria-label={`${isToday ? t('today') : dayFmt.format(date)} — ${t(`badge.${day.badge}`)} — ${cloudPct}% ${t('clouds')}`}
    >
      <span className="forecast7__rwhen">
        <span className="forecast7__rday">{isToday ? t('today') : dayFmt.format(date)}</span>
        <span className="forecast7__rdate">{dateFmt.format(date)}</span>
      </span>
      <span className="forecast7__rmoon" aria-hidden="true">
        <MoonGlyph phase={day.moonPhase} size={20} />
      </span>
      <span className="forecast7__rbar" aria-hidden="true">
        <span className="forecast7__rbar-fill" style={{ width: `${cloudPct}%` }} />
      </span>
      <span className="forecast7__rpct">{cloudPct}<em>%</em></span>
      {typeof day.tempLow === 'number' && (
        <span className="forecast7__rtemp">{day.tempLow}°</span>
      )}
    </li>
  );
}

/**
 * Compact 4-night outlook strip — mobile only.
 *
 * A horizontal row of four day cells, each just two text lines (weekday over
 * cloud %) with a small moon glyph and a verdict-tinted bar. Far slimmer than
 * the 7-row rail; the rail still carries the full week on desktop.
 */
export function FourNightStrip({ days, loading = false, locationLabel }: Omit<SevenDayForecastProps, 'variant'>) {
  const t = useTranslations('sky.forecast7');
  const t4 = useTranslations('sky.forecast4');
  const locale = useLocale();

  const dayFmt = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(locale, { weekday: 'short' });
    } catch {
      return new Intl.DateTimeFormat('en', { weekday: 'short' });
    }
  }, [locale]);

  const four = days.slice(0, 4);

  return (
    <section className="fcstrip" aria-label={t4('label')}>
      <div className="fcstrip__head">
        <span className="fcstrip__label">{t4('label')}</span>
        {locationLabel && <span className="fcstrip__loc">{locationLabel}</span>}
      </div>
      {loading && days.length === 0 ? (
        <div className="fcstrip__row" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="fcstrip__skel" />
          ))}
        </div>
      ) : four.length === 0 ? (
        <div className="fcstrip__empty">{t('empty')}</div>
      ) : (
        <ol className="fcstrip__row">
          {four.map((d, i) => {
            const date = new Date(d.date);
            const cloudPct = Math.max(0, Math.min(100, d.cloudCoverPct));
            return (
              <li
                key={d.date}
                className={`fcstrip__cell fcstrip__cell--${d.badge}${i === 0 ? ' is-today' : ''}`}
                aria-label={`${i === 0 ? t('today') : dayFmt.format(date)} — ${t(`badge.${d.badge}`)} — ${cloudPct}% ${t('clouds')}`}
              >
                <span className="fcstrip__day">{i === 0 ? t('today') : dayFmt.format(date)}</span>
                <span className="fcstrip__moon" aria-hidden="true">
                  <MoonGlyph phase={d.moonPhase} size={18} />
                </span>
                <span className="fcstrip__pct">{cloudPct}<em>%</em></span>
                <span className="fcstrip__bar" aria-hidden="true">
                  <span className="fcstrip__bar-fill" style={{ width: `${cloudPct}%` }} />
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function DayCard({
  day,
  isToday,
  dayFmt,
  dateFmt,
  t,
}: {
  day: ForecastDay;
  isToday: boolean;
  dayFmt: Intl.DateTimeFormat;
  dateFmt: Intl.DateTimeFormat;
  t: ReturnType<typeof useTranslations>;
}) {
  const date = new Date(day.date);
  const cloudPct = Math.max(0, Math.min(100, day.cloudCoverPct));
  const score = dayScore(day);
  const tier = scoreTier(score);
  const ck = cloudKey(cloudPct);
  const Icon = WX_ICON[ck];
  const verdict = t(`verdict.${tier.key}`);
  const clouds = t(`sky.${ck}`);

  const labelParts = [
    isToday ? t('today') : dayFmt.format(date),
    `${verdict} (${score}/100)`,
    clouds,
  ];
  if (typeof day.tempHigh === 'number') labelParts.push(`${day.tempHigh}° ${t('hi')}`);
  if (typeof day.tempLow === 'number') labelParts.push(`${day.tempLow}° ${t('lo')}`);

  return (
    <article
      className={`forecast7__day forecast7__day--${tier.key}${isToday ? ' is-today' : ''}`}
      aria-label={labelParts.join(' — ')}
    >
      <span className="forecast7__weekday">
        {isToday ? t('today') : dayFmt.format(date)}
      </span>
      <span className="forecast7__date">{dateFmt.format(date)}</span>

      <ScoreGauge score={score} color={tier.color} />

      <span className="forecast7__verdict" style={{ color: tier.color }}>{verdict}</span>

      <span className="forecast7__moon" aria-hidden="true">
        <MoonGlyph phase={day.moonPhase} size={26} />
      </span>

      <span className="forecast7__wx">
        <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
        <span>{clouds}</span>
      </span>

      {(typeof day.tempHigh === 'number' || typeof day.tempLow === 'number') && (
        <span className="forecast7__temps">
          {typeof day.tempLow === 'number' && (
            <span className="forecast7__temp"><b>{day.tempLow}°</b><i>{t('lo')}</i></span>
          )}
          {typeof day.tempHigh === 'number' && (
            <span className="forecast7__temp"><b>{day.tempHigh}°</b><i>{t('hi')}</i></span>
          )}
        </span>
      )}
    </article>
  );
}
