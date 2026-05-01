import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { marketCashouts } from '@/lib/schema';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');
  if (!address) {
    return NextResponse.json({ error: 'address required' }, { status: 400 });
  }
  const db = getDb();
  if (!db) return NextResponse.json({ cashouts: [] });
  try {
    const rows = await db
      .select()
      .from(marketCashouts)
      .where(eq(marketCashouts.wallet, address));
    return NextResponse.json({ cashouts: rows });
  } catch (err) {
    console.error('[markets/cashouts]', err);
    return NextResponse.json({ cashouts: [] });
  }
}
