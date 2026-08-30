import { TIER_BY_ID, type TierId } from '@/lib/discovery/tiers';

/**
 * A tier, at list scale: 16px of the actual material, then the name.
 *
 * The board used to mark rarity with a coloured pill, which told you a row was
 * purple. The swatch is the same graphite / steel / anodized blue / bronze /
 * gold foil the cards are cut from, so a leaderboard row and a pass card are
 * making the same statement rather than two unrelated ones. Shared by both
 * boards so the tabs cannot drift apart.
 */
export default function TierChip({ tier }: { tier: TierId }) {
  return (
    <span className="dsc-chip dsc-mat" data-tier={tier}>
      <span className="dsc-chip-swatch" aria-hidden="true" />
      <span className="dsc-chip-name">{TIER_BY_ID[tier].name}</span>
    </span>
  );
}
