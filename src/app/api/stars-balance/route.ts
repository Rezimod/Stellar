import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getStarsBalance } from '@/lib/solana';
import { isValidPublicKey } from '@/lib/validate';
import { getDb } from '@/lib/db';
import { observationLog } from '@/lib/schema';

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');
  if (!address || !isValidPublicKey(address)) {
    return NextResponse.json({ balance: 0, lifetimeEarned: 0, lifetimeBurned: 0 });
  }

  const balance = await getStarsBalance(address).catch(() => 0);

  // lifetimeEarned: sum of all observation_log.stars rows for this wallet.
  // lifetimeBurned: filled by stars_burns aggregate after §4 ships; 0 for now.
  let lifetimeEarned = 0;
  const db = getDb();
  if (db) {
    try {
      const rows = await db
        .select({ stars: observationLog.stars })
        .from(observationLog)
        .where(eq(observationLog.wallet, address));
      lifetimeEarned = rows.reduce((sum, r) => sum + (r.stars ?? 0), 0);
    } catch {
      lifetimeEarned = 0;
    }
  }

  return NextResponse.json({
    balance,
    lifetimeEarned,
    lifetimeBurned: 0,
  });
}
