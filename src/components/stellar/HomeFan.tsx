import Link from 'next/link';
import type { CSSProperties } from 'react';
import { SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';
import { glowFor } from '@/lib/stellar/plate';
import CardThumb from './CardThumb';

/**
 * Eight cards of the set scattered around the headline: a spot on the stage
 * (x, y in percent), a lean and a size for each. The first three also carry
 * `side`, the fan they fold into on a phone, where the rest stay hidden.
 */
const RING = [
  { designation: 'SATURN', x: 11, y: 30, rot: -11, s: 1, side: -1 },
  { designation: 'M1', x: 89, y: 32, rot: 10, s: 1, side: 1 },
  { designation: 'HALLEY', x: 50, y: 10, rot: 3, s: 0.74, side: 0 },
  { designation: 'JUPITER', x: 13, y: 84, rot: -15, s: 0.86 },
  { designation: 'M31', x: 87, y: 86, rot: 13, s: 0.86 },
  { designation: 'GREAT-ECLIPSE', x: 28, y: 9, rot: -8, s: 0.62 },
  { designation: 'M42', x: 72, y: 9, rot: 8, s: 0.62 },
  { designation: 'VOYAGER-1', x: 50, y: 96, rot: -4, s: 0.58 },
];

export default function HomeFan() {
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
              style={
                {
                  '--x': f.x, '--y': f.y, '--rot': `${f.rot}deg`, '--s': f.s, '--i': i,
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
