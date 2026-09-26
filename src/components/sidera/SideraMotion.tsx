'use client';

import { useEffect } from 'react';

/** How far the eased pointer closes on the real one each frame. */
const EASE = 0.075;

/**
 * The pointer, handed to CSS. With a mouse (never on touch, never with reduced
 * motion) it writes an eased -1…1 position onto the sky behind the page and
 * onto any card fan ([data-sd-fan]), and the pointer's place inside a capsule
 * tile onto that tile, so the stylesheet can lean it. One listener, one frame
 * loop that stops when the pointer rests, reads before writes.
 */
export default function SideraMotion() {
  useEffect(() => {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root = document.documentElement;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let cx = 0;
    let cy = 0;
    let raf = 0;
    let lean: HTMLElement | null = null;
    let leanMoved = false;

    const setLean = (el: HTMLElement | null) => {
      if (el === lean) return;
      if (lean) {
        lean.removeAttribute('data-lean');
        lean.style.removeProperty('--lx');
        lean.style.removeProperty('--ly');
      }
      lean = el;
    };

    const tick = () => {
      raf = 0;
      // Read first: the tile's box, before anything below writes a style.
      const rect = lean && leanMoved ? lean.getBoundingClientRect() : null;

      x += (tx - x) * EASE;
      y += (ty - y) * EASE;
      const mx = x.toFixed(4);
      const my = y.toFixed(4);
      for (const el of document.querySelectorAll<HTMLElement>('.sd-backdrop, [data-sd-fan]')) {
        el.style.setProperty('--mx', mx);
        el.style.setProperty('--my', my);
      }
      if (lean && rect) {
        leanMoved = false;
        lean.style.setProperty('--lx', Math.min(1, Math.max(0, (cx - rect.left) / rect.width)).toFixed(3));
        lean.style.setProperty('--ly', Math.min(1, Math.max(0, (cy - rect.top) / rect.height)).toFixed(3));
        lean.setAttribute('data-lean', '');
      }
      if (Math.abs(tx - x) > 0.0005 || Math.abs(ty - y) > 0.0005) raf = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      tx = (e.clientX / innerWidth) * 2 - 1;
      ty = (e.clientY / innerHeight) * 2 - 1;
      cx = e.clientX;
      cy = e.clientY;
      const t = e.target instanceof Element ? e.target.closest<HTMLElement>('.sd-tier') : null;
      setLean(t);
      leanMoved = t !== null;
      wake();
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      setLean(null);
      wake();
    };

    // The page moving under a still pointer takes the tile out from under it.
    const onScroll = () => lean && setLean(null);

    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('scroll', onScroll, { passive: true });
    root.addEventListener('pointerleave', onLeave);
    return () => {
      removeEventListener('pointermove', onMove);
      removeEventListener('scroll', onScroll);
      root.removeEventListener('pointerleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
      setLean(null);
    };
  }, []);
  return null;
}
