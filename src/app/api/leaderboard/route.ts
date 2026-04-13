import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { observationLog } from '@/lib/schema'
import { sql, desc, gte } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const db = getDb()

  if (!db) {
    return NextResponse.json({ leaderboard: [] }, { status: 200 })
  }

  const period = req.nextUrl.searchParams.get('period') ?? 'month'

  try {
    const baseQuery = db
      .select({
        wallet: observationLog.wallet,
        observations: sql<number>`count(*)::int`,
        total_stars: sql<number>`coalesce(sum(${observationLog.stars}), 0)::int`,
      })
      .from(observationLog)

    const rows = await (period === 'all'
      ? baseQuery
      : baseQuery.where(
          gte(
            observationLog.createdAt,
            new Date(Date.now() - (period === 'week' ? 7 : 30) * 24 * 60 * 60 * 1000)
          )
        )
    )
      .groupBy(observationLog.wallet)
      .orderBy(desc(sql`sum(${observationLog.stars})`))
      .limit(50)

    return NextResponse.json(
      { leaderboard: rows },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
      }
    )
  } catch {
    return NextResponse.json({ leaderboard: [] }, { status: 200 })
  }
}
