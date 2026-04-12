'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePrivy } from '@privy-io/react-auth'
import { useAppState } from '@/hooks/useAppState'
import { useAstronomerProfile } from '@/hooks/useAstronomerProfile'
import { useLocation } from '@/lib/location'
import PageTransition from '@/components/ui/PageTransition'
import ScoreRing from '@/components/ui/ScoreRing'
import StatCard from '@/components/ui/StatCard'
import ForecastStrip from '@/components/ui/ForecastStrip'
import type { ForecastDay } from '@/components/ui/ForecastStrip'
import StreakBadge from '@/components/ui/StreakBadge'
import LoadingRing from '@/components/ui/LoadingRing'
import type { SkyScoreResult } from '@/lib/sky-score'
import type { PlanetInfo } from '@/lib/planets'
import type { SkyDay } from '@/lib/sky-data'
import DailyCheckIn from '@/components/dashboard/DailyCheckIn'
import { getStreakDays } from '@/lib/daily-checkin'


const PLANET_EMOJI: Record<string, string> = {
  moon: '🌙',
  mercury: '☿',
  venus: '♀️',
  mars: '🔴',
  jupiter: '🪐',
  saturn: '🪐',
}

const PLANET_LABEL: Record<string, string> = {
  moon: 'Moon',
  mercury: 'Mercury',
  venus: 'Venus',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  if (h >= 17 && h < 21) return 'Good evening'
  return 'Good night'
}

function getRank(count: number): string {
  if (count >= 15) return 'Stellar'
  if (count >= 7) return 'Celestial'
  if (count >= 3) return 'Pathfinder'
  return 'Observer'
}

function skyDayToForecastDay(day: SkyDay): ForecastDay {
  const today = new Date().toISOString().slice(0, 10)
  // Average cloud cover from night hours (20–23 and 0–5)
  const nightHours = day.hours.filter((h) => {
    const hr = new Date(h.time).getHours()
    return hr >= 20 || hr < 5
  })
  const hoursToAvg = nightHours.length > 0 ? nightHours : day.hours
  const avgCloud = Math.round(
    hoursToAvg.reduce((s, h) => s + h.cloudCover, 0) / hoursToAvg.length
  )

  const badge: ForecastDay['badge'] = avgCloud < 30 ? 'go' : avgCloud < 65 ? 'maybe' : 'skip'
  const date = new Date(day.date + 'T12:00:00')
  const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' })

  return {
    date: day.date,
    dayLabel,
    cloudCover: avgCloud,
    badge,
    isToday: day.date === today,
  }
}

function fmtTime(val: string | Date | null): string {
  if (!val) return '–'
  try {
    const d = typeof val === 'string' ? new Date(val) : val
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  } catch {
    return '–'
  }
}

const FALLBACK_PLANETS = [
  { key: 'moon', rise: null },
  { key: 'jupiter', rise: null },
  { key: 'saturn', rise: null },
]

export default function Dashboard() {
  const { state } = useAppState()
  const { profile } = useAstronomerProfile()
  const { location } = useLocation()

  const [skyScore, setSkyScore] = useState<SkyScoreResult | null>(null)
  const [forecast, setForecast] = useState<ForecastDay[]>([])
  const [planets, setPlanets] = useState<PlanetInfo[]>([])
  const [streakDays, setStreakDays] = useState(0)
  const [loading, setLoading] = useState(true)

  const lat = profile?.location?.lat ?? (location.lat !== 0 ? location.lat : 41.6941)
  const lon = profile?.location?.lon ?? (location.lon !== 0 ? location.lon : 44.8337)

  useEffect(() => {
    setStreakDays(getStreakDays())
  }, [])

  useEffect(() => {
    let alive = true

    async function load() {
      setLoading(true)
      await Promise.all([
        fetch(`/api/sky/score?lat=${lat}&lon=${lon}`)
          .then((r) => r.json())
          .then((d) => { if (alive) setSkyScore(d) })
          .catch(() => {}),

        fetch(`/api/sky/forecast?lat=${lat}&lng=${lon}`)
          .then((r) => r.json())
          .then((days: SkyDay[]) => {
            if (alive && Array.isArray(days)) {
              setForecast(days.map(skyDayToForecastDay))
            }
          })
          .catch(() => {}),

        fetch(`/api/sky/planets?lat=${lat}&lng=${lon}`)
          .then((r) => r.json())
          .then((data: PlanetInfo[]) => { if (alive && Array.isArray(data)) setPlanets(data) })
          .catch(() => {}),
      ])
      if (alive) setLoading(false)
    }

    load()
    return () => { alive = false }
  }, [lat, lon])

  const missionsCount = state.completedMissions.length
  const starsBalance =
    state.completedMissions.reduce((s, m) => s + m.stars, 0) +
    (state.completedQuizzes ?? []).reduce((s, q) => s + q.stars, 0)
  const rankName = getRank(missionsCount)

  const displayPlanets = planets.length > 0
    ? planets.slice(0, 5)
    : (FALLBACK_PLANETS as { key: string; rise: null }[])

  if (loading) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LoadingRing message="Reading the sky..." />
      </div>
    )
  }

  return (
    <PageTransition>
      <div
        style={{
          maxWidth: 512,
          margin: '0 auto',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Section 0 — Daily Check-In */}
        <div className="animate-fade-in stagger-1">
          <DailyCheckIn
            lat={lat}
            lon={lon}
            onCheckIn={() => setStreakDays(getStreakDays())}
          />
        </div>

        {/* Section 1 — Greeting + ScoreRing */}
        <div className="animate-fade-in stagger-1">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-body)',
              }}
            >
              {getGreeting()}, {rankName}
            </span>
            <StreakBadge days={streakDays} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 16 }}>
            <ScoreRing
              value={skyScore?.score ?? 0}
              size={180}
              color="gradient"
              label="Sky Score"
              sublabel={skyScore?.grade ?? ''}
              animate
            />
            {skyScore && (
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)',
                  marginTop: 10,
                  textAlign: 'center',
                }}
              >
                {skyScore.emoji} {skyScore.grade}
              </p>
            )}
          </div>
        </div>

        {/* Section 2 — Forecast */}
        <div className="animate-slide-up stagger-2">
          <p
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontFamily: 'var(--font-display)',
              color: 'var(--text-secondary)',
              marginBottom: 8,
            }}
          >
            This Week
          </p>
          {forecast.length > 0 ? (
            <ForecastStrip days={forecast} />
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9999,
                    background: 'var(--border-subtle)',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Section 3 — Visible Tonight */}
        <div className="animate-slide-up stagger-3">
          <p
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontFamily: 'var(--font-display)',
              color: 'var(--text-secondary)',
              marginBottom: 8,
            }}
          >
            Visible Tonight
          </p>
          <div
            className="scroll-x scrollbar-hide"
            style={{ display: 'flex', gap: 8, overflowX: 'auto' }}
          >
            {displayPlanets.map((p) => {
              const pi = p as { key: string; rise?: Date | string | null; visible?: boolean }
              return (
                <div
                  key={pi.key}
                  className="card-base"
                  style={{
                    flexShrink: 0,
                    minWidth: 90,
                    padding: 12,
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 22 }}>
                    {PLANET_EMOJI[pi.key] ?? '✨'}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: 'var(--font-display)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {PLANET_LABEL[pi.key] ?? pi.key}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {pi.rise ? fmtTime(pi.rise as string | Date) : '–'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Section 4 — Stats */}
        <div
          className="animate-slide-up stagger-4"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}
        >
          <StatCard label="Missions" value={missionsCount} accentColor="var(--accent)" />
          <StatCard label="Stars ✦" value={starsBalance} accentColor="var(--stars)" />
          <StatCard label="Rank" value={rankName} accentColor="var(--accent)" />
        </div>

        {/* Section 5 — Quick Actions */}
        <div
          className="animate-slide-up stagger-5"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
        >
          <Link href="/missions" style={{ textDecoration: 'none' }}>
            <div
              className="btn-accent-ghost"
              style={{
                width: '100%',
                borderRadius: 'var(--radius-xl)',
                paddingTop: 12,
                paddingBottom: 12,
                textAlign: 'center',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              🔭 Start Mission
            </div>
          </Link>
          <Link href="/chat" style={{ textDecoration: 'none' }}>
            <div
              style={{
                width: '100%',
                borderRadius: 'var(--radius-xl)',
                paddingTop: 12,
                paddingBottom: 12,
                textAlign: 'center',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 48,
                background: 'var(--accent-dim)',
                border: '1px solid var(--accent-border)',
                color: 'var(--accent)',
              }}
            >
              ✦ Ask ASTRA
            </div>
          </Link>
        </div>
      </div>
    </PageTransition>
  )
}
