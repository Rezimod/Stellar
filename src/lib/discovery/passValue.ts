import { MARKETPLACE_GEL_PER_USD, starsToGEL } from '@/lib/stars-economy';
import { TIER_BY_ID, type TierId } from '@/lib/discovery/tiers';

/**
 * What a tier is worth, in money.
 *
 * Rip Cars puts a plain dollar figure on every pull ("LEGENDARY $240") and that
 * is the single thing that makes a pack feel like it contains something rather
 * than a colour. Stellarr can do the same honestly, because STRLLR already has
 * a redemption rate: it spends against the Astroman catalogue at the one
 * canonical Star↔GEL rate in stars-economy.ts. So these figures are derived,
 * not invented — change the rate or a tier's STRLLR and they follow.
 *
 * Physical rewards are quoted separately rather than folded into the number.
 * A telescope's retail price is a catalogue fact that belongs in the product
 * data, and guessing at it here would put a made-up figure next to a derived
 * one with nothing to tell them apart.
 */

/** Token value of a tier in GEL, at the canonical marketplace rate. */
export function tierValueGEL(id: TierId): number {
  return starsToGEL(TIER_BY_ID[id].strllr);
}

/** The same value in USD. */
export function tierValueUSD(id: TierId): number {
  return tierValueGEL(id) / MARKETPLACE_GEL_PER_USD;
}

/** "$3,950" — whole dollars, which is how a pull value reads on a card. */
export function formatTierValueUSD(id: TierId): string {
  return `$${Math.round(tierValueUSD(id)).toLocaleString('en-US')}`;
}

/**
 * Expected token value of a single pass, summed over the odds.
 *
 * Published because a pack that shows five big numbers and hides the average
 * is doing the gambling-skin thing the brand is meant to avoid.
 */
export function expectedValueUSD(): number {
  return Object.values(TIER_BY_ID).reduce(
    (sum, tier) => sum + (tier.odds / 100) * tierValueUSD(tier.id),
    0,
  );
}
