'use client';

import { useEffect, useState } from 'react';
import CardPlate from './CardPlate';
import type { Rarity } from '@/lib/rarity';

type ShowcaseCard = { designation: string; name: string; rarity: Rarity; artUrl?: string | null };

const STEP_MS = 3600;

/**
 * The set, turning slowly past the viewer. One card is in front and lit; its
 * neighbours wait either side. It holds still under the pointer or focus, when
 * the tab is hidden, and for anyone who asked for less motion.
 */
export default function HeroShowcase({ cards }: { cards: ShowcaseCard[] }) {
  const [front, setFront] = useState(0);
  const [held, setHeld] = useState(false);
  const n = cards.length;

  useEffect(() => {
    if (held || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setFront((f) => (f + 1) % n);
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [held, n]);

  return (
    <div
      className="sd-showcase"
      role="region"
      aria-roledescription="carousel"
      aria-label="Cards from Set 001"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      <ul className="sd-showcase__stage">
        {cards.map((c, k) => {
          let pos = (k - front + n) % n;
          if (pos > n / 2) pos -= n;
          const away = Math.abs(pos) > 1;
          return (
            <li key={c.designation} className="sd-showcase__slot" data-pos={Math.max(-3, Math.min(3, pos))} inert={away} aria-hidden={away}>
              <CardPlate
                designation={c.designation}
                name={c.name}
                rarity={c.rarity}
                artUrl={c.artUrl}
                href={`/card/${c.designation}`}
              />
            </li>
          );
        })}
      </ul>
      <div className="sd-showcase__dots">
        {cards.map((c, k) => (
          <button
            key={c.designation}
            type="button"
            className="sd-showcase__dot"
            aria-label={`Show ${c.name}`}
            aria-current={k === front}
            onClick={() => setFront(k)}
          />
        ))}
      </div>
    </div>
  );
}
