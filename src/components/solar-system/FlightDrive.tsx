'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Orbit } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { FlightSession } from '@/lib/solar-system/player-ship';
import { STAR_SYSTEMS, lightYearsBetween } from '@/lib/solar-system/star-routes';

interface FlightDriveProps {
  session: FlightSession;
  paused: boolean;
  touch: boolean;
}

const formatLy = (locale: string, n: number, unit: string) =>
  `${new Intl.NumberFormat(locale, { notation: n >= 1e5 ? 'compact' : 'standard', maximumFractionDigits: 2 }).format(n)} ${unit}`;

/** The drive: slower / faster through the regimes, and the light-year jump
 *  with its destination list. */
export function FlightDrive({ session, paused, touch }: FlightDriveProps) {
  const t = useTranslations('solarSystem.flight');
  const locale = useLocale();
  const [menu, setMenu] = useState(false);
  const gearsRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<HTMLSpanElement>(null);
  const jumpRef = useRef<HTMLButtonElement>(null);
  const destRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const tel = session.telemetry;
    const text = (el: HTMLElement | null, v: string) => { if (el && el.textContent !== v) el.textContent = v; };
    let raf = 0;
    let last = 0;
    const paint = (now: number) => {
      raf = requestAnimationFrame(paint);
      if (now - last < 100) return;
      last = now;
      const mode = tel.pilot === 'eva' ? 'eva' : tel.mode;
      if (gearsRef.current) gearsRef.current.dataset.mode = mode;
      text(modeRef.current, t(`modes.${mode}`));
      const state = tel.jumpPhase !== 'none' ? 'jumping' : tel.driveReady ? 'ready' : 'locked';
      if (jumpRef.current) jumpRef.current.dataset.state = state;
      const target = t(`systems.${tel.targetName}`);
      text(destRef.current, state === 'locked' ? t('driveLocked') : state === 'jumping' ? target : `${target} · ${formatLy(locale, tel.targetLy, t('ly'))}`);
    };
    raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
  }, [session, t, locale]);

  const shift = (faster: boolean) => {
    const tel = session.telemetry;
    if (session.paused || tel.jumpPhase !== 'none' || tel.pilot !== 'ship') return;
    session.input.modeRequest = faster ? 'fast' : 'cruise';
  };
  const engage = (id: string) => {
    setMenu(false);
    if (session.paused) return;
    session.destination = id;
    session.input.modeRequest = 'jump';
  };
  const current = session.telemetry.systemName;

  return (
    <>
      <div ref={gearsRef} className="flight-drive" data-mode="cruise" role="group" aria-label={t('speedMode')}>
        <button type="button" className="flight-drive__step" onClick={() => shift(false)} disabled={paused} aria-label={t('slower')} title={t('slower')}>
          <ChevronDown size={22} aria-hidden />
          {!touch && <kbd>1</kbd>}
        </button>
        <span className="flight-drive__gear">
          <span ref={modeRef} className="flight-drive__mode" />
          <span className="flight-drive__pips" aria-hidden><i /><i /></span>
        </span>
        <button type="button" className="flight-drive__step" onClick={() => shift(true)} disabled={paused} aria-label={t('faster')} title={t('faster')}>
          <ChevronUp size={22} aria-hidden />
          {!touch && <kbd>2</kbd>}
        </button>
      </div>
      <div className="flight-drive__jump-wrap">
        <button ref={jumpRef} type="button" className="flight-drive__jump" onClick={() => setMenu((m) => !m)} disabled={paused} aria-expanded={menu && !paused} aria-haspopup="menu">
          <Orbit size={18} aria-hidden />
          <span className="flight-drive__jump-text">
            <span className="flight-drive__jump-label">{t('jumpLabel')}{!touch && <kbd>H</kbd>}</span>
            <span ref={destRef} className="flight-drive__dest" />
          </span>
        </button>
        {menu && !paused && (
          <div className="flight-drive__menu" role="menu" aria-label={t('jumpMenu')}>
            {STAR_SYSTEMS.filter((id) => id !== current).map((id) => (
              <button key={id} type="button" role="menuitem" onClick={() => engage(id)}>
                <span>{t(`systems.${id}`)}</span>
                <span className="flight-drive__ly">{formatLy(locale, lightYearsBetween(current, id), t('ly'))}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
