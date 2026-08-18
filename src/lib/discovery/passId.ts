import { TOTAL_PASSES } from '@/lib/discovery/constants';

/**
 * The public identifier for a single pass: `<wallet>-<passNumber>`.
 *
 * A pass is fully described by the wallet that holds it and its number — that
 * pair is what `determineObject` draws from — so the share URL carries both
 * rather than pointing at a row in a table that does not exist yet. Nothing
 * needs to be looked up to render /discovery/<passId>.
 *
 * Base58 has no `-`, so the separator can never appear inside the address and
 * splitting on the last one is unambiguous.
 */

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export type PassRef = { wallet: string; passNumber: number };

export function passIdFor(wallet: string, passNumber: number): string {
  return `${wallet}-${passNumber}`;
}

/** Null for anything that is not a well-formed pass reference. */
export function parsePassId(passId: string): PassRef | null {
  const split = passId.lastIndexOf('-');
  if (split <= 0) return null;

  const wallet = passId.slice(0, split);
  if (!BASE58.test(wallet)) return null;

  const passNumber = Number(passId.slice(split + 1));
  if (!Number.isInteger(passNumber) || passNumber < 1 || passNumber > TOTAL_PASSES) return null;

  return { wallet, passNumber };
}
