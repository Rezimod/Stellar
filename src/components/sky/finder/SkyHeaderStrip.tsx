'use client';

import { useTranslations } from 'next-intl';

interface Props {
  locationLabel: string;
  nowISO: string;
  visibleCount: number;
  activeName: string | null;
}

function formatLocalTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '—';
  }
}

export function SkyHeaderStrip({ locationLabel, nowISO, visibleCount, activeName }: Props) {
  const t = useTranslations('sky.skymap');
  const time = formatLocalTime(nowISO);
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
