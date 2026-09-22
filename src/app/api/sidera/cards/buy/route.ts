import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isValidPublicKey } from '@/lib/validate';
import { assertOwnsWallet, verifyPrivy } from '@/lib/api-auth';
import { paused } from '@/lib/kill-switch';
import { sideraBuyRateLimit } from '@/lib/rate-limit';
import { isRarity } from '@/lib/rarity';
import { DIRECT_CARD_PRICE_USD } from '@/lib/sidera/economics';
import { cardAvailability, createCardOrder, usdToSol, merchantWallet, newPaymentReference, paymentUrl } from '@/lib/sidera/orders';
import { limited } from '@/lib/sidera/route-guards';
import { SolPriceUnavailableError } from '@/lib/sol-price';

export const runtime = 'nodejs';

/**
 * Buys one card outright — the second way in, besides a capsule. The edition
 * number is allocated when the payment is confirmed, not now, so an unpaid
 * order never holds a number and the numbers stay gapless. A draft set sells
 * nothing, on its own or by capsule. Editions owed to capsules already listed
 * or bought are not for sale on their own. The quote
 * stands for ORDER_WINDOW_MINUTES, and none is given without a live SOL price.
 */
export async function POST(req: NextRequest) {
  const p = paused();
  if (p) return p;
  const privyId = await verifyPrivy(req);
  if (!privyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { walletAddress?: unknown; designation?: unknown } | null;
  const walletAddress = body?.walletAddress;
  const designation = body?.designation;
  if (typeof walletAddress !== 'string' || !isValidPublicKey(walletAddress)) {
    return NextResponse.json({ error: 'Valid walletAddress required' }, { status: 400 });
  }
  if (typeof designation !== 'string' || !/^[A-Z0-9-]{1,40}$/.test(designation)) {
    return NextResponse.json({ error: 'designation required' }, { status: 400 });
  }
  if (!(await assertOwnsWallet(privyId, walletAddress))) {
    return NextResponse.json({ error: 'Wallet does not match session' }, { status: 403 });
  }
  const l = await limited(sideraBuyRateLimit, walletAddress);
  if (l) return l;

  const recipient = merchantWallet();
  if (!recipient) return NextResponse.json({ error: 'Merchant wallet not configured' }, { status: 503 });
  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const c = await cardAvailability(db, designation);
  if (!c || !isRarity(c.rarity)) return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  if (!c.released) return NextResponse.json({ error: 'This set is not on sale yet' }, { status: 409 });
  if (!c.available) return NextResponse.json({ error: 'No edition of this card is available on its own' }, { status: 409 });

  const priceUsd = DIRECT_CARD_PRICE_USD[c.rarity];
  let amountSol: number;
  try {
    amountSol = await usdToSol(priceUsd);
  } catch (err) {
    if (!(err instanceof SolPriceUnavailableError)) console.error('[sidera/cards/buy] quote', err);
    return NextResponse.json({ error: 'No price can be quoted right now — please retry shortly.' }, { status: 503 });
  }

  try {
    const reference = newPaymentReference();
    const order = await createCardOrder(db, { privyId, wallet: walletAddress, designation, name: c.name, priceUsd, amountSol, reference });
    return NextResponse.json({
      orderId: order.id,
      designation,
      reference,
      url: paymentUrl({ recipient, amountSol, reference, label: c.name, orderId: order.id }),
      amountSol,
      amountFiat: priceUsd,
      currency: 'USD',
      status: 'pending',
      expiresAt: order.expiresAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error('[sidera/cards/buy]', err);
    return NextResponse.json({ error: 'Could not place the order — please retry.' }, { status: 500 });
  }
}
