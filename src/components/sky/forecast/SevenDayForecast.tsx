'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Cloud, CloudRain, CloudSun, Droplets, Moon, Sun, Wind } from 'lucide-react';
import type { ForecastDay } from '@/lib/use-sky-data';

interface SevenDayForecastProps {
  days: ForecastDay[];
  loading?: boolean;
  /** Optional location label to anchor the section header. */
  locationLabel?: string;
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
  const cloudPct = Math.max(0, Math.min(100, day.cloudCoverPct));
  const Icon = pickIcon(cloudPct);

  const labelParts = [
    isToday ? t('today') : dayFmt.format(date),
    `${t(`badge.${day.badge}`)}`,
    `${cloudPct}% ${t('clouds')}`,
  ];
  if (typeof day.tempHigh === 'number') labelParts.push(`${day.tempHigh}°`);
  if (typeof day.windKmh === 'number') labelParts.push(`wind ${day.windKmh}km/h`);

  return (
    <article
      className={`forecast7__day forecast7__day--${day.badge}${isToday ? ' is-today' : ''}`}
      aria-label={labelParts.join(' — ')}
    >
      <div className="forecast7__day-head">
        <span className="forecast7__weekday">
          {isToday ? t('today') : dayFmt.format(date)}
        </span>
        <span className="forecast7__date">{dateFmt.format(date)}</span>
      </div>

      <div className={`forecast7__icon forecast7__icon--${day.badge}`} aria-hidden="true">
        <Icon size={24} strokeWidth={1.5} />
      </div>

      {(typeof day.tempHigh === 'number' || typeof day.tempLow === 'number') && (
        <div className="forecast7__temp">
          {typeof day.tempHigh === 'number' && (
            <span className="forecast7__temp-hi">{day.tempHigh}°</span>
          )}
          {typeof day.tempLow === 'number' && (
            <span className="forecast7__temp-lo">{day.tempLow}°</span>
          )}
        </div>
      )}

      <div className="forecast7__cloud">
        <span className="forecast7__cloud-track" aria-hidden="true">
          <span className="forecast7__cloud-fill" style={{ width: `${cloudPct}%` }} />
        </span>
        <span className="forecast7__cloud-pct">{cloudPct}%</span>
      </div>

      <ul className="forecast7__metrics" aria-hidden="true">
        {typeof day.windKmh === 'number' && (
          <li className="forecast7__metric">
            <Wind size={11} strokeWidth={1.6} />
            <span>{day.windKmh}<em>km/h</em></span>
          </li>
        )}
        {typeof day.humidityPct === 'number' && (
          <li className="forecast7__metric">
            <Droplets size={11} strokeWidth={1.6} />
            <span>{day.humidityPct}<em>%</em></span>
          </li>
        )}
      </ul>

      <div className={`forecast7__badge forecast7__badge--${day.badge}`}>
        {t(`badge.${day.badge}`)}
      </div>
    </article>
  );
}

// Cloud-cover -> icon. Cloud cover is the dominant signal in our forecast,
// so the icon should reflect that rather than a generic weather code.
function pickIcon(cloudPct: number) {
  if (cloudPct < 15) return ClearMoon;
  if (cloudPct < 35) return Sun;
  if (cloudPct < 65) return CloudSun;
  if (cloudPct < 85) return Cloud;
  return CloudRain;
}

// Re-export the night-sky icon as a named component so React keeps the
// motion separate from the day icons.
function ClearMoon(props: React.ComponentProps<typeof Moon>) {
  return <Moon {...props} />;
}
