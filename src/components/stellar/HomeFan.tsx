'use client';

import Link from 'next/link';
import { useRef, type CSSProperties, type PointerEvent } from 'react';
import { SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';
import { glowFor } from '@/lib/stellar/plate';
import { TIERS } from '@/lib/stellar/tiers';
import CardThumb from './CardThumb';
import TierCapsule from './TierCapsule';

/**
 * The vault beside the headline: the sealed capsule lit by its two blades, a
 * hand of cards fanned behind it on a pedestal. Each card has a seat on the
 * stage (x, y in percent), a lean and a size. The first three also carry
 * `side`; the rest stay hidden on a phone. Any card can be pulled out and moved.
 */
const HAND = [
  { designation: 'HALLEY', x: 50, y: 30, rot: 0, s: 0.9, side: 0 },
  { designation: 'JUPITER', x: 34, y: 35, rot: -9, s: 0.9 },
  { designation: 'M31', x: 66, y: 35, rot: 9, s: 0.9 },
  { designation: 'SATURN', x: 20, y: 46, rot: -17, s: 0.92, side: -1 },
  { designation: 'M1', x: 80, y: 46, rot: 17, s: 0.92, side: 1 },
];

const DRAG_START = 5;

export default function HomeFan() {
  const top = useRef(20);

  function onPointerDown(e: PointerEvent<HTMLAnchorElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    const el = e.currentTarget;
    const startX = e.clientX, startY = e.clientY;
    const baseX = parseFloat(el.style.getPropertyValue('--dx-px')) || 0;
    const baseY = parseFloat(el.style.getPropertyValue('--dy-px')) || 0;
    let moved = false;
    el.style.zIndex = String(++top.current);

    const onMove = (ev: globalThis.PointerEvent) => {
      const mx = ev.clientX - startX, my = ev.clientY - startY;
      if (!moved && Math.hypot(mx, my) < DRAG_START) return;
      if (!moved) { moved = true; el.dataset.drag = 'on'; }
      el.style.setProperty('--dx-px', `${baseX + mx}px`);
      el.style.setProperty('--dy-px', `${baseY + my}px`);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      delete el.dataset.drag;
      if (moved) {
        const swallow = (ce: Event) => { ce.preventDefault(); ce.stopPropagation(); };
        window.addEventListener('click', swallow, { capture: true, once: true });
        setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  return (
    <div className="sd-herofan" aria-label="The sealed capsule and cards from First Light">
      <span className="sd-herofan__light" aria-hidden="true" />
      <span className="sd-herofan__plate" aria-hidden="true">Founding set · First Light</span>
      <div className="sd-herofan__deck">
        {HAND.map((f, i) => {
          const c = SET_001_CARD_BY_DESIGNATION.get(f.designation);
          if (!c) return null;
          return (
            <Link
              key={f.designation}
              href={`/card/${f.designation}`}
              className="sd-herofan__card"
              aria-label={c.seed.name}
              data-zoom={f.designation}
              data-phone={f.side === undefined ? 'hide' : undefined}
              draggable={false}
              onPointerDown={onPointerDown}
              onDragStart={(e) => e.preventDefault()}
              style={
                {
                  '--x': f.x, '--y': f.y, '--rot': `${f.rot}deg`, '--s': f.s, '--i': i,
                  '--side': f.side ?? 0, '--off': Math.abs(f.side ?? 0),
                  '--tile-glow': glowFor(f.designation),
                } as CSSProperties
              }
            >
              <CardThumb designation={f.designation} eager />
            </Link>
          );
        })}
      </div>
      <span className="sd-herofan__capsule" aria-hidden="true">
        <TierCapsule tier={TIERS[0]} />
      </span>
      <span className="sd-herofan__pedestal" aria-hidden="true" />
    </div>
  );
}
