import { NextRequest, NextResponse } from 'next/server';
import { attachForecast, buildSlots, DEFAULT_NIGHTS } from '@/lib/observatory/availability';
import { getNode } from '@/lib/observatory/nodes';
import { heldSlots, type Holder } from '@/lib/observatory/reservations';
import { verifyPrivy } from '@/lib/api-auth';

// Slots expire as the night runs down, and which of them are taken depends on
// who is asking. Nothing here is cacheable.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const nodeId = req.nextUrl.searchParams.get('node');
  const node = nodeId ? getNode(nodeId) : null;
  if (!node) {
    return NextResponse.json({ error: 'Unknown node' }, { status: 404 });
  }

  const requested = Number(req.nextUrl.searchParams.get('nights'));
  const nights = Number.isFinite(requested)
    ? Math.min(Math.max(Math.trunc(requested), 1), DEFAULT_NIGHTS)
    : DEFAULT_NIGHTS;

  const slots = await attachForecast(node, buildSlots(node, { nights }));

  // An unauthenticated visitor still sees what is free; they just cannot see
  // whose booking a taken slot is, which is nobody's business but the holder's.
  const privyId = await verifyPrivy(req);
  const held =
    slots.length > 0
      ? await heldSlots(
          node.id,
          new Date(slots[0].startsAt),
          new Date(new Date(slots[slots.length - 1].startsAt).getTime() + 1),
        )
      : new Map<string, Holder>();

  return NextResponse.json({
    node: {
      id: node.id,
      name: node.name,
      site: node.site,
      timezone: node.timezone,
      status: node.status,
      priceGel: node.priceGel,
      sessionMinutes: node.sessionMinutes,
    },
    slots: slots.map((slot) => {
      const holder = held.get(slot.id);
      const mine = privyId !== null && holder?.privyId === privyId;
      return {
        ...slot,
        taken: holder !== undefined,
        mine,
        // The session room's id, and only for the person who holds it.
        sessionId: mine && holder ? holder.id : null,
      };
    }),
  });
}
