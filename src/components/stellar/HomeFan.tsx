'use client';

import Link from 'next/link';
import { useRef, type CSSProperties, type PointerEvent } from 'react';
import { SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';
import { glowFor } from '@/lib/stellar/plate';
import CardThumb from './CardThumb';

/**
 * Eight cards of the set in a ring around the headline. Each has a seat on the
 * ring as a fraction of its two radii (ax, ay), a lean and a size; the radii
 * grow from the copy's own footprint (stellar-pages.css), so the cards always
 * clear the words. The first three also carry `side`, the fan they fold into
 * on a phone, where the rest stay hidden. Any card can be picked up and dragged.
 */
const RING = [
  { designation: 'SATURN', ax: -1, ay: 0, rot: -10, s: 1, side: -1 },
  { designation: 'M1', ax: 1, ay: 0, rot: 10, s: 1, side: 1 },
  { designation: 'HALLEY', ax: 0, ay: -1, rot: 2, s: 0.64, side: 0 },
  { designation: 'JUPITER', ax: -0.9, ay: -0.8, rot: -7, s: 0.8 },
  { designation: 'M31', ax: 0.9, ay: -0.8, rot: 7, s: 0.8 },
  { designation: 'GREAT-ECLIPSE', ax: -0.9, ay: 0.8, rot: 6, s: 0.8 },
  { designation: 'M42', ax: 0.9, ay: 0.8, rot: -6, s: 0.8 },
  { designation: 'VOYAGER-1', ax: 0, ay: 1, rot: -3, s: 0.64 },
];

const DRAG_START = 5;

export default function HomeFan() {
  const top = useRef(10);

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
    <div className="sd-herofan" aria-label="Cards from First Light">
      <span className="sd-herofan__light" aria-hidden="true" />
      <div className="sd-herofan__deck">
        {RING.map((f, i) => {
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
                  '--ax': f.ax, '--ay': f.ay, '--rot': `${f.rot}deg`, '--s': f.s, '--i': i,
                  '--side': f.side ?? 0, '--off': Math.abs(f.side ?? 0),
                  '--tile-glow': glowFor(f.designation),
                } as CSSProperties
              }
            >
              <CardThumb designation={f.designation} eager={i < 3} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
