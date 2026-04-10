import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { observationLog } from '@/lib/schema'
import { eq, desc } from 'drizzle-orm'

function streakBonusStars(streak: number): number {
  if (streak >= 30) return 100
  if (streak >= 14) return 50
  if (streak >= 7) return 25
  if (streak >= 3) return 10
  return 0
}

export async function GET(req: NextRequest) {
  const walletAddress = req.nextUrl.searchParams.get('walletAddress')
  if (!walletAddress) {
    return NextResponse.json({ error: 'walletAddress required' }, { status: 400 })
  }

  const db = getDb()
  if (!db) {
    return NextResponse.json({ streak: 0, todayCompleted: false, bonusStars: 0, totalObservations: 0 })
  }

  try {
    const rows = await db
      .select({ createdAt: observationLog.createdAt })
      .from(observationLog)
      .where(eq(observationLog.wallet, walletAddress))
      .orderBy(desc(observationLog.createdAt))
      .limit(60)

    const todayUTC = new Date().toISOString().slice(0, 10)
    const days = new Set(rows.map(r => r.createdAt?.toISOString().slice(0, 10) ?? ''))

    // Count consecutive days backwards from today.
    // If user hasn't observed today yet, start from yesterday so a morning
    // app open doesn't wipe out their running streak.
    let streak = 0
    const check = new Date()
    if (!days.has(check.toISOString().slice(0, 10))) {
      check.setDate(check.getDate() - 1)
    }
    while (true) {
      const key = check.toISOString().slice(0, 10)
      if (days.has(key)) {
        streak++
        check.setDate(check.getDate() - 1)
      } else {
        break
      }
    }

    return NextResponse.json({
      streak,
      todayCompleted: days.has(todayUTC),
      bonusStars: streakBonusStars(streak),
      totalObservations: rows.length,
    })
  } catch (err) {
    console.error('[streak]', err)
    return NextResponse.json({ streak: 0, todayCompleted: false, bonusStars: 0, totalObservations: 0 })
  }
}
