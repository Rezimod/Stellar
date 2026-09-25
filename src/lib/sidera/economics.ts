/**
 * The numbers that decide what a card is worth to hold.
 *
 * One file on purpose: edition sizes, price and odds move together and are
 * argued about together. Rarer means fewer.
 *
 * PROVISIONAL. Everything below EDITION_SIZE is a placeholder until Gate 2
 * (docs/sidera/gate-2-economics.md) is decided on real cost numbers. Change
 * them here and nowhere else. A capsule's log entry records the odds and draw
 * count it was opened under, so changing them later does not break the
 * verification of capsules already opened.
 */

import { RARITIES, type Rarity } from '@/lib/rarity';

/** How many numbered editions of one card exist, by rarity. */
export const EDITION_SIZE: Record<Rarity, number> = {
  common: 300,
  rare: 100,
  epic: 30,
  legendary: 5,
};

/** PROVISIONAL (Gate 2). Cards drawn when one capsule is opened. */
export const CARDS_PER_CAPSULE = 3;

/**
 * PROVISIONAL (Gate 2). Chance of each rarity on a single draw, in parts per
 * ten thousand. Integers so the draw is exact arithmetic that any verifier,
 * in any language, reproduces bit for bit. Set to the first set's supply mix
 * (2,700 / 700 / 150 / 15 editions); First Light's is 2,100 / 800 / 120 / 25.
 */
export const RARITY_ODDS_BPS: Record<Rarity, number> = {
  common: 7570,
  rare: 1960,
  epic: 420,
  legendary: 50,
};

/** The same odds as fractions of one. They sum to exactly 1. */
export const RARITY_ODDS: Record<Rarity, number> = {
  common: RARITY_ODDS_BPS.common / 10_000,
  rare: RARITY_ODDS_BPS.rare / 10_000,
  epic: RARITY_ODDS_BPS.epic / 10_000,
  legendary: RARITY_ODDS_BPS.legendary / 10_000,
};

/**
 * How long a Sidera order's quote stands. A payment whose block time is later
 * than this is not accepted as payment: it is recorded as a refund due. A
 * capsule bought and left unpaid this long is released.
 */
export const ORDER_WINDOW_MINUTES = 15;

/** PROVISIONAL (Gate 2). What one capsule costs, in US dollars. Paid in SOL at the live rate. */
export const CAPSULE_PRICE_USD = 15;

/** PROVISIONAL (Gate 2). What one card costs bought on its own, in US dollars. */
export const DIRECT_CARD_PRICE_USD: Record<Rarity, number> = {
  common: 3,
  rare: 8,
  epic: 22,
  legendary: 95,
};

/** The cost base Gate 2 needs, per capsule sold, in US dollars. Unknowns are zero until supplied. */
export type CapsuleCosts = {
  /** Payment processing, as a fraction of the price (0.029 for 2.9%). */
  paymentFeeRate: number;
  /** Fixed per-payment fee. */
  paymentFeeFixedUsd: number;
  /** Producing one card's contents (a printed card, if physical; 0 if digital only). */
  contentsCostPerCardUsd: number;
  fulfilmentUsd: number;
  packagingUsd: number;
  /** Expected refunds and returns, as a fraction of the price. */
  returnsRate: number;
  supportUsd: number;
  /** Node 01's running cost, spread over the capsules sold in the same period. */
  telescopeOperatingUsd: number;
};

export const UNKNOWN_COSTS: CapsuleCosts = {
  paymentFeeRate: 0,
  paymentFeeFixedUsd: 0,
  contentsCostPerCardUsd: 0,
  fulfilmentUsd: 0,
  packagingUsd: 0,
  returnsRate: 0,
  supportUsd: 0,
  telescopeOperatingUsd: 0,
};

/**
 * Gate 2's arithmetic. Contents value is what the capsule's cards would cost
 * bought one at a time; contribution margin is what one capsule leaves after
 * the costs that scale with it.
 */
export function capsuleEconomics(costs: CapsuleCosts, price = CAPSULE_PRICE_USD) {
  const valuePerDraw = RARITIES.reduce((sum, r) => sum + RARITY_ODDS[r] * DIRECT_CARD_PRICE_USD[r], 0);
  const expectedContentsValueUsd = CARDS_PER_CAPSULE * valuePerDraw;
  const variableCostUsd =
    price * (costs.paymentFeeRate + costs.returnsRate) +
    costs.paymentFeeFixedUsd +
    CARDS_PER_CAPSULE * costs.contentsCostPerCardUsd +
    costs.fulfilmentUsd +
    costs.packagingUsd +
    costs.supportUsd +
    costs.telescopeOperatingUsd;
  const contributionMarginUsd = price - variableCostUsd;
  return {
    priceUsd: price,
    expectedContentsValueUsd,
    /** Contents value over price: above 1, a capsule is cheaper than its cards bought one by one. */
    contentsValueRatio: expectedContentsValueUsd / price,
    variableCostUsd,
    contributionMarginUsd,
    contributionMarginRate: contributionMarginUsd / price,
  };
}

/**
 * PROVISIONAL (Gate 4). What one held edition adds to its holder's vote for
 * the night's card, by the edition's rarity. A holder's weight is the sum over
 * every edition they hold; holding nothing, they have no vote.
 */
export const VOTE_WEIGHT: Record<Rarity, number> = {
  common: 1,
  rare: 2,
  epic: 5,
  legendary: 20,
};
