'use client';

import CardPlate from './CardPlate';
import type { Rarity } from '@/lib/rarity';
import { isRarity } from '@/lib/rarity';
import { SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';
import type { ObservationStatus } from '@/lib/sidera/observability';

export type RevealedCard = {
  drawIndex: number;
  designation: string;
  name: string;
  rarity: string;
  editionNumber: number;
  editionSize: number;
};

const pad = (n: number) => String(n).padStart(3, '0');

/**
 * What was inside. The stone falls once, then each card is drawn out of it in
 * turn — CSS keyframes only, and nothing at all under prefers-reduced-motion,
 * where the cards are simply there. No glow: the movement is the reveal.
 */
export default function SideraReveal({ cards }: { cards: RevealedCard[] }) {
  return (
    <div className="sd-reveal">
      <div className="sd-reveal__stone" aria-hidden="true">
        <svg viewBox="0 0 64 64" width="64" height="64">
          <path
            d="M32 4 L52 16 L58 38 L44 56 L20 58 L6 40 L10 16 Z"
            fill="var(--sd-plate)"
            stroke="var(--sd-ink-3)"
            strokeWidth="1"
          />
          <path d="M22 18 L36 28 L28 44" fill="none" stroke="var(--sd-ink-4)" strokeWidth="1" />
          <path d="M40 22 L46 36" fill="none" stroke="var(--sd-ink-4)" strokeWidth="1" />
        </svg>
      </div>
      <ul className="sd-grid">
        {cards.map((c, i) => {
          const authored = SET_001_CARD_BY_DESIGNATION.get(c.designation);
          return (
            <li key={c.drawIndex} className="sd-reveal__card" style={{ animationDelay: `${0.5 + i * 0.35}s` }}>
              <CardPlate
                designation={c.designation}
                name={c.name}
                rarity={isRarity(c.rarity) ? (c.rarity as Rarity) : 'common'}
                observationStatus={(authored?.seed.observationStatus ?? 'eligible') as ObservationStatus}
                artUrl="/cards/placeholder.svg"
                href={`/card/${c.designation}`}
                data={[{ label: 'Ed', value: `${pad(c.editionNumber)} / ${c.editionSize}` }]}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
