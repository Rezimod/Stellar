'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { HC_RATES, type Axis } from '@/lib/observatory/mount-drive';

export type HandControlProps = {
  rate: number;
  onRate: (rate: number) => void;
  onPress: (axis: Axis, direction: 1 | -1) => void;
  onRelease: (axis: Axis) => void;
  tracking: boolean;
  /** Distance from the tracked target, arcminutes. Null when nothing is being tracked. */
  offTargetArcmin: number | null;
};

type Key = { id: string; axis: Axis; direction: 1 | -1; label: string; Icon: typeof ChevronUp };

const KEYS: Record<string, Key> = {
  ArrowUp: { id: 'up', axis: 'alt', direction: 1, label: 'Altitude up', Icon: ChevronUp },
  ArrowDown: { id: 'down', axis: 'alt', direction: -1, label: 'Altitude down', Icon: ChevronDown },
  ArrowLeft: { id: 'left', axis: 'az', direction: -1, label: 'Azimuth west', Icon: ChevronLeft },
  ArrowRight: { id: 'right', axis: 'az', direction: 1, label: 'Azimuth east', Icon: ChevronRight },
};

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName);

/**
 * The NexStar hand control: four direction keys that slew while held, and
 * nine rates. Keys on a keyboard do the same job — arrows to slew, digits
 * to pick the rate — so the frame can be steered without taking a hand off
 * the trackpad.
 */
export default function HandControl(p: HandControlProps) {
  const [held, setHeld] = useState<Set<string>>(new Set());

  const press = useCallback(
    (key: Key) => {
      setHeld((prev) => (prev.has(key.id) ? prev : new Set(prev).add(key.id)));
      p.onPress(key.axis, key.direction);
    },
    [p],
  );

  const release = useCallback(
    (key: Key) => {
      setHeld((prev) => {
        if (!prev.has(key.id)) return prev;
        const next = new Set(prev);
        next.delete(key.id);
        return next;
      });
      p.onRelease(key.axis);
    },
    [p],
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const key = KEYS[e.key];
      if (key) {
        e.preventDefault();
        if (!e.repeat) press(key);
        return;
      }
      if (/^[1-9]$/.test(e.key)) p.onRate(Number(e.key));
    };
    const up = (e: KeyboardEvent) => {
      const key = KEYS[e.key];
      if (key) release(key);
    };
    // Losing the window mid-hold must not leave an axis running.
    const blur = () => {
      for (const key of Object.values(KEYS)) release(key);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [p, press, release]);

  const pad = (key: Key) => (
    <button
      type="button"
      className="obs-pad__key"
      aria-label={key.label}
      aria-pressed={held.has(key.id)}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        press(key);
      }}
      onPointerUp={() => release(key)}
      onPointerCancel={() => release(key)}
      onLostPointerCapture={() => release(key)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <key.Icon size={22} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );

  const current = HC_RATES.find((r) => r.rate === p.rate) ?? HC_RATES[HC_RATES.length - 1];

  return (
    <div className="obs-panel">
      <div className="obs-panel__bar">
        <span className="obs-panel__title">Hand control</span>
        <span className="obs-panel__title" style={{ color: 'var(--accent-text)' }}>
          Rate {current.rate} · {current.label}
        </span>
      </div>

      <div className="obs-panel__body">
        <div className="obs-pad" role="group" aria-label="Slew direction, hold to move">
          <span />
          {pad(KEYS.ArrowUp)}
          <span />
          {pad(KEYS.ArrowLeft)}
          <span className="obs-pad__centre" aria-hidden="true">
            {p.tracking ? 'TRK' : 'IDLE'}
          </span>
          {pad(KEYS.ArrowRight)}
          <span />
          {pad(KEYS.ArrowDown)}
          <span />
        </div>

        <div className="mt-4">
          <span className="obs-label">Motor speed</span>
          <div className="obs-rates mt-1" role="group" aria-label="Slew rate">
            {HC_RATES.map((r) => (
              <button
                key={r.rate}
                type="button"
                className="obs-rates__key"
                aria-pressed={r.rate === p.rate}
                aria-label={`Rate ${r.rate}, ${r.label}`}
                onClick={() => p.onRate(r.rate)}
              >
                {r.rate}
              </button>
            ))}
          </div>
        </div>

        <dl className="mt-3">
          <div className="obs-readout">
            <dt className="obs-label">Tracking</dt>
            <dd className="obs-readout__value">{p.tracking ? 'Sidereal' : 'Off'}</dd>
          </div>
          <div className="obs-readout">
            <dt className="obs-label">Off target</dt>
            <dd className="obs-readout__value">
              {p.offTargetArcmin === null
                ? '—'
                : p.offTargetArcmin < 1
                  ? `${(p.offTargetArcmin * 60).toFixed(0)}″`
                  : `${p.offTargetArcmin.toFixed(1)}′`}
            </dd>
          </div>
        </dl>

        <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          Hold a key to slew; arrow keys and digits 1–9 work too. Rates 1–5 centre, 6–9 cross the sky.
        </p>
      </div>
    </div>
  );
}
