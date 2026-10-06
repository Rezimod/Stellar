import type { Tier } from '@/lib/stellar/tiers';

/** One energy blade on its hilt: the blade lights from the emitter up, in the tier's colour. */
function Blade({ side }: { side: 'l' | 'r' }) {
  return (
    <span className={`sd-tier__saber sd-tier__saber--${side}`}>
      <i className="sd-tier__blade" />
      <i className="sd-tier__hilt" />
    </span>
  );
}

/**
 * The sealed capsule: the card face down, two blades lit in an X behind it, in
 * the colour of the class being opened. Keyed on the tier, so choosing another
 * one lights the blades again.
 */
export default function TierCapsule({ tier }: { tier: Tier }) {
  return (
    <span key={tier.key} className="sd-tier__capsule" aria-hidden="true">
      <Blade side="l" />
      <Blade side="r" />
      <img className="sd-tier__sealed" src="/cards/sealed.webp?v=pack2" alt="" width={520} height={726} decoding="async" />
    </span>
  );
}
