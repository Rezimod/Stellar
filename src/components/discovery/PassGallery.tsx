import PassCard from '@/components/discovery/PassCard';
import { expectedValueUSD } from '@/lib/discovery/passValue';
import { TIERS_BY_VALUE } from '@/lib/discovery/tiers';

/**
 * All five passes, rarest first.
 *
 * This replaces the old text list of tiers. The point of showing the cards
 * themselves is that a buyer sees the actual range of what a pass becomes —
 * the artwork, a real object name, and the money — instead of reading five
 * rows and being asked to imagine it.
 */
export default function PassGallery() {
  return (
    <div className="flex flex-col gap-4">
      <div className="dsc-pass-grid">
        {TIERS_BY_VALUE.map((tier, i) => (
          <PassCard key={tier.id} id={tier.id} index={i} />
        ))}
      </div>

      {/* Stated rather than buried. Five large numbers with no average is the
          gambling-skin pattern the brand is supposed to be the opposite of. */}
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          lineHeight: 1.55,
          color: 'var(--dsc-ghost-dim)',
          margin: 0,
        }}
      >
        Values are the tier&rsquo;s STRLLR at the Astroman catalogue rate, excluding physical
        rewards. Average token value across all odds: ${expectedValueUSD().toFixed(2)} per pass.
      </p>
    </div>
  );
}
