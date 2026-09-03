import { NextRequest, NextResponse } from 'next/server';
import { findSlot } from '@/lib/observatory/availability';
import { getNode } from '@/lib/observatory/nodes';
import { MAX_OPEN_RESERVATIONS, release, reserve } from '@/lib/observatory/reservations';
import { verifyPrivy } from '@/lib/api-auth';
import { checkRateLimit, observatoryBookRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/** `tbilisi-01:2026-09-04T18:30Z` — the node is the part before the timestamp. */
function nodeIdOf(slotId: string): string | null {
  const cut = slotId.indexOf(':');
  return cut > 0 ? slotId.slice(0, cut) : null;
}

export async function POST(req: NextRequest) {
  const privyId = await verifyPrivy(req);
  if (!privyId) {
    return NextResponse.json({ error: 'Sign in to hold a slot' }, { status: 401 });
  }

  const { success } = await checkRateLimit(observatoryBookRateLimit, `book:${privyId}`);
  if (!success) {
    return NextResponse.json({ error: 'Too many booking attempts' }, { status: 429 });
  }

  let slotId: unknown;
  try {
    ({ slotId } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }
  if (typeof slotId !== 'string' || slotId.length > 120) {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }

  const node = getNode(nodeIdOf(slotId) ?? '');
  if (!node) {
    return NextResponse.json({ error: 'Unknown node' }, { status: 404 });
  }

  // Rebuilding the timetable is the validation: a slot that is not on it is
  // past, outside the dark window, or outside the operator's hours, and no
  // amount of client-side insistence makes it bookable.
  const slot = findSlot(node, slotId);
  if (!slot) {
    return NextResponse.json({ error: 'That slot is no longer available' }, { status: 409 });
  }

  const { outcome, id } = await reserve({
    slotId: slot.id,
    nodeId: node.id,
    privyId,
    startsAt: new Date(slot.startsAt),
    endsAt: new Date(slot.endsAt),
  });

  if (outcome === 'reserved') {
    return NextResponse.json({ reserved: true, slot, sessionId: id }, { status: 201 });
  }
  if (outcome === 'taken') {
    return NextResponse.json({ error: 'Someone else holds that slot' }, { status: 409 });
  }
  if (outcome === 'at_limit') {
    return NextResponse.json(
      { error: `You already hold ${MAX_OPEN_RESERVATIONS} slots. Release one first.` },
      { status: 409 },
    );
  }
  return NextResponse.json({ error: 'Booking is unavailable right now' }, { status: 503 });
}

export async function DELETE(req: NextRequest) {
  const privyId = await verifyPrivy(req);
  if (!privyId) {
    return NextResponse.json({ error: 'Sign in to release a slot' }, { status: 401 });
  }

  const slotId = req.nextUrl.searchParams.get('slot');
  if (!slotId) {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }

  const outcome = await release(slotId, privyId);
  if (outcome === 'unavailable') {
    return NextResponse.json({ error: 'Booking is unavailable right now' }, { status: 503 });
  }
  if (outcome === 'not_held') {
    return NextResponse.json({ error: 'You do not hold that slot' }, { status: 404 });
  }
  return NextResponse.json({ released: true });
}
