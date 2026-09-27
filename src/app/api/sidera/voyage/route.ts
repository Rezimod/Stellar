import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sideraLogRateLimit } from '@/lib/rate-limit';
import { holderView } from '@/lib/sidera/repo';
import { clientIp, limited } from '@/lib/sidera/route-guards';
import { destinationsFor } from '@/lib/sidera/voyage';
import { isValidPublicKey } from '@/lib/validate';

export const runtime = 'nodejs';

/** Where a holder's cards take them in Voyage. Public, like the Collection page. */
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet') ?? '';
  if (!isValidPublicKey(wallet)) return NextResponse.json({ error: 'Valid wallet required' }, { status: 400 });
  const l = await limited(sideraLogRateLimit, clientIp(req));
  if (l) return l;
  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  return NextResponse.json({ destinations: destinationsFor(await holderView(db, wallet)) });
}
