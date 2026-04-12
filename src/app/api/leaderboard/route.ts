import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { observationLog } from '@/lib/schema'
import { sql, desc } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function GET() {
  const db = getDb()

  if (!db) {
    return NextResponse.json({ leaderboard: [] }, { status: 200 })
  }

  try {
    const rows = await db
      .select({
        wallet: observationLog.wallet,
        observations: sql<number>`count(*)::int`,
        total_stars: sql<number>`coalesce(sum(${observationLog.stars}), 0)::int`,
      })
      .from(observationLog)
      .where(sql`${observationLog.createdAt} > now() - interval '30 days'`)
      .groupBy(observationLog.wallet)
      .orderBy(desc(sql`sum(${observationLog.stars})`))
      .limit(20)

    return NextResponse.json(
      { leaderboard: rows },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, s-maxage=300' },
      }
    )
  } catch {
    return NextResponse.json({ leaderboard: [] }, { status: 200 })
  }
}
