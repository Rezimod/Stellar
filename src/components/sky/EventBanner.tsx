'use client';

import { useEffect, useState } from 'react';
import { getUpcomingEvents, AstroEvent } from '@/lib/astro-events';

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const event = new Date(dateStr + 'T12:00:00');
  event.setHours(0, 0, 0, 0);
  return Math.round((event.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const DISMISS_KEY = (date: string) => `stellar_dismissed_event_${date}`;

export default function EventBanner() {
  const [event, setEvent] = useState<AstroEvent | null>(null);

  useEffect(() => {
    const upcoming = getUpcomingEvents(new Date());
    const next = upcoming.find(e => !localStorage.getItem(DISMISS_KEY(e.date)));
    setEvent(next ?? null);
  }, []);

  if (!event) return null;

  const days = daysUntil(event.date);

  function dismiss() {
    if (!event) return;
    localStorage.setItem(DISMISS_KEY(event.date), '1');
    setEvent(null);
  }

  return (
    <div className="glass-card p-4 border-[var(--terracotta)]/30 relative" style={{ boxShadow: '0 0 20px rgba(232, 130, 107,0.05)' }}>
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-[var(--text-dim)] hover:text-text-primary text-sm leading-none"
        aria-label="Dismiss"
      >
        ✕
      </button>

      <div className="flex items-start gap-3 pr-6">
        <span className="text-[var(--terracotta)] text-lg mt-0.5">✦</span>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-text-primary text-sm font-semibold">{event.name}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-[var(--terracotta)]/20 text-[var(--terracotta)] border-[var(--terracotta)]/40">
              In {days} day{days !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-[var(--text-secondary)] text-xs leading-relaxed">{event.description}</p>
          <p className="text-[var(--terracotta)]/70 text-xs">Tip: {event.viewingTip}</p>
        </div>
      </div>
    </div>
  );
}
