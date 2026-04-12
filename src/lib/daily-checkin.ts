const CHECKIN_KEY = 'stellar-daily-checkins'

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
