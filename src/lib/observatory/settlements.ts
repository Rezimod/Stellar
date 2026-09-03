/**
 * The payout ledger.
 *
 * Append-only, one row per session, idempotent by `session_id`. The sweep that
 * writes it runs on a schedule and may run twice; the unique index is what
 * stops a double payout, not the caller remembering to check first.
 *
 * The ledger is also where an operator's delivered hours come from, which is
 * why `payable` matters twice: it decides whether anyone is owed money, and
 * whether the session counts toward the tier that sets the share.
 */

import { and, eq, lt, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { observatoryReservation, observatorySettlement } from '@/lib/schema'
import { settleComplete, type Settlement } from './settlement'
import type { Provenance } from './provenance'

export type LedgerRow = {
  sessionId: string
  nodeId: string
  state: string
  feeTetri: number
  operatorTetri: number
  platformTetri: number
  refundTetri: number
  payable: boolean
  tierId: string | null
  settledAt: string
}

/** Hours this node has actually delivered — simulated sessions do not count. */
export async function deliveredHoursForNode(nodeId: string): Promise<number> {
  const db = getDb()
  if (!db) return 0

  try {
    const [row] = await db
      .select({ hours: sql<number>`coalesce(sum(${observatorySettlement.hoursDelivered}), 0)` })
      .from(observatorySettlement)
      .where(and(eq(observatorySettlement.nodeId, nodeId), eq(observatorySettlement.payable, true)))

    return Number(row?.hours ?? 0)
  } catch (err) {
    console.error('[observatory] cannot read delivered hours', err)
    return 0
  }
}

/** Sessions whose slot has ended and which have no ledger row yet. */
export async function unsettledSessions(before: Date, limit = 100) {
  const db = getDb()
  if (!db) return []

  try {
    return await db
      .select({
        id: observatoryReservation.id,
        nodeId: observatoryReservation.nodeId,
        privyId: observatoryReservation.privyId,
        startsAt: observatoryReservation.startsAt,
        endsAt: observatoryReservation.endsAt,
      })
      .from(observatoryReservation)
      .leftJoin(
        observatorySettlement,
        eq(observatorySettlement.sessionId, observatoryReservation.id),
      )
      .where(
        and(
          lt(observatoryReservation.endsAt, before),
          sql`${observatorySettlement.id} is null`,
        ),
      )
      .limit(limit)
  } catch (err) {
    console.error('[observatory] cannot list unsettled sessions', err)
    return []
  }
}

/**
 * Write one session's settlement.
 *
 * Returns false when a row already existed, which is the normal outcome of a
 * sweep that overlaps the previous one — not an error.
 */
export async function recordSettlement(input: {
  sessionId: string
  nodeId: string
  privyId: string
  minutes: number
  settlement: Settlement
}): Promise<boolean> {
  const db = getDb()
  if (!db) return false

  try {
    const inserted = await db
      .insert(observatorySettlement)
      .values({
        sessionId: input.sessionId,
        nodeId: input.nodeId,
        privyId: input.privyId,
        state: input.settlement.state,
        feeTetri: input.settlement.feeTetri,
        operatorTetri: input.settlement.operatorTetri,
        platformTetri: input.settlement.platformTetri,
        refundTetri: input.settlement.refundTetri,
        payable: input.settlement.payable,
        tierId: input.settlement.tier?.id ?? null,
        // Only a payable session adds to the ladder; a dry run adds nothing.
        hoursDelivered: input.settlement.payable ? input.minutes / 60 : 0,
        reason: input.settlement.reason,
      })
      .onConflictDoNothing({ target: observatorySettlement.sessionId })
      .returning({ id: observatorySettlement.id })

    return inserted.length > 0
  } catch (err) {
    console.error('[observatory] cannot record settlement', err)
    return false
  }
}

/**
 * Settle everything whose slot has ended.
 *
 * A session that ran to its end is COMPLETE, which releases. Failures refund,
 * and they arrive from the node when there is a node to report them — until
 * then no session can fail, because none of them touched hardware.
 */
export async function settleDueSessions(input: {
  now?: Date
  feeTetriFor: (nodeId: string) => number
  minutesFor: (nodeId: string) => number
  provenanceFor: (nodeId: string) => Provenance
}): Promise<{ settled: number; skipped: number }> {
  const now = input.now ?? new Date()
  const due = await unsettledSessions(now)

  let settled = 0
  let skipped = 0

  for (const session of due) {
    const hours = await deliveredHoursForNode(session.nodeId)
    const written = await recordSettlement({
      sessionId: session.id,
      nodeId: session.nodeId,
      privyId: session.privyId,
      minutes: input.minutesFor(session.nodeId),
      settlement: settleComplete({
        feeTetri: input.feeTetriFor(session.nodeId),
        hoursDelivered: hours,
        provenance: input.provenanceFor(session.nodeId),
      }),
    })
    if (written) settled++
    else skipped++
  }

  return { settled, skipped }
}
