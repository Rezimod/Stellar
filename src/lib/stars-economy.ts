// Stars-as-currency rules.
//
// A Star is worth the SAME amount of GEL however it is spent — as a marketplace
// discount, a full "pay in Stars" purchase, or an Astroman till redemption. That
// single rate is anchored to the catalog reference 288 GEL = 1,350 Stars
// (≈ 4.69 Stars per GEL ≈ 0.213 GEL per Star), which keeps the "earn a telescope
// in ~3.6 months at the 4,000/mo cap" curve in stars-cap.ts intact. Discounts are
// capped at 30% of the product price; Stars burn in fixed increments (the checkout
// slider snaps to this) and the server re-validates on order confirmation so a
// tampered client cannot bypass the cap.

// Catalog reference point that anchors the single Star↔GEL rate.
export const MARKETPLACE_REFERENCE_GEL = 288;
export const MARKETPLACE_REFERENCE_STARS = 1350;

/** The one canonical rate: Stars per 1 GEL (1350 / 288 ≈ 4.69). */
export const STARS_PER_GEL = MARKETPLACE_REFERENCE_STARS / MARKETPLACE_REFERENCE_GEL;
/** Alias kept for marketplace call sites — identical to STARS_PER_GEL. */
export const MARKETPLACE_STARS_PER_GEL = STARS_PER_GEL;

export const MAX_BURN_RATIO = 0.30;
// Stars per slider step. At ≈0.213 GEL/Star, 25 Stars ≈ 5.3 GEL — fine-grained
// enough that discounts still work on inexpensive items (a 100-Star step would be
// ≈21 GEL and zero out discounts below ~71 GEL of list price).
export const BURN_INCREMENT = 25;

// Marketplace "pay in Stars" currency conversion for non-GEL list prices.
export const MARKETPLACE_GEL_PER_USD = 2.7;
export const MARKETPLACE_USD_PER_EUR = 1.08;

export function fiatGelEquivalent(price: number, currency: string): number {
  if (!Number.isFinite(price)) return 0;
  const c = currency.toUpperCase();
  if (c === 'GEL') return price;
  if (c === 'USD') return price * MARKETPLACE_GEL_PER_USD;
  if (c === 'EUR') return price * MARKETPLACE_USD_PER_EUR * MARKETPLACE_GEL_PER_USD;
  return price * MARKETPLACE_GEL_PER_USD;
}

/** Stars price for dual-price marketplace items (not Star Shop fixed tiers). */
export function computeMarketplaceStarsPrice(price: number, currency: string): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  const gel = fiatGelEquivalent(price, currency);
  return Math.max(1, Math.round(gel * MARKETPLACE_STARS_PER_GEL));
}

export function starsToGEL(stars: number): number {
  return stars / STARS_PER_GEL;
}

/**
 * Largest amount of Stars the user can burn against a GEL-priced product:
 * limited by 30% of price AND by the on-chain balance, snapped DOWN to a
 * 100-Star increment.
 */
export function computeMaxBurn(priceGEL: number, balance: number): number {
  if (priceGEL <= 0 || balance <= 0) return 0;
  const maxByPrice = Math.floor((priceGEL * MAX_BURN_RATIO) * STARS_PER_GEL);
  const cap = Math.min(maxByPrice, balance);
  return Math.floor(cap / BURN_INCREMENT) * BURN_INCREMENT;
}

export type ValidateBurnResult =
  | { ok: true; gelDiscount: number }
  | { ok: false; reason: string };

export function validateBurn(args: {
  priceGEL: number;
  stars: number;
  balance: number;
}): ValidateBurnResult {
  const { priceGEL, stars, balance } = args;
  if (!Number.isFinite(stars) || stars < 0 || !Number.isInteger(stars)) {
    return { ok: false, reason: 'Stars must be a non-negative integer' };
  }
  if (stars === 0) return { ok: true, gelDiscount: 0 };
  if (stars % BURN_INCREMENT !== 0) {
    return { ok: false, reason: `Stars must be in increments of ${BURN_INCREMENT}` };
  }
  if (stars > balance) {
    return { ok: false, reason: 'Insufficient Stars balance' };
  }
  const max = computeMaxBurn(priceGEL, balance);
  if (stars > max) {
    return { ok: false, reason: `Maximum burn is ${max} Stars (${MAX_BURN_RATIO * 100}% of price)` };
  }
  return { ok: true, gelDiscount: starsToGEL(stars) };
}
