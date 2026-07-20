'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Info } from 'lucide-react';
import type { ForecastDay } from '@/lib/use-sky-data';
import { MoonGlyph } from './visuals';

type Verdict = 'go' | 'maybe' | 'skip';

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

/**
 * Verdict tier from the score rather than from `day.badge`. The badge is
 * cloud-only while the score also weighs moonlight, so reading colour from
 * one and bar height from the other would let a tall bar render red.
 */
function verdictOf(score: number): Verdict {
  if (score >= 65) return 'go';
  if (score >= 40) return 'maybe';
  return 'skip';
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

interface SevenDayForecastProps {
  days: ForecastDay[];
  loading?: boolean;
  /** Optional location label to anchor the section header. */
  locationLabel?: string;
}

/**
 * 7-night observation outlook.
 *
 * The question this answers is "which night this week do I take the scope
 * out?", which is a comparison — so every night sits on one shared baseline
 * and the winner is called out in words above the chart. The previous version
 * gave each night its own ring gauge in its own card, which made seven
 * identical objects and left the comparison entirely to the reader.
 */
export function SevenDayForecast({ days, loading = false, locationLabel }: SevenDayForecastProps) {
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
  const longDayFmt = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(locale, { weekday: 'long' });
    } catch {
      return new Intl.DateTimeFormat('en', { weekday: 'long' });
    }
  }, [locale]);

  const week = useMemo(
    () =>
      days.slice(0, 7).map((day, i) => ({
        day,
        isToday: i === 0,
        score: dayScore(day),
        verdict: verdictOf(dayScore(day)),
      })),
    [days],
  );

  // The verdict line. Ties resolve to the earliest night — a good sky sooner
  // is worth more than the same sky later in the week.
  const best = useMemo(() => {
    if (!week.length) return null;
    return week.reduce((a, b) => (b.score > a.score ? b : a));
  }, [week]);

  return (
    <section className="fcw" aria-label={t('label')}>
      <div className="fcw__head">
        <h2 className="fcw__label">{t('label')}</h2>
        {locationLabel && <span className="fcw__loc">{locationLabel}</span>}
      </div>

      {loading && week.length === 0 ? (
        <div className="fcw__chart" aria-hidden="true">
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i} className="fcw__skel" />
          ))}
        </div>
      ) : week.length === 0 ? (
        <p className="fcw__empty">{t('empty')}</p>
      ) : (
        <>
          {best && (
            <p className="fcw__best">
              {t.rich('bestLine', {
                day: best.isToday ? t('today') : longDayFmt.format(new Date(best.day.date)),
                score: best.score,
                sky: t(`sky.${cloudKey(best.day.cloudCoverPct)}`).toLowerCase(),
                b: (chunks) => <b>{chunks}</b>,
              })}
            </p>
          )}

          <ol className="fcw__chart">
            {week.map(({ day, isToday, score, verdict }) => {
              const date = new Date(day.date);
              // Short form in the column: "Tonight" overflows a 7-column grid
              // on a phone, and shrinking it further would breach the 12px
              // microcopy floor. The full word still carries the aria label
              // and the verdict sentence above.
              const label = isToday ? t('todayShort') : dayFmt.format(date);
              const isBest = day.date === best?.day.date;
              return (
                <li
                  key={day.date}
                  className={`fcw__col fcw__col--${verdict}${isBest ? ' is-best' : ''}`}
                  // Drives both the bar height and the label that rides on
                  // top of it, so the number can never drift off its bar.
                  // Floored so a 0-score night still reads as a night.
                  style={{ '--h': `${Math.max(4, score)}%` } as React.CSSProperties}
                  aria-label={[
                    isToday ? t('today') : longDayFmt.format(date),
                    `${score}/100`,
                    t(`badge.${verdict}`),
                    t(`sky.${cloudKey(day.cloudCoverPct)}`),
                    typeof day.tempLow === 'number' ? `${day.tempLow}° ${t('lo')}` : '',
                  ]
                    .filter(Boolean)
                    .join(' — ')}
                >
                  {/* Bars share one baseline, so height is the comparison. */}
                  <span className="fcw__track">
                    <span className="fcw__bar" aria-hidden="true" />
                    <span className="fcw__score" aria-hidden="true">{score}</span>
                  </span>
                  <span className="fcw__day">{label}</span>
                  <span className="fcw__moon" aria-hidden="true">
                    <MoonGlyph phase={day.moonPhase} size={14} litColor="var(--fcw-moon-lit)" />
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="fcw__foot">
            <button
              type="button"
              className="fcw__how"
              onClick={() => setHowOpen((v) => !v)}
              aria-expanded={howOpen}
            >
              <Info size={12} aria-hidden="true" />
              {t('howItWorks')}
            </button>
            {howOpen && <p className="fcw__note">{t('howNote')}</p>}
          </div>
        </>
      )}
    </section>
  );
}
