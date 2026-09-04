/**
 * The capture-request queue.
 *
 * Placing a request is a claim on a *window*, not on a slot: the scheduler
 * decides which twenty minutes it becomes, later, when it knows what is free.
 * Every state change is a compare-and-swap on the state it expected to find,
 * because the sweep can run in more than one place at once and a request must
 * never be scheduled twice.
 *
 * No money moves here, exactly as with reservations — pricing is recorded and
 * escrow arrives with docs/observatory-network.md §6.
 */

import { and, asc, desc, eq, lt } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { observatoryCaptureRequest } from '@/lib/schema'
import type { RequestState } from './capture-requests'

/** How many open requests one account may hold. */
export const MAX_OPEN_REQUESTS = 5

export type CaptureRequest = {
  id: string
  privyId: string
  nodeId: string
  targetId: string
  targetName: string
  windowStart: string
  windowEnd: string
  priceTetri: number
  state: RequestState
  slotId: string | null
  createdAt: string
  scheduledAt: string | null
}

export type PlaceOutcome = 'queued' | 'at_limit' | 'unavailable'

export async function placeRequest(input: {
  privyId: string
  nodeId: string
  targetId: string
  targetName: string
  windowStart: Date
  windowEnd: Date
  priceTetri: number
}): Promise<{ outcome: PlaceOutcome; id: string | null }> {
  const db = getDb()
  if (!db) return { outcome: 'unavailable', id: null }

  try {
    const open = (await requestsFor(input.privyId)).filter(isOpen)
    if (open.length >= MAX_OPEN_REQUESTS) return { outcome: 'at_limit', id: null }

    const [row] = await db
      .insert(observatoryCaptureRequest)
      .values({
        privyId: input.privyId,
        nodeId: input.nodeId,
        targetId: input.targetId,
        targetName: input.targetName,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        priceTetri: input.priceTetri,
      })
      .returning({ id: observatoryCaptureRequest.id })

    return { outcome: 'queued', id: row.id }
  } catch (err) {
    console.error('[observatory] cannot place request', err)
    return { outcome: 'unavailable', id: null }
  }
}

/** Still waiting on the sky: a request that has not reached a terminal state. */
export function isOpen(request: CaptureRequest): boolean {
  return request.state === 'queued' || request.state === 'scheduled'
}

export async function requestsFor(privyId: string): Promise<CaptureRequest[]> {
  const db = getDb()
  if (!db) return []

  try {
    const rows = await db
      .select()
      .from(observatoryCaptureRequest)
      .where(eq(observatoryCaptureRequest.privyId, privyId))
      .orderBy(desc(observatoryCaptureRequest.createdAt))
      .limit(50)

    return rows.map(shape)
  } catch (err) {
    console.error('[observatory] cannot read requests', err)
    return []
  }
}

/** The queue, oldest first — a request that has waited longest is served first. */
export async function queuedRequests(limit = 50): Promise<CaptureRequest[]> {
  const db = getDb()
  if (!db) return []

  try {
    const rows = await db
      .select()
      .from(observatoryCaptureRequest)
      .where(eq(observatoryCaptureRequest.state, 'queued'))
      .orderBy(asc(observatoryCaptureRequest.createdAt))
      .limit(limit)

    return rows.map(shape)
  } catch (err) {
    console.error('[observatory] cannot read the queue', err)
    return []
  }
}

/**
 * Bind a request to the slot it will be worked in.
 *
 * Conditional on the request still being queued, so two sweeps racing produce
 * one schedule and one no-op rather than two reservations for one photograph.
 */
export async function markScheduled(input: {
  id: string
  slotId: string
  reservationId: string
  at?: Date
}): Promise<boolean> {
  const db = getDb()
  if (!db) return false

  try {
    const updated = await db
      .update(observatoryCaptureRequest)
      .set({
        state: 'scheduled',
        slotId: input.slotId,
        reservationId: input.reservationId,
        scheduledAt: input.at ?? new Date(),
      })
      .where(
        and(
          eq(observatoryCaptureRequest.id, input.id),
          eq(observatoryCaptureRequest.state, 'queued'),
        ),
      )
      .returning({ id: observatoryCaptureRequest.id })

    return updated.length > 0
  } catch (err) {
    console.error('[observatory] cannot schedule request', err)
    return false
  }
}

/**
 * Close every request whose window ran out while it was still waiting.
 *
 * An unfilled window refunds in full and automatically — the same rule as a
 * clouded-out session, and for the same reason: nobody should have to open a
 * support ticket because the sky did not cooperate.
 */
export async function expireStale(now = new Date()): Promise<number> {
  const db = getDb()
  if (!db) return 0

  try {
    const closed = await db
      .update(observatoryCaptureRequest)
      .set({ state: 'expired', closedAt: now })
      .where(
        and(
          eq(observatoryCaptureRequest.state, 'queued'),
          lt(observatoryCaptureRequest.windowEnd, now),
        ),
      )
      .returning({ id: observatoryCaptureRequest.id })

    return closed.length
  } catch (err) {
    console.error('[observatory] cannot expire requests', err)
    return 0
  }
}

/** Only a queued request can be withdrawn; once it holds a slot the night is planned. */
export async function cancelRequest(id: string, privyId: string): Promise<boolean> {
  const db = getDb()
  if (!db) return false

  try {
    const closed = await db
      .update(observatoryCaptureRequest)
      .set({ state: 'cancelled', closedAt: new Date() })
      .where(
        and(
          eq(observatoryCaptureRequest.id, id),
          eq(observatoryCaptureRequest.privyId, privyId),
          eq(observatoryCaptureRequest.state, 'queued'),
        ),
      )
      .returning({ id: observatoryCaptureRequest.id })

    return closed.length > 0
  } catch (err) {
    console.error('[observatory] cannot cancel request', err)
    return false
  }
}

const STATES: RequestState[] = ['queued', 'scheduled', 'delivered', 'expired', 'cancelled']

function shape(row: typeof observatoryCaptureRequest.$inferSelect): CaptureRequest {
  return {
    id: row.id,
    privyId: row.privyId,
    nodeId: row.nodeId,
    targetId: row.targetId,
    targetName: row.targetName,
    windowStart: row.windowStart.toISOString(),
    windowEnd: row.windowEnd.toISOString(),
    priceTetri: row.priceTetri,
    // A state this build does not recognise is treated as queued rather than
    // as delivered: the safe direction is more work, not a photograph nobody took.
    state: (STATES as string[]).includes(row.state) ? (row.state as RequestState) : 'queued',
    slotId: row.slotId,
    createdAt: row.createdAt.toISOString(),
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
  }
}
