'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { ForecastDay } from '@/lib/use-sky-data';

interface SevenDayForecastProps {
  days: ForecastDay[];
  loading?: boolean;
  /** Optional location label to anchor the section header. */
  locationLabel?: string;
}

/**
 * Compact 7-day observation outlook.
 *
 * Each day rolls up its hourly cloud cover into a single Go / Maybe / Skip
 * verdict — the same call telescope owners make every evening. Designed to
 * sit where HintCards + HorizonStrip used to: at-a-glance, action-first.
 */
export function SevenDayForecast({ days, loading = false, locationLabel }: SevenDayForecastProps) {
  const t = useTranslations('sky.forecast7');
  const locale = useLocale();

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

  return (
    <section className="forecast7" aria-label={t('label')}>
      <div className="forecast7__head">
        <span className="forecast7__label">{t('label')}</span>
        {locationLabel && <span className="forecast7__loc">{locationLabel}</span>}
      </div>
      {loading && days.length === 0 ? (
        <div className="forecast7__skeleton" aria-hidden="true">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="forecast7__skel" />
          ))}
        </div>
      ) : days.length === 0 ? (
        <div className="forecast7__empty">{t('empty')}</div>
      ) : (
        <div className="forecast7__row">
          {days.slice(0, 7).map((d, i) => (
            <DayCard key={d.date} day={d} isToday={i === 0} dayFmt={dayFmt} dateFmt={dateFmt} t={t} />
          ))}
        </div>
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
  // Cloud bar is a 0..100% fill — empty = clear sky (good).
  const cloudPct = Math.max(0, Math.min(100, day.cloudCoverPct));

  return (
    <article
      className={`forecast7__day forecast7__day--${day.badge}${isToday ? ' is-today' : ''}`}
      aria-label={`${dayFmt.format(date)} — ${t(`badge.${day.badge}`)}, ${cloudPct}% clouds`}
    >
      <div className="forecast7__day-head">
        <span className="forecast7__weekday">
          {isToday ? t('today') : dayFmt.format(date)}
        </span>
        <span className="forecast7__date">{dateFmt.format(date)}</span>
      </div>
      <div className="forecast7__cloud">
        <span className="forecast7__cloud-track" aria-hidden="true">
          <span className="forecast7__cloud-fill" style={{ width: `${cloudPct}%` }} />
        </span>
        <span className="forecast7__cloud-pct">{cloudPct}%</span>
      </div>
      <div className={`forecast7__badge forecast7__badge--${day.badge}`}>
        {t(`badge.${day.badge}`)}
      </div>
    </article>
  );
}
