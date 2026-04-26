'use client';

import { useState } from 'react';
import { useAppState } from '@/hooks/useAppState';
import { getUnlockedRewards, getRank } from '@/lib/rewards';
import { MISSIONS } from '@/lib/constants';
import { Copy, Check, Lock, Unlock } from 'lucide-react';

export default function RewardsSection() {
  const { state, claimReward } = useAppState();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const completedIds = state.completedMissions
    .filter(m => m.status === 'completed')
    .map(m => m.id);
  const rank = getRank(completedIds.length).name;
  const rewards = getUnlockedRewards(completedIds, rank);

  const copyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="ornament-line flex-1" />
        <span className="text-[10px] text-slate-600 uppercase tracking-widest font-medium whitespace-nowrap">Rewards</span>
        <div className="ornament-line flex-1" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {rewards.map(r => {
          const isOpen = expanded === r.id;
          const claimed = state.claimedRewards.includes(r.id);
          const pct = Math.round(r.progress * 100);

          const progressColor = r.unlocked
            ? 'var(--success)'
            : r.progress > 0
            ? 'var(--stars)'
            : 'rgba(148,163,184,0.3)';

          return (
            <div
              key={r.id}
              className={`rounded-xl overflow-hidden transition-all duration-200 ${isOpen ? 'col-span-2' : ''}`}
              style={{
                background: r.unlocked
                  ? 'linear-gradient(135deg, rgba(52,211,153,0.06), rgba(15,31,61,0.4))'
                  : 'rgba(15,31,61,0.35)',
                border: r.unlocked
                  ? '1px solid rgba(52,211,153,0.2)'
                  : '1px solid rgba(255,255,255,0.05)',
                opacity: !r.unlocked && r.progress === 0 ? 0.5 : 1,
              }}
            >
              {/* Tile (collapsed header) */}
              <button
                className="relative w-full flex flex-col justify-between text-left p-2.5"
                style={{ minHeight: '88px' }}
                onClick={() => setExpanded(isOpen ? null : r.id)}
              >
                {/* Top-right badges */}
                <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                  {r.unlocked && !claimed && (
                    <span className="text-[7.5px] font-bold text-[#34d399] bg-[#34d399]/10 border border-[#34d399]/20 px-1 py-0.5 rounded-full uppercase tracking-wider">
                      Unlocked
                    </span>
                  )}
                  {claimed && (
                    <span className="text-[7.5px] font-bold text-slate-500 bg-slate-500/10 border border-slate-500/20 px-1 py-0.5 rounded-full uppercase tracking-wider">
                      Claimed
                    </span>
                  )}
                  {r.unlocked
                    ? <Unlock size={9} className="text-[#34d399] opacity-60" />
                    : <Lock size={9} className="text-slate-600" />
                  }
                </div>

                {/* Top: icon + name */}
                <div className="flex items-center gap-2">
                  <div
                    className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-base"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {r.icon}
                  </div>
                  <div className={`text-[11.5px] font-semibold leading-tight truncate ${r.unlocked ? 'text-white' : 'text-slate-400'}`}>
                    {r.name}
                  </div>
                </div>

                {/* Bottom: progress bar + pct */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: progressColor }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-600 flex-shrink-0">{pct}%</span>
                </div>
              </button>

              {/* Expanded panel */}
              {isOpen && (
                <div className="px-4 pb-4 pt-0 border-t border-white/5">
                  <p className="text-slate-500 text-xs mb-3 mt-3">{r.description}</p>

                  {/* Required missions chips (shown when locked) */}
                  {!r.unlocked && r.requiredMissions && (
                    <div className="flex gap-1 mb-3 flex-wrap">
                      {r.requiredMissions.map(mId => {
                        const m = MISSIONS.find(x => x.id === mId);
                        const done = completedIds.includes(mId);
                        return (
                          <span
                            key={mId}
                            className="text-[9px] px-1.5 py-0.5 rounded-full border"
                            style={{
                              borderColor: done ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.06)',
                              color: done ? 'var(--success)' : '#4a5568',
                            }}
                          >
                            {m?.emoji} {done ? '✓' : '○'}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {r.unlocked && r.code && (
                    <div className="flex items-center gap-2">
                      <code
                        className="flex-1 px-3 py-2.5 rounded-xl text-sm font-mono tracking-widest"
                        style={{
                          background: 'rgba(7,11,20,0.8)',
                          border: '1px solid rgba(255,209,102,0.2)',
                          color: 'var(--stars)',
                        }}
                      >
                        {r.code}
                      </code>
                      <button
                        onClick={() => copyCode(r.id, r.code!)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                        style={{
                          background: 'rgba(99,102,241,0.06)',
                          border: '1px solid rgba(99,102,241,0.15)',
                          color: copied === r.id ? 'var(--success)' : '#64748b',
                        }}
                      >
                        {copied === r.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                      <a
                        href="https://astroman.ge"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-10 px-3 rounded-xl flex items-center text-xs font-semibold transition-all hover:opacity-80"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255,209,102,0.15), rgba(255,209,102,0.08))',
                          border: '1px solid rgba(255,209,102,0.25)',
                          color: 'var(--stars)',
                        }}
                      >
                        Redeem →
                      </a>
                    </div>
                  )}
                  {r.unlocked && !claimed && (
                    <button
                      onClick={() => claimReward(r.id)}
                      className="w-full mt-2 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80"
                      style={{
                        background: 'rgba(52,211,153,0.08)',
                        border: '1px solid rgba(52,211,153,0.2)',
                        color: 'var(--success)',
                      }}
                    >
                      Mark as Claimed ✓
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
