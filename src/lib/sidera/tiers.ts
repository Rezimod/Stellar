/**
 * The four capsules on the shelf, cheapest first. Each is named for a class of
 * meteorite, commonest to rarest, and the odds climb with the price.
 *
 * PROVISIONAL (Gate 2), and for now a preview only: opening one draws in the
 * browser, charges nothing and records nothing. Odds are parts per ten
 * thousand and each row sums to exactly 10,000.
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
    oddsBps: { common: 8200, rare: 1500, epic: 270, legendary: 30 },
  },
  {
    key: 'iron',
    name: 'Iron',
    priceUsd: 20,
    line: 'Nickel-iron, heavy in the hand',
    lit: 'rare',
    oddsBps: { common: 5600, rare: 3400, epic: 880, legendary: 120 },
  },
  {
    key: 'pallasite',
    name: 'Pallasite',
    priceUsd: 50,
    line: 'Olivine set in metal',
    lit: 'epic',
    oddsBps: { common: 2400, rare: 4800, epic: 2400, legendary: 400 },
  },
  {
    key: 'lunar',
    name: 'Lunar',
    priceUsd: 100,
    line: 'A piece of the Moon',
    lit: 'legendary',
    oddsBps: { common: 0, rare: 4500, epic: 4200, legendary: 1300 },
  },
];

export const CARDS_PER_TIER = 3;

/** A rarity drawn at a tier's odds, from a number in [0, 1). */
export function rarityAt(tier: Tier, u: number): Rarity {
  let at = u * 10_000;
  for (const r of ['legendary', 'epic', 'rare', 'common'] as const) {
    at -= tier.oddsBps[r];
    if (at < 0) return r;
  }
  return 'common';
}
