import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isValidPublicKey } from '@/lib/validate';
import { assertOwnsWallet, verifyPrivy } from '@/lib/api-auth';
import { paused } from '@/lib/kill-switch';
import { sideraBuyRateLimit } from '@/lib/rate-limit';
import { purchaseCapsule, readCapsule } from '@/lib/sidera/capsule';
import { gelToSol, merchantWallet, newPaymentReference, paymentUrl } from '@/lib/sidera/orders';
import { isHex32, verifyPurchaseSignature } from '@/lib/sidera/randomness';
import { limited } from '@/lib/sidera/route-guards';

export const runtime = 'nodejs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Buys one listed capsule.
 *
 * The buyer names the capsule and the commitment they saw published, and
 * supplies a 32-byte nonce, fresh from their own random source. The response
 * carries the exact purchase message and its hash — the buyer's receipt that
 * this nonce, and no other, was accepted for this capsule. A signature over
 * that message by the wallet is recorded when sent, and is refused if it does
 * not verify. The capsule is the buyer's, and its nonce fixed, from here; it
 * is opened once the order is paid.
 */
export async function POST(req: NextRequest) {
  const p = paused();
  if (p) return p;
  const privyId = await verifyPrivy(req);
  if (!privyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const { walletAddress, capsuleId, commitment, nonce, signature } = body ?? {};
  if (typeof walletAddress !== 'string' || !isValidPublicKey(walletAddress)) {
    return NextResponse.json({ error: 'Valid walletAddress required' }, { status: 400 });
  }
  if (typeof capsuleId !== 'string' || !UUID.test(capsuleId)) return NextResponse.json({ error: 'capsuleId required' }, { status: 400 });
  if (!isHex32(commitment)) return NextResponse.json({ error: 'commitment must be 64 lowercase hex characters' }, { status: 400 });
  if (!isHex32(nonce)) return NextResponse.json({ error: 'nonce must be 64 lowercase hex characters' }, { status: 400 });
  if (signature !== undefined && typeof signature !== 'string') return NextResponse.json({ error: 'signature must be base58' }, { status: 400 });

  if (!(await assertOwnsWallet(privyId, walletAddress))) {
    return NextResponse.json({ error: 'Wallet does not match session' }, { status: 403 });
  }
  const l = await limited(sideraBuyRateLimit, walletAddress);
  if (l) return l;

  const recipient = merchantWallet();
  if (!recipient) return NextResponse.json({ error: 'Merchant wallet not configured' }, { status: 503 });
  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const listed = await readCapsule(db, capsuleId);
  if (!listed) return NextResponse.json({ error: 'Capsule not found' }, { status: 404 });
  if (signature) {
    const terms = { capsuleId, sequence: Number(listed.sequence), commitment, wallet: walletAddress, nonce };
    if (!verifyPurchaseSignature(terms, signature)) {
      return NextResponse.json({ error: 'The signature does not match the purchase message' }, { status: 400 });
    }
  }

  try {
    const amountSol = await gelToSol(Number(listed.price_gel));
    const reference = newPaymentReference();
    const result = await purchaseCapsule(db, {
      capsuleId,
      commitment,
      wallet: walletAddress,
      nonce,
      signature: signature ?? null,
      privyId,
      amountSol,
      paymentReference: reference,
    });
    if (!result.ok) {
      const status = result.reason === 'not_found' ? 404 : 409;
      const error = {
        not_found: 'Capsule not found',
        commitment_mismatch: 'That commitment is not this capsule’s',
        not_listed: 'This capsule is no longer on sale',
      }[result.reason];
      return NextResponse.json({ error }, { status });
    }
    return NextResponse.json({
      orderId: result.orderId,
      capsuleId,
      sequence: result.sequence,
      reference,
      url: paymentUrl({ recipient, amountSol, reference, label: `Capsule ${result.sequence}`, orderId: result.orderId }),
      amountSol,
      amountFiat: result.priceGel,
      currency: 'GEL',
      purchaseMessage: result.message,
      purchaseHash: result.purchaseHash,
      status: 'pending',
    });
  } catch (err) {
    console.error('[sidera/capsules/buy]', err);
    return NextResponse.json({ error: 'Could not reserve the capsule — please retry.' }, { status: 500 });
  }
}
