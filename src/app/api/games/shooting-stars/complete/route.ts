import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { and, eq } from 'drizzle-orm';
import { verifyPrivy, assertOwnsWallet } from '@/lib/api-auth';
import { getDb } from '@/lib/db';
import { observationLog, gameDailyPlays } from '@/lib/schema';
import { awardStarsOnChain } from '@/lib/stars';
import { remainingStarsAllowance } from '@/lib/stars-cap';
import { paused } from '@/lib/kill-switch';
import { networkMisconfig } from '@/lib/network-guard';
import { scoreToStars, SHOOTING_STARS_MAX_STARS } from '@/lib/games/shooting-stars';

const GAME_ID = 'shooting_stars';

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  const p = paused();
  if (p) return p;
  const n = networkMisconfig();
  if (n) return n;

  const privyId = await verifyPrivy(req);
  if (!privyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { wallet?: unknown; score?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  let wallet: string;
  try {
    wallet = new PublicKey(body.wallet as string).toString();
  } catch {
    return NextResponse.json({ error: 'Invalid wallet' }, { status: 400 });
  }
  const owns = await assertOwnsWallet(privyId, wallet);
  if (!owns) {
    return NextResponse.json({ error: 'Wallet does not match session' }, { status: 403 });
  }

  // Server clamps score — client can send anything but it stays in valid range
  const score = Math.max(0, Math.min(99, Number.isInteger(body.score) ? (body.score as number) : 0));

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
  }

  const utcDate = todayUtc();
  const target = `game:${GAME_ID}`;
  const idemKey = `${target}:${wallet}:${utcDate}`;

  let claimed = false;
  try {
    await db.insert(observationLog).values({
      wallet, target, stars: 0, confidence: 'pending', mintTx: idemKey, observedDate: utcDate,
    });
    claimed = true;
  } catch (err) {
    if ((err as { code?: string })?.code !== '23505') {
      return NextResponse.json({ error: 'Failed to record play' }, { status: 500 });
    }
    const existing = await db
      .select({ score: gameDailyPlays.score, stars: gameDailyPlays.stars })
      .from(gameDailyPlays)
      .where(and(eq(gameDailyPlays.wallet, wallet), eq(gameDailyPlays.game, GAME_ID), eq(gameDailyPlays.utcDate, utcDate)))
      .limit(1);
    const row = existing[0];
    return NextResponse.json({ score: row?.score ?? 0, streak: null, starsAwarded: row?.stars ?? 0, alreadyPlayed: true });
  }

  const baseAmount = Math.min(scoreToStars(score), SHOOTING_STARS_MAX_STARS);
  const remaining = await remainingStarsAllowance(db, wallet);
  const amount = Math.max(0, Math.min(baseAmount, remaining));

  try {
    await db.insert(gameDailyPlays).values({ wallet, game: GAME_ID, utcDate, score, stars: amount });

    if (amount > 0) {
      const sig = await awardStarsOnChain(wallet, amount, target);
      if (!sig) throw new Error('Stars token not configured');
    }

    await db.update(observationLog)
      .set({ confidence: 'minted', stars: amount })
      .where(and(eq(observationLog.wallet, wallet), eq(observationLog.mintTx, idemKey)));

    return NextResponse.json({ score, streak: null, starsAwarded: amount, alreadyPlayed: false });
  } catch (err) {
    console.error('[games/shooting-stars/complete]', err);
    try {
      await db.delete(gameDailyPlays)
        .where(and(eq(gameDailyPlays.wallet, wallet), eq(gameDailyPlays.game, GAME_ID), eq(gameDailyPlays.utcDate, utcDate)));
    } catch { /* best-effort */ }
    if (claimed) {
      try {
        await db.delete(observationLog)
          .where(and(eq(observationLog.wallet, wallet), eq(observationLog.mintTx, idemKey)));
      } catch { /* best-effort */ }
    }
    return NextResponse.json({ error: 'Failed to award Stars' }, { status: 500 });
  }
}
