import { NextRequest, NextResponse } from 'next/server';
import { and, inArray, like } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { gameDailyPlays } from '@/lib/schema';
import { verifyPrivy, getSessionWalletAddresses } from '@/lib/api-auth';
import {
  EXPLORE_GAME_ID, EXPLORE_MAX_STARS, EXPLORE_ACHIEVEMENT_IDS, type ExploreProgress,
} from '@/lib/games/explore';

// What the platform has credited this player for Stellar Explore. Needs a
// Privy session: the records belong to the wallets it owns. Without one the
// answer is an empty progress, not an error — the /missions card and the
// game's mission panel both read this before the player has signed in.
export async function GET(req: NextRequest) {
  const empty: ExploreProgress = { credited: [], totalStars: 0, maxStars: EXPLORE_MAX_STARS };
  try {
    const privyId = await verifyPrivy(req).catch(() => null);
    if (!privyId) return NextResponse.json(empty);
    const wallets = await getSessionWalletAddresses(privyId);
    const db = getDb();
    if (!db || !wallets.length) return NextResponse.json(empty);
    const rows = await db
      .select({ game: gameDailyPlays.game, stars: gameDailyPlays.stars, createdAt: gameDailyPlays.createdAt })
      .from(gameDailyPlays)
      .where(and(inArray(gameDailyPlays.wallet, wallets), like(gameDailyPlays.game, `${EXPLORE_GAME_ID}:%`)));
    const prefix = `${EXPLORE_GAME_ID}:`;
    const byId = new Map<string, { stars: number; at: string }>();
    for (const r of rows) {
      const id = r.game.slice(prefix.length);
      if (!EXPLORE_ACHIEVEMENT_IDS.includes(id) || byId.has(id)) continue;
      byId.set(id, { stars: r.stars, at: r.createdAt.toISOString() });
    }
    const credited = EXPLORE_ACHIEVEMENT_IDS
      .filter((id) => byId.has(id))
      .map((id) => ({ id, ...byId.get(id)! }));
    const progress: ExploreProgress = {
      credited,
      totalStars: credited.reduce((sum, c) => sum + c.stars, 0),
      maxStars: EXPLORE_MAX_STARS,
    };
    return NextResponse.json(progress);
  } catch (err) {
    console.error('[games/explore] progress lookup failed', err);
    return NextResponse.json(empty);
  }
}
