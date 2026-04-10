import { NextRequest, NextResponse } from 'next/server';
import { mintCompressedNFT } from '@/lib/mint-nft';
import { getDb } from '@/lib/db';
import { observationLog } from '@/lib/schema';
import { eq, and, gte, isNotNull } from 'drizzle-orm';
import { awardStarsOnChain } from '../observe/log/route';

export async function POST(req: NextRequest) {
  const secret = process.env.INTERNAL_API_SECRET;
  const authHeader = req.headers.get('authorization');
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { userAddress, target, timestampMs, lat, lon, cloudCover, oracleHash, stars } = body;

  if (!target || typeof target !== 'string' || target.length === 0) {
    return NextResponse.json({ error: 'target is required' }, { status: 400 });
  }
  if (typeof timestampMs !== 'number' || !isFinite(timestampMs) || timestampMs <= 0) {
    return NextResponse.json({ error: 'timestampMs must be a positive finite number' }, { status: 400 });
  }
  if (typeof cloudCover !== 'number' || cloudCover < 0 || cloudCover > 100) {
    return NextResponse.json({ error: 'cloudCover must be 0–100' }, { status: 400 });
  }
  if (cloudCover > 70) {
    return NextResponse.json({ error: 'Sky too cloudy', cloudCover }, { status: 400 });
  }
  if (typeof lat !== 'number' || !isFinite(lat) || lat < -90 || lat > 90) {
    return NextResponse.json({ error: 'lat must be -90 to 90' }, { status: 400 });
  }
  if (typeof lon !== 'number' || !isFinite(lon) || lon < -180 || lon > 180) {
    return NextResponse.json({ error: 'lon must be -180 to 180' }, { status: 400 });
  }
  if (typeof stars !== 'number' || !Number.isInteger(stars) || stars <= 0) {
    return NextResponse.json({ error: 'stars must be a positive integer' }, { status: 400 });
  }

  // Rate limit: one NFT per wallet+target per hour
  const db = getDb();
  if (db && userAddress) {
    try {
      const oneHourAgo = new Date(Date.now() - 3600_000);
      const recent = await db
        .select({ id: observationLog.id })
        .from(observationLog)
        .where(
          and(
            eq(observationLog.wallet, userAddress),
            eq(observationLog.target, target),
            gte(observationLog.createdAt, oneHourAgo),
            isNotNull(observationLog.mintTx)
          )
        )
        .limit(1);
      if (recent.length > 0) {
        return NextResponse.json({ error: 'Already minted this target recently' }, { status: 429 });
      }
    } catch {
      // DB check failure is non-fatal — allow the mint to proceed
    }
  }

  try {
    const { txId } = await mintCompressedNFT({ userAddress, target, timestampMs, lat, lon, cloudCover, oracleHash, stars });

    // Server-side log + award (non-blocking)
    if (db && userAddress) {
      db.insert(observationLog).values({
        wallet: userAddress,
        target,
        stars,
        confidence: 'minted',
        mintTx: txId,
      }).catch(err => console.error('[mint] db.insert failed:', err));

      awardStarsOnChain(userAddress, stars, target).catch(err =>
        console.error('[mint] award-stars failed:', err)
      );
    }

    return NextResponse.json({ txId, explorerUrl: `https://explorer.solana.com/tx/${txId}?cluster=devnet` });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[mint] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
