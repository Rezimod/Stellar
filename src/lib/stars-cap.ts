import { and, eq, gte, sum } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import type * as schema from '@/lib/schema'
import { observationLog } from '@/lib/schema'

// Unified Stars issuance caps, enforced across BOTH earning pipelines
// (/api/award-stars — quizzes/finds/check-ins/cosmic-bonus/challenges — and
// /api/observe/log — photo-verified observations). They share the same ledger
// (observation_log.stars), so the caps below bound a wallet's TOTAL issuance,
// not just one pathway.
//
// The monthly cap is the real lever. It bounds the maximum any wallet can earn
// so that buying gear entirely with Stars takes sustained, multi-month use: the
// cheapest telescope in the marketplace is ~14,500 Stars (see src/lib/dealers.ts),
// which at MONTHLY_STARS_CAP = 4000 is ~3.6 months of maxed-out earning. One
// month of grinding (≤ 4000) buys no telescope — by design. The daily cap just
// smooths issuance within a single day.
export const DAILY_STARS_CAP = 500
export const MONTHLY_STARS_CAP = 4000

const DAY_MS = 86_400_000
const MONTH_MS = 30 * DAY_MS

type Db = NeonHttpDatabase<typeof schema>

async function issuedSince(db: Db, wallet: string, since: Date): Promise<number> {
  const rows = await db
    .select({ total: sum(observationLog.stars) })
    .from(observationLog)
    .where(and(eq(observationLog.wallet, wallet), gte(observationLog.createdAt, since)))
  return Number(rows[0]?.total ?? 0)
}

/**
 * Stars this wallet may still be issued right now — the smaller of what's left
 * under the daily cap (since 00:00 UTC) and the trailing-30-day monthly cap.
 * Never negative. Callers clamp the reward they were about to mint to this.
 */
export async function remainingStarsAllowance(db: Db, wallet: string): Promise<number> {
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)
  const monthAgo = new Date(Date.now() - MONTH_MS)
  const [today, month] = await Promise.all([
    issuedSince(db, wallet, startOfDay),
    issuedSince(db, wallet, monthAgo),
  ])
  return Math.max(0, Math.min(DAILY_STARS_CAP - today, MONTHLY_STARS_CAP - month))
}
