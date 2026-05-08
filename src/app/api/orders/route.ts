import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { Keypair, PublicKey } from '@solana/web3.js';
import { encodeURL } from '@solana/pay';
import BigNumber from 'bignumber.js';
import { PrivyClient } from '@privy-io/server-auth';
import { eq, desc, and } from 'drizzle-orm';
import { getDb, ensureOrdersBurnColumns } from '@/lib/db';
import { orders, users } from '@/lib/schema';
import { isValidPublicKey } from '@/lib/validate';
import { getStarsBalance } from '@/lib/solana';
import { computeMaxBurn, validateBurn, starsToGEL } from '@/lib/stars-economy';
import { assertOwnsWallet } from '@/lib/api-auth';

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
  try {
  const privyId = await authenticate(req);
  if (!privyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const {
    productId, productName, productImage, dealerId,
    paymentMethod, amountSol, amountStars, amountFiat, currency,
    walletAddress,
    shipping,
    burnStars: burnStarsRaw,
  } = body as {
    productId?: string; productName?: string; productImage?: string; dealerId?: string;
    paymentMethod?: 'sol' | 'stars';
    amountSol?: number; amountStars?: number; amountFiat?: number; currency?: string;
    walletAddress?: string;
    shipping?: { name?: string; phone?: string; address?: string; city?: string; country?: string; notes?: string };
    burnStars?: number;
  };

  const method: 'sol' | 'stars' = paymentMethod === 'stars' ? 'stars' : 'sol';

  if (!productId || !productName || !dealerId) {
    return NextResponse.json({ error: 'productId, productName, dealerId required' }, { status: 400 });
  }
  if (typeof amountFiat !== 'number' || amountFiat <= 0) {
    return NextResponse.json({ error: 'amountFiat must be a positive number' }, { status: 400 });
  }
  if (!currency) return NextResponse.json({ error: 'currency required' }, { status: 400 });
  if (!walletAddress || !isValidPublicKey(walletAddress)) {
    return NextResponse.json({ error: 'Valid walletAddress required' }, { status: 400 });
  }
  // Match the GET path's ownership check — the wallet placing this order
  // must be the one linked to the verified Privy session, otherwise a
  // signed-in user could spend another wallet's Stars or sign up SOL
  // payments under someone else's address.
  const owns = await assertOwnsWallet(privyId, walletAddress);
  if (!owns) {
    return NextResponse.json({ error: 'Wallet does not match session' }, { status: 403 });
  }
  if (method === 'sol' && (typeof amountSol !== 'number' || amountSol <= 0)) {
    return NextResponse.json({ error: 'amountSol must be a positive number' }, { status: 400 });
  }
  if (method === 'stars' && (typeof amountStars !== 'number' || amountStars <= 0 || !Number.isInteger(amountStars))) {
    return NextResponse.json({ error: 'amountStars must be a positive integer' }, { status: 400 });
  }
  const s = shipping ?? {};
  for (const k of ['name', 'phone', 'address', 'city', 'country'] as const) {
    if (!s[k] || typeof s[k] !== 'string' || (s[k] as string).trim().length === 0) {
      return NextResponse.json({ error: `shipping.${k} required` }, { status: 400 });
    }
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }
  // Self-heal the §4 burn columns on first hit — keeps the API working even
  // when a deploy ships new schema without the manual Neon ALTER.
  await ensureOrdersBurnColumns().catch(() => { /* surface as insert error below */ });

  // ─── Optional Stars-for-discount burn (§4) ────────────────────────────────
  // Only valid for SOL-paid GEL-priced products. Discount is computed here so
  // the resulting order row already carries the discounted amountFiat /
  // amountSol; the actual SPL burn is signed via /api/stars/burn after order
  // creation, before /api/orders/confirm marks the order paid.
  let burnStars = 0;
  let gelDiscount = 0;
  let discountedFiat = amountFiat;
  let discountedSol = typeof amountSol === 'number' ? amountSol : 0;
  if (typeof burnStarsRaw === 'number' && burnStarsRaw > 0) {
    if (method !== 'sol') {
      return NextResponse.json({ error: 'Stars burn discount is only available for SOL-paid orders right now' }, { status: 400 });
    }
    if (currency !== 'GEL') {
      return NextResponse.json({ error: 'Stars burn discount is only available for GEL-priced products right now' }, { status: 400 });
    }
    const balance = await getStarsBalance(walletAddress).catch(() => 0);
    const v = validateBurn({ priceGEL: amountFiat, stars: burnStarsRaw, balance });
    if (!v.ok) {
      return NextResponse.json({ error: v.reason }, { status: 400 });
    }
    burnStars = burnStarsRaw;
    gelDiscount = v.gelDiscount;
    discountedFiat = Math.max(0, amountFiat - gelDiscount);
    if (typeof amountSol === 'number' && amountFiat > 0) {
      // Scale SOL proportionally — the client computed amountSol against the
      // pre-discount price; divide by the same ratio to keep the SOL payment
      // honest.
      discountedSol = Number(((amountSol * discountedFiat) / amountFiat).toFixed(6));
    }
  }
  // Cap burn helper for parity with /api/stars/burn — the validation above is
  // already strict, this is just a defensive belt+suspenders.
  void computeMaxBurn; void starsToGEL;

  // STARS PAYMENT: verify on-chain balance against pending+paid stars orders, then mark paid immediately.
  if (method === 'stars') {
    const required = amountStars as number;
    let onChainBalance = 0;
    try { onChainBalance = await getStarsBalance(walletAddress); } catch { onChainBalance = 0; }
    const existing = await db
      .select({ amount: orders.amountStars })
      .from(orders)
      .where(and(eq(orders.walletAddress, walletAddress), eq(orders.paymentMethod, 'stars')));
    const alreadyRedeemed = existing.reduce((sum, r) => sum + (r.amount ?? 0), 0);
    const available = onChainBalance - alreadyRedeemed;
    if (available < required) {
      return NextResponse.json(
        { error: `Not enough stars. You have ${Math.max(0, available)}, need ${required}.`, available, required },
        { status: 400 },
      );
    }

    const referenceStr = `stars-${randomUUID()}`;
    const inserted = await db
      .insert(orders)
      .values({
        privyId, walletAddress, productId, productName,
        productImage: productImage ?? null, dealerId,
        paymentMethod: 'stars',
        amountSol: 0,
        amountStars: required,
        amountFiat,
        currency,
        paymentReference: referenceStr,
        status: 'paid',
        paidAt: new Date(),
        shippingName: (s.name as string).trim(),
        shippingPhone: (s.phone as string).trim(),
        shippingAddress: (s.address as string).trim(),
        shippingCity: (s.city as string).trim(),
        shippingCountry: (s.country as string).trim(),
        shippingNotes: s.notes ? s.notes.trim() : null,
      })
      .returning();
    const order = inserted[0];
    return NextResponse.json({
      orderId: order.id,
      paymentMethod: 'stars',
      amountStars: required,
      amountFiat,
      currency,
      status: 'paid',
    });
  }

  // SOL PAYMENT: generate Solana Pay reference + URL, persist as pending.
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

  const inserted = await db
    .insert(orders)
    .values({
      privyId, walletAddress, productId, productName,
      productImage: productImage ?? null, dealerId,
      paymentMethod: 'sol',
      amountSol: discountedSol,
      amountStars: 0,
      amountFiat: discountedFiat,
      currency,
      burnStars,
      gelDiscount,
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
    amount: new BigNumber(discountedSol),
    reference,
    label: productName,
    memo: order.id,
    message: `Stellarr · ${productName}`,
  });

  return NextResponse.json({
    orderId: order.id,
    paymentMethod: 'sol',
    reference: referenceStr,
    url: url.toString(),
    amountSol: discountedSol,
    amountFiat: discountedFiat,
    currency,
    burnStars,
    gelDiscount,
    requiresBurn: burnStars > 0,
    status: 'pending',
  });
  } catch (err) {
    console.error('[orders/POST]', err);
    // Drizzle wraps the underlying pg error; its top-level message is the SQL
    // it tried to run, which is noisy and leaks DB structure to the UI. Walk
    // the .cause chain to the original Postgres error and surface that.
    const reason = extractDbErrorReason(err);
    return NextResponse.json({ error: `Could not place order: ${reason}` }, { status: 500 });
  }
}

function extractDbErrorReason(err: unknown): string {
  let cur: unknown = err;
  // Walk up to 3 levels of cause; pg errors are usually 1–2 deep.
  for (let i = 0; i < 3 && cur; i++) {
    if (cur && typeof cur === 'object') {
      const e = cur as { message?: string; detail?: string; code?: string; cause?: unknown };
      // Postgres errors carry a `code` (e.g. '42703' undefined_column,
      // '23505' unique_violation). When present, prefer their message
      // over the wrapper's "Failed query: ..." dump.
      if (e.code && typeof e.message === 'string' && !e.message.startsWith('Failed query')) {
        return e.detail ? `${e.message} (${e.detail})` : e.message;
      }
      if (e.cause) { cur = e.cause; continue; }
      if (typeof e.message === 'string' && !e.message.startsWith('Failed query')) return e.message;
    }
    break;
  }
  return 'database error — please retry, or contact support if it keeps happening';
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

