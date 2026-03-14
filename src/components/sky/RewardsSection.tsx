'use client';

import { useState } from 'react';
import { useAppState } from '@/hooks/useAppState';
import { getUnlockedRewards, getRank, type Reward } from '@/lib/rewards';
import { MISSIONS } from '@/lib/constants';
import { Copy, Check, ExternalLink } from 'lucide-react';
import RewardIcon from '@/components/shared/RewardIcon';

type RewardWithStatus = Reward & { unlocked: boolean; progress: number };

function RewardCard({ reward, completedIds, claimed, onClaim }: {
  reward: RewardWithStatus;
  completedIds: string[];
  claimed: boolean;
  onClaim: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    if (!reward.code) return;
    navigator.clipboard.writeText(reward.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const borderColor = reward.unlocked
    ? 'border-[#34d399]/40'
    : reward.progress > 0
    ? 'border-amber-500/40'
    : 'border-[rgba(56, 240, 255, 0.12)]';

  const progressColor = reward.progress === 0
    ? 'bg-slate-600'
    : reward.progress < 1
    ? 'bg-amber-400'
    : 'bg-[#34d399]';

  return (
    <div className={`glass-card border ${borderColor} ${reward.unlocked ? 'glow-emerald' : ''} p-3.5 sm:p-5 flex flex-col gap-2.5 sm:gap-4 ${!reward.unlocked && reward.progress === 0 ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <RewardIcon emoji={reward.icon} />
          <div>
            <p className="font-semibold text-white text-sm">{reward.name}</p>
            <p className="text-slate-400 text-xs">{reward.description}</p>
          </div>
        </div>
        {reward.unlocked ? (
          <span className="text-[#34d399] text-xs font-semibold whitespace-nowrap">UNLOCKED</span>
        ) : reward.requiredMissions ? (
          <span className="text-slate-500 text-xs whitespace-nowrap">
            {reward.requiredMissions.filter(id => completedIds.includes(id)).length}/{reward.requiredMissions.length}
          </span>
        ) : null}
      </div>

      {/* Mission progress chips */}
      {reward.requiredMissions && (
        <div className="flex flex-wrap gap-1.5">
          {reward.requiredMissions.map(mId => {
            const m = MISSIONS.find(x => x.id === mId);
            const done = completedIds.includes(mId);
            return (
              <span key={mId} className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border ${done ? 'border-[#34d399]/50 text-[#34d399]' : 'border-[rgba(56, 240, 255, 0.12)] text-slate-500'}`}>
                {m?.emoji} {m?.name} {done ? '✓' : '○'}
              </span>
            );
          })}
        </div>
      )}

      {/* Progress bar */}
      <div className="reward-progress">
        <div className={`reward-progress-fill ${progressColor}`} style={{ width: `${Math.round(reward.progress * 100)}%` }} />
      </div>
      <p className="text-xs text-slate-500 -mt-2">{Math.round(reward.progress * 100)}%</p>

      {/* Code + claim when unlocked */}
      {reward.unlocked && reward.code && (
        <div className="mt-2">
          <p className="text-[var(--text-dim)] text-[10px] uppercase tracking-wider mb-1.5">Your Code</p>
          <div className="flex items-center gap-2">
            <code className="bg-[#070B14] border border-[#FFD166]/30 px-3 py-2 rounded-lg text-xs sm:text-sm text-[#FFD166] font-mono flex-1 tracking-wide">
              {reward.code}
            </code>
            <button onClick={copyCode} className="p-2.5 border border-[rgba(56,240,255,0.12)] hover:border-[#38F0FF] rounded-lg text-slate-400 hover:text-[#38F0FF] transition-all" title="Copy code">
              {copied ? <Check size={14} className="text-[#34d399]" /> : <Copy size={14} />}
            </button>
            <a href="https://astroman.ge" target="_blank" rel="noopener noreferrer" className="p-2.5 border border-[rgba(56,240,255,0.12)] hover:border-[#FFD166] rounded-lg text-slate-400 hover:text-[#FFD166] transition-all" title="Visit astroman.ge">
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}

      {reward.unlocked && (
        <button
          onClick={onClaim}
          disabled={claimed}
          className={`w-full text-xs py-2.5 px-3 rounded border transition-all ${claimed ? 'border-[#34d399]/30 text-[#34d399] cursor-default' : 'border-[#34d399]/50 text-[#34d399] hover:bg-[#34d399]/10'}`}
        >
          {claimed ? 'Claimed ✓' : 'Claim →'}
        </button>
      )}
    </div>
  );
}

export default function RewardsSection() {
  const { state, claimReward } = useAppState();
  const completedIds = state.completedMissions
    .filter(m => m.status === 'completed')
    .map(m => m.id);
  const rank = getRank(completedIds.length).name;
  const rewards = getUnlockedRewards(completedIds, rank);

  return (
    <div className="mt-3 mb-3">
      <p className="text-center text-slate-500 text-sm mb-4 tracking-widest uppercase">— Rewards —</p>
      <div className="flex flex-col gap-1.5 sm:gap-3">
        {rewards.map(r => (
          <RewardCard
            key={r.id}
            reward={r}
            completedIds={completedIds}
            claimed={state.claimedRewards.includes(r.id)}
            onClaim={() => claimReward(r.id)}
          />
        ))}
      </div>
    </div>
  );
}
