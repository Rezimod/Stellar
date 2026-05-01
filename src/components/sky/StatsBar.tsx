'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useAppState } from '@/hooks/useAppState';
import { getRank } from '@/lib/rewards';

const TOTAL = 5;

export default function StatsBar() {
  const { state } = useAppState();
  const { ready, authenticated, getAccessToken } = usePrivy();
  const completed = state.completedMissions.filter(m => m.status === 'completed');
  const totalStars = completed.reduce((sum, m) => sum + (m.stars ?? 0), 0);
  const localCount = completed.length;

  const [apiCount, setApiCount] = useState<number | null>(null);

  useEffect(() => {
    if (!state.walletAddress || !ready || !authenticated) return;
    let cancelled = false;
    getAccessToken().then(token => {
      if (cancelled || !token) return;
      fetch(`/api/observe/history?walletAddress=${encodeURIComponent(state.walletAddress!)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(d => { if (!cancelled) setApiCount((d.observations ?? []).length); })
        .catch(() => {});
    });
    return () => { cancelled = true; };
  }, [state.walletAddress, ready, authenticated, getAccessToken]);

  const count = apiCount ?? localCount;
  const rank = getRank(count);
  const pct = Math.min(100, (count / TOTAL) * 100);
  const allDone = count >= TOTAL;

  return (
    <div
      className="animate-page-enter"
      style={{
        borderRadius: 10,
        background: 'linear-gradient(135deg, rgba(232, 130, 107,0.04) 0%, rgba(15,20,40,0.55) 60%, transparent 100%)',
        border: '1px solid rgba(232, 130, 107,0.14)',
        padding: '10px 12px',
        marginBottom: 14,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 10,
              letterSpacing: '0.18em',
              color: 'rgba(255,255,255,0.45)',
              textTransform: 'uppercase',
            }}
          >
            Rank
          </span>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              fontWeight: 600,
              color: allDone ? 'var(--success)' : 'var(--stars)',
              letterSpacing: '-0.005em',
            }}
          >
            {rank.name}
          </span>
        </div>

        <div className="flex items-baseline gap-3 flex-shrink-0">
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11.5,
              fontWeight: 500,
              color: 'var(--text)',
              letterSpacing: '0.02em',
            }}
          >
            {count}/{TOTAL}
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 9.5, color: 'rgba(255,255,255,0.4)', marginLeft: 4, letterSpacing: '0.12em', textTransform: 'uppercase', fontStyle: 'italic' }}>
              obs
            </span>
          </span>
          <span
            className="flex items-baseline gap-1"
            style={{
              color: 'var(--stl-gold)',
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 600, letterSpacing: '0.02em' }}>
              {totalStars}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700 }}>✦</span>
          </span>
        </div>
      </div>

      <div
        className="mt-2 h-[2px] rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: allDone
              ? 'linear-gradient(to right, var(--seafoam), #22c55e)'
              : 'linear-gradient(to right, var(--terracotta), var(--terracotta))',
            boxShadow: `0 0 8px ${allDone ? 'rgba(94, 234, 212,0.4)' : 'rgba(232, 130, 107,0.5)'}`,
          }}
        />
      </div>
    </div>
  );
}
