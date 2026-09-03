import { NextRequest, NextResponse } from 'next/server';
import { SimNodeAdapter } from '@/lib/observatory/adapter';
import { getNode } from '@/lib/observatory/nodes';
import { reservationById } from '@/lib/observatory/reservations';
import { verifyPrivy } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * One booked session, for the person who booked it.
 *
 * A reservation someone else holds answers 404, not 403: "not yours" would
 * still confirm that the id exists and who was on the instrument that night.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const privyId = await verifyPrivy(req);
  if (!privyId) {
    return NextResponse.json({ error: 'Sign in to open your session' }, { status: 401 });
  }

  const reservation = await reservationById((await params).id);
  if (!reservation || reservation.privyId !== privyId) {
    return NextResponse.json({ error: 'No such session' }, { status: 404 });
  }

  const node = getNode(reservation.nodeId);
  if (!node) {
    return NextResponse.json({ error: 'No such session' }, { status: 404 });
  }

  const readiness = await new SimNodeAdapter().getReadiness(node);

  return NextResponse.json({
    session: {
      id: reservation.id,
      startsAt: reservation.startsAt,
      endsAt: reservation.endsAt,
    },
    node,
    cloudCover: readiness.cloudCover,
  });
}
