'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Orbit } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { FlightSession } from '@/lib/solar-system/player-ship';
import { jumpChoices, lightYearsBetween } from '@/lib/solar-system/star-routes';

interface DriveProps {
  session: FlightSession;
  paused: boolean;
  touch: boolean;
}

const formatLy = (locale: string, n: number, unit: string) =>
  `${new Intl.NumberFormat(locale, { notation: n >= 1e5 ? 'compact' : 'standard', maximumFractionDigits: 2 }).format(n)} ${unit}`;

/** Paint telemetry into the DOM a few times a second, off React. */
function usePaint(session: FlightSession, paint: (tel: FlightSession['telemetry']) => void) {
  const ref = useRef(paint);
  ref.current = paint;
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 100) return;
      last = now;
      ref.current(session.telemetry);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [session]);
}

/** The throttle lever beside the dial: up a regime, down a regime. */
export function FlightGears({ session, paused, touch }: DriveProps) {
  const t = useTranslations('solarSystem.flight');
  const ref = useRef<HTMLDivElement>(null);
  usePaint(session, (tel) => {
    if (ref.current) ref.current.dataset.mode = tel.pilot === 'eva' ? 'eva' : tel.mode;
  });
  const shift = (faster: boolean) => {
    const tel = session.telemetry;
    if (session.paused || tel.jumpPhase !== 'none' || tel.pilot !== 'ship') return;
    session.input.modeRequest = faster ? 'fast' : 'cruise';
  };
  return (
    <div ref={ref} className="flight-gears" data-mode="cruise" role="group" aria-label={t('speedMode')}>
      <button type="button" onClick={() => shift(true)} disabled={paused} aria-label={t('faster')} title={t('faster')}>
        <ChevronUp size={18} aria-hidden />
        {!touch && <kbd>2</kbd>}
      </button>
      <span className="flight-gears__pips" aria-hidden><i /><i /></span>
      <button type="button" onClick={() => shift(false)} disabled={paused} aria-label={t('slower')} title={t('slower')}>
        <ChevronDown size={18} aria-hidden />
        {!touch && <kbd>1</kbd>}
      </button>
    </div>
  );
}

/** Jump tabs on the console's top edge: every other system, how far, one tap to go. */
export function FlightJumps({ session, paused, touch }: DriveProps) {
  const t = useTranslations('solarSystem.flight');
  const locale = useLocale();
  const [current, setCurrent] = useState(session.telemetry.systemName);
  const ref = useRef<HTMLDivElement>(null);
  usePaint(session, (tel) => {
    setCurrent(tel.systemName);
    const root = ref.current;
    if (!root) return;
    root.dataset.state = tel.jumpPhase !== 'none' ? 'jumping' : tel.driveReady ? 'ready' : 'locked';
    const target = tel.jumpPhase !== 'none' ? tel.targetName : '';
    root.querySelectorAll('button').forEach((b) => { b.dataset.active = String(b.dataset.id === target); });
  });
  const engage = (id: string) => {
    if (session.paused || session.telemetry.jumpPhase !== 'none') return;
    session.destination = id;
    session.input.modeRequest = 'jump';
  };
  return (
    <div ref={ref} className="flight-jumps" data-state="ready" role="group" aria-label={t('jumpLabel')}>
      {jumpChoices(current).map((id, i) => (
        <button key={id} type="button" data-id={id} onClick={() => engage(id)} disabled={paused} title={`${t('jumpLabel')} · ${t(`systems.${id}`)}`}>
          <Orbit size={14} aria-hidden />
          <span className="flight-jumps__text">
            <span className="flight-jumps__name">{t(`systems.${id}`)}</span>
            <span className="flight-jumps__ly">{formatLy(locale, lightYearsBetween(current, id), t('ly'))}</span>
          </span>
          {!touch && <kbd>{i === 0 ? 'H' : 'J'}</kbd>}
        </button>
      ))}
    </div>
  );
}
