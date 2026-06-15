import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { observationLog } from '@/lib/schema';
import { and, eq, gte, sql } from 'drizzle-orm';
import { GLOBAL_MISSION } from '@/lib/missions-tonight';

// Community mission progress. current = seed + real observations of the target
// logged today (UTC). Degrades to the seed when the DB is unavailable so the
// card always renders something honest.
export async function GET() {
  const base = {
    target: GLOBAL_MISSION.target,
    goal: GLOBAL_MISSION.goal,
    bonusStars: GLOBAL_MISSION.bonusStars,
  };

  const db = getDb();
  if (!db) return NextResponse.json({ ...base, current: GLOBAL_MISSION.seed });

  try {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const rows = await db
      .select({ n: sql<number>`count(*)` })
      .from(observationLog)
      .where(and(eq(observationLog.target, GLOBAL_MISSION.target), gte(observationLog.createdAt, since)));
    const live = Number(rows[0]?.n ?? 0);
    return NextResponse.json({ ...base, current: GLOBAL_MISSION.seed + live });
  } catch (err) {
    console.error('[missions/global]', err);
    return NextResponse.json({ ...base, current: GLOBAL_MISSION.seed });
  }
}
