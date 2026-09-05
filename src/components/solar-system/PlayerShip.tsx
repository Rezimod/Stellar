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

const STICK_RADIUS = 56;
const RADAR_PX = 96;

interface Stick {
  id: number;
  ox: number;
  oy: number;
  x: number;
  y: number;
}

/**
 * Explore Mode chrome: the EXPLORE button, launch countdown, the flight HUD
 * (speed, hull bar, radar) and the touch controls. The HUD is painted
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
  const respawnRef = useRef<HTMLDivElement>(null);
  const detachRef = useRef<(() => void) | null>(null);
  const timersRef = useRef<number[]>([]);
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

  // ── Touch sticks (mobile): left = thrust / yaw, right = pitch / yaw. ──
  const sticksRef = useRef<{ left: Stick; right: Stick }>({
    left: { id: -1, ox: 0, oy: 0, x: 0, y: 0 },
    right: { id: -1, ox: 0, oy: 0, x: 0, y: 0 },
  });
  useEffect(() => {
    const pad = padRef.current;
    if (phase !== 'flying' || !touch || !pad) return;
    const sticks = sticksRef.current;
    const input = session.input;
    const applyStick = (s: Stick, left: boolean) => {
      if (left) {
        input.yaw = s.x;
        input.thrust = -s.y;
      } else {
        input.lookYaw = s.x;
        input.pitch = -s.y;
      }
    };
    const onStart = (e: TouchEvent) => {
      const rect = pad.getBoundingClientRect();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const tch = e.changedTouches[i];
        const x = tch.clientX - rect.left;
        const y = tch.clientY - rect.top;
        const s = x < rect.width / 2 ? sticks.left : sticks.right;
        if (s.id >= 0) continue;
        s.id = tch.identifier;
        s.ox = x;
        s.oy = y;
        s.x = s.y = 0;
      }
      e.preventDefault();
    };
    const onMove = (e: TouchEvent) => {
      const rect = pad.getBoundingClientRect();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const tch = e.changedTouches[i];
        const s = tch.identifier === sticks.left.id ? sticks.left
          : tch.identifier === sticks.right.id ? sticks.right : null;
        if (!s) continue;
        let dx = (tch.clientX - rect.left - s.ox) / STICK_RADIUS;
        let dy = (tch.clientY - rect.top - s.oy) / STICK_RADIUS;
        const len = Math.hypot(dx, dy);
        if (len > 1) {
          dx /= len;
          dy /= len;
        }
        s.x = dx;
        s.y = dy;
        applyStick(s, s === sticks.left);
      }
      e.preventDefault();
    };
    const onEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const id = e.changedTouches[i].identifier;
        for (const s of [sticks.left, sticks.right]) {
          if (s.id !== id) continue;
          s.id = -1;
          s.x = s.y = 0;
          applyStick(s, s === sticks.left);
        }
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
      sticks.left.id = sticks.right.id = -1;
      sticks.left.x = sticks.left.y = sticks.right.x = sticks.right.y = 0;
    };
  }, [phase, touch, session]);

  // ── HUD paint loop — DOM writes + two small canvases, no React state. ──
  useEffect(() => {
    if (phase !== 'flying') return;
    const tel = session.telemetry;
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
      const speed = Math.round(tel.speed * 10);
      if (speed !== lastSpeed && speedRef.current) {
        lastSpeed = speed;
        speedRef.current.textContent = (speed / 10).toFixed(1);
      }
      if (tel.hp !== lastHp) {
        lastHp = tel.hp;
        const k = tel.hp / tel.maxHp;
        if (hpFillRef.current) {
          hpFillRef.current.style.width = `${Math.max(0, k * 100)}%`;
          hpFillRef.current.style.background =
            k > 0.5 ? '#5eead4' : k > 0.25 ? '#ffb347' : '#ff5a5a';
        }
        if (hpTextRef.current) hpTextRef.current.textContent = String(Math.round(tel.hp));
      }
      if (tel.kills !== lastKills && killsRef.current) {
        lastKills = tel.kills;
        killsRef.current.textContent = String(tel.kills);
      }
      if (flashRef.current) flashRef.current.style.opacity = String(tel.hitFlash * 0.4);
      if (respawnRef.current) respawnRef.current.hidden = tel.respawnIn <= 0;

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
          for (const s of [sticksRef.current.left, sticksRef.current.right]) {
            if (s.id < 0) continue;
            const ox = s.ox * dpr;
            const oy = s.oy * dpr;
            const r = STICK_RADIUS * dpr;
            ctx.strokeStyle = 'rgba(248, 244, 236, 0.35)';
            ctx.lineWidth = 1.5 * dpr;
            ctx.beginPath();
            ctx.arc(ox, oy, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(94, 234, 212, 0.55)';
            ctx.beginPath();
            ctx.arc(ox + s.x * r, oy + s.y * r, r * 0.38, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    };
    raf = requestAnimationFrame(paint);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', sizePad);
    };
  }, [phase, session]);

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
          <div ref={respawnRef} className="flight-hud__respawn" role="status" hidden>
            {t('respawn')}
          </div>
          {touch && (
            <>
              <canvas ref={padRef} className="flight-hud__pad" aria-hidden />
              <button type="button" className="flight-hud__boost" {...hold('boost')}>
                {t('boost')}
              </button>
              <button type="button" className="flight-hud__fire" {...hold('fire')} aria-label={t('fire')}>
                <span className="flight-hud__fire-dot" aria-hidden />
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
