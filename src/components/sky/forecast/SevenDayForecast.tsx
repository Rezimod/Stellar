'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { ForecastDay } from '@/lib/use-sky-data';
import { MoonGlyph, NightCloudStrip } from './visuals';

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
        <span className="forecast7__label">{t('label')}</span>
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
        <div className="forecast7__row">
          {days.slice(0, 7).map((d, i) => (
            <DayCard key={d.date} day={d} isToday={i === 0} dayFmt={dayFmt} dateFmt={dateFmt} t={t} />
          ))}
        </div>
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

  const labelParts = [
    isToday ? t('today') : dayFmt.format(date),
    `${t(`badge.${day.badge}`)}`,
    `${cloudPct}% ${t('clouds')}`,
  ];
  if (typeof day.tempLow === 'number') labelParts.push(`${day.tempLow}°`);
  if (typeof day.windKmh === 'number') labelParts.push(`wind ${day.windKmh}km/h`);

  return (
    <article
      className={`forecast7__day forecast7__day--${day.badge}${isToday ? ' is-today' : ''}`}
      aria-label={labelParts.join(' — ')}
    >
      <span className="forecast7__weekday">
        {isToday ? t('today') : dayFmt.format(date)}
      </span>
      <span className="forecast7__date">{dateFmt.format(date)}</span>

      <span className="forecast7__moon" aria-hidden="true">
        <MoonGlyph phase={day.moonPhase} size={22} />
      </span>

      <div className="forecast7__readout">
        <span className="forecast7__pct">{cloudPct}<em>%</em></span>
        {typeof day.tempLow === 'number' && (
          <span className="forecast7__temp-lo">{day.tempLow}°</span>
        )}
      </div>

      <div className="forecast7__strip" aria-hidden="true">
        <NightCloudStrip hours={day.nightHours} height={10} cellGap={1} />
      </div>

      <span className={`forecast7__badge forecast7__badge--${day.badge}`}>
        {t(`badge.${day.badge}`)}
      </span>
    </article>
  );
}
