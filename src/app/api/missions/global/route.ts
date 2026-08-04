import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { observationLog } from '@/lib/schema';
import { and, eq, gte, sql } from 'drizzle-orm';
import { GLOBAL_MISSION } from '@/lib/missions-tonight';

// Community mission progress. current = seed + real observations of the target
// since the mission opened. Degrades to the seed when the DB is unavailable so
// the card always renders something honest. sponsor/eventName are forwarded from
// GLOBAL_MISSION config so the UI can brand the card without a separate API.
export async function GET() {
  const base = {
    target: GLOBAL_MISSION.target,
    goal: GLOBAL_MISSION.goal,
    bonusStars: GLOBAL_MISSION.bonusStars,
    sponsor: GLOBAL_MISSION.sponsor,
    eventName: GLOBAL_MISSION.eventName,
  };

  const db = getDb();
  if (!db) return NextResponse.json({ ...base, current: GLOBAL_MISSION.seed });

  try {
    // Count observations from Aug 4 2026 (campaign launch) — not just today —
    // so the counter accumulates across the full Perseids window.
    const campaignStart = new Date('2026-08-04T00:00:00Z');
    const rows = await db
      .select({ n: sql<number>`count(*)` })
      .from(observationLog)
      .where(and(eq(observationLog.target, GLOBAL_MISSION.target), gte(observationLog.createdAt, campaignStart)));
    const live = Number(rows[0]?.n ?? 0);
    return NextResponse.json({ ...base, current: GLOBAL_MISSION.seed + live });
  } catch (err) {
    console.error('[missions/global]', err);
    return NextResponse.json({ ...base, current: GLOBAL_MISSION.seed });
  }
}
