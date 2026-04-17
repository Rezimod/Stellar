import { NextRequest, NextResponse } from 'next/server';
import { mintCompressedNFT } from '@/lib/mint-nft';

export const maxDuration = 60; // Solana devnet confirmations can take 15-30s
import { PrivyClient } from '@privy-io/server-auth';
import { getDb } from '@/lib/db';
import { observationLog } from '@/lib/schema';
import { eq, and, gte, isNotNull } from 'drizzle-orm';
import { mintRateLimit, checkRateLimit } from '@/lib/rate-limit';

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userAddress, target, timestampMs, lat, lon, cloudCover, oracleHash, stars, rarity, demo } = body;

  const isDemoMint = demo === true;

  // Auth required for all requests; unauthenticated dev demo without wallet is the only exception
  const isDevNoWallet = process.env.NODE_ENV === 'development' && isDemoMint && !body.userAddress;
  if (!isDevNoWallet) {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
      await privy.verifyAuthToken(token);
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!target || typeof target !== 'string' || target.length === 0) {
    return NextResponse.json({ error: 'target is required' }, { status: 400 });
  }
  if (typeof timestampMs !== 'number' || !isFinite(timestampMs) || timestampMs <= 0) {
    return NextResponse.json({ error: 'timestampMs must be a positive finite number' }, { status: 400 });
  }
  if (typeof cloudCover !== 'number' || cloudCover < 0 || cloudCover > 100) {
    return NextResponse.json({ error: 'cloudCover must be 0–100' }, { status: 400 });
  }
  if (typeof lat !== 'number' || !isFinite(lat) || lat < -90 || lat > 90) {
    return NextResponse.json({ error: 'lat must be -90 to 90' }, { status: 400 });
  }
  if (typeof lon !== 'number' || !isFinite(lon) || lon < -180 || lon > 180) {
    return NextResponse.json({ error: 'lon must be -180 to 180' }, { status: 400 });
  }
  if (typeof stars !== 'number' || !Number.isInteger(stars) || stars < 0) {
    return NextResponse.json({ error: 'stars must be a positive integer' }, { status: 400 });
  }
  if (stars > 1000) {
    return NextResponse.json(
      { error: 'stars cannot exceed 1000 per observation' },
      { status: 400 }
    );
  }

  // Upstash rate limit: 2 mints per wallet per hour — skipped for demo missions
  if (!isDemoMint && userAddress) {
    const { success, remaining } = await checkRateLimit(mintRateLimit, userAddress);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before trying again.' },
        { status: 429, headers: { 'X-RateLimit-Remaining': String(remaining) } }
      );
    }
  }

  // Validate rarity
  const VALID_RARITIES = ['Common', 'Stellar', 'Astral', 'Celestial'] as const;
  const rarityVal = VALID_RARITIES.includes(rarity as typeof VALID_RARITIES[number]) ? (rarity as string) : 'Common';

  // DB rate limit: one NFT per wallet+target per hour — skipped for demo missions
  const db = getDb();
  if (!isDemoMint && db && userAddress) {
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
    } catch (err) {
      console.error('[mint] DB rate-limit check failed:', err);
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
    }
  }

  // No wallet + demo → return a plausible-looking txId (no real on-chain mint)
  if (!userAddress && isDemoMint) {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
    const mockTxId = Array.from({ length: 87 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    console.log('[mint] No wallet + demo — returning sim txId');
    return NextResponse.json({ txId: mockTxId, explorerUrl: `https://explorer.solana.com/tx/${mockTxId}?cluster=${process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'devnet'}` });
  }

  try {
    console.log('[mint] Starting mint for wallet:', userAddress ? userAddress.slice(0, 8) + '...' : 'unknown', 'target:', target);
    const { txId } = await mintCompressedNFT({ userAddress, target, timestampMs, lat, lon, cloudCover, oracleHash, stars, rarity: rarityVal });
    console.log('[mint] Success, txId:', txId.slice(0, 16) + '...');

    // Server-side log (non-blocking) — Stars are awarded by the client via /api/award-stars with idempotency
    // Skip DB log for demo mints to avoid polluting production records
    if (db && userAddress && !isDemoMint) {
      db.insert(observationLog).values({
        wallet: userAddress,
        target,
        stars,
        confidence: 'minted',
        mintTx: txId,
        observedDate: new Date().toISOString().split('T')[0],
      }).catch(err => console.error('[mint] db.insert failed:', err));
    }

    return NextResponse.json({ txId, explorerUrl: `https://explorer.solana.com/tx/${txId}?cluster=${process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'devnet'}` });
  } catch (err) {
    console.error('[mint] Bubblegum mint failed:', err);
    return NextResponse.json({ error: 'NFT minting failed — check server logs', txId: null }, { status: 500 });
  }
}
