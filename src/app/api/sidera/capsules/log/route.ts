import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sideraLogRateLimit } from '@/lib/rate-limit';
import { auditLog } from '@/lib/sidera/audit';
import { readLog } from '@/lib/sidera/capsule';
import { clientIp, limited } from '@/lib/sidera/route-guards';

export const runtime = 'nodejs';

/**
 * The public capsule log, oldest first, and the audit of all of it: listing
 * gaps, capsules purchased and never opened, capsules voided after purchase,
 * and any opened capsule whose draws do not verify.
 */
export async function GET(req: NextRequest) {
  const l = await limited(sideraLogRateLimit, clientIp(req));
  if (l) return l;
  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const after = Number(req.nextUrl.searchParams.get('after') ?? 0);
  const rows = await readLog(db);
  return NextResponse.json({
    entries: rows.filter((r) => r.seq > (Number.isFinite(after) ? after : 0)),
    audit: auditLog(rows),
  });
}
