/**
 * The four capsules on the shelf, cheapest first. Each is named for a class of
 * meteorite, commonest to rarest, and the odds climb with the price.
 *
 * PROVISIONAL (Gate 2). A capsule is listed as one tier and keeps its odds
 * from then on (capsule.odds_bps, and its 'listed' log entry), so changing a
 * row here changes only capsules listed after. Odds are parts per ten
 * thousand and each row sums to exactly 10,000.
 *
 * Checked against First Light's supply (12,600 / 3,400 / 480 / 40 editions)
 * at a shelf of 40 / 25 / 10 / 5: the 40 legendaries last about 1,700
 * capsules, the epics about 3,000.
 */

import type { Rarity } from '@/lib/rarity';

export type Tier = {
  key: 'chondrite' | 'iron' | 'pallasite' | 'lunar';
  name: string;
  priceUsd: number;
  /** One line, under the name. */
  line: string;
  /** The rarity whose colour the capsule is lit in. */
  lit: Rarity;
  oddsBps: Record<Rarity, number>;
};

export const TIERS: readonly Tier[] = [
  {
    key: 'chondrite',
    name: 'Chondrite',
    priceUsd: 5,
    line: 'Stony, the commonest fall',
    lit: 'common',
    oddsBps: { common: 8600, rare: 1250, epic: 140, legendary: 10 },
  },
  {
    key: 'iron',
    name: 'Iron',
    priceUsd: 20,
    line: 'Nickel-iron, heavy in the hand',
    lit: 'rare',
    oddsBps: { common: 6000, rare: 3200, epic: 700, legendary: 100 },
  },
  {
    key: 'pallasite',
    name: 'Pallasite',
    priceUsd: 50,
    line: 'Olivine set in metal',
    lit: 'epic',
    oddsBps: { common: 2500, rare: 5200, epic: 2000, legendary: 300 },
  },
  {
    key: 'lunar',
    name: 'Lunar',
    priceUsd: 100,
    line: 'A piece of the Moon',
    lit: 'legendary',
    oddsBps: { common: 0, rare: 5300, epic: 4000, legendary: 700 },
  },
];

export const CARDS_PER_TIER = 2;

export function tierByKey(key: unknown): Tier | undefined {
  return TIERS.find((t) => t.key === key);
}

/** A rarity drawn at a tier's odds, from a number in [0, 1). */
export function rarityAt(tier: Tier, u: number): Rarity {
  let at = u * 10_000;
  for (const r of ['legendary', 'epic', 'rare', 'common'] as const) {
    at -= tier.oddsBps[r];
    if (at < 0) return r;
  }
  return 'common';
}
