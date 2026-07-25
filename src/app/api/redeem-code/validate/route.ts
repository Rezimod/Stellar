// POST /api/redeem-code/validate — Astroman cashier scans the QR / types
// the 6-character code at the till. This endpoint marks the code spent and
// returns its GEL value so the cashier can apply it as store credit.
//
// Auth: shared bearer secret (ASTROMAN_TILL_SECRET) — NOT a user Privy token.
// The Astroman till POS device is configured with this header.
//
// Status transitions: active → spent (this route) OR active → expired
// (lazily, on read, when expiresAt < now).

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { redeemCodes } from '@/lib/schema';

export async function POST(req: NextRequest) {
  const expected = process.env.ASTROMAN_TILL_SECRET;
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'Till secret not configured' }, { status: 503 });
  }

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const tokenBuf = Buffer.from(token ?? '');
  const expectedBuf = Buffer.from(expected);
  if (!token || tokenBuf.length !== expectedBuf.length || !timingSafeEqual(tokenBuf, expectedBuf)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: { code?: unknown; cashierId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const codeRaw = body.code;
  const cashierId = body.cashierId;
  if (typeof codeRaw !== 'string' || codeRaw.length === 0) {
    return NextResponse.json({ ok: false, error: 'code required' }, { status: 400 });
  }
  const code = codeRaw.toUpperCase().trim();

  const db = getDb();
  if (!db) return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 503 });

  const rows = await db.select().from(redeemCodes).where(eq(redeemCodes.code, code)).limit(1);
  const row = rows[0];
  if (!row) return NextResponse.json({ ok: false, error: 'Code not found' }, { status: 404 });

  // Lazy expiry
  if (row.status === 'active' && row.expiresAt.getTime() < Date.now()) {
    await db.update(redeemCodes).set({ status: 'expired' }).where(eq(redeemCodes.id, row.id));
    return NextResponse.json({ ok: false, error: 'Code expired', expiresAt: row.expiresAt }, { status: 410 });
  }
  if (row.status === 'spent') {
    return NextResponse.json({
      ok: false,
      error: 'Code already used',
      spentAt: row.spentAt,
      spentBy: row.spentBy,
    }, { status: 409 });
  }
  if (row.status !== 'active') {
    return NextResponse.json({ ok: false, error: `Code status: ${row.status}` }, { status: 400 });
  }

  // Atomic mark-spent: only update if still active.
  const updated = await db
    .update(redeemCodes)
    .set({
      status: 'spent',
      spentAt: new Date(),
      spentBy: typeof cashierId === 'string' && cashierId.length > 0 ? cashierId : 'till',
    })
    .where(eq(redeemCodes.id, row.id))
    .returning();
  if (updated.length === 0) {
    return NextResponse.json({ ok: false, error: 'Concurrent update — try again' }, { status: 409 });
  }

  return NextResponse.json({
    ok: true,
    gelValue: row.gelValue,
    starsBurned: row.starsBurned,
    walletAddress: row.walletAddress,
    code: row.code,
  });
}
