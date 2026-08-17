/**
 * Cosmic Discovery Pass — single source of truth for the sale + reveal numbers.
 *
 * These appear in marketing copy, on-chain metadata and reward math, so they
 * live here rather than being retyped per surface.
 */

/** Reveal moment: peak of the 2026 Orionids, fixed to UTC so it is the same
 *  instant for every holder regardless of where they are standing. */
export const REVEAL_AT_MS = Date.UTC(2026, 9, 21, 0, 0, 0);

export const REVEAL_AT_ISO = new Date(REVEAL_AT_MS).toISOString();

/** Total passes that will ever exist. */
export const TOTAL_PASSES = 10_000;

/** Mint price per pass, in SOL. */
export const PASS_PRICE_SOL = 0.5;
