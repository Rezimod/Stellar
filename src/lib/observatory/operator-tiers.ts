/**
 * What an operator keeps, and how that improves.
 *
 * A new operator keeps 60% of every session fee. The share rises with hours
 * actually delivered — not nights listed, not a subscription, not a promise —
 * and tops out at the 80/20 the network design proposed. Eighty per cent is
 * where an operator arrives, not where they begin.
 *
 * The ladder is measured in delivered hours because that is the only number an
 * operator cannot fake and a customer can feel: an instrument that has run 150
 * hours of other people's sessions has been aligned, cleaned, unparked and
 * fixed 150 hours' worth. The tier names are the real job titles from a staffed
 * observatory, in the order a career runs.
 *
 * At a 20-minute session, three sessions make an hour. The second rung is set
 * where a Node Kit pays for itself: about 84 sessions at the starting share,
 * which is 28 delivered hours.
 */

export type OperatorTier = {
  id: string;
  name: string;
  /** Cumulative delivered hours needed to reach this tier. */
  minHours: number;
  /** The operator's cut, 0-1. The platform keeps the rest. */
  operatorShare: number;
};

export const OPERATOR_TIERS: OperatorTier[] = [
  { id: 'night_assistant', name: 'Night Assistant', minHours: 0, operatorShare: 0.6 },
  { id: 'telescope_operator', name: 'Telescope Operator', minHours: 25, operatorShare: 0.65 },
  { id: 'support_astronomer', name: 'Support Astronomer', minHours: 75, operatorShare: 0.7 },
  { id: 'staff_astronomer', name: 'Staff Astronomer', minHours: 150, operatorShare: 0.75 },
  { id: 'observatory_director', name: 'Observatory Director', minHours: 300, operatorShare: 0.8 },
];

/** The tier this many delivered hours has earned. */
export function tierFor(hoursDelivered: number): OperatorTier {
  const hours = Number.isFinite(hoursDelivered) ? Math.max(0, hoursDelivered) : 0;
  // Walk down: the highest rung whose threshold has been passed.
  for (let i = OPERATOR_TIERS.length - 1; i >= 0; i--) {
    if (hours >= OPERATOR_TIERS[i].minHours) return OPERATOR_TIERS[i];
  }
  return OPERATOR_TIERS[0];
}

/** The next rung, and how many hours are left to it. Null at the top. */
export function nextTier(
  hoursDelivered: number,
): { tier: OperatorTier; hoursRemaining: number } | null {
  const hours = Number.isFinite(hoursDelivered) ? Math.max(0, hoursDelivered) : 0;
  const next = OPERATOR_TIERS.find((t) => hours < t.minHours);
  return next ? { tier: next, hoursRemaining: next.minHours - hours } : null;
}

export type Split = {
  tier: OperatorTier;
  /** Tetri — a hundredth of a lari. Money is integers, never floats. */
  operatorTetri: number;
  platformTetri: number;
};

/**
 * Divide one session fee.
 *
 * Computed in tetri and settled by subtraction, so the two halves always add
 * back to exactly what the customer paid. Splitting in lari with two decimals
 * loses or invents a tetri on most fees, and a payout ledger that does not
 * balance is worse than one that is a tetri ungenerous.
 */
export function splitFee(feeTetri: number, hoursDelivered: number): Split {
  const tier = tierFor(hoursDelivered);
  const fee = Math.max(0, Math.round(feeTetri));
  const operatorTetri = Math.round(fee * tier.operatorShare);
  return { tier, operatorTetri, platformTetri: fee - operatorTetri };
}

/** Delivered hours from a count of sessions of a given length. */
export function hoursFromSessions(sessions: number, sessionMinutes: number): number {
  return (Math.max(0, sessions) * Math.max(0, sessionMinutes)) / 60;
}
