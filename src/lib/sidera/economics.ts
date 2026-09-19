/**
 * The numbers that decide what a card is worth to hold.
 *
 * One file on purpose: edition sizes, and in Phase 5 price and odds, move
 * together and are argued about together. Rarer means fewer.
 */

import type { Rarity } from '@/lib/rarity';

/** How many numbered editions of one card exist, by rarity. */
export const EDITION_SIZE: Record<Rarity, number> = {
  common: 300,
  rare: 100,
  epic: 30,
  legendary: 5,
};
