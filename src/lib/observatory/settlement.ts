/**
 * What happens to a session fee when the night is over.
 *
 * Money moves on exactly two transitions, and neither of them is in the middle
 * of a session: a mission that reaches COMPLETE releases, and any terminal
 * failure refunds the customer in full. There is no partial night, no
 * pro-rating, and no support ticket — an instrument that clouded out owes the
 * customer their money back, automatically, and that is cheaper than arguing.
 *
 * The split at release comes from the operator's tier at that moment, so an
 * operator who crosses a rung mid-week is paid the better share from the next
 * session on, and never retroactively.
 *
 * Nothing here charges a card or signs a transaction. It decides the amounts,
 * and — critically — whether they are payable at all: a session run on the
 * simulator settles as a dry run worth zero to everyone, for the same reason a
 * simulated frame cannot mint. When an instrument is wired, the same code
 * produces a real payable with no change to the arithmetic.
 */

import { splitFee, type OperatorTier } from './operator-tiers';
import type { Provenance } from './provenance';

export type SettlementState = 'released' | 'refunded';

/** Why a session ended without delivering the sky it was sold. */
export type FailureReason = 'weather' | 'hardware' | 'not_visible' | 'cancelled' | 'failed';

export type Settlement = {
  state: SettlementState;
  /** What the customer paid, in tetri. */
  feeTetri: number;
  operatorTetri: number;
  platformTetri: number;
  refundTetri: number;
  /**
   * Whether these amounts are owed to anyone. False for a session the
   * simulator ran: the arithmetic is real, the obligation is not.
   */
  payable: boolean;
  tier: OperatorTier | null;
  reason: FailureReason | null;
};

/** A completed mission: the operator is paid their share, the platform keeps the rest. */
export function settleComplete(input: {
  feeTetri: number;
  hoursDelivered: number;
  provenance: Provenance;
}): Settlement {
  const { tier, operatorTetri, platformTetri } = splitFee(input.feeTetri, input.hoursDelivered);
  const payable = input.provenance === 'instrument';

  return {
    state: 'released',
    feeTetri: Math.max(0, Math.round(input.feeTetri)),
    operatorTetri,
    platformTetri,
    refundTetri: 0,
    payable,
    tier,
    reason: null,
  };
}

/** Any terminal failure: the customer is made whole, and nobody is paid. */
export function settleFailure(input: {
  feeTetri: number;
  reason: FailureReason;
  provenance: Provenance;
}): Settlement {
  const fee = Math.max(0, Math.round(input.feeTetri));

  return {
    state: 'refunded',
    feeTetri: fee,
    operatorTetri: 0,
    platformTetri: 0,
    refundTetri: fee,
    payable: input.provenance === 'instrument',
    tier: null,
    reason: input.reason,
  };
}

/**
 * Delivered hours only count when the sky was real.
 *
 * A ladder climbed on simulated sessions would be a ladder anyone could climb
 * indoors — and the share it grants is real money.
 */
export function deliveredHours(sessions: Array<{ minutes: number; payable: boolean }>): number {
  return sessions.filter((s) => s.payable).reduce((total, s) => total + s.minutes, 0) / 60;
}
