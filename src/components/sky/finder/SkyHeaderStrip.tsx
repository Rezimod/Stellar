'use client';

import { useTranslations } from 'next-intl';

interface Props {
  locationLabel: string;
  nowISO: string;
  visibleCount: number;
  activeName: string | null;
  /** IANA timezone of the observing location; falls back to the browser zone. */
  timeZone?: string;
}

function formatLocalTime(iso: string, timeZone?: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false, timeZone });
  } catch {
    return '—';
  }
}

export function SkyHeaderStrip({ locationLabel, nowISO, visibleCount, activeName, timeZone }: Props) {
  const t = useTranslations('sky.skymap');
  const time = formatLocalTime(nowISO, timeZone);
  return (
    <div className="sky-strip-mini" role="presentation">
      <span className="sky-strip-mini__cell">{locationLabel}</span>
      <span className="sky-strip-mini__sep" aria-hidden>·</span>
      <span className="sky-strip-mini__cell sky-strip-mini__cell--time">{time}</span>
      <span className="sky-strip-mini__sep" aria-hidden>·</span>
      <span className="sky-strip-mini__cell">
        {t('visible', { count: visibleCount })}
      </span>
      {activeName && (
        <>
          <span className="sky-strip-mini__sep" aria-hidden>·</span>
          <span className="sky-strip-mini__cell sky-strip-mini__cell--active">{activeName}</span>
        </>
      )}
    </div>
  );
}
