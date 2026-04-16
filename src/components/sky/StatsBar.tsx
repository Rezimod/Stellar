'use client';

import { useState, useEffect } from 'react';
import { useAppState } from '@/hooks/useAppState';
import { usePrivy } from '@privy-io/react-auth';
import { getRank } from '@/lib/rewards';
import { Award } from 'lucide-react';
import { getStarlight, MAX_STARLIGHT_VALUE } from '@/lib/starlight';
import { getTierForStreak } from '@/lib/constellation-streak';
import MoonPhase from '@/components/shared/MoonPhase';

const TOTAL = 5;

export default function StatsBar() {
  const { state } = useAppState();
  const { user } = usePrivy();
  const solanaWallet = user?.linkedAccounts.find(
    (a): a is Extract<typeof a, { type: 'wallet' }> =>
      a.type === 'wallet' && 'chainType' in a && (a as { chainType?: string }).chainType === 'solana'
  );
  const completed = state.completedMissions.filter(m => m.status === 'completed');
  const totalStars = completed.reduce((sum, m) => sum + (m.stars ?? 0), 0);
  const localCount = completed.length;

  const [apiCount, setApiCount] = useState<number | null>(null);
  const [starlight, setStarlight] = useState(MAX_STARLIGHT_VALUE);
  const [serverStreak, setServerStreak] = useState<number>(0);

  useEffect(() => {
    if (!state.walletAddress) return;
    fetch(`/api/observe/history?walletAddress=${encodeURIComponent(state.walletAddress)}`)
      .then(r => r.json())
      .then(d => setApiCount((d.observations ?? []).length))
      .catch(() => {});
  }, [state.walletAddress]);

  // Read server-authoritative streak
  useEffect(() => {
    if (!solanaWallet?.address) return;
    fetch(`/api/streak?walletAddress=${encodeURIComponent(solanaWallet.address)}`)
      .then(r => r.json())
      .then(d => setServerStreak(d.streak ?? 0))
      .catch(() => {});
  }, [solanaWallet?.address]);

  // Starlight — localStorage, refresh every 60s in case sunset passes
  useEffect(() => {
    setStarlight(getStarlight().remaining);
    const id = setInterval(() => setStarlight(getStarlight().remaining), 60000);
    return () => clearInterval(id);
  }, []);

  const count = apiCount ?? localCount;
  const rank = getRank(count);
  const pct = (count / TOTAL) * 100;
  const allDone = count >= TOTAL;
  const tier = getTierForStreak(serverStreak);

  return (
    <div
      className="rounded-2xl overflow-hidden mb-6 animate-page-enter"
      style={{
        background: 'linear-gradient(135deg, rgba(255,209,102,0.06) 0%, rgba(15,20,40,0.8) 60%, rgba(56,240,255,0.04) 100%)',
        border: '1px solid rgba(255,209,102,0.15)',
        boxShadow: '0 0 40px rgba(255,209,102,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* Top row: rank + Starlight dots */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,209,102,0.03)' }}
      >
        <div className="flex items-center gap-2">
          <Award size={13} className="text-[#FFD166]/60" />
          <span className="text-[10px] uppercase tracking-widest text-slate-600 font-medium">Observer Rank</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Starlight dots */}
          <div className="flex items-center gap-1" title={`${starlight} of ${MAX_STARLIGHT_VALUE} Starlight tonight`}>
            {Array.from({ length: MAX_STARLIGHT_VALUE }, (_, i) => (
              <div
                key={i}
                className={i < starlight ? 'animate-starlight' : ''}
                style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: i < starlight ? '#FFD166' : 'rgba(255,255,255,0.1)',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
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
      </div>

      {/* Stats row — 3 columns stays, but 3rd column swaps to Multiplier when streak > 0 */}
      <div className="grid grid-cols-3 divide-x px-0 py-4" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="flex flex-col items-center gap-1 py-1">
          <p className="text-white font-bold text-lg leading-none">{count}/{TOTAL}</p>
          <p className="text-slate-700 text-[10px] uppercase tracking-widest">Observations</p>
        </div>
        <div className="flex flex-col items-center gap-1 py-1" style={{ borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-white font-bold text-lg leading-none">{totalStars} ✦</p>
          <p className="text-slate-700 text-[10px] uppercase tracking-widest">Stars</p>
        </div>
        <div className="flex flex-col items-center gap-1 py-1" style={{ borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
          {tier.multiplier > 1 ? (
            <>
              <div className="flex items-center gap-1.5">
                <MoonPhase phase={tier.phase} size={16} glow />
                <p className="font-bold text-lg leading-none" style={{ color: '#FFD166' }}>{tier.multiplier}×</p>
              </div>
              <p className="text-slate-700 text-[10px] uppercase tracking-widest">{tier.name}</p>
            </>
          ) : (
            <>
              <p className="text-white font-bold text-lg leading-none">{count >= TOTAL ? 'Max' : `${TOTAL - count}`}</p>
              <p className="text-slate-700 text-[10px] uppercase tracking-widest">{count >= TOTAL ? 'Rank' : 'Next rank'}</p>
            </>
          )}
        </div>
      </div>

      {/* Streak progress to next tier (only shown if active streak) */}
      {tier.streak > 0 && tier.nextName && (
        <div className="px-5 pb-3 flex items-center gap-2 animate-multiplier-rise">
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (tier.streak / (tier.streak + tier.nightsToNext)) * 100)}%`,
                background: 'linear-gradient(to right, #A855F7, #FFD166)',
                transition: 'width 700ms var(--ease-out-expo)',
              }}
            />
          </div>
          <span className="text-[10px] text-slate-600 whitespace-nowrap">
            {tier.nightsToNext} night{tier.nightsToNext === 1 ? '' : 's'} to {tier.nextName}
          </span>
        </div>
      )}

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
              background: allDone ? 'linear-gradient(to right, #34d399, #22c55e)' : 'linear-gradient(to right, #CC9A33, #FFD166)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
