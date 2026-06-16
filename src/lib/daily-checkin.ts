const CHECKIN_KEY = 'stellar-daily-checkins'

/** Base Stars for a daily check-in, before the streak multiplier. */
export const DAILY_CHECKIN_BASE_REWARD = 5

export interface DailyCheckIn {
  date: string        // YYYY-MM-DD
  skyScore?: number
  skyGrade?: string
  lat?: number
  lon?: number
}

export function getTodayKey(): string {
  return new Date().toLocaleDateString('sv')
}

export function getCheckIns(): DailyCheckIn[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(CHECKIN_KEY) ?? '[]') } catch { return [] }
}

export function hasCheckedInToday(): boolean {
  return getCheckIns().some(c => c.date === getTodayKey())
}

export function saveCheckIn(data: Omit<DailyCheckIn, 'date'>): void {
  const all = getCheckIns().filter(c => c.date !== getTodayKey())
  all.push({ ...data, date: getTodayKey() })
  const recent = all.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 365)
  localStorage.setItem(CHECKIN_KEY, JSON.stringify(recent))
}

/** Server-authoritative streak: given check-in dates (YYYY-MM-DD) in any order
 *  plus today's key, count consecutive days ending today. Pure — safe on the
 *  server (no localStorage). Today must be present in `dates` to count. */
export function streakFromDates(dates: string[], todayKey: string): number {
  const set = new Set(dates)
  let streak = 0
  const day = new Date(todayKey + 'T00:00:00Z')
  while (set.has(day.toISOString().slice(0, 10))) {
    streak++
    day.setUTCDate(day.getUTCDate() - 1)
  }
  return streak
}

export function getStreakDays(): number {
  const checkIns = getCheckIns().sort((a, b) => b.date.localeCompare(a.date))
  let streak = 0
  const today = getTodayKey()
  for (let i = 0; i < checkIns.length; i++) {
    const expected = new Date(today)
    expected.setDate(expected.getDate() - i)
    const expectedStr = expected.toISOString().slice(0, 10)
    if (checkIns[i]?.date === expectedStr) streak++
    else break
  }
  return streak
}
