'use client';

import { useTranslations } from 'next-intl';

/**
 * The simulated clock.
 *
 * A booking is made for a time in the future, and the sky at that time decides
 * whether it is worth making. Defaulting to now is honest but leaves the
 * console refusing everything through the working day, so the visitor can step
 * to tonight's dark window — the same window the forecast pages compute.
 */
export default function TimeControl({
  now,
  timezone,
  offsetMs,
  onJumpToNight,
  onReturnToNow,
}: {
  now: number;
  timezone: string;
  offsetMs: number;
  onJumpToNight: () => void;
  onReturnToNow: () => void;
}) {
  const t = useTranslations('observatory.console');
  const stamp = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(now));

  return (
    <div className="obs-card">
      <div className="obs-card__head" style={{ marginBottom: '0.75rem' }}>
        <span className="obs-card__title">
          {t('siteTime')} <span className="obs-clock">{stamp}</span>
        </span>
        {offsetMs !== 0 && (
          <span className="obs-card__aside" style={{ color: 'var(--accent-text)' }}>
            {t('simulatedForward')}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="obs-ghost" onClick={onJumpToNight}>
          {t('jumpToNight')}
        </button>
        <button type="button" className="obs-ghost" onClick={onReturnToNow} disabled={offsetMs === 0}>
          {t('now')}
        </button>
      </div>
    </div>
  );
}
