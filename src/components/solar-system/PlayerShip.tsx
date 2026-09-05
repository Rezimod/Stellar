'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Rocket, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  attachDesktopControls,
  clearFlightInput,
  type FlightSession,
} from '@/lib/solar-system/player-ship';

interface PlayerShipProps {
  session: FlightSession;
  /** Fires when Explore Mode is entered (countdown starts) or left. */
  onActiveChange: (active: boolean) => void;
}

type Phase = 'idle' | 'countdown' | 'flying';

const STICK_RADIUS = 62;
const RADAR_PX = 92;
/** Auto-cruise throttle on touch: a phone has no spare thumb for a throttle,
 *  so the ship always makes way and the controls are steer, boost, brake. */
const CRUISE = 0.85;
const BRAKE = -0.7;

interface Stick {
  id: number;
  /** Where the thumb landed — the stick centres itself there. */
  ox: number;
  oy: number;
  x: number;
  y: number;
}

/**
 * Explore Mode chrome: the Explore button, launch countdown, the flight HUD
 * (speed, hull, radar) and the touch controls. The HUD is painted
 * imperatively from `session.telemetry` each frame — React only renders on
 * phase changes, never inside the animation loop.
 */
export function PlayerShip({ session, onActiveChange }: PlayerShipProps) {
  const t = useTranslations('solarSystem.flight');
  const [phase, setPhase] = useState<Phase>('idle');
  const [count, setCount] = useState(3);
  const [touch, setTouch] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const padRef = useRef<HTMLCanvasElement>(null);
  const radarRef = useRef<HTMLCanvasElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const hpFillRef = useRef<HTMLDivElement>(null);
  const hpTextRef = useRef<HTMLSpanElement>(null);
  const killsRef = useRef<HTMLSpanElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const detachRef = useRef<(() => void) | null>(null);
  const timersRef = useRef<number[]>([]);
  const brakeRef = useRef(false);
  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;

  useEffect(() => {
    setTouch(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  const clearTimers = () => {
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
  };

  const exit = useCallback(() => {
    if (phaseRef.current === 'idle') return;
    clearTimers();
    detachRef.current?.();
    detachRef.current = null;
    brakeRef.current = false;
    session.active = false;
    clearFlightInput(session.input);
    setPhase('idle');
    onActiveChange(false);
  }, [session, onActiveChange]);
  const exitRef = useRef(exit);
  exitRef.current = exit;

  const enter = () => {
    if (phaseRef.current !== 'idle') return;
    setPhase('countdown');
    setCount(3);
    onActiveChange(true);
    // Attach inside the click so the pointer-lock request counts as a gesture.
    if (!touch && rootRef.current) {
      detachRef.current = attachDesktopControls(session, rootRef.current, () => exitRef.current());
    }
    const at = (ms: number, fn: () => void) => timersRef.current.push(window.setTimeout(fn, ms));
    at(1000, () => setCount(2));
    at(2000, () => setCount(1));
    at(3000, () => setCount(0));
    at(3700, () => {
      session.telemetry.kills = 0;
      session.active = true;
      setPhase('flying');
    });
  };

  // Unmount: tear down without touching React state.
  useEffect(
    () => () => {
      clearTimers();
      detachRef.current?.();
      detachRef.current = null;
      session.active = false;
      clearFlightInput(session.input);
    },
    [session],
  );

  // ── Touch steering. One stick, anywhere in the left half of the screen:
  // left/right yaws, up/down pitches. The right half is reserved for the
  // action buttons so a thumb never has to share space with the stick. ──
  const stickRef = useRef<Stick>({ id: -1, ox: 0, oy: 0, x: 0, y: 0 });
  useEffect(() => {
    const pad = padRef.current;
    if (phase !== 'flying' || !touch || !pad) return;
    const stick = stickRef.current;
    const input = session.input;
    const apply = () => {
      input.yaw = stick.x;
      input.pitch = -stick.y;
    };
    const onStart = (e: TouchEvent) => {
      const rect = pad.getBoundingClientRect();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const tch = e.changedTouches[i];
        if (stick.id >= 0) continue;
        stick.id = tch.identifier;
        stick.ox = tch.clientX - rect.left;
        stick.oy = tch.clientY - rect.top;
        stick.x = stick.y = 0;
      }
      apply();
      e.preventDefault();
    };
    const onMove = (e: TouchEvent) => {
      const rect = pad.getBoundingClientRect();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const tch = e.changedTouches[i];
        if (tch.identifier !== stick.id) continue;
        let dx = (tch.clientX - rect.left - stick.ox) / STICK_RADIUS;
        let dy = (tch.clientY - rect.top - stick.oy) / STICK_RADIUS;
        const len = Math.hypot(dx, dy);
        if (len > 1) {
          dx /= len;
          dy /= len;
        }
        stick.x = dx;
        stick.y = dy;
        apply();
      }
      e.preventDefault();
    };
    const onEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier !== stick.id) continue;
        stick.id = -1;
        stick.x = stick.y = 0;
        apply();
      }
    };
    pad.addEventListener('touchstart', onStart, { passive: false });
    pad.addEventListener('touchmove', onMove, { passive: false });
    pad.addEventListener('touchend', onEnd);
    pad.addEventListener('touchcancel', onEnd);
    return () => {
      pad.removeEventListener('touchstart', onStart);
      pad.removeEventListener('touchmove', onMove);
      pad.removeEventListener('touchend', onEnd);
      pad.removeEventListener('touchcancel', onEnd);
      stick.id = -1;
      stick.x = stick.y = 0;
    };
  }, [phase, touch, session]);

  // ── HUD paint loop — DOM writes + two small canvases, no React state. ──
  useEffect(() => {
    if (phase !== 'flying') return;
    const tel = session.telemetry;
    const input = session.input;
    const radar = radarRef.current;
    const pad = padRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (radar) {
      radar.width = RADAR_PX * dpr;
      radar.height = RADAR_PX * dpr;
    }
    const sizePad = () => {
      if (!pad) return;
      pad.width = pad.clientWidth * dpr;
      pad.height = pad.clientHeight * dpr;
    };
    sizePad();
    window.addEventListener('resize', sizePad);

    let raf = 0;
    let lastHp = -1;
    let lastKills = -1;
    let lastSpeed = -1;
    const paint = () => {
      raf = requestAnimationFrame(paint);

      // Touch flight holds a cruise throttle so steering is the only stick.
      if (touch) input.thrust = brakeRef.current ? BRAKE : CRUISE;

      const speed = Math.round(tel.speed * 10);
      if (speed !== lastSpeed && speedRef.current) {
        lastSpeed = speed;
        speedRef.current.textContent = (speed / 10).toFixed(1);
      }
      const hp = Math.round(tel.hp);
      if (hp !== lastHp) {
        lastHp = hp;
        const k = tel.hp / tel.maxHp;
        if (hpFillRef.current) {
          hpFillRef.current.style.width = `${Math.max(0, k * 100)}%`;
          hpFillRef.current.style.background =
            k > 0.5 ? '#5eead4' : k > 0.25 ? '#ffb347' : '#ff5a5a';
        }
        if (hpTextRef.current) hpTextRef.current.textContent = String(hp);
      }
      if (tel.kills !== lastKills && killsRef.current) {
        lastKills = tel.kills;
        killsRef.current.textContent = String(tel.kills);
      }
      if (flashRef.current) flashRef.current.style.opacity = String(tel.hitFlash * 0.4);

      if (radar) {
        const ctx = radar.getContext('2d');
        if (ctx) {
          const s = RADAR_PX * dpr;
          const c = s / 2;
          ctx.clearRect(0, 0, s, s);
          ctx.fillStyle = 'rgba(6, 9, 14, 0.7)';
          ctx.beginPath();
          ctx.arc(c, c, c - 1, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(248, 244, 236, 0.18)';
          ctx.lineWidth = dpr;
          ctx.beginPath();
          ctx.arc(c, c, c - 1, 0, Math.PI * 2);
          ctx.moveTo(c, 2);
          ctx.lineTo(c, s - 2);
          ctx.moveTo(2, c);
          ctx.lineTo(s - 2, c);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(c, c, c * 0.5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#5eead4';
          ctx.beginPath();
          ctx.moveTo(c, c - 5 * dpr);
          ctx.lineTo(c + 3.5 * dpr, c + 4 * dpr);
          ctx.lineTo(c - 3.5 * dpr, c + 4 * dpr);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#ff5a5a';
          const reach = c - 6 * dpr;
          for (let i = 0; i < tel.radarCount; i++) {
            const x = c + tel.radar[i * 2] * reach;
            const y = c - tel.radar[i * 2 + 1] * reach;
            ctx.beginPath();
            ctx.arc(x, y, 2.5 * dpr, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      if (pad) {
        const ctx = pad.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, pad.width, pad.height);
          const st = stickRef.current;
          const r = STICK_RADIUS * dpr;
          // Idle, the stick shows a home ring in the left thumb zone so it is
          // obvious where to reach; on contact it re-centres under the thumb.
          const active = st.id >= 0;
          const ox = active ? st.ox * dpr : pad.width * 0.26;
          const oy = active ? st.oy * dpr : pad.height - r - 26 * dpr;
          ctx.strokeStyle = active ? 'rgba(94, 234, 212, 0.5)' : 'rgba(248, 244, 236, 0.22)';
          ctx.lineWidth = 1.5 * dpr;
          ctx.beginPath();
          ctx.arc(ox, oy, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = active ? 'rgba(94, 234, 212, 0.55)' : 'rgba(248, 244, 236, 0.16)';
          ctx.beginPath();
          ctx.arc(ox + st.x * r, oy + st.y * r, r * 0.36, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };
    raf = requestAnimationFrame(paint);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', sizePad);
      input.thrust = 0;
    };
  }, [phase, session, touch]);

  const hold = (key: 'fire' | 'boost') => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      session.input[key] = true;
    },
    onPointerUp: () => {
      session.input[key] = false;
    },
    onPointerCancel: () => {
      session.input[key] = false;
    },
    onPointerLeave: () => {
      session.input[key] = false;
    },
  });
  const holdBrake = {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      brakeRef.current = true;
    },
    onPointerUp: () => {
      brakeRef.current = false;
    },
    onPointerCancel: () => {
      brakeRef.current = false;
    },
    onPointerLeave: () => {
      brakeRef.current = false;
    },
  };

  return (
    <div ref={rootRef} className="flight-hud" data-phase={phase}>
      {phase === 'idle' && (
        <button type="button" className="flight-hud__explore" onClick={enter}>
          <Rocket size={16} strokeWidth={2.2} aria-hidden />
          <span>{t('explore')}</span>
        </button>
      )}

      {phase === 'countdown' && (
        <div className="flight-hud__countdown" role="status" aria-live="assertive">
          <span key={count} className="flight-hud__count">
            {count > 0 ? count : t('launch')}
          </span>
        </div>
      )}

      {phase !== 'idle' && (
        <button
          type="button"
          className="solar-system__fab flight-hud__exit"
          onClick={exit}
          aria-label={t('exit')}
        >
          <X size={20} strokeWidth={2.2} aria-hidden />
        </button>
      )}

      {phase === 'flying' && (
        <>
          <div ref={flashRef} className="flight-hud__flash" aria-hidden />
          <div className="flight-hud__speed" aria-live="off">
            <span className="flight-hud__label">{t('speed')}</span>
            <span ref={speedRef} className="flight-hud__value">0.0</span>
            <span className="flight-hud__label">{t('kills')}</span>
            <span ref={killsRef} className="flight-hud__value">0</span>
          </div>
          <canvas
            ref={radarRef}
            className="flight-hud__radar"
            style={{ width: RADAR_PX, height: RADAR_PX }}
            aria-hidden
          />
          <div className="flight-hud__hull">
            <div className="flight-hud__hull-row">
              <span className="flight-hud__label">{t('hull')}</span>
              <span ref={hpTextRef} className="flight-hud__value">100</span>
            </div>
            <div className="flight-hud__hp">
              <div ref={hpFillRef} className="flight-hud__hp-fill" />
            </div>
            {!touch && <div className="flight-hud__hint">{t('hint')}</div>}
          </div>
          {touch && (
            <>
              <canvas ref={padRef} className="flight-hud__pad" aria-hidden />
              <button type="button" className="flight-hud__brake" {...holdBrake}>
                {t('brake')}
              </button>
              <button type="button" className="flight-hud__boost" {...hold('boost')}>
                {t('boost')}
              </button>
              <button
                type="button"
                className="flight-hud__fire"
                {...hold('fire')}
                aria-label={t('fire')}
              >
                <span className="flight-hud__fire-dot" aria-hidden />
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
