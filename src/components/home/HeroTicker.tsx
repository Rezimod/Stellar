'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { getUpcomingEvents } from '@/lib/astro-events';

/* Sky-calendar marquee under the header. Pulls the next real events from the
   app's 2026 calendar (same source as /sky and /missions) and scrolls them.
   Content is duplicated once so the -50% translate loops seamlessly. */

type TickerEvent = { name: string; label: string };

const COPY = {
  en: { calendar: 'Sky Calendar' },
  ka: { calendar: 'ცის კალენდარი' },
} as const;

export default function HeroTicker() {
  const locale = useLocale() === 'ka' ? 'ka' : 'en';
  const [events, setEvents] = useState<TickerEvent[]>([]);
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    const now = new Date();
    setYear(now.getFullYear());
    const upcoming = getUpcomingEvents(now, 400).slice(0, 6);
    const fmt = new Intl.DateTimeFormat(locale === 'ka' ? 'ka-GE' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });
    setEvents(
      upcoming.map((e) => {
        const d = new Date(`${e.date}T00:00:00`);
        const date = Number.isNaN(d.getTime()) ? '' : fmt.format(d).toUpperCase();
        return { name: e.name, label: `${e.name.toUpperCase()} · ${date}` };
      }),
    );
  }, [locale]);

  const label = `${COPY[locale].calendar}${year ? ` ${year}` : ''}`;

  const Group = () => (
    <div
      className="flex shrink-0 items-center gap-11 whitespace-nowrap px-6 py-2.5 uppercase"
      style={{
        fontFamily: 'var(--font-mono), ui-monospace, monospace',
        fontWeight: 500,
        fontSize: 12,
        letterSpacing: '0.14em',
        color: '#9aa6c8',
      }}
    >
      <span style={{ color: '#f5a83d' }}>{label}</span>
      {events.map((e, i) => (
        <span key={`${e.name}-${i}`} className="flex items-center gap-11">
          <Link
            href="/sky"
            className="text-[#9aa6c8] no-underline transition-colors hover:text-[#eef2ff]"
          >
            {e.label}
          </Link>
          <span aria-hidden style={{ color: '#3d476b' }}>
            ✦
          </span>
        </span>
      ))}
    </div>
  );

  return (
    <div
      className="heroV2-ticker-group relative z-20 overflow-hidden"
      style={{
        borderTop: '1px solid rgba(140,165,235,0.10)',
        borderBottom: '1px solid rgba(140,165,235,0.10)',
        background: 'rgba(6,9,20,0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {events.length > 0 ? (
        <div className="heroV2-ticker flex w-max">
          <Group />
          <Group />
        </div>
      ) : (
        <div className="flex w-max">
          <Group />
        </div>
      )}
    </div>
  );
}
