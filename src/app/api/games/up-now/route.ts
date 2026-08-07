import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { DEFAULT_OBSERVER } from '@/lib/observer-location';
import {
  getDailyObjectIds, computeAltitude, getRiseSetHint, getIdentifyChoices,
  UP_NOW_BUCKET, DEEPSKY_PHOTO,
} from '@/lib/games/up-now';
import { getDb } from '@/lib/db';
import { gameDailyPlays } from '@/lib/schema';
import { verifyPrivy, getSessionWalletAddresses } from '@/lib/api-auth';
import { streakFromDates } from '@/lib/daily-checkin';

// Public — no auth required to preview today's puzzle. If a valid Privy
// session is attached, the response also reports whether that player has
// already played today (used by both the game page and the /missions card).
export async function GET(req: NextRequest) {
  const latRaw = req.nextUrl.searchParams.get('lat');
  const lonRaw = req.nextUrl.searchParams.get('lon');
  const latParsed = parseFloat(latRaw ?? '');
  const lonParsed = parseFloat(lonRaw ?? '');
  const latValid = isFinite(latParsed) && latParsed >= -90 && latParsed <= 90;
  const lonValid = isFinite(lonParsed) && lonParsed >= -180 && lonParsed <= 180;
  const lat = latValid ? latParsed : DEFAULT_OBSERVER.lat;
  const lon = lonValid ? lonParsed : DEFAULT_OBSERVER.lon;
  const isFallback = !(latValid && lonValid);

  const now = new Date();
  const utcDate = now.toISOString().slice(0, 10);
  const issuedAt = now.toISOString();

  const objectIds = getDailyObjectIds(utcDate);
  const questions = objectIds.map((id) => {
    const altitudeDeg = Math.round(computeAltitude(id, lat, lon, now) * 10) / 10;
    const kind = UP_NOW_BUCKET[id];
    return {
      id,
      kind,
      isUp: altitudeDeg > 0,
      altitudeDeg,
      hint: getRiseSetHint(id, lat, lon, now),
      photoUrl: kind === 'deepsky' ? DEEPSKY_PHOTO[id] : null,
      choices: kind === 'deepsky' ? getIdentifyChoices(id, utcDate) : null,
    };
  });

  // Best-effort — this is a convenience readout for the intro screen and the
  // /missions card, not the puzzle itself. A DB hiccup here (e.g. the
  // game_daily_plays migration not applied yet) must not break the response.
  let playedToday: { score: number; stars: number; streak: number } | null = null;
  try {
    const privyId = await verifyPrivy(req).catch(() => null);
    if (privyId) {
      const wallets = await getSessionWalletAddresses(privyId);
      const db = getDb();
      if (db && wallets.length) {
        const rows = await db
          .select({ score: gameDailyPlays.score, stars: gameDailyPlays.stars, utcDate: gameDailyPlays.utcDate })
          .from(gameDailyPlays)
          .where(and(
            inArray(gameDailyPlays.wallet, wallets),
            eq(gameDailyPlays.game, 'up_now'),
          ));
        const today = rows.find((r) => r.utcDate === utcDate);
        if (today) {
          const dates = rows.map((r) => r.utcDate).filter((d): d is string => typeof d === 'string');
          playedToday = { score: today.score, stars: today.stars, streak: streakFromDates(dates, utcDate) };
        }
      }
    }
  } catch (err) {
    console.error('[games/up-now] playedToday lookup failed', err);
  }

  return NextResponse.json({
    utcDate,
    issuedAt,
    locationUsed: { lat, lon, isFallback },
    questions,
    playedToday,
  });
}
