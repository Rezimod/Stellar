import Link from 'next/link';
import type { CSSProperties } from 'react';
import { SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';
import { glowFor } from '@/lib/stellar/plate';
import CardThumb from './CardThumb';

/** Left, right, then the front card last so it paints on top. */
const FAN = [
  { designation: 'SATURN', side: -1 },
  { designation: 'M1', side: 1 },
  { designation: 'HALLEY', side: 0 },
];

/**
 * The picture beside the home headline: three cards of the set held in a fan,
 * standing in their own light. They deal out on arrival and drift a little;
 * a card lifts when pointed at (src/styles/stellar-pages.css).
 */
export default function HomeFan() {
  return (
    <div className="sd-herofan" aria-label="Three cards from First Light">
      <span className="sd-herofan__light" aria-hidden="true" />
      <div className="sd-herofan__deck">
        {FAN.map((f) => {
          const c = SET_001_CARD_BY_DESIGNATION.get(f.designation);
          if (!c) return null;
          return (
            <Link
              key={f.designation}
              href={`/card/${f.designation}`}
              className="sd-herofan__card"
              aria-label={c.seed.name}
              style={{ '--side': f.side, '--off': Math.abs(f.side), '--tile-glow': glowFor(f.designation) } as CSSProperties}
            >
              <CardThumb designation={f.designation} eager />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
