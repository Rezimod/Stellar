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
  id: string
  slotId: string
  nodeId: string
  privyId: string
  startsAt: string
  endsAt: string
}

/** Who holds a slot, and the session room it opens. */
export type Holder = { id: string; privyId: string }

export type BookOutcome = 'reserved' | 'taken' | 'at_limit' | 'unavailable'

/** Slot id → who holds it, for one node over one time range. */
export async function heldSlots(
  nodeId: string,
  from: Date,
  to: Date,
): Promise<Map<string, Holder>> {
  const db = getDb()
  if (!db) return new Map()

  const rows = await db
    .select({
      id: observatoryReservation.id,
      slotId: observatoryReservation.slotId,
      privyId: observatoryReservation.privyId,
    })
    .from(observatoryReservation)
    .where(
      and(
        eq(observatoryReservation.nodeId, nodeId),
        gte(observatoryReservation.startsAt, from),
        lt(observatoryReservation.startsAt, to),
      ),
    )

  return new Map(rows.map((r) => [r.slotId, { id: r.id, privyId: r.privyId }]))
}

/** Everything this account holds from `from` onwards, soonest first. */
export async function reservationsFor(privyId: string, from = new Date()): Promise<Reservation[]> {
  const db = getDb()
  if (!db) return []

  const rows = await db
    .select()
    .from(observatoryReservation)
    .where(
      and(eq(observatoryReservation.privyId, privyId), gte(observatoryReservation.startsAt, from)),
    )

  return rows.map(shape).sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1))
}

/**
 * One reservation by its id.
 *
 * The session room asks for this and then checks the holder itself: a
 * reservation someone else made is not this visitor's to see, and answering
 * "not yours" would still confirm that it exists.
 */
export async function reservationById(id: string): Promise<Reservation | null> {
  const db = getDb()
  if (!db) return null

  const [row] = await db
    .select()
    .from(observatoryReservation)
    .where(eq(observatoryReservation.id, id))
    .limit(1)

  return row ? shape(row) : null
}

export async function reserve(input: {
  slotId: string
  nodeId: string
  privyId: string
  startsAt: Date
  endsAt: Date
}): Promise<{ outcome: BookOutcome; id: string | null }> {
  const db = getDb()
  if (!db) return { outcome: 'unavailable', id: null }

  const open = await reservationsFor(input.privyId)
  if (open.length >= MAX_OPEN_RESERVATIONS) return { outcome: 'at_limit', id: null }

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

  return inserted.length > 0
    ? { outcome: 'reserved', id: inserted[0].id }
    : { outcome: 'taken', id: null }
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

function shape(row: typeof observatoryReservation.$inferSelect): Reservation {
  return {
    id: row.id,
    slotId: row.slotId,
    nodeId: row.nodeId,
    privyId: row.privyId,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
  }
}
