import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sideraLogRateLimit } from '@/lib/rate-limit';
import type { OpenedOutcome } from '@/lib/sidera/audit';
import { readLog } from '@/lib/sidera/capsule';
import { verifyCapsule } from '@/lib/sidera/randomness';
import { clientIp, limited } from '@/lib/sidera/route-guards';

export const runtime = 'nodejs';

/**
 * Re-runs the check on one opened capsule from its public log entries, and
 * returns every input so the same check can be run anywhere else.
 */
export async function GET(req: NextRequest) {
  const l = await limited(sideraLogRateLimit, clientIp(req));
  if (l) return l;
  const capsuleId = req.nextUrl.searchParams.get('capsuleId') ?? '';
  if (!/^[0-9a-f-]{36}$/.test(capsuleId)) return NextResponse.json({ error: 'capsuleId required' }, { status: 400 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const entries = (await readLog(db)).filter((r) => r.capsuleId === capsuleId);
  const opened = entries.find((e) => e.event === 'opened');
  if (!opened) return NextResponse.json({ capsuleId, entries, verification: null, note: 'Not opened yet' });

  const o = opened.outcome as OpenedOutcome;
  const inputs = {
    commitment: opened.commitment,
    secret: o.secret,
    nonce: opened.buyerNonce ?? '',
    capsuleId,
    pulls: o.pulls,
    supply: o.supply,
    draws: o.draws,
    oddsBps: o.oddsBps,
  };
  return NextResponse.json({ capsuleId, entries, inputs, verification: verifyCapsule(inputs) });
}
