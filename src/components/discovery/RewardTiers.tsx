import { TIERS_BY_VALUE } from '@/lib/discovery/tiers';

const fmt = (n: number) => n.toLocaleString('en-US');

/**
 * What each rarity pays out, best first. Counts come from the same table that
 * drives the odds pills on the pass card, so the two can never drift apart.
 */
export default function RewardTiers() {
  return (
    <ul className="flex list-none flex-col p-0">
      {TIERS_BY_VALUE.map((tier) => (
        <li
          key={tier.id}
          className="dsc-tier-row"
          style={{ '--dsc-tier': tier.color } as React.CSSProperties}
        >
          <span className="dsc-tier-meta">
            <span className="dsc-tier-name">{tier.name}</span>
            <span className="dsc-tier-count">{fmt(tier.count)} total</span>
          </span>

          <span className="dsc-tier-reward">
            {tier.physical ? `${tier.physical} + ` : ''}
            {fmt(tier.strllr)} STRLLR
          </span>
        </li>
      ))}
    </ul>
  );
}
