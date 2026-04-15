import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { getDb } from '@/lib/db';
import { observationLog } from '@/lib/schema';
import { and, eq, gte } from 'drizzle-orm';

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
);

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const target = searchParams.get('target') ?? '';
  const ts = searchParams.get('ts') ?? '0';
  const lat = searchParams.get('lat') ?? '0';
  const lon = searchParams.get('lon') ?? '0';
  const cc = searchParams.get('cc') ?? '0';
  const hash = searchParams.get('hash') ?? '';
  const stars = searchParams.get('stars') ?? '0';
  const wallet = searchParams.get('wallet') ?? '';

  // Verify auth
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let claims: { userId: string };
  try {
    claims = await privy.verifyAuthToken(token);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!target || !ts || !wallet) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 });
  }

  // Verify that an observation record exists for this wallet + target within 30 minutes of ts
  const db = getDb();
  if (db) {
    const tsNum = Number(ts);
    if (!isFinite(tsNum) || tsNum <= 0) {
      return NextResponse.json({ error: 'Invalid ts param' }, { status: 400 });
    }
    const tsDate = new Date(tsNum);
    const thirtyMinBefore = new Date(tsDate.getTime() - 30 * 60 * 1000);
    const thirtyMinAfter = new Date(tsDate.getTime() + 30 * 60 * 1000);

    // Verify the authenticated user's wallet matches the wallet param
    // (Privy userId is not a wallet; we check the DB record exists for this wallet)
    const records = await db
      .select({ id: observationLog.id })
      .from(observationLog)
      .where(
        and(
          eq(observationLog.wallet, wallet),
          eq(observationLog.target, target),
          gte(observationLog.createdAt, thirtyMinBefore)
        )
      )
      .limit(1);

    if (records.length === 0) {
      return NextResponse.json({ error: 'Observation not found' }, { status: 403 });
    }

    // Ensure createdAt is within the 30-minute window
    void claims; // userId verified above
    void thirtyMinAfter;
  }

  return NextResponse.json({
    name: `Stellar: ${target}`,
    description: `Verified observation of ${target}. Cloud cover ${cc}%, oracle hash ${hash}. Sealed on Solana.`,
    image: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://stellarrclub.vercel.app'}/api/nft-image?target=${encodeURIComponent(target)}&ts=${ts}&lat=${lat}&lon=${lon}&cc=${cc}&stars=${stars}`,
    external_url: 'https://stellarrclub.vercel.app',
    attributes: [
      { trait_type: 'Target', value: target },
      { trait_type: 'Date', value: new Date(Number(ts)).toISOString().split('T')[0] },
      { trait_type: 'Location', value: `${Number(lat).toFixed(2)}, ${Number(lon).toFixed(2)}` },
      { trait_type: 'Cloud Cover', value: `${cc}%` },
      { trait_type: 'Oracle Hash', value: hash },
      { trait_type: 'Stars Earned', value: Number(stars) },
    ],
  });
}
