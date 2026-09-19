import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { capsule, orders } from '@/lib/schema';
import { verifyPrivy } from '@/lib/api-auth';
import { paused } from '@/lib/kill-switch';
import { sideraConfirmRateLimit } from '@/lib/rate-limit';
import { CAPSULE_PRODUCT_ID, CARD_PRODUCT_PREFIX, findPayment, fulfilCardOrder, markPaid, type OrderRow } from '@/lib/sidera/orders';
import { limited } from '@/lib/sidera/route-guards';

export const runtime = 'nodejs';

/**
 * Confirms a Sidera order's Solana Pay transfer. A paid capsule is then ready
 * to open; a paid card is allocated its edition here. Safe to call again.
 */
export async function POST(req: NextRequest) {
  const p = paused();
  if (p) return p;
  const privyId = await verifyPrivy(req);
  if (!privyId) return NextResponse.json({ confirmed: false, error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { orderId?: unknown } | null;
  const orderId = body?.orderId;
  if (typeof orderId !== 'string' || !/^[0-9a-f-]{36}$/.test(orderId)) {
    return NextResponse.json({ confirmed: false, error: 'orderId required' }, { status: 400 });
  }
  const l = await limited(sideraConfirmRateLimit, privyId);
  if (l) return l;

  const db = getDb();
  if (!db) return NextResponse.json({ confirmed: false, error: 'Database not configured' }, { status: 503 });

  const [found] = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.privyId, privyId))).limit(1);
  const isSidera = found && (found.productId === CAPSULE_PRODUCT_ID || found.productId.startsWith(CARD_PRODUCT_PREFIX));
  if (!found || !isSidera) return NextResponse.json({ confirmed: false, error: 'Order not found' }, { status: 404 });

  let order: OrderRow = found;
  if (order.status === 'pending') {
    const payment = await findPayment(order);
    if (!payment.paid) {
      return NextResponse.json({ confirmed: false, ...(payment.error ? { error: payment.error } : {}) }, { status: payment.status ?? 200 });
    }
    order = await markPaid(db, order.id, payment.signature);
  }
  if (order.status !== 'paid') {
    return NextResponse.json({ confirmed: false, status: order.status, error: 'This order is closed' }, { status: 409 });
  }

  if (order.productId === CAPSULE_PRODUCT_ID) {
    const [c] = await db.select({ id: capsule.id }).from(capsule).where(eq(capsule.orderId, order.id)).limit(1);
    return NextResponse.json({ confirmed: true, signature: order.signature, capsuleId: c?.id ?? null });
  }

  const fulfilled = await fulfilCardOrder(db, order);
  if (!fulfilled.ok) {
    const error = fulfilled.reason === 'sold_out'
      ? 'Every edition of this card was taken before the payment arrived. The order will be refunded.'
      : 'Card not found';
    return NextResponse.json({ confirmed: true, signature: order.signature, error }, { status: 409 });
  }
  return NextResponse.json({ confirmed: true, signature: order.signature, edition: fulfilled });
}
