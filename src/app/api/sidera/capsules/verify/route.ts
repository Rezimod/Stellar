import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sideraLogRateLimit } from '@/lib/rate-limit';
import type { OpenedOutcome } from '@/lib/sidera/audit';
import { readFullLog } from '@/lib/sidera/capsule';
import { verifyCapsule } from '@/lib/sidera/randomness';
import { clientIp, isUuid, limited } from '@/lib/sidera/route-guards';

export const runtime = 'nodejs';

/**
 * Re-runs the check on one opened capsule from its public log entries, and
 * returns every input so the same check can be run anywhere else. The secret
 * is checked against the commitment published at listing — not the one the
 * 'opened' entry repeats — and the nonce against the one logged at purchase.
 */
export async function GET(req: NextRequest) {
  const l = await limited(sideraLogRateLimit, clientIp(req));
  if (l) return l;
  const capsuleId = req.nextUrl.searchParams.get('capsuleId') ?? '';
  if (!isUuid(capsuleId)) return NextResponse.json({ error: 'capsuleId required' }, { status: 400 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const entries = await readFullLog(db, { capsuleId });
  const listed = entries.find((e) => e.event === 'listed');
  const purchased = entries.find((e) => e.event === 'purchased');
  const opened = entries.find((e) => e.event === 'opened');
  if (!opened) return NextResponse.json({ capsuleId, entries, verification: null, note: 'Not opened yet' });
  if (!listed || !purchased) {
    return NextResponse.json({
      capsuleId,
      entries,
      verification: { ok: false, problems: [`the log has no '${listed ? 'purchased' : 'listed'}' entry for this capsule`] },
    });
  }

  const o = opened.outcome as OpenedOutcome;
  const inputs = {
    commitment: listed.commitment ?? '',
    secret: o.secret,
    nonce: purchased.buyerNonce ?? '',
    capsuleId,
    pulls: o.pulls,
    supply: o.supply,
    draws: o.draws,
    oddsBps: o.oddsBps,
  };
  return NextResponse.json({ capsuleId, entries, inputs, verification: verifyCapsule(inputs) });
}
