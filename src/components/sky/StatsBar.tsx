'use client';

import { useState, useEffect } from 'react';
import { useAppState } from '@/hooks/useAppState';
import { getRank } from '@/lib/rewards';
import { Target, Flame } from 'lucide-react';
import { StarsCounter } from '@/components/ui/StarsCounter';
import { MISSIONS } from '@/lib/constants';

const TOTAL = MISSIONS.length;

interface StatsBarProps {
  streak?: number;
}

export default function StatsBar({ streak = 0 }: StatsBarProps) {
  const { state } = useAppState();
  const completed = state.completedMissions.filter(m => m.status === 'completed');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalStars = completed.reduce((sum, m) => sum + (m.stars ?? (m as any).points ?? 0), 0);
  const localCount = completed.length;
  const [apiCount, setApiCount] = useState<number | null>(null);

  useEffect(() => {
    if (!state.walletAddress) return;
    fetch(`/api/observe/history?walletAddress=${encodeURIComponent(state.walletAddress)}`)
      .then(r => r.json())
      .then(d => setApiCount((d.observations ?? []).length))
      .catch(() => {});
  }, [state.walletAddress]);

  const count = apiCount ?? localCount;
  const rank = getRank(count);
  const pctToNext = Math.min(Math.round((count / TOTAL) * 100), 100);
  const divider = { width: 1, height: 20, background: 'rgba(255,255,255,0.07)', flexShrink: 0 } as const;

  return (
    <div
      className="sticky z-[20] border-b"
      style={{
        top: 56,
        background: 'var(--color-panel-dark, #0A1628)',
        borderBottomColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <div className="max-w-2xl mx-auto overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-5 px-4 py-3 min-w-max">

          {/* Missions completed */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Target size={12} style={{ color: 'var(--color-nebula-teal, #38F0FF)' }} />
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.6875rem', fontFamily: 'var(--font-display)' }}>
              Missions
            </span>
            <span style={{ color: 'var(--color-text-primary)', fontSize: '0.8125rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {count}/{TOTAL}
            </span>
          </div>

          <div style={divider} />

          {/* Stars earned */}
          <div className="flex-shrink-0">
            <StarsCounter count={totalStars} size="sm" animated />
          </div>

          <div style={divider} />

          {/* Rank + progress */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.6875rem', fontFamily: 'var(--font-display)' }}>
              Rank
            </span>
            <span style={{ color: 'var(--color-star-gold, #FFD166)', fontSize: '0.8125rem', fontWeight: 700 }}>
              {rank.name}
            </span>
            <div style={{ width: 44, height: 4, borderRadius: 9999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${pctToNext}%`,
                background: 'linear-gradient(to right, #CC9A33, #FFD166)',
                borderRadius: 9999,
                transition: 'width 700ms ease-out',
              }} />
            </div>
          </div>

          <div style={divider} />

          {/* Streak */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Flame size={13} style={{ color: streak > 0 ? '#F59E0B' : 'rgba(255,255,255,0.2)' }} />
            <span style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: streak > 0 ? '#F59E0B' : 'var(--color-text-muted)',
            }}>
              {streak > 0 ? `${streak}d streak` : 'Start a streak!'}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
