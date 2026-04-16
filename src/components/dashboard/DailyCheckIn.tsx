'use client'

import { useState, useEffect } from 'react'
import { Telescope, Check } from 'lucide-react'
import { hasCheckedInToday, saveCheckIn, getStreakDays } from '@/lib/daily-checkin'
import { getTierForStreak } from '@/lib/constellation-streak'
import MoonPhase from '@/components/shared/MoonPhase'
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
  const [justChecked, setJustChecked] = useState(false)

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
      setJustChecked(true)
      setStreak(getStreakDays())
      onCheckIn?.()
    } catch {
      saveCheckIn({ lat, lon })
      setChecked(true)
      setJustChecked(true)
      setStreak(getStreakDays())
      onCheckIn?.()
    } finally {
      setLoading(false)
    }
  }

  if (checked) {
    return (
      <>
        <style>{`
          @keyframes checkin-pop {
            0% { transform: scale(0.85); opacity: 0; }
            60% { transform: scale(1.04); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes checkin-glow {
            0%, 100% { box-shadow: 0 0 10px rgba(52,211,153,0.2); }
            50% { box-shadow: 0 0 22px rgba(52,211,153,0.45); }
          }
        `}</style>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 12px',
            borderRadius: 12,
            background: 'rgba(52,211,153,0.06)',
            border: '1px solid rgba(52,211,153,0.18)',
            animation: justChecked ? 'checkin-pop 0.4s cubic-bezier(0.22,1,0.36,1), checkin-glow 2s ease 0.4s infinite' : 'checkin-glow 3s ease infinite',
          }}
        >
          {/* Check icon */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(52,211,153,0.12)',
              border: '1.5px solid rgba(52,211,153,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Check size={13} color="#34D399" strokeWidth={2.5} />
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#34D399', fontFamily: 'var(--font-display)', display: 'block', lineHeight: 1.2 }}>
              Checked in today
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginTop: 1 }}>
              {skyScore ? `${skyScore.score}/100 · ${skyScore.grade}` : 'Come back tomorrow'}
            </span>
          </div>

          {/* Streak pill */}
          {streak > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                borderRadius: 9999,
                background: 'rgba(255,209,102,0.08)',
                border: '1px solid rgba(255,209,102,0.2)',
                flexShrink: 0,
              }}
            >
              {(() => {
                const tier = getTierForStreak(streak);
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MoonPhase phase={tier.phase} size={12} glow />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#FFD166', fontFamily: 'var(--font-display)' }}>
                      {tier.streak > 0 ? `${tier.name} · ${tier.multiplier}×` : `${streak} day streak`}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(56,240,255,0.4); }
          70% { box-shadow: 0 0 0 8px rgba(56,240,255,0); }
          100% { box-shadow: 0 0 0 0 rgba(56,240,255,0); }
        }
        @keyframes checkin-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-1px); }
        }
        .checkin-btn {
          animation: pulse-ring 2s ease infinite, checkin-float 3s ease infinite;
          transition: transform 0.15s ease, opacity 0.15s ease;
        }
        .checkin-btn:hover:not(:disabled) {
          transform: scale(1.04);
          animation: checkin-float 3s ease infinite;
        }
        .checkin-btn:active:not(:disabled) {
          transform: scale(0.97);
        }
      `}</style>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '8px 10px',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'rgba(56,240,255,0.06)',
              border: '1px solid rgba(56,240,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Telescope size={14} color="rgba(56,240,255,0.7)" />
          </div>
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', display: 'block', lineHeight: 1.2 }}>
              Tonight&apos;s Check-In
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Log tonight&apos;s sky</span>
          </div>
        </div>

        {/* Button */}
        <button
          onClick={handleCheckIn}
          disabled={loading}
          className="checkin-btn"
          style={{
            padding: '7px 14px',
            borderRadius: 9999,
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.65 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: '#0A0E1A',
            flexShrink: 0,
            backgroundSize: '200% auto',
            backgroundImage: loading
              ? 'linear-gradient(135deg, rgba(56,240,255,0.5), rgba(56,200,220,0.5))'
              : 'linear-gradient(135deg, #38F0FF 0%, #00D4FF 40%, #38F0FF 60%, #7BFAFF 100%)',
            animation: loading ? 'none' : 'pulse-ring 2s ease infinite, checkin-float 3s ease infinite, shimmer 2.5s linear infinite',
          }}
        >
          {loading ? (
            <>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  border: '2px solid rgba(0,0,0,0.2)',
                  borderTopColor: 'rgba(0,0,0,0.7)',
                  display: 'inline-block',
                  animation: 'spin 0.7s linear infinite',
                }}
              />
              Checking…
            </>
          ) : (
            <>
              <Telescope size={12} />
              Check In
            </>
          )}
        </button>
      </div>
    </>
  )
}
