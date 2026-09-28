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
import {
  exploreLedgerGame, exploreLedgerTarget, exploreStarsFor, isExploreAchievement,
} from '@/lib/games/explore';

// One Explore achievement, credited once per wallet for good. The game
// reports the id when the crew earns it; the server decides what it is worth
// (the catalogue in lib/games/explore.ts), claims the row in the shared
// Stars ledger so it counts against the same daily and monthly caps as every
// other reward path, and mints. A second report of the same id returns the
// first award rather than an error.
//
// The report is self-declared, as the other games' scores are: the ledger
// caps bound what a dishonest client can extract, and each id pays once.

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

  let body: { wallet?: unknown; achievement?: unknown };
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
  const achievement = body.achievement;
  if (!isExploreAchievement(achievement)) {
    return NextResponse.json({ error: 'Unknown achievement' }, { status: 400 });
  }
  const owns = await assertOwnsWallet(privyId, wallet);
  if (!owns) {
    return NextResponse.json({ error: 'Wallet does not match session' }, { status: 403 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
  }

  const utcDate = todayUtc();
  const target = exploreLedgerTarget(achievement);
  const game = exploreLedgerGame(achievement);
  // No date in the key: an achievement pays once, not once a day.
  const idemKey = `${target}:${wallet}`;

  let claimed = false;
  try {
    await db.insert(observationLog).values({
      wallet, target, stars: 0, confidence: 'pending', mintTx: idemKey, observedDate: utcDate,
    });
    claimed = true;
  } catch (err) {
    if ((err as { code?: string })?.code !== '23505') {
      return NextResponse.json({ error: 'Failed to record achievement' }, { status: 500 });
    }
    const existing = await db
      .select({ stars: gameDailyPlays.stars })
      .from(gameDailyPlays)
      .where(and(eq(gameDailyPlays.wallet, wallet), eq(gameDailyPlays.game, game)))
      .limit(1);
    return NextResponse.json({ achievement, starsAwarded: existing[0]?.stars ?? 0, alreadyAwarded: true });
  }

  const baseAmount = exploreStarsFor(achievement);
  const remaining = await remainingStarsAllowance(db, wallet);
  const amount = Math.max(0, Math.min(baseAmount, remaining));

  try {
    await db.insert(gameDailyPlays).values({ wallet, game, utcDate, score: 1, stars: amount });

    if (amount > 0) {
      const sig = await awardStarsOnChain(wallet, amount, target);
      if (!sig) throw new Error('Stars token not configured');
    }

    await db.update(observationLog)
      .set({ confidence: 'minted', stars: amount })
      .where(and(eq(observationLog.wallet, wallet), eq(observationLog.mintTx, idemKey)));

    return NextResponse.json({ achievement, starsAwarded: amount, alreadyAwarded: false });
  } catch (err) {
    console.error('[games/explore/complete]', err);
    // Release both rows so a genuine retry can re-claim.
    try {
      await db.delete(gameDailyPlays)
        .where(and(eq(gameDailyPlays.wallet, wallet), eq(gameDailyPlays.game, game)));
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
