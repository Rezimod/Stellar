/**
 * Working the queue when nobody is awake.
 *
 * This is the half of the network with no browser in it. A request reaches the
 * slot it was given, something has to point the telescope, and whatever comes
 * back has to end up where the customer can see it — in the gallery, and on
 * the poster if one is waiting for it.
 *
 * The rules are the same as everywhere else and they do not soften because no
 * one is watching:
 *
 *   - A capture may only happen inside the slot that was reserved for it.
 *   - Provenance comes from the adapter at the moment of capture, never from
 *     the caller, and a failure resolves downward.
 *   - A night that did not work is not a refund. The request loses its slot
 *     and waits for the next one; only a closed window refunds.
 */

import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { firstLightOrder } from '@/lib/schema'
import { recordCapture } from './captures'
import { adapterFor, getNode } from './nodes'
import { release } from './reservations'
import {
  expireScheduled,
  markDelivered,
  returnToQueue,
  scheduledRequests,
  type CaptureRequest,
} from './requests'

export type DeliverySweep = {
  delivered: number
  requeued: number
  expired: number
  /** Slots that arrived but had not started yet, left alone for a later sweep. */
  waiting: number
}

export async function deliverDueRequests(now = new Date()): Promise<DeliverySweep> {
  const sweep: DeliverySweep = { delivered: 0, requeued: 0, expired: 0, waiting: 0 }

  for (const request of await scheduledRequests(now)) {
    const outcome = await work(request, now)
    if (outcome === 'delivered') sweep.delivered++
    else if (outcome === 'requeued') sweep.requeued++
    else sweep.waiting++
  }

  // Anything still holding a slot when its window has closed. Runs last, so a
  // request that could have been worked on its final night got its chance.
  sweep.expired = await expireScheduled(now)

  return sweep
}

type Outcome = 'delivered' | 'requeued' | 'waiting'

async function work(request: CaptureRequest, now: Date): Promise<Outcome> {
  const node = getNode(request.nodeId)
  if (!node) return 'waiting'

  const slot = slotWindow(request)
  // Its slot is still ahead. Nothing to do, and nothing is wrong.
  if (!slot || now < slot.startsAt) return 'waiting'

  // The slot has passed without a photograph. Give the reservation back and let
  // the request find another night while its window is open.
  if (now >= slot.endsAt) return (await requeue(request)) ? 'requeued' : 'waiting'

  const adapter = adapterFor(node)
  const result = await adapter.capture(node, { targetId: request.targetId }, now)

  if (!result.ok) {
    if (result.kind === 'terminal') {
      // Nothing about another night would change this. Let the window close on
      // its own, which refunds — a terminal failure is not the customer's fault
      // either.
      return 'waiting'
    }
    return (await requeue(request)) ? 'requeued' : 'waiting'
  }

  // Asked at the moment of capture, exactly as the live path does. A node can
  // be connected and still running its own simulator.
  const provenance = await adapter.provenanceNow(node, now)

  const recorded = await recordCapture({
    sessionId: request.id,
    nodeId: node.id,
    privyId: request.privyId,
    targetId: request.targetId,
    targetName: request.targetName,
    provenance,
    exposureSec: result.exposureSec,
    subs: result.subs,
    opticalTrain: result.opticalTrain,
    roi: result.roi,
    capturedAt: now,
  })

  if (!recorded.recorded) return 'waiting'

  if (!(await markDelivered(request.id, recorded.capture.id, now))) {
    // Another sweep delivered it between the capture and this write. The frame
    // is still a true record of what the instrument did, so it stays.
    return 'waiting'
  }

  await attachToPoster(request.id, recorded.capture.id)
  return 'delivered'
}

/** The twenty minutes this request was given, read back off its slot id. */
function slotWindow(request: CaptureRequest): { startsAt: Date; endsAt: Date } | null {
  if (!request.scheduledAt || !request.slotId) return null

  const node = getNode(request.nodeId)
  if (!node) return null

  // `nodeId:2026-09-04T18:30Z` — the start is in the id, which is why the id is
  // built that way. The length comes from the node's own session length.
  const stamp = request.slotId.slice(request.nodeId.length + 1)
  const startsAt = new Date(stamp)
  if (Number.isNaN(startsAt.getTime())) return null

  return { startsAt, endsAt: new Date(startsAt.getTime() + node.sessionMinutes * 60_000) }
}

async function requeue(request: CaptureRequest): Promise<boolean> {
  if (!(await returnToQueue(request.id))) return false
  // Hand the slot back so the scheduler, or a person, can use that night.
  if (request.slotId) await release(request.slotId, request.privyId)
  return true
}

/**
 * A First Light order waiting on this request now has its photograph.
 *
 * Only the order that asked for it: `capture_request_id` is set when a
 * commissioned poster is placed, and nothing else may claim the frame.
 */
async function attachToPoster(requestId: string, captureId: string): Promise<void> {
  const db = getDb()
  if (!db) return

  try {
    await db
      .update(firstLightOrder)
      .set({ captureId, state: 'photographed' })
      .where(eq(firstLightOrder.captureRequestId, requestId))
  } catch (err) {
    console.error('[observatory] cannot attach capture to a First Light order', err)
  }
}
