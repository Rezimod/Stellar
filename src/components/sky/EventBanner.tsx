'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { getUpcomingEvents, AstroEvent } from '@/lib/astro-events';
import EventInfoSheet from './EventInfoSheet';
import StarMark from '@/components/ui/StarMark';

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const event = new Date(dateStr + 'T12:00:00');
  event.setHours(0, 0, 0, 0);
  return Math.round((event.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const DISMISS_KEY = (date: string) => `stellar_dismissed_event_${date}`;

const DIFFICULTY_COLOR: Record<AstroEvent['difficulty'], string> = {
  'naked-eye':  'var(--seafoam)',
  'binoculars': 'var(--terracotta)',
  'telescope':  'var(--terracotta)',
  'expert':     'var(--negative)',
};

export default function EventBanner() {
  const t = useTranslations('skyUi.eventBanner');
  const [event, setEvent] = useState<AstroEvent | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const upcoming = getUpcomingEvents(new Date(), 7);
    const next = upcoming.find(e => !localStorage.getItem(DISMISS_KEY(e.date)));
    setEvent(next ?? null);
  }, []);

  if (!event) return null;

  const days = daysUntil(event.date);
  const whenLabel = days <= 0 ? t('today') : days === 1 ? t('tomorrow') : t('inDays', { days });

  function dismiss() {
    if (!event) return;
    localStorage.setItem(DISMISS_KEY(event.date), '1');
    setEvent(null);
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setSheetOpen(true)}
          className="glass-card p-4 border-[var(--terracotta)]/30 w-full text-left"
          aria-label={t('openDetails', { name: event.name })}
        >
          <div className="flex items-start gap-3 pr-6">
            <StarMark size={18} className="text-[var(--terracotta)] mt-0.5" />
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-text-primary text-sm font-semibold">{event.name}</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-[var(--terracotta)]/20 text-[var(--terracotta)] border-[var(--terracotta)]/40">
                  {whenLabel}
                </span>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border"
                  style={{
                    color: DIFFICULTY_COLOR[event.difficulty],
                    borderColor: `${DIFFICULTY_COLOR[event.difficulty]}55`,
                    background: `${DIFFICULTY_COLOR[event.difficulty]}1A`,
                  }}
                >
                  {t(`difficulty.${event.difficulty}`)}
                </span>
              </div>
              <p className="text-[var(--text-secondary)] text-xs leading-relaxed">{event.description}</p>
              <p className="text-[var(--terracotta)]/70 text-xs">{t('tip', { tip: event.viewingTip })}</p>
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="absolute top-2 right-2 min-h-0 p-1.5 text-[var(--text-dim)] hover:text-text-primary leading-none cursor-pointer"
          aria-label={t('dismiss')}
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      <EventInfoSheet open={sheetOpen} event={event} onClose={() => setSheetOpen(false)} />
    </>
  );
}
