'use client'

import { useState, useEffect } from 'react'
import { hasCheckedInToday, saveCheckIn, getStreakDays } from '@/lib/daily-checkin'
import type { SkyScoreResult } from '@/lib/sky-score'

interface DailyCheckInProps {
  lat: number
  lon: number
  onCheckIn?: () => void
}

export default function DailyCheckIn({ lat, lon, onCheckIn }: DailyCheckInProps) {
  const [checked, setChecked] = useState(false)
  const [skyScore, setSkyScore] = useState<SkyScoreResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    setChecked(hasCheckedInToday())
    setStreak(getStreakDays())
  }, [])

  async function handleCheckIn() {
    setLoading(true)
    try {
      const res = await fetch(`/api/sky/score?lat=${lat}&lon=${lon}`)
      const result: SkyScoreResult = await res.json()
      saveCheckIn({ skyScore: result.score, skyGrade: result.grade, lat, lon })
      setSkyScore(result)
      setChecked(true)
      setStreak(getStreakDays())
      onCheckIn?.()
    } catch {
      // Save without score data on failure
      saveCheckIn({ lat, lon })
      setChecked(true)
      setStreak(getStreakDays())
      onCheckIn?.()
    } finally {
      setLoading(false)
    }
  }

  if (checked) {
    return (
      <div
        className="card-base"
        style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(52,211,153,0.1)',
            border: '1px solid rgba(52,211,153,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: '#34D399',
            fontSize: 18,
          }}
        >
          ✓
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'var(--font-display)',
              color: '#34D399',
            }}
          >
            Checked in today
          </span>
          {skyScore && (
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {skyScore.score}/100 · {skyScore.grade}
            </span>
          )}
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Come back tomorrow to continue your streak
          </span>
        </div>
        <div
          style={{
            padding: '4px 10px',
            borderRadius: 9999,
            background: 'rgba(52,211,153,0.1)',
            border: '1px solid rgba(52,211,153,0.25)',
            color: '#34D399',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'var(--font-display)',
            whiteSpace: 'nowrap',
          }}
        >
          {streak} day streak
        </div>
      </div>
    )
  }

  return (
    <div
      className="card-base"
      style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 24 }}>🔭</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'var(--font-display)',
              color: 'var(--text-primary)',
            }}
          >
            Tonight&apos;s Check-In
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
            Log tonight&apos;s sky conditions
          </span>
        </div>
      </div>
      <button
        onClick={handleCheckIn}
        disabled={loading}
        style={{
          padding: '8px 16px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--gradient-accent)',
          color: 'var(--bg-base)',
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'var(--font-display)',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {loading ? (
          <>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                border: '2px solid rgba(0,0,0,0.3)',
                borderTopColor: 'rgba(0,0,0,0.8)',
                display: 'inline-block',
                animation: 'spin 0.7s linear infinite',
              }}
            />
            Checking...
          </>
        ) : (
          'Check In'
        )}
      </button>
    </div>
  )
}
