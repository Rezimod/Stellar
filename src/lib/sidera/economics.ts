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
 * in any language, reproduces bit for bit. Set to Set 001's own supply mix
 * (2,400 / 500 / 120 / 15 editions), so no tier runs out long before the rest.
 */
export const RARITY_ODDS_BPS: Record<Rarity, number> = {
  common: 7900,
  rare: 1650,
  epic: 400,
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

/** PROVISIONAL (Gate 2). What one capsule costs, in lari. */
export const CAPSULE_PRICE_GEL = 39;

/** PROVISIONAL (Gate 2). What one card costs bought on its own, in lari. */
export const DIRECT_CARD_PRICE_GEL: Record<Rarity, number> = {
  common: 8,
  rare: 20,
  epic: 60,
  legendary: 250,
};

/** The cost base Gate 2 needs, per capsule sold, in lari. Unknowns are zero until supplied. */
export type CapsuleCosts = {
  /** Payment processing, as a fraction of the price (0.029 for 2.9%). */
  paymentFeeRate: number;
  /** Fixed per-payment fee. */
  paymentFeeFixedGel: number;
  /** Producing one card's contents (a printed card, if physical; 0 if digital only). */
  contentsCostPerCardGel: number;
  fulfilmentGel: number;
  packagingGel: number;
  /** Expected refunds and returns, as a fraction of the price. */
  returnsRate: number;
  supportGel: number;
  /** Node 01's running cost, spread over the capsules sold in the same period. */
  telescopeOperatingGel: number;
};

export const UNKNOWN_COSTS: CapsuleCosts = {
  paymentFeeRate: 0,
  paymentFeeFixedGel: 0,
  contentsCostPerCardGel: 0,
  fulfilmentGel: 0,
  packagingGel: 0,
  returnsRate: 0,
  supportGel: 0,
  telescopeOperatingGel: 0,
};

/**
 * Gate 2's arithmetic. Contents value is what the capsule's cards would cost
 * bought one at a time; contribution margin is what one capsule leaves after
 * the costs that scale with it.
 */
export function capsuleEconomics(costs: CapsuleCosts, price = CAPSULE_PRICE_GEL) {
  const valuePerDraw = RARITIES.reduce((sum, r) => sum + RARITY_ODDS[r] * DIRECT_CARD_PRICE_GEL[r], 0);
  const expectedContentsValueGel = CARDS_PER_CAPSULE * valuePerDraw;
  const variableCostGel =
    price * (costs.paymentFeeRate + costs.returnsRate) +
    costs.paymentFeeFixedGel +
    CARDS_PER_CAPSULE * costs.contentsCostPerCardGel +
    costs.fulfilmentGel +
    costs.packagingGel +
    costs.supportGel +
    costs.telescopeOperatingGel;
  const contributionMarginGel = price - variableCostGel;
  return {
    priceGel: price,
    expectedContentsValueGel,
    /** Contents value over price: above 1, a capsule is cheaper than its cards bought one by one. */
    contentsValueRatio: expectedContentsValueGel / price,
    variableCostGel,
    contributionMarginGel,
    contributionMarginRate: contributionMarginGel / price,
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
