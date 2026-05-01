import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { findReference } from '@solana/pay';
import { PrivyClient } from '@privy-io/server-auth';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { orders } from '@/lib/schema';

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
);

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ confirmed: false, error: 'Unauthorized' }, { status: 401 });

  let privyId: string;
  try {
    const claims = await privy.verifyAuthToken(token);
    privyId = claims.userId;
  } catch {
    return NextResponse.json({ confirmed: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const orderId: string | undefined = body?.orderId;
  if (!orderId) return NextResponse.json({ confirmed: false, error: 'orderId required' }, { status: 400 });

  const db = getDb();
  if (!db) return NextResponse.json({ confirmed: false, error: 'Database not configured' }, { status: 503 });

  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.privyId, privyId)))
    .limit(1);
  const order = rows[0];
  if (!order) return NextResponse.json({ confirmed: false, error: 'Order not found' }, { status: 404 });

  if (order.status === 'paid' && order.signature) {
    return NextResponse.json({ confirmed: true, signature: order.signature, order });
  }

  let referenceKey: PublicKey;
  try {
    referenceKey = new PublicKey(order.paymentReference);
  } catch {
    return NextResponse.json({ confirmed: false, error: 'Invalid reference' }, { status: 400 });
  }

  const rpcUrl = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');

  let signature: string;
  try {
    const sig = await findReference(connection, referenceKey, { finality: 'confirmed' });
    signature = sig.signature;
  } catch {
    return NextResponse.json({ confirmed: false });
  }

  const updated = await db
    .update(orders)
    .set({ status: 'paid', signature, paidAt: new Date() })
    .where(eq(orders.id, order.id))
    .returning();

  return NextResponse.json({ confirmed: true, signature, order: updated[0] ?? order });
}
