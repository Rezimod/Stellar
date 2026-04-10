'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ExternalLink, Trash2, Clock, CheckCircle2, Cloud, ImageIcon } from 'lucide-react';
import BackButton from '@/components/shared/BackButton';
import { useAppState } from '@/hooks/useAppState';
import { getUnlockedRewards, getRank } from '@/lib/rewards';
import type { CompletedMission } from '@/lib/types';

function openExplorer(mission: CompletedMission) {
  if (mission.method !== 'onchain' || !mission.txId || mission.txId.length < 40) return;
  window.open(`https://explorer.solana.com/tx/${mission.txId}?cluster=devnet`, '_blank', 'noopener,noreferrer');
}

const isSafePhoto = (url: string) =>
  url.startsWith('data:image/jpeg;base64,') ||
  url.startsWith('data:image/png;base64,') ||
  url.startsWith('data:image/webp;base64,') ||
  url.startsWith('blob:');

function ProofCard({ mission, onDelete }: { mission: CompletedMission; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const isPending = mission.status === 'pending';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const displayStars = mission.stars ?? (mission as any).points ?? 0;
  const isRealTx = !isPending && mission.method === 'onchain' && !!mission.txId && mission.txId.length >= 40;

  return (
    <div className={`glass-card rounded-xl overflow-hidden flex flex-col ${isPending ? '!border-amber-500/50' : ''}`} style={isPending ? { borderColor: 'rgba(245,158,11,0.5)' } : {}}>
      <img src={isSafePhoto(mission.photo) ? mission.photo : '/placeholder-obs.jpg'} alt={mission.name} className="w-full aspect-[4/3] object-cover" />
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">{mission.emoji}</span>
          <p className="font-semibold text-white">{mission.name}</p>
        </div>
        <p className="text-slate-400 text-xs">{new Date(mission.timestamp).toLocaleString()}</p>
        <div className="flex items-center gap-2">
          <p className="text-[#FFD166] font-bold">+{displayStars} stars ✦</p>
          {isPending && <span className="text-amber-400 text-xs">⏳ Pending</span>}
        </div>
        <div className="flex gap-3 text-xs text-[var(--text-secondary)]">
          <span className="flex items-center gap-1"><Cloud size={11} />{mission.sky ? `${mission.sky.cloudCover}%` : '—'}</span>
        </div>
        {isPending ? (
          <p className="text-amber-400 text-xs italic flex items-center gap-1"><Clock size={11} /> Awaiting connectivity</p>
        ) : (
          <div className="flex items-center gap-2">
            <p className="font-hash text-xs text-[var(--text-dim)] truncate flex-1">
              {mission.txId.slice(0, 8)}...{mission.txId.slice(-8)}
            </p>
            {isRealTx && (
              <span className="text-[#34d399] text-xs shrink-0">✅ On-chain</span>
            )}
            {!isRealTx && !isPending && (
              <span className="text-amber-400 text-xs shrink-0">⚠️ Local</span>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-auto pt-2">
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={() => navigator.share({
                title: `${mission.emoji} ${mission.name} — STELLAR`,
                text: `I observed ${mission.name} and earned +${displayStars} stars on Solana ✦`,
                url: window.location.href,
              }).catch(() => {})}
              className="text-xs px-2 py-1.5 border border-[rgba(56,240,255,0.12)] hover:border-[#38F0FF] text-slate-400 hover:text-[#38F0FF] rounded transition-all flex items-center justify-center gap-1"
              title="Share observation"
            >
              ↗ Share
            </button>
          )}
          <button
            onClick={() => openExplorer(mission)}
            className={`flex-1 text-center text-xs px-2 py-1.5 border rounded transition-all flex items-center justify-center gap-1 ${
              isRealTx
                ? 'border-[rgba(56,240,255,0.12)] hover:border-[#38F0FF] text-slate-400 hover:text-[#38F0FF] btn-glow-cyan'
                : 'border-[rgba(56,240,255,0.12)] text-slate-600 cursor-default'
            }`}
          >
            <ExternalLink size={12} /> {isRealTx ? 'Explorer →' : 'Local only'}
          </button>
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="flex-1 text-xs px-2 py-1.5 hover:border-red-500 text-slate-400 hover:text-red-400 rounded transition-all flex items-center justify-center gap-1"
              style={{ border: '1px solid rgba(56,240,255,0.12)' }}
            >
              <Trash2 size={12} /> Delete
            </button>
          ) : (
            <div className="flex-1 flex gap-1">
              <button onClick={onDelete} className="flex-1 text-xs px-2 py-1.5 bg-red-500/20 border border-red-500 text-red-400 rounded">Confirm</button>
              <button onClick={() => setConfirming(false)} className="flex-1 text-xs px-2 py-1.5 text-slate-400 rounded" style={{ border: '1px solid rgba(56,240,255,0.12)' }}>Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProofPage() {
  const { state, removeMission } = useAppState();
  const clubDone = state.walletConnected && state.membershipMinted && !!state.telescope;
  const proofs = [...state.completedMissions].reverse();

  if (!clubDone) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 sm:py-20 animate-page-enter text-center">
        <div className="glass-card p-6 sm:p-8 max-w-md mx-auto">
          <ImageIcon size={32} className="text-[#FFD166] mx-auto mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
            Observation Gallery
          </h2>
          <p className="text-[var(--text-secondary)] text-sm mb-6">
            Your sky observations minted as on-chain proofs on Solana. Collect them all.
          </p>
          {!state.walletConnected ? (
            <Link href="/club" className="inline-block px-6 py-3 bg-gradient-to-r from-[#FFD166] to-[#CC9A33] text-black font-bold rounded-lg transition-all duration-200">
              Connect Wallet to Start →
            </Link>
          ) : (
            <Link href="/club" className="inline-block px-6 py-3 bg-gradient-to-r from-[#FFD166] to-[#CC9A33] text-black font-bold rounded-lg transition-all duration-200">
              Complete Setup →
            </Link>
          )}
        </div>
      </div>
    );
  }

  const completedIds = state.completedMissions.filter(m => m.status === 'completed').map(m => m.id);
  const rank = getRank(completedIds.length).name;
  const rewards = getUnlockedRewards(completedIds, rank);
  const unlockedCount = rewards.filter(r => r.unlocked).length;
  const nextReward = rewards.find(r => !r.unlocked && r.progress > 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-12 animate-page-enter">
      <BackButton />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#FFD166]" style={{ fontFamily: 'Georgia, serif' }}>
            Observation Gallery
          </h1>
          <p className="text-slate-400 mt-1">{proofs.length} observation{proofs.length !== 1 ? 's' : ''} sealed on Solana</p>
        </div>
        {proofs.length > 0 && (
          <Link href="/missions" className="text-sm text-[#38F0FF] hover:underline">
            + Add more →
          </Link>
        )}
      </div>

      {/* Rewards summary */}
      <div className="glass-card border border-[#FFD166]/20 p-4 mb-6 flex flex-col gap-2">
        <p className="text-[#FFD166] text-sm font-semibold">
          Rewards: {unlockedCount}/{rewards.length} unlocked
          {nextReward && (
            <span className="text-slate-400 font-normal"> · Next: {nextReward.name}</span>
          )}
        </p>
        {nextReward?.requiredMissions && (
          <p className="text-slate-500 text-xs">
            Observe {nextReward.requiredMissions.filter(id => !completedIds.includes(id)).join(', ')} to unlock
          </p>
        )}
        <Link href="/missions" className="text-[#38F0FF] text-xs hover:underline">
          View All Rewards →
        </Link>
      </div>

      {proofs.length === 0 ? (
        <div className="text-center py-20 rounded-xl" style={{ border: '1px dashed rgba(56,240,255,0.12)' }}>
          <p className="text-4xl mb-4">🌌</p>
          <p className="text-slate-400 mb-4">No observations minted yet</p>
          <Link href="/missions" className="px-6 py-3 bg-gradient-to-r from-[#FFD166] to-[#CC9A33] text-black font-bold rounded-lg">
            Begin Observation →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {proofs.map((m, index) => (
            <div key={m.txId} className="animate-slide-up opacity-0" style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'forwards' }}>
              <ProofCard mission={m} onDelete={() => removeMission(m.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
