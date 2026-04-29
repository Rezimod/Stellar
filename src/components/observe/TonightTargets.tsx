'use client'

import { useState, useEffect } from 'react'
import type { DailyTarget } from '@/lib/daily-targets'
import { getTonightTargets } from '@/lib/daily-targets'

interface TonightTargetsProps {
  onStartObserve: () => void
  walletAddress: string | null
}

interface StreakData {
  streak: number
  todayCompleted: boolean
  bonusStars: number
  totalObservations: number
}

const DIFFICULTY_COLOR = {
  easy: 'bg-seafoam text-seafoam',
  medium: 'bg-terracotta text-terracotta',
  hard: 'bg-terracotta text-terracotta',
}

export default function TonightTargets({ onStartObserve, walletAddress }: TonightTargetsProps) {
  const [targets, setTargets] = useState<DailyTarget[]>([])
  const [streak, setStreak] = useState<StreakData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    function loadData(lat: number, lon: number) {
      getTonightTargets(lat, lon)
        .then(t => { if (!cancelled) setTargets(t) })
        .catch(() => {})
        .finally(async () => {
          if (walletAddress) {
            try {
              const res = await fetch(`/api/streak?walletAddress=${encodeURIComponent(walletAddress)}`)
              if (res.ok && !cancelled) setStreak(await res.json())
            } catch { /* ignore */ }
          }
          if (!cancelled) setLoading(false)
        })
    }

    navigator.geolocation.getCurrentPosition(
      pos => loadData(pos.coords.latitude, pos.coords.longitude),
      ()   => loadData(41.72, 44.83),
      { timeout: 5000 }
    )

    return () => { cancelled = true }
  }, [walletAddress])

  if (loading || targets.length === 0) return null

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-text-primary font-semibold" style={{ fontFamily: 'Georgia, serif' }}>Tonight's Targets</p>
        {streak && streak.streak > 0 && (
          <>
            <span className="text-terracotta text-xs ml-1">🔥 {streak.streak} day streak</span>
            {streak.bonusStars > 0 && (
              <span className="text-[var(--terracotta)] text-xs">+{streak.bonusStars} ✦ bonus</span>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {targets.map(t => (
          <button
            key={t.id}
            onClick={onStartObserve}
            className="flex items-center gap-3 rounded-xl p-4 text-left w-full transition-colors hover:bg-[var(--surface)]]"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <span className="text-2xl flex-shrink-0">{t.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-text-primary font-semibold text-sm">{t.name}</p>
              <p className="text-text-muted text-xs mt-0.5 line-clamp-1">{t.description}</p>
              <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${DIFFICULTY_COLOR[t.difficulty]}`}>
                {t.difficulty}
              </span>
            </div>
            <div className="flex flex-col items-end flex-shrink-0">
              <span className="text-sm font-bold" style={{ color: 'var(--stars)' }}>+{t.bonusStars} ✦</span>
              {!t.available && (
                <span className="text-negative text-[10px] mt-0.5">Below horizon</span>
              )}
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onStartObserve}
        className="w-full py-3.5 rounded-xl text-black font-bold text-sm transition-all active:scale-[0.98] hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, var(--terracotta), var(--terracotta))' }}
      >
        Observe Now
      </button>
    </div>
  )
}
