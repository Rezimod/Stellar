/**
 * What an operator has earned, and what it would take to earn more.
 *
 * Read straight off the payout ledger. Nothing is recomputed from prices or
 * bookings: a session's share was decided when it settled, at the tier the
 * operator held then, and a summary that re-derives it would eventually
 * disagree with what was actually paid.
 *
 * The operator sees lari and hours. The word wallet does not appear, per
 * docs/observatory-network.md §6.
 */

import { and, eq, gte, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { observatorySettlement } from '@/lib/schema'
import { nextTier, tierFor, type OperatorTier } from './operator-tiers'

export type OperatorEarnings = {
  nodeId: string
  /** Tetri earned this calendar month, and over the life of the node. */
  monthTetri: number
  lifetimeTetri: number
  /** Sessions that were real — a dry run earns nothing and counts for nothing. */
  sessionsDelivered: number
  hoursDelivered: number
  tier: OperatorTier
  next: { tier: OperatorTier; hoursRemaining: number } | null
  /** True while the node is simulated: the ledger is a rehearsal, not a wage. */
  dryRun: boolean
}

export async function earningsForNode(nodeId: string): Promise<OperatorEarnings> {
  const hoursAndTotals = await totals(nodeId)
  const hours = hoursAndTotals.hoursDelivered

  return {
    nodeId,
    ...hoursAndTotals,
    tier: tierFor(hours),
    next: nextTier(hours),
  }
}

async function totals(nodeId: string): Promise<{
  monthTetri: number
  lifetimeTetri: number
  sessionsDelivered: number
  hoursDelivered: number
  dryRun: boolean
}> {
  const empty = {
    monthTetri: 0,
    lifetimeTetri: 0,
    sessionsDelivered: 0,
    hoursDelivered: 0,
    dryRun: true,
  }

  const db = getDb()
  if (!db) return empty

  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)

  try {
    const [life] = await db
      .select({
        tetri: sql<number>`coalesce(sum(${observatorySettlement.operatorTetri}), 0)`,
        sessions: sql<number>`count(*)`,
        hours: sql<number>`coalesce(sum(${observatorySettlement.hoursDelivered}), 0)`,
      })
      .from(observatorySettlement)
      .where(and(eq(observatorySettlement.nodeId, nodeId), eq(observatorySettlement.payable, true)))

    const [month] = await db
      .select({ tetri: sql<number>`coalesce(sum(${observatorySettlement.operatorTetri}), 0)` })
      .from(observatorySettlement)
      .where(
        and(
          eq(observatorySettlement.nodeId, nodeId),
          eq(observatorySettlement.payable, true),
          gte(observatorySettlement.settledAt, monthStart),
        ),
      )

    const sessions = Number(life?.sessions ?? 0)
    return {
      monthTetri: Number(month?.tetri ?? 0),
      lifetimeTetri: Number(life?.tetri ?? 0),
      sessionsDelivered: sessions,
      hoursDelivered: Number(life?.hours ?? 0),
      // Nothing payable has ever settled here, so every figure above is zero
      // and the page should say why rather than showing an empty wage slip.
      dryRun: sessions === 0,
    }
  } catch (err) {
    console.error('[observatory] cannot read earnings', err)
    return empty
  }
}

/** Lari, for display. The ledger is tetri; nothing but the view rounds. */
export function lari(tetri: number): string {
  return (tetri / 100).toFixed(2)
}
