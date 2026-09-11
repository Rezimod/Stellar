'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronsUpDown } from 'lucide-react';
import { STATIONS, skyStateAt, type SkyState, type Station } from '@/lib/observatory/sim-stations';

/**
 * The telescope list. A green dot means the station is under a dark sky
 * right now and can be connected; anything else is named and greyed, so the
 * visitor learns why rather than wondering.
 */
export default function StationMenu({
  current,
  now,
  onSelect,
  open,
  onOpen,
}: {
  current: Station | null;
  now: number;
  onSelect: (station: Station) => void;
  open: boolean;
  onOpen: (open: boolean) => void;
}) {
  const t = useTranslations('observatory.telescope');
  const ref = useRef<HTMLDivElement>(null);
  const [states, setStates] = useState<Record<string, SkyState>>({});

  useEffect(() => {
    if (!open) return;
    const date = new Date(now);
    setStates(Object.fromEntries(STATIONS.map((s) => [s.id, skyStateAt(s, date)])));
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
    // Graded when the menu opens; a station does not change state while it is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="tel-station" ref={ref}>
      <button
        type="button"
        className="tel-station__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => onOpen(!open)}
      >
        <span className="tel-station__name">{current ? current.name : t('selectTelescope')}</span>
        <ChevronsUpDown size={16} aria-hidden="true" />
      </button>

      {open && (
        <ul className="tel-station__list" role="listbox" aria-label={t('selectTelescope')}>
          <li className="tel-station__hint">{t('pickHint')}</li>
          {STATIONS.map((s) => {
            const state = states[s.id] ?? 'day';
            const available = state === 'night';
            return (
              <li key={s.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={current?.id === s.id}
                  className="tel-station__item"
                  disabled={!available}
                  onClick={() => {
                    onSelect(s);
                    onOpen(false);
                  }}
                >
                  <span className={`obs-led ${available ? 'obs-led--nominal' : ''}`} aria-hidden="true" />
                  <span className="tel-station__text">
                    <span className="tel-station__title">{s.name}</span>
                    <span className="tel-station__meta">
                      {s.site} · {s.instrument.optics} · {t(`sky_${state}`)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
