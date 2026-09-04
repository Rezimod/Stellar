/**
 * Who holds which slot.
 *
 * A reservation is a claim on twenty minutes of an instrument, and nothing
 * more: no money moves, no lease is issued, no hardware is told. That comes
 * with the escrow slice (docs/observatory-network.md §6). What matters here is
 * that two people cannot hold the same slot, which the unique index on
 * `slot_id` enforces in the database rather than in a read-then-write race.
 *
 * Every call reports its own failure instead of throwing. The timetable is
 * computed from the sky and needs no database at all, so a store that cannot
 * answer costs a visitor the held marks and the booking button — not the
 * night's schedule.
 */

import { and, eq, gte, lt } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { observatoryReservation } from '@/lib/schema'

/** How many upcoming slots one account may hold at once, while this is a dry run. */
export const MAX_OPEN_RESERVATIONS = 3

export type ReservationSource = 'live' | 'request'

export type Reservation = {
  id: string
  slotId: string
  nodeId: string
  privyId: string
  source: ReservationSource
  feeTetri: number
  startsAt: string
  endsAt: string
}

/** Who holds a slot, and the session room it opens. */
export type Holder = { id: string; privyId: string }

export type BookOutcome = 'reserved' | 'taken' | 'at_limit' | 'unavailable'
export type ReleaseOutcome = 'released' | 'not_held' | 'unavailable'

/**
 * Slot id → who holds it, for one node over one time range.
 *
 * Null means the store could not answer, which the caller must tell apart from
 * an empty map — that one reads as "everything is free".
 */
export async function heldSlots(
  nodeId: string,
  from: Date,
  to: Date,
): Promise<Map<string, Holder> | null> {
  const db = getDb()
  if (!db) return null

  try {
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
  } catch (err) {
    console.error('[observatory] cannot read reservations', err)
    return null
  }
}

/**
 * Live bookings this account holds from `from` onwards, soonest first.
 *
 * Requests are excluded on purpose: they are worked by the scheduler, not
 * driven by the customer, and listing them as sessions would offer a console
 * for a night nobody intends to be awake for.
 */
export async function reservationsFor(privyId: string, from = new Date()): Promise<Reservation[]> {
  const db = getDb()
  if (!db) return []

  const rows = await db
    .select()
    .from(observatoryReservation)
    .where(
      and(
        eq(observatoryReservation.privyId, privyId),
        eq(observatoryReservation.source, 'live'),
        gte(observatoryReservation.startsAt, from),
      ),
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

  try {
    const [row] = await db
      .select()
      .from(observatoryReservation)
      .where(eq(observatoryReservation.id, id))
      .limit(1)

    return row ? shape(row) : null
  } catch (err) {
    console.error('[observatory] cannot read reservation', err)
    return null
  }
}

export async function reserve(input: {
  slotId: string
  nodeId: string
  privyId: string
  /** A live booking is driven; a request is worked while the customer sleeps. */
  source?: ReservationSource
  /** What was agreed now. Settlement reads this back rather than re-pricing. */
  feeTetri: number
  startsAt: Date
  endsAt: Date
}): Promise<{ outcome: BookOutcome; id: string | null }> {
  const db = getDb()
  if (!db) return { outcome: 'unavailable', id: null }

  const source = input.source ?? 'live'

  try {
    // The cap is on slots a person holds to drive themselves. A queue worked on
    // their behalf is the scheduler's business and is bounded by the night.
    if (source === 'live') {
      const open = await reservationsFor(input.privyId)
      if (open.length >= MAX_OPEN_RESERVATIONS) return { outcome: 'at_limit', id: null }
    }

    // The insert is the lock: a second caller for the same slot conflicts on
    // the unique index and gets nothing back, whoever checked availability
    // first.
    const inserted = await db
      .insert(observatoryReservation)
      .values({
        slotId: input.slotId,
        nodeId: input.nodeId,
        privyId: input.privyId,
        source,
        feeTetri: input.feeTetri,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
      })
      .onConflictDoNothing({ target: observatoryReservation.slotId })
      .returning({ id: observatoryReservation.id })

    return inserted.length > 0
      ? { outcome: 'reserved', id: inserted[0].id }
      : { outcome: 'taken', id: null }
  } catch (err) {
    console.error('[observatory] cannot hold slot', err)
    return { outcome: 'unavailable', id: null }
  }
}

/**
 * Release a slot.
 *
 * A store that cannot answer says so. Telling someone they never held a slot
 * they are looking at, because the database blinked, is worse than an outage.
 */
export async function release(slotId: string, privyId: string): Promise<ReleaseOutcome> {
  const db = getDb()
  if (!db) return 'unavailable'

  try {
    const deleted = await db
      .delete(observatoryReservation)
      .where(
        and(eq(observatoryReservation.slotId, slotId), eq(observatoryReservation.privyId, privyId)),
      )
      .returning({ id: observatoryReservation.id })

    return deleted.length > 0 ? 'released' : 'not_held'
  } catch (err) {
    console.error('[observatory] cannot release slot', err)
    return 'unavailable'
  }
}

function shape(row: typeof observatoryReservation.$inferSelect): Reservation {
  return {
    id: row.id,
    slotId: row.slotId,
    nodeId: row.nodeId,
    privyId: row.privyId,
    // Anything the column holds that is not the word request is a live
    // booking, which is the safe direction: a driveable session that reads as
    // a queue entry disappears from its owner, and that is the worse failure.
    source: row.source === 'request' ? 'request' : 'live',
    feeTetri: row.feeTetri,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
  }
}
