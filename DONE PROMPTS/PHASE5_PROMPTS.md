## PHASE 5 — COMPETITIVE DIFFERENTIATORS ✅ COMPLETE (2026-04-12)

---

### PROMPT U15 — Social Share Cards (Observations go viral)

```
I'm building Stellar, a Next.js 15 astronomy app on Solana. I need a social share feature — when a user mints an observation NFT, they can share it to X (Twitter) or Farcaster. The share should generate a beautiful card image using the existing observation metadata.

Read these files FULLY before writing anything:
  src/components/sky/MissionActive.tsx (the 'done' step — where share button will go)
  src/app/nfts/page.tsx (NFT data shape)
  src/lib/types.ts (NFT/observation types)
  src/app/globals.css (CSS variables)

---

Step 1 — Create src/app/api/share/og/route.tsx:

This is a Next.js ImageResponse route (uses next/og) that generates a 1200x630 Open Graph image.

Query params:
  target: string (e.g. "Moon", "Jupiter")
  score: string (e.g. "78")
  grade: string (e.g. "Excellent")
  stars: string (e.g. "150")
  date: string (ISO)
  emoji: string (e.g. "🌙")

Check if next/og (ImageResponse) is available in this Next.js 15 project:
  import { ImageResponse } from 'next/og'
  If not available, skip this step and note it in a comment.

Image design (1200x630):
  Background: dark navy gradient (#050810 → #0D1117)
  Top-left: "STELLAR" wordmark (text-5xl font-bold, color: #38F0FF)
  Top-right: "stellarrclub.vercel.app" (text-xl, color: rgba(255,255,255,0.4))
  Center: large emoji (target) text-[120px]
  Below emoji: "{target} Observation" text-4xl font-bold white
  Score ring (CSS simulation — div with border-radius):
    Circular div, border 6px solid #38F0FF, width 100 height 100
    Inside: "{score}" text-3xl font-bold #38F0FF
  Grade: "{grade}" text-2xl color #34D399
  Bottom: "✦ {stars} Stars earned · Sealed on Solana" text-xl color rgba(255,255,255,0.6)
  Bottom-right: Solana logo color "#9945FF" with "Solana" text

Return new ImageResponse(jsx, { width: 1200, height: 630 })

---

Step 2 — Create src/lib/share.ts:

  export function buildShareImageUrl(params: {
    target: string, score: number, grade: string, stars: number, date: string, emoji: string
  }): string {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://stellarrclub.vercel.app'
    const q = new URLSearchParams({
      target: params.target,
      score: String(params.score),
      grade: params.grade,
      stars: String(params.stars),
      date: params.date,
      emoji: params.emoji,
    })
    return `${base}/api/share/og?${q}`
  }

  export function buildTwitterShareUrl(params: {
    target: string, score: number, grade: string, stars: number, appUrl: string
  }): string {
    const text = `I just sealed my ${params.target} observation on Stellar! Sky Score: ${params.score}/100 (${params.grade}) · Earned ✦${params.stars} Stars 🔭\n\n@StellarrClub #Solana #Astronomy`
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(params.appUrl)}`
  }

  export function buildFarcasterShareUrl(params: {
    target: string, score: number, stars: number, appUrl: string
  }): string {
    const text = `Sealed my ${params.target} observation on @StellarrClub! Sky Score ${params.score}/100 · ✦${params.stars} Stars earned on Solana`
    return `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(params.appUrl)}`
  }

---

Step 3 — Add share buttons to the 'done' success screen in MissionActive.tsx:

Read the 'done' step's current buttons. After the existing buttons, add:

  A "Share" row (flex gap-2, full width):

  X (Twitter) button:
    btn-ghost with Twitter bird icon (X icon or "𝕏" text) + "Share on X"
    onClick: window.open(buildTwitterShareUrl({...}), '_blank')

  If Farcaster button doesn't already exist:
    btn-ghost with "⬡ Farcaster" text, purple tint (border purple/30)
    onClick: window.open(buildFarcasterShareUrl({...}), '_blank')

  Pass mission data (target name, sky score, stars earned) from component state.

---

Verify: npm run build passes. Share URLs open correctly. No existing functionality broken.
```

---

### PROMPT U16 — Daily Sky Check-In (Daily Engagement Hook)

```
I'm building Stellar, a Next.js 15 astronomy app. DRiP has daily NFT drops. Moonwalk has daily step goals. Stellar needs a daily hook. I need a "Tonight's Sky Check-In" feature — users tap one button daily to log the conditions. Simple, quick, builds streak.

Read these files FULLY before writing anything:
  src/app/missions/page.tsx (understand page layout + auth + data patterns)
  src/components/ui/ (available components)
  src/lib/sky-score.ts
  src/lib/types.ts
  src/app/globals.css

This is a new feature. Keep it minimal — do not add to missions page if it already has a lot going on. Add it to the dashboard (src/components/dashboard/Dashboard.tsx) instead, as a new section.

---

Step 1 — Create src/lib/daily-checkin.ts:

  const CHECKIN_KEY = 'stellar-daily-checkins'

  export interface DailyCheckIn {
    date: string           // YYYY-MM-DD
    skyScore?: number
    skyGrade?: string
    lat?: number
    lon?: number
  }

  export function getTodayKey(): string {
    return new Date().toISOString().slice(0, 10)
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
    // Keep last 365 days
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

---

Step 2 — Create src/components/dashboard/DailyCheckIn.tsx:

'use client'

Props: { lat: number; lon: number; onCheckIn?: () => void }

State: checked (boolean), skyScore (SkyScoreResult | null), loading (boolean)

On mount: check hasCheckedInToday() → if yes, set checked=true, show "Checked in today" state.

UI — card-base p-4 (two states):

NOT CHECKED IN:
  Flex items-center justify-between
  Left: "🔭" text-2xl + flex col gap-0.5
    "Tonight's Check-In" text-sm font-semibold font-display
    "Log tonight's sky conditions" text-xs text-secondary
  Right: btn-primary "Check In" py-2 px-4 text-sm
    onClick:
      setLoading(true)
      fetch sky score from /api/sky/score?lat=&lon=
      saveCheckIn({ skyScore: result.score, skyGrade: result.grade, lat, lon })
      setChecked(true), setSkyScore(result), setLoading(false)
      onCheckIn?.()
  During loading: loading spinner inside button, disabled

CHECKED IN:
  Flex items-center gap-3
  Left: w-10 h-10 rounded-full bg-success-dim flex items-center justify-center text-success "✓" text-lg
  Center: flex col
    "Checked in today" text-sm font-semibold font-display text-success
    if skyScore: "{score}/100 · {grade}" text-xs text-secondary
    "Come back tomorrow to continue your streak" text-xs text-muted
  Right: badge-pill badge-success "{streak} day streak"

---

Step 3 — Integrate into Dashboard:

In src/components/dashboard/Dashboard.tsx:
  Import DailyCheckIn from '@/components/dashboard/DailyCheckIn'
  Import getStreakDays, hasCheckedInToday from '@/lib/daily-checkin'

  In state: add streakDays (initialize from getStreakDays())
  After check-in: refresh streakDays and update StreakBadge

  Add <DailyCheckIn lat={lat} lon={lon} onCheckIn={() => setStreakDays(getStreakDays())} />
  as SECTION 0 (very first section, before score ring) — or between score and forecast.

---

Verify: npm run build passes. Check-in state persists across refresh. Streak counts correctly.
```

---

## What was built

| Prompt | Files created / modified |
|---|---|
| U15 | `src/app/api/share/og/route.tsx`, `src/lib/share.ts`, `src/components/sky/MissionActive.tsx` |
| U16 | `src/lib/daily-checkin.ts`, `src/components/dashboard/DailyCheckIn.tsx`, `src/components/dashboard/Dashboard.tsx` |

Build: `npm run build` ✅ exit 0 — `/api/share/og` confirmed in route manifest.
