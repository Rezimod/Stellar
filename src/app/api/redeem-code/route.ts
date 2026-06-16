// POST /api/redeem-code — turn a confirmed Stars burn into a one-time code
// the user can present at the Astroman till.
//
// Flow:
//   1. Client burns Stars via /api/stars/burn (kind='redeem-code'), getting
//      back a confirmed burn signature.
//   2. Client posts here with { walletAddress, stars, burnSignature }.
//   3. Server verifies a matching stars_burns row exists (same wallet, same
//      amount, kind='redeem-code'). If yes, mints a 6-character code,
//      writes a redeem_codes row with 7-day expiry, returns the code + QR
//      payload.
//
// The actual cashier scan goes through POST /api/redeem-code/validate.

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { getDb } from '@/lib/db';
import { redeemCodes, starsBurns } from '@/lib/schema';
import { isValidPublicKey } from '@/lib/validate';
import { redeemRateLimit, checkRateLimit } from '@/lib/rate-limit';
import { starsToGEL } from '@/lib/stars-economy';
import { verifyPrivy, assertOwnsWallet } from '@/lib/api-auth';
import { paused } from '@/lib/kill-switch';

const CODE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// 6-char A-Z 2-9 (ambiguity-resistant alphabet — no I, O, 0, 1)
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(): string {
  const buf = randomBytes(6);
  let out = '';
  for (let i = 0; i < 6; i++) out += ALPHABET[buf[i] % ALPHABET.length];
  return out;
}

export async function POST(req: NextRequest) {
  const p = paused();
  if (p) return p;
  const privyId = await verifyPrivy(req);
  if (!privyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { walletAddress?: unknown; stars?: unknown; burnSignature?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const walletAddress = body.walletAddress;
  const stars = body.stars;
  const burnSignature = body.burnSignature;
  if (typeof walletAddress !== 'string' || !isValidPublicKey(walletAddress)) {
    return NextResponse.json({ error: 'Valid walletAddress required' }, { status: 400 });
  }
  const owns = await assertOwnsWallet(privyId, walletAddress);
  if (!owns) {
    return NextResponse.json({ error: 'Wallet does not match session' }, { status: 403 });
  }
  if (typeof stars !== 'number' || !Number.isInteger(stars) || stars <= 0) {
    return NextResponse.json({ error: 'stars must be a positive integer' }, { status: 400 });
  }
  if (typeof burnSignature !== 'string' || burnSignature.length < 10) {
    return NextResponse.json({ error: 'burnSignature required' }, { status: 400 });
  }

  const { success, remaining } = await checkRateLimit(redeemRateLimit, walletAddress);
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before trying again.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': String(remaining) } },
    );
  }

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  // Verify the burn happened: a stars_burns row with this signature, kind,
  // wallet, and amount must exist. (The /api/stars/burn route writes this
  // row only after on-chain confirmation.)
  const burns = await db
    .select()
    .from(starsBurns)
    .where(and(
      eq(starsBurns.signature, burnSignature),
      eq(starsBurns.walletAddress, walletAddress),
      eq(starsBurns.kind, 'redeem-code'),
    ))
    .limit(1);
  const burn = burns[0];
  if (!burn) {
    return NextResponse.json({ error: 'Burn not found — confirm the burn first' }, { status: 400 });
  }
  if (burn.amount !== stars) {
    return NextResponse.json({ error: `Burn amount mismatch (${burn.amount} ≠ ${stars})` }, { status: 400 });
  }

  // Idempotency: if a redeem code already exists for this burn signature,
  // return it. Lets a flaky network re-call this endpoint safely.
  const existing = await db
    .select()
    .from(redeemCodes)
    .where(eq(redeemCodes.burnSignature, burnSignature))
    .limit(1);
  if (existing.length > 0) {
    const r = existing[0];
    return NextResponse.json({
      code: r.code,
      gelValue: r.gelValue,
      starsBurned: r.starsBurned,
      expiresAt: r.expiresAt,
      cached: true,
    });
  }

  // Generate a unique code. Retry on the rare collision.
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  const gelValue = starsToGEL(stars);
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    try {
      const inserted = await db
        .insert(redeemCodes)
        .values({
          code,
          starsBurned: stars,
          gelValue,
          walletAddress,
          burnSignature,
          status: 'active',
          expiresAt,
        })
        .returning();
      return NextResponse.json({
        code: inserted[0].code,
        gelValue,
        starsBurned: stars,
        expiresAt: inserted[0].expiresAt,
      });
    } catch (err) {
      if ((err as { code?: string })?.code === '23505') continue; // unique violation, retry
      console.error('[redeem-code] DB insert failed', err);
      return NextResponse.json({ error: 'Could not generate code' }, { status: 500 });
    }
  }
  return NextResponse.json({ error: 'Could not generate a unique code, please retry' }, { status: 500 });
}

// GET — list active codes for the signed-in wallet (for "your codes" view).
export async function GET(req: NextRequest) {
  const privyId = await verifyPrivy(req);
  if (!privyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const wallet = req.nextUrl.searchParams.get('walletAddress');
  if (!wallet || !isValidPublicKey(wallet)) {
    return NextResponse.json({ error: 'walletAddress required' }, { status: 400 });
  }
  const owns = await assertOwnsWallet(privyId, wallet);
  if (!owns) {
    return NextResponse.json({ error: 'Wallet does not match session' }, { status: 403 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ codes: [] });

  const rows = await db
    .select()
    .from(redeemCodes)
    .where(eq(redeemCodes.walletAddress, wallet));

  // Lazy expiry — flag old active codes as expired on read so we don't need a cron.
  const now = Date.now();
  const codes = rows.map(r => ({
    ...r,
    status: r.status === 'active' && r.expiresAt.getTime() < now ? 'expired' : r.status,
  }));

  return NextResponse.json({ codes });
}
