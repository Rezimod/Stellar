import { NextRequest, NextResponse } from 'next/server';
import { Keypair, PublicKey } from '@solana/web3.js';
import { encodeURL } from '@solana/pay';
import BigNumber from 'bignumber.js';
import { PrivyClient } from '@privy-io/server-auth';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { orders, users } from '@/lib/schema';
import { isValidPublicKey } from '@/lib/validate';

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
);

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const claims = await privy.verifyAuthToken(token);
    return claims.userId;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const privyId = await authenticate(req);
  if (!privyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const {
    productId, productName, productImage, dealerId,
    amountSol, amountFiat, currency,
    walletAddress,
    shipping,
  } = body as {
    productId?: string; productName?: string; productImage?: string; dealerId?: string;
    amountSol?: number; amountFiat?: number; currency?: string;
    walletAddress?: string;
    shipping?: { name?: string; phone?: string; address?: string; city?: string; country?: string; notes?: string };
  };

  if (!productId || !productName || !dealerId) {
    return NextResponse.json({ error: 'productId, productName, dealerId required' }, { status: 400 });
  }
  if (typeof amountSol !== 'number' || amountSol <= 0) {
    return NextResponse.json({ error: 'amountSol must be a positive number' }, { status: 400 });
  }
  if (typeof amountFiat !== 'number' || amountFiat <= 0) {
    return NextResponse.json({ error: 'amountFiat must be a positive number' }, { status: 400 });
  }
  if (!currency) return NextResponse.json({ error: 'currency required' }, { status: 400 });
  if (!walletAddress || !isValidPublicKey(walletAddress)) {
    return NextResponse.json({ error: 'Valid walletAddress required' }, { status: 400 });
  }
  const s = shipping ?? {};
  for (const k of ['name', 'phone', 'address', 'city', 'country'] as const) {
    if (!s[k] || typeof s[k] !== 'string' || (s[k] as string).trim().length === 0) {
      return NextResponse.json({ error: `shipping.${k} required` }, { status: 400 });
    }
  }

  const merchantWallet = process.env.NEXT_PUBLIC_MERCHANT_WALLET;
  if (!merchantWallet) {
    return NextResponse.json({ error: 'Merchant wallet not configured' }, { status: 503 });
  }
  let recipient: PublicKey;
  try {
    recipient = new PublicKey(merchantWallet);
  } catch {
    return NextResponse.json({ error: 'Invalid merchant wallet address' }, { status: 503 });
  }

  const reference = Keypair.generate().publicKey;
  const referenceStr = reference.toBase58();

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const inserted = await db
    .insert(orders)
    .values({
      privyId,
      walletAddress,
      productId,
      productName,
      productImage: productImage ?? null,
      dealerId,
      amountSol,
      amountFiat,
      currency,
      paymentReference: referenceStr,
      status: 'pending',
      shippingName: (s.name as string).trim(),
      shippingPhone: (s.phone as string).trim(),
      shippingAddress: (s.address as string).trim(),
      shippingCity: (s.city as string).trim(),
      shippingCountry: (s.country as string).trim(),
      shippingNotes: s.notes ? s.notes.trim() : null,
    })
    .returning();

  const order = inserted[0];

  const url = encodeURL({
    recipient,
    amount: new BigNumber(amountSol),
    reference,
    label: productName,
    memo: order.id,
    message: `Stellarr · ${productName}`,
  });

  return NextResponse.json({
    orderId: order.id,
    reference: referenceStr,
    url: url.toString(),
    amountSol,
    amountFiat,
    currency,
  });
}

export async function GET(req: NextRequest) {
  const privyId = await authenticate(req);
  if (!privyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const walletAddress = req.nextUrl.searchParams.get('walletAddress');
  if (!walletAddress || !isValidPublicKey(walletAddress)) {
    return NextResponse.json({ error: 'Valid walletAddress required' }, { status: 400 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ orders: [] });

  // Verify wallet ownership
  const userRows = await db
    .select({ walletAddress: users.walletAddress })
    .from(users)
    .where(eq(users.privyId, privyId))
    .limit(1);
  if (userRows.length > 0 && userRows[0].walletAddress && userRows[0].walletAddress !== walletAddress) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.walletAddress, walletAddress))
      .orderBy(desc(orders.createdAt))
      .limit(50);
    return NextResponse.json({ orders: rows });
  } catch (err) {
    console.error('[orders/list]', err);
    return NextResponse.json({ orders: [] });
  }
}

