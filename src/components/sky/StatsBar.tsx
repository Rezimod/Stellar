'use client';

import { useState, useEffect } from 'react';
import { useAppState } from '@/hooks/useAppState';
import { getRank } from '@/lib/rewards';
import { Star, Target, Award } from 'lucide-react';

const TOTAL = 5;

export default function StatsBar() {
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
  const pct = (count / TOTAL) * 100;
  const allDone = count >= TOTAL;

  return (
    <div
      className="rounded-2xl overflow-hidden mb-6 animate-page-enter"
      style={{
        background: 'linear-gradient(135deg, rgba(255,209,102,0.06) 0%, rgba(15,20,40,0.8) 60%, rgba(56,240,255,0.04) 100%)',
        border: '1px solid rgba(255,209,102,0.15)',
        boxShadow: '0 0 40px rgba(255,209,102,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* Rank header */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,209,102,0.03)' }}
      >
        <div className="flex items-center gap-2">
          <Award size={13} className="text-[#FFD166]/60" />
          <span className="text-[10px] uppercase tracking-widest text-slate-600 font-medium">Observer Rank</span>
        </div>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-lg"
          style={{
            background: allDone ? 'rgba(52,211,153,0.1)' : 'rgba(255,209,102,0.08)',
            border: `1px solid ${allDone ? 'rgba(52,211,153,0.25)' : 'rgba(255,209,102,0.2)'}`,
            color: allDone ? '#34d399' : '#FFD166',
          }}
        >
          {rank.name}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x px-0 py-4" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        {[
          { icon: Target,   label: 'Observations', value: `${count}/${TOTAL}` },
          { icon: Star,     label: 'Stars',         value: `${totalStars} ✦` },
          { icon: Award,    label: 'Next rank',     value: count >= TOTAL ? 'Max' : `${TOTAL - count} left` },
        ].map((s, i) => (
          <div key={s.label} className="flex flex-col items-center gap-1 py-1" style={{ borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
            <p className="text-white font-bold text-lg leading-none">{s.value}</p>
            <p className="text-slate-700 text-[10px] uppercase tracking-widest">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Progress section */}
      <div className="px-5 pb-4 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex gap-2">
            {Array.from({ length: TOTAL }, (_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full transition-all duration-500"
                style={{
                  backgroundColor: i < count ? (allDone ? '#34d399' : '#FFD166') : 'rgba(255,255,255,0.08)',
                  boxShadow: i < count ? `0 0 6px ${allDone ? 'rgba(52,211,153,0.5)' : 'rgba(255,209,102,0.4)'}` : 'none',
                }}
              />
            ))}
          </div>
          <span className="text-[10px] text-slate-700">
            {allDone ? '✦ All complete' : `${TOTAL - count} remaining`}
          </span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${pct}%`,
              background: allDone
                ? 'linear-gradient(to right, #34d399, #22c55e)'
                : 'linear-gradient(to right, #CC9A33, #FFD166)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
