import Link from 'next/link';
import type { CSSProperties } from 'react';
import { SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';
import { glowFor, plateFor } from '@/lib/sidera/plate';
import SideraCard from './card/SideraCard';

/** Matches the stylesheet: below this width the fan is not drawn, so a phone's first screen stays text and its LCP stays early. */
const FAN_MEDIA = '(min-width: 900px)';

/** Left, right, then the front card last so it paints on top. */
const FAN = [
  { designation: 'SATURN', side: -1 },
  { designation: 'M1', side: 1 },
  { designation: 'HALLEY', side: 0 },
];

/**
 * The top of the home page: three cards of the set held in a fan. They deal
 * out on arrival, float, turn a little toward the pointer, and spread and sink
 * as the page scrolls past them (src/styles/sidera-motion.css).
 */
export default function HomeFan() {
  const fan = FAN.flatMap((f) => {
    const c = SET_001_CARD_BY_DESIGNATION.get(f.designation);
    return c ? [{ ...f, name: c.seed.name }] : [];
  });
  if (fan.length === 0) return null;
  // The front card is the largest thing on the first screen: fetch its drawing
  // now rather than when the lazy image is laid out. Phones never show the fan.
  const front = plateFor(fan[fan.length - 1].designation);
  return (
    <section className="sd-fan" aria-label="Three cards from First Light">
      {front &&
        ['sky', 'object'].map((layer) => (
          <link key={layer} rel="preload" as="image" href={`${front.art}/${layer}.svg`} media={FAN_MEDIA} fetchPriority="high" />
        ))}
      <div className="sd-fan__light" aria-hidden="true" />
      <div className="sd-fan__sweep" aria-hidden="true" />
      <div className="sd-container sd-fan__rail sd-label">
        <span>Set 001 · First Light</span>
        <span>Node 01 · Tbilisi · commissioning</span>
      </div>
      <div className="sd-fan__stage">
        <div className="sd-fan__deck" data-sd-fan>
          {fan.map((f) => (
            <Link
              key={f.designation}
              href={`/card/${f.designation}`}
              className="sd-fan__card"
              aria-label={f.name}
              style={{ '--side': f.side, '--off': Math.abs(f.side), '--tile-glow': glowFor(f.designation) } as CSSProperties}
            >
              <span className="sd-fan__float">
                <SideraCard designation={f.designation} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
