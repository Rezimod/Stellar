/**
 * The five Cosmic Discovery Pass rarity tiers.
 *
 * Odds, counts and reward copy live here rather than in the components,
 * because the same numbers appear on the mint card's odds pills, the reward
 * list, and later in the reveal + reward-distribution logic. One edit site.
 *
 * Counts sum to TOTAL_PASSES (10,000) and odds sum to 100.
 */

export type TierId = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type Tier = {
  id: TierId;
  /** Display name, rendered uppercase. */
  name: string;
  /** Percentage chance of drawing this tier. */
  odds: number;
  /** How many of the 10,000 passes resolve to this tier. */
  count: number;
  /** Accent color for pills, borders and the card's cycling edge. */
  color: string;
  /** In-app STRLLR award. */
  strllr: number;
  /** Physical reward, or null for token-only tiers. */
  physical: string | null;
};

/** Ascending rarity. Reverse for "best first" presentation. */
export const TIERS: Tier[] = [
  {
    id: 'common',
    name: 'Common',
    odds: 90,
    count: 9_000,
    color: '#8A93A6',
    strllr: 50,
    physical: null,
  },
  {
    id: 'uncommon',
    name: 'Uncommon',
    odds: 7,
    count: 700,
    color: '#00C8F0',
    strllr: 500,
    physical: null,
  },
  {
    id: 'rare',
    name: 'Rare',
    odds: 2.5,
    count: 250,
    color: '#9152D7',
    strllr: 2_000,
    physical: null,
  },
  {
    id: 'epic',
    name: 'Epic',
    odds: 0.4,
    count: 40,
    color: '#FFB200',
    strllr: 10_000,
    physical: 'Telescope Accessory Kit',
  },
  {
    id: 'legendary',
    name: 'Legendary',
    odds: 0.1,
    count: 10,
    color: '#FFDA6B',
    strllr: 50_000,
    physical: 'Full Astroman Telescope',
  },
];

/** Best-first, for the reward breakdown. */
export const TIERS_BY_VALUE: Tier[] = [...TIERS].reverse();

export const TIER_BY_ID = Object.fromEntries(TIERS.map((t) => [t.id, t])) as Record<TierId, Tier>;

/** "Full Astroman Telescope + 50,000 STRLLR", or just the STRLLR for the
 *  token-only tiers. Shared by the reveal card and the leaderboard. */
export function rewardLine(id: TierId): string {
  const t = TIER_BY_ID[id];
  const strllr = `${t.strllr.toLocaleString('en-US')} STRLLR`;
  return t.physical ? `${t.physical} + ${strllr}` : strllr;
}

/** Physical rewards ship, so these tiers need a shipping address collected. */
export function needsShipping(id: TierId): boolean {
  return TIER_BY_ID[id].physical !== null;
}
