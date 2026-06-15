import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import { findReference, validateTransfer } from '@solana/pay';
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

  if (order.paymentMethod === 'stars') {
    if (!order.burnSignature) {
      return NextResponse.json({
        confirmed: false,
        pending: 'burn',
        error: 'Awaiting Stars burn confirmation',
      });
    }
    const updated = await db
      .update(orders)
      .set({ status: 'paid', signature: order.burnSignature, paidAt: new Date() })
      .where(eq(orders.id, order.id))
      .returning();
    return NextResponse.json({ confirmed: true, signature: order.burnSignature, order: updated[0] ?? order });
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

  // findReference only proves *some* tx referenced this key. validate that
  // the recipient/amount/SPL match what the order recorded — otherwise an
  // attacker could send 1 lamport with the right reference and have the
  // order flip to paid.
  const merchantWallet = process.env.NEXT_PUBLIC_MERCHANT_WALLET;
  if (!merchantWallet) {
    return NextResponse.json({ confirmed: false, error: 'Merchant wallet not configured' }, { status: 503 });
  }
  try {
    const recipient = new PublicKey(merchantWallet);
    await validateTransfer(
      connection,
      signature,
      { recipient, amount: new BigNumber(order.amountSol), reference: referenceKey },
      { commitment: 'confirmed' },
    );
  } catch (err) {
    console.warn('[orders/confirm] amount validation failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ confirmed: false, error: 'Payment amount does not match order' }, { status: 400 });
  }

  // §4: orders that committed Stars for a discount cannot be marked paid
  // until the SPL burn lands on chain. The client signs + submits the burn
  // via /api/stars/burn, which writes order.burn_signature.
  if (order.burnStars > 0 && !order.burnSignature) {
    return NextResponse.json({
      confirmed: false,
      paymentFound: true,
      pending: 'burn',
      error: 'Awaiting Stars burn confirmation',
    });
  }

  const updated = await db
    .update(orders)
    .set({ status: 'paid', signature, paidAt: new Date() })
    .where(eq(orders.id, order.id))
    .returning();

  return NextResponse.json({ confirmed: true, signature, order: updated[0] ?? order });
}
