/**
 * Who holds which slot.
 *
 * A reservation is a claim on twenty minutes of an instrument, and nothing
 * more: no money moves, no lease is issued, no hardware is told. That comes
 * with the escrow slice (docs/observatory-network.md §6). What matters here is
 * that two people cannot hold the same slot, which the unique index on
 * `slot_id` enforces in the database rather than in a read-then-write race.
 */

import { and, eq, gte, lt } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { observatoryReservation } from '@/lib/schema'

/** How many upcoming slots one account may hold at once, while this is a dry run. */
export const MAX_OPEN_RESERVATIONS = 3

export type Reservation = {
  slotId: string
  nodeId: string
  startsAt: string
  endsAt: string
}

export type BookOutcome = 'reserved' | 'taken' | 'at_limit' | 'unavailable'

/** Slot id → the account holding it, for one node over one time range. */
export async function heldSlots(
  nodeId: string,
  from: Date,
  to: Date,
): Promise<Map<string, string>> {
  const db = getDb()
  if (!db) return new Map()

  const rows = await db
    .select({ slotId: observatoryReservation.slotId, privyId: observatoryReservation.privyId })
    .from(observatoryReservation)
    .where(
      and(
        eq(observatoryReservation.nodeId, nodeId),
        gte(observatoryReservation.startsAt, from),
        lt(observatoryReservation.startsAt, to),
      ),
    )

  return new Map(rows.map((r) => [r.slotId, r.privyId]))
}

/** Everything this account holds from `from` onwards, soonest first. */
export async function reservationsFor(privyId: string, from = new Date()): Promise<Reservation[]> {
  const db = getDb()
  if (!db) return []

  const rows = await db
    .select({
      slotId: observatoryReservation.slotId,
      nodeId: observatoryReservation.nodeId,
      startsAt: observatoryReservation.startsAt,
      endsAt: observatoryReservation.endsAt,
    })
    .from(observatoryReservation)
    .where(
      and(eq(observatoryReservation.privyId, privyId), gte(observatoryReservation.startsAt, from)),
    )

  return rows
    .map((r) => ({
      slotId: r.slotId,
      nodeId: r.nodeId,
      startsAt: r.startsAt.toISOString(),
      endsAt: r.endsAt.toISOString(),
    }))
    .sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1))
}

export async function reserve(input: {
  slotId: string
  nodeId: string
  privyId: string
  startsAt: Date
  endsAt: Date
}): Promise<BookOutcome> {
  const db = getDb()
  if (!db) return 'unavailable'

  const open = await reservationsFor(input.privyId)
  if (open.length >= MAX_OPEN_RESERVATIONS) return 'at_limit'

  // The insert is the lock: a second caller for the same slot conflicts on the
  // unique index and gets nothing back, whoever checked availability first.
  const inserted = await db
    .insert(observatoryReservation)
    .values({
      slotId: input.slotId,
      nodeId: input.nodeId,
      privyId: input.privyId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
    })
    .onConflictDoNothing({ target: observatoryReservation.slotId })
    .returning({ id: observatoryReservation.id })

  return inserted.length > 0 ? 'reserved' : 'taken'
}

/** Release a slot. True when this account held it; false when it did not. */
export async function release(slotId: string, privyId: string): Promise<boolean> {
  const db = getDb()
  if (!db) return false

  const deleted = await db
    .delete(observatoryReservation)
    .where(
      and(
        eq(observatoryReservation.slotId, slotId),
        eq(observatoryReservation.privyId, privyId),
      ),
    )
    .returning({ id: observatoryReservation.id })

  return deleted.length > 0
}
