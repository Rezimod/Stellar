import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { paused } from '@/lib/kill-switch';
import { voidCapsule } from '@/lib/sidera/capsule';
import { isSideraAdmin } from '@/lib/sidera/route-guards';

export const runtime = 'nodejs';

/**
 * Withdraws an unopened, unpaid capsule. Admin or cron only. The secret is
 * revealed with the reason, and a capsule voided after purchase stays in the
 * public log as exactly that.
 */
export async function POST(req: NextRequest) {
  const p = paused();
  if (p) return p;
  if (!(await isSideraAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { capsuleId?: unknown; reason?: unknown } | null;
  const capsuleId = body?.capsuleId;
  const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 200) : '';
  if (typeof capsuleId !== 'string' || !/^[0-9a-f-]{36}$/.test(capsuleId)) {
    return NextResponse.json({ error: 'capsuleId required' }, { status: 400 });
  }
  if (!reason) return NextResponse.json({ error: 'reason required' }, { status: 400 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const result = await voidCapsule(db, { capsuleId, reason });
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: result.reason === 'not_found' ? 404 : 409 });
  return NextResponse.json({ voided: capsuleId });
}
