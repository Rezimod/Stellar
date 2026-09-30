import type { Tier } from '@/lib/stellar/tiers';

/** The sealed capsule: three cards fanned, the front one naming its class. */
export default function TierCapsule({ tier }: { tier: Tier }) {
  return (
    <span className="sd-tier__capsule" aria-hidden="true">
      <span className="sd-tier__card" />
      <span className="sd-tier__card" />
      <span className="sd-tier__card sd-tier__card--front">
        <span className="sd-tier__mark">Stellar</span>
        <span className="sd-tier__kind">{tier.name}</span>
      </span>
    </span>
  );
}
