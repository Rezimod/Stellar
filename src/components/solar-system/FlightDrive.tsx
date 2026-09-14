'use client';

import { useEffect, useRef, useState } from 'react';
import { Gauge, Orbit } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { FlightSession, SpeedMode } from '@/lib/solar-system/player-ship';
import { STAR_SYSTEMS, lightYearsBetween } from '@/lib/solar-system/star-routes';

interface FlightDriveProps {
  session: FlightSession;
  paused: boolean;
  touch: boolean;
}

/** The three flown regimes, in the order the gear key walks them. */
const GEARS: SpeedMode[] = ['cruise', 'fast', 'ultra'];

const formatLy = (locale: string, n: number, unit: string) =>
  `${new Intl.NumberFormat(locale, { notation: n >= 1e5 ? 'compact' : 'standard', maximumFractionDigits: 2 }).format(n)} ${unit}`;

/** The drive, in two keys: one gear that walks cruise → fast → ultra and
 *  wraps, and the light-year jump with its destination list. Both live in
 *  the dock beside the thumb sticks; the regime's name is read off the
 *  speed dial, so the keys themselves stay small. */
export function FlightDrive({ session, paused, touch }: FlightDriveProps) {
  const t = useTranslations('solarSystem.flight');
  const locale = useLocale();
  const [menu, setMenu] = useState(false);
  const gearRef = useRef<HTMLButtonElement>(null);
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
      const gear = gearRef.current;
      if (gear && gear.dataset.mode !== mode) {
        gear.dataset.mode = mode;
        const label = `${t('speedMode')} · ${t(`modes.${mode}`)}`;
        gear.setAttribute('aria-label', label);
        gear.title = label;
      }
      text(modeRef.current, t(`modes.${mode}`));
      const state = tel.jumpPhase !== 'none' ? 'jumping' : tel.driveReady ? 'ready' : 'locked';
      if (jumpRef.current) jumpRef.current.dataset.state = state;
      const target = t(`systems.${tel.targetName}`);
      text(destRef.current, state === 'locked' ? t('driveLocked') : state === 'jumping' ? target : `${target} · ${formatLy(locale, tel.targetLy, t('ly'))}`);
    };
    raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
  }, [session, t, locale]);

  /** One key, three regimes: the next one up, then back to cruise. */
  const cycle = () => {
    const tel = session.telemetry;
    if (session.paused || tel.jumpPhase !== 'none' || tel.pilot !== 'ship') return;
    session.input.modeRequest = GEARS[(GEARS.indexOf(tel.mode) + 1) % GEARS.length];
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
      <button ref={gearRef} type="button" className="flight-drive__gear" data-mode="cruise" onClick={cycle} disabled={paused} aria-label={t('speedMode')}>
        <Gauge size={17} aria-hidden />
        <span ref={modeRef} className="flight-drive__mode" />
        <span className="flight-drive__pips" aria-hidden><i /><i /><i /></span>
        {!touch && <kbd>1·2·3</kbd>}
      </button>
      <div className="flight-drive__jump-wrap">
        <button ref={jumpRef} type="button" className="flight-drive__jump" onClick={() => setMenu((m) => !m)} disabled={paused} aria-expanded={menu && !paused} aria-haspopup="menu" aria-label={t('jumpLabel')}>
          <Orbit size={17} aria-hidden />
          <span className="flight-drive__jump-text">
            <span className="flight-drive__jump-label">{touch ? t('jumpShort') : t('jumpLabel')}{!touch && <kbd>H</kbd>}</span>
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
