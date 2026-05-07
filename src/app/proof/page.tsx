'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ExternalLink, Trash2, Clock, CheckCircle2, Cloud, ImageIcon, AlertTriangle, Telescope } from 'lucide-react';
import BackButton from '@/components/shared/BackButton';
import { useAppState } from '@/hooks/useAppState';
import { getRank } from '@/lib/rewards';
import type { CompletedMission } from '@/lib/types';

function openExplorer(mission: CompletedMission) {
  if (mission.method !== 'onchain' || !mission.txId || mission.txId.length < 40) return;
  window.open(`https://explorer.solana.com/tx/${mission.txId}?cluster=${process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'devnet'}`, '_blank', 'noopener,noreferrer');
}

const isSafePhoto = (url: string) =>
  url.startsWith('data:image/jpeg;base64,') ||
  url.startsWith('data:image/png;base64,') ||
  url.startsWith('data:image/webp;base64,') ||
  url.startsWith('blob:') ||
  url.startsWith('/images/') ||
  (url.startsWith('https://') && (
    url.includes('vercel.app') ||
    url.includes('supabase.co') ||
    url.includes('cloudinary.com') ||
    url.includes('s3.amazonaws.com')
  ));

function ProofCard({ mission, onDelete }: { mission: CompletedMission; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const isPending = mission.status === 'pending';
  const displayStars = mission.stars ?? 0;
  const isRealTx = !isPending && mission.method === 'onchain' && !!mission.txId && mission.txId.length >= 40;

  return (
    <div className={`glass-card rounded-xl overflow-hidden flex flex-col ${isPending ? '!border-terracotta' : ''}`} style={isPending ? { borderColor: 'rgba(255, 179, 71,0.5)' } : {}}>
      <img src={isSafePhoto(mission.photo) ? mission.photo : '/images/placeholder-nft.svg'} alt={mission.name} className="w-full aspect-[4/3] object-cover" style={{ background: 'var(--canvas)' }} />
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">{mission.emoji}</span>
          <p className="font-semibold text-text-primary">{mission.name}</p>
        </div>
        <p className="text-text-muted text-xs">{new Date(mission.timestamp).toLocaleString()}</p>
        <div className="flex items-center gap-2">
          <p className="text-[var(--terracotta)] font-bold">+{displayStars} stars ✦</p>
          {isPending && <span className="text-terracotta text-xs flex items-center gap-1" title="Transaction is being confirmed on Solana. This usually takes 15-30 seconds."><Clock size={11} /> Pending</span>}
        </div>
        <div className="flex gap-3 text-xs text-[var(--text-secondary)]">
          <span className="flex items-center gap-1"><Cloud size={11} />{mission.sky ? `${mission.sky.cloudCover}%` : '—'}</span>
        </div>
        {isPending ? (
          <p className="text-terracotta text-xs italic flex items-center gap-1"><Clock size={11} /> Awaiting connectivity</p>
        ) : (
          <div className="flex items-center gap-2">
            <p className="font-hash text-xs text-[var(--text-dim)] truncate flex-1">
              {mission.txId.slice(0, 8)}...{mission.txId.slice(-8)}
            </p>
            {isRealTx && (
              <span className="text-[var(--seafoam)] text-xs shrink-0 flex items-center gap-1"><CheckCircle2 size={11} /> On-chain</span>
            )}
            {!isRealTx && !isPending && (
              <span className="text-terracotta text-xs shrink-0 flex items-center gap-1"><AlertTriangle size={11} /> Local</span>
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
              className="text-xs px-2 py-1.5 border border-[rgba(255, 179, 71,0.12)] hover:border-[var(--terracotta)] text-text-muted hover:text-[var(--terracotta)] rounded transition-all flex items-center justify-center gap-1"
              title="Share observation"
            >
              ↗ Share
            </button>
          )}
          {isRealTx ? (
            <button
              onClick={() => openExplorer(mission)}
              title="View on Solana Explorer"
              className="flex-1 text-center text-xs px-2 py-1.5 border border-[rgba(255, 179, 71,0.12)] hover:border-[var(--terracotta)] text-text-muted hover:text-[var(--terracotta)] btn-glow-cyan rounded transition-all flex items-center justify-center gap-1"
            >
              <ExternalLink size={12} /> Explorer →
            </button>
          ) : isPending ? (
            <button
              disabled
              title="Transaction is being confirmed on Solana"
              className="flex-1 text-center text-xs px-2 py-1.5 border border-[rgba(255, 179, 71,0.12)] text-text-muted opacity-50 cursor-not-allowed rounded transition-all flex items-center justify-center gap-1"
            >
              <ExternalLink size={12} /> Pending
            </button>
          ) : (
            <button
              disabled
              title="Observation saved locally"
              className="flex-1 text-center text-xs px-2 py-1.5 border border-[rgba(255, 179, 71,0.12)] text-text-muted opacity-50 cursor-not-allowed rounded transition-all flex items-center justify-center gap-1"
            >
              <ExternalLink size={12} /> Local
            </button>
          )}
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="flex-1 text-xs px-2 py-1.5 hover:border-negative text-text-muted hover:text-negative rounded transition-all flex items-center justify-center gap-1"
              style={{ border: '1px solid rgba(255, 179, 71,0.12)' }}
            >
              <Trash2 size={12} /> Delete
            </button>
          ) : (
            <div className="flex-1 flex gap-1">
              <button onClick={onDelete} className="flex-1 text-xs px-2 py-1.5 bg-negative border border-negative text-negative rounded">Confirm</button>
              <button onClick={() => setConfirming(false)} className="flex-1 text-xs px-2 py-1.5 text-text-muted rounded" style={{ border: '1px solid rgba(255, 179, 71,0.12)' }}>Cancel</button>
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
          <ImageIcon size={32} className="text-[var(--terracotta)] mx-auto mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
            Observation Gallery
          </h2>
          <p className="text-[var(--text-secondary)] text-sm mb-6">
            Your sky observations minted as on-chain proofs on Solana. Collect them all.
          </p>
          <Link href="/missions" className="inline-block px-6 py-3 bg-gradient-to-r from-[var(--terracotta)] to-[var(--terracotta)] text-black font-bold rounded-lg transition-all duration-200">
            Start Observing →
          </Link>
        </div>
      </div>
    );
  }

  const completedIds = state.completedMissions.filter(m => m.status === 'completed').map(m => m.id);
  const rank = getRank(completedIds.length);
  const lifetimeStarsLocal = state.completedMissions
    .filter(m => m.status === 'completed')
    .reduce((sum, m) => sum + (m.stars ?? 0), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-12 animate-page-enter">
      <BackButton />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--terracotta)]" style={{ fontFamily: 'Georgia, serif' }}>
            Observation Gallery
          </h1>
          <p className="text-text-muted mt-1">{proofs.length} observation{proofs.length !== 1 ? 's' : ''} sealed on Solana</p>
        </div>
        {proofs.length > 0 && (
          <Link href="/missions" className="text-sm text-[var(--terracotta)] hover:underline">
            + Add more →
          </Link>
        )}
      </div>

      {/* Stars summary */}
      <div className="glass-card border border-[var(--terracotta)]/20 p-4 mb-6 flex flex-col gap-2">
        <p className="text-[var(--terracotta)] text-sm font-semibold">
          {rank.icon} {rank.name}
          <span className="text-text-muted font-normal"> · ✦ {lifetimeStarsLocal.toLocaleString()} earned</span>
        </p>
        {rank.nextRank && (
          <p className="text-text-muted text-xs">
            Next rank: {rank.nextRank} · {rank.progressPct}% to go
          </p>
        )}
        <Link href="/profile" className="text-[var(--terracotta)] text-xs hover:underline">
          View profile →
        </Link>
      </div>

      {proofs.length === 0 ? (
        <div className="text-center py-20 rounded-xl" style={{ border: '1px dashed rgba(255, 179, 71,0.12)' }}>
          <Telescope size={36} className="text-[var(--terracotta)]/30 mx-auto mb-4" />
          <p className="text-text-muted mb-4">No observations minted yet</p>
          <Link href="/missions" className="px-6 py-3 bg-gradient-to-r from-[var(--terracotta)] to-[var(--terracotta)] text-black font-bold rounded-lg">
            Begin Observation →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {proofs.map((m, index) => (
            <div key={m.txId} className="animate-slide-up opacity-0" style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'forwards' }}>
              <ProofCard mission={m} onDelete={() => removeMission(m.txId)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
