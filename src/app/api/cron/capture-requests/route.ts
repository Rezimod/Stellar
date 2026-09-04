import { NextRequest, NextResponse } from 'next/server';
import { planRequest } from '@/lib/observatory/capture-requests';
import { deliverDueRequests } from '@/lib/observatory/deliver';
import { getNode } from '@/lib/observatory/nodes';
import { heldSlots, release, reserve } from '@/lib/observatory/reservations';
import { expireStale, markScheduled, queuedRequests } from '@/lib/observatory/requests';
import { verifyCronSecret } from '@/lib/cron-auth';

export const runtime = 'nodejs';

/**
 * Work the capture queue.
 *
 * Booked live sessions are immovable and requests fill the gaps between them.
 * That is not enforced by any ordering here — it falls out of the reservation
 * table's unique index on the slot. A live booking racing this sweep for the
 * same twenty minutes simply wins or loses atomically, and the loser tries the
 * next slot.
 *
 * Idempotent by construction: scheduling is a compare-and-swap on `queued`, so
 * two sweeps produce one schedule and one no-op.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  // Work anything whose slot has arrived before handing out new ones, so a
  // request cannot be scheduled into a slot this same sweep is about to free.
  const delivery = await deliverDueRequests(now);

  const expired = await expireStale(now);

  const queue = await queuedRequests();
  let scheduled = 0;
  let waiting = 0;

  // Slots this sweep has claimed, so two requests in the same run do not both
  // plan into the twenty minutes one of them already took.
  const claimed = new Map<string, Set<string>>();

  for (const request of queue) {
    const node = getNode(request.nodeId);
    if (!node) continue;

    const windowStart = new Date(request.windowStart);
    const windowEnd = new Date(request.windowEnd);

    const held = await heldSlots(request.nodeId, windowStart, windowEnd);
    // A store that cannot answer reads as "everything is free", which would
    // plan straight into a booked night. Skip the request; it keeps its window.
    if (held === null) {
      waiting++;
      continue;
    }

    const taken = new Set<string>([...held.keys(), ...(claimed.get(request.nodeId) ?? [])]);
    const slot = planRequest({
      node,
      targetId: request.targetId,
      windowStart,
      windowEnd,
      taken,
      now,
    });

    if (!slot) {
      // Nothing free and observable yet. The window has not closed, so this is
      // patience rather than failure — expireStale closes it when it is over.
      waiting++;
      continue;
    }

    const { outcome, id } = await reserve({
      slotId: slot.id,
      nodeId: node.id,
      privyId: request.privyId,
      source: 'request',
      feeTetri: request.priceTetri,
      startsAt: new Date(slot.startsAt),
      endsAt: new Date(slot.endsAt),
    });

    if (outcome !== 'reserved' || !id) {
      waiting++;
      continue;
    }

    if (await markScheduled({ id: request.id, slotId: slot.id, reservationId: id, at: now })) {
      scheduled++;
      const forNode = claimed.get(node.id) ?? new Set<string>();
      forNode.add(slot.id);
      claimed.set(node.id, forNode);
    } else {
      // Another sweep scheduled this request between the plan and the write, so
      // the slot just taken belongs to nothing. Hand it back rather than leave
      // an hour of a clear night reserved for a photograph nobody asked for.
      await release(slot.id, request.privyId);
      waiting++;
    }
  }

  return NextResponse.json({ ok: true, ...delivery, expired, scheduled, waiting });
}
