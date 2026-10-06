'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';
import { cardStatus } from '@/lib/stellar/almanac';
import { DIRECT_CARD_PRICE_USD } from '@/lib/stellar/economics';
import { plateFor } from '@/lib/stellar/plate';
import StellarCard from './card/StellarCard';

type Zoom = { designation: string; price: string; from: HTMLAnchorElement };

const FLIGHT = { duration: 560, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' };
const DEALT = ':is(.sd-fl__grid, .sd-showcase2__cards) > li';

const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Sets the class the deal waits on before the cards are painted, so they never flash in place first. */
export const LIVE_SCRIPT = `if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('sd-live')`;

/**
 * What moves on a Stellar page without being a component of its own: cards
 * that lean toward the pointer (or the scroll, on a phone), cards dealt onto
 * the table as they come into view, the home fan opening as it leaves, and a
 * card lifted out of the shelf to hold when it is tapped. One listener each,
 * delegated from the document; the cards themselves stay plain links.
 */
export default function StellarLiving() {
  const [zoom, setZoom] = useState<Zoom | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[data-zoom]');
      if (!a || !a.querySelector('.sd-thumb')) return;
      const designation = a.dataset.zoom!;
      const seed = SET_001_CARD_BY_DESIGNATION.get(designation);
      const plate = plateFor(designation);
      if (!seed || !plate) return;
      e.preventDefault();
      e.stopPropagation();
      const price = a.dataset.zoomPrice ?? (cardStatus(seed) === 'sealed' ? 'Sealed' : `$${DIRECT_CARD_PRICE_USD[plate.rarity]}`);
      setZoom({ designation, price, from: a });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  useEffect(() => {
    if (calm()) return;
    const root = document.documentElement;
    root.classList.add('sd-live');
    const offs: (() => void)[] = [];

    // The deal: whatever comes into view in one frame is dealt left to right, top to bottom.
    const deal = new IntersectionObserver(
      (entries) => {
        const shown = entries.filter((en) => en.isIntersecting).map((en) => en.target as HTMLElement);
        shown.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top || a.getBoundingClientRect().left - b.getBoundingClientRect().left);
        shown.forEach((el, i) => {
          el.style.setProperty('--d', `${Math.min(i, 9) * 70}ms`);
          el.classList.add('is-in');
          deal.unobserve(el);
        });
      },
      { rootMargin: '0px 0px -6% 0px' },
    );
    document.querySelectorAll(DEALT).forEach((el) => deal.observe(el));
    offs.push(() => deal.disconnect());

    // Browsers without scroll-driven animation: sections rise on arrival, the fan opens from script.
    if (!CSS.supports('animation-timeline: view()')) {
      root.classList.add('sd-io');
      const rise = new IntersectionObserver(
        (entries) => {
          for (const en of entries) {
            if (!en.isIntersecting) continue;
            en.target.classList.add('is-in');
            rise.unobserve(en.target);
          }
        },
        { rootMargin: '0px 0px -10% 0px' },
      );
      document.querySelectorAll('.sd-home-sec > :not(.sd-showcase2__cards, .sd-orbit__stage), .sd-fl__head').forEach((el) => rise.observe(el));
      offs.push(() => rise.disconnect());

      const deck = document.querySelector<HTMLElement>('.sd-herofan__deck');
      if (deck) {
        let raf = 0;
        const spread = () => {
          raf = 0;
          const r = deck.getBoundingClientRect();
          const p = Math.min(1, Math.max(0, (innerHeight / 2 - (r.top + r.height / 2)) / (innerHeight / 2 + r.height / 2)));
          deck.style.setProperty('--sd-spread', p.toFixed(3));
        };
        const onScroll = () => {
          if (!raf) raf = requestAnimationFrame(spread);
        };
        addEventListener('scroll', onScroll, { passive: true });
        spread();
        offs.push(() => removeEventListener('scroll', onScroll));
      }
    }

    // The lean. A mouse tilts the card under it; on a phone every card in view leans with its place on the screen.
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      let held: HTMLElement | null = null;
      let raf = 0;
      let at = { x: 0, y: 0 };
      const letGo = () => {
        held?.classList.remove('is-tilt');
        held?.style.removeProperty('--tx');
        held?.style.removeProperty('--ty');
        held = null;
      };
      const lean = () => {
        raf = 0;
        if (!held) return;
        const r = held.getBoundingClientRect();
        held.style.setProperty('--tx', ((at.x - r.left) / r.width - 0.5).toFixed(3));
        held.style.setProperty('--ty', ((at.y - r.top) / r.height - 0.5).toFixed(3));
      };
      const onMove = (e: PointerEvent) => {
        const thumb = (e.target as Element | null)?.closest('[data-zoom]')?.querySelector<HTMLElement>('.sd-thumb') ?? null;
        if (thumb !== held) {
          letGo();
          held = thumb;
          held?.classList.add('is-tilt');
        }
        at = { x: e.clientX, y: e.clientY };
        if (held && !raf) raf = requestAnimationFrame(lean);
      };
      document.addEventListener('pointermove', onMove, { passive: true });
      document.documentElement.addEventListener('pointerleave', letGo);
      offs.push(() => {
        document.removeEventListener('pointermove', onMove);
        document.documentElement.removeEventListener('pointerleave', letGo);
        cancelAnimationFrame(raf);
      });
    } else {
      const seen = new Set<HTMLElement>();
      let raf = 0;
      const lean = () => {
        raf = 0;
        for (const t of seen) {
          const r = t.getBoundingClientRect();
          const y = Math.min(0.5, Math.max(-0.5, ((r.top + r.height / 2) / innerHeight - 0.5) * 0.8));
          t.style.setProperty('--ty', y.toFixed(3));
        }
      };
      const onScroll = () => {
        if (!raf) raf = requestAnimationFrame(lean);
      };
      const watch = new IntersectionObserver((entries) => {
        for (const en of entries) {
          const t = en.target as HTMLElement;
          if (en.isIntersecting) seen.add(t);
          else seen.delete(t);
        }
        onScroll();
      });
      document.querySelectorAll<HTMLElement>('[data-zoom] .sd-thumb').forEach((t) => {
        t.classList.add('is-scroll');
        watch.observe(t);
      });
      addEventListener('scroll', onScroll, { passive: true });
      offs.push(() => {
        watch.disconnect();
        removeEventListener('scroll', onScroll);
        cancelAnimationFrame(raf);
      });
    }

    return () => offs.forEach((off) => off());
  }, []);

  return zoom ? <ZoomedCard key={zoom.designation} zoom={zoom} onClosed={() => setZoom(null)} /> : null;
}

/** A card lifted off the shelf: it flies from its place to the middle of the screen, and back when let go. */
function ZoomedCard({ zoom, onClosed }: { zoom: Zoom; onClosed: () => void }) {
  const plate = plateFor(zoom.designation)!;
  const card = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const closer = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<'flying' | 'open' | 'closing'>('flying');
  const closing = useRef(false);
  const thumb = zoom.from.querySelector<HTMLElement>('.sd-thumb')!;
  const src = thumb.querySelector('img')?.currentSrc;

  /** The transform that puts the held card exactly over its thumb on the shelf. */
  const home = () => {
    const a = thumb.getBoundingClientRect();
    const b = card.current!.getBoundingClientRect();
    return `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width})`;
  };

  useLayoutEffect(() => {
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = 'hidden';
    thumb.style.visibility = 'hidden';
    closer.current?.focus({ preventScroll: true });
    if (calm()) setState('open');
    else card.current!.animate([{ transform: home() }, { transform: 'none' }], FLIGHT).finished.then(() => setState('open'), () => {});
    return () => {
      root.style.overflow = overflow;
      thumb.style.visibility = '';
    };
  }, []);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    setState('closing');
    const done = () => {
      thumb.style.visibility = '';
      zoom.from.focus({ preventScroll: true });
      onClosed();
    };
    if (calm()) return done();
    card.current!.animate([{ transform: 'none' }, { transform: home() }], { ...FLIGHT, duration: 440, fill: 'forwards' }).finished.then(done, done);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return close();
      if (e.key !== 'Tab' || !dialog.current) return;
      const stops = [...dialog.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')];
      const first = stops[0];
      const last = stops[stops.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const href = `/card/${zoom.designation}`;
  return (
    <div className="sd-zoom" data-state={state}>
      <div className="sd-zoom__veil" onClick={close} aria-hidden="true" />
      <div ref={dialog} className="sd-zoom__panel" role="dialog" aria-modal="true" aria-labelledby="sd-zoom-name">
        <button ref={closer} type="button" className="sd-zoom__close" aria-label="Close" onClick={close}>
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <div ref={card} className="sd-zoom__card">
          <StellarCard designation={zoom.designation} hero />
          {src && <img className="sd-zoom__ghost" src={src} alt="" />}
        </div>
        <div className="sd-zoom__info">
          <p className="sd-zoom__rarity" data-rarity={plate.rarity}>
            {plate.rname}
          </p>
          <h2 className="sd-zoom__name" id="sd-zoom-name">
            {plate.name}
          </h2>
          <p className="sd-zoom__price">{zoom.price}</p>
          <div className="sd-zoom__cta">
            {zoom.price !== 'Sealed' && (
              <Link href={`${href}#buy`} className="sd-btn sd-btn--light">
                Buy
              </Link>
            )}
            <Link href={href} className="sd-btn">
              Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
