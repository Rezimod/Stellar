'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ExternalLink, Trash2, Clock, CheckCircle2, Cloud, Wifi } from 'lucide-react';
import { useAppState } from '@/hooks/useAppState';
import type { CompletedMission } from '@/lib/types';

function NFTCard({ mission, onDelete }: { mission: CompletedMission; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);

  const isPending = mission.status === 'pending';
  return (
    <div className={`glass-card rounded-xl overflow-hidden flex flex-col ${isPending ? '!border-amber-500/50' : ''}`} style={isPending ? { borderColor: 'rgba(245,158,11,0.5)' } : {}}>
      <img src={mission.photo} alt={mission.name} className="w-full aspect-[4/3] object-cover" />
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">{mission.emoji}</span>
          <p className="font-semibold text-white">{mission.name}</p>
        </div>
        <p className="text-slate-400 text-xs">{new Date(mission.timestamp).toLocaleString()}</p>
        <div className="flex items-center gap-2">
          <p className="text-[#FFD166] font-bold">+{mission.stars} stars ✦</p>
          {isPending && <span className="text-amber-400 text-xs">⏳ Pending</span>}
        </div>
        <div className="flex gap-3 text-xs text-[var(--text-secondary)]">
          <span className="flex items-center gap-1"><Cloud size={11} />{mission.farmhawk ? `${mission.farmhawk.cloudCover}%` : '—'}</span>
          <span className="flex items-center gap-1"><Wifi size={11} />{mission.pollinet.mode}</span>
        </div>
        {isPending ? (
          <p className="text-amber-400 text-xs italic flex items-center gap-1"><Clock size={11} /> Awaiting connectivity</p>
        ) : (
          <p className="font-hash text-xs text-[var(--text-dim)] truncate">
            {mission.txId.slice(0, 8)}...{mission.txId.slice(-8)}
          </p>
        )}

        <div className="flex gap-2 mt-auto pt-2">
          <a
            href={isPending ? '#' : `https://explorer.solana.com/tx/${mission.txId}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-xs px-2 py-1.5 border border-[rgba(56, 240, 255, 0.12)] hover:border-[#38F0FF] text-slate-400 hover:text-[#38F0FF] rounded transition-all"
          >
            <ExternalLink size={12} /> Explorer
          </a>
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="flex-1 text-xs px-2 py-1.5 border border-[rgba(56, 240, 255, 0.12)] hover:border-red-500 text-slate-400 hover:text-red-400 rounded transition-all"
            >
              <Trash2 size={12} /> Delete
            </button>
          ) : (
            <div className="flex-1 flex gap-1">
              <button
                onClick={onDelete}
                className="flex-1 text-xs px-2 py-1.5 bg-red-500/20 border border-red-500 text-red-400 rounded transition-all"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 text-xs px-2 py-1.5 border border-[rgba(56, 240, 255, 0.12)] text-slate-400 rounded transition-all"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NFTsPage() {
  const { state, removeMission } = useAppState();
  const clubDone = state.walletConnected && state.membershipMinted && !!state.telescope;
  const nfts = [...state.completedMissions].reverse();

  if (!clubDone) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-12 animate-page-enter">
        <div className="relative">
          <div className="filter blur-sm opacity-30 pointer-events-none select-none" aria-hidden="true">
            <div className="grid grid-cols-3 gap-3 mb-6">
              {['Observations', 'Stars', 'Rank'].map(l => (
                <div key={l} className="glass-card p-4 text-center">
                  <p className="text-[var(--text-dim)] text-xs">{l}</p>
                  <p className="text-xl font-bold text-[#FFD166]">—</p>
                </div>
              ))}
            </div>
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card p-4 mb-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0F1F3D]" />
                  <div className="flex-1">
                    <div className="h-4 bg-[#0F1F3D] rounded w-32 mb-1" />
                    <div className="h-3 bg-[#0F1F3D]/50 rounded w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="glass-card border border-[#FFD166]/20 p-8 text-center max-w-sm glow-gold">
              <p className="text-4xl mb-4">🔒</p>
              <h2 className="text-2xl font-bold text-[#FFD166] mb-3" style={{ fontFamily: 'Georgia, serif' }}>Join Stellar Club</h2>
              <p className="text-[var(--text-secondary)] mb-6 text-sm">Complete the three setup steps to unlock this section.</p>
              <Link href="/club" className="inline-block px-6 py-3 bg-gradient-to-r from-[#FFD166] to-[#CC9A33] text-black font-bold rounded-lg transition-all duration-200">Join Club ✦</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-12 animate-page-enter">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#FFD166]" style={{ fontFamily: 'Georgia, serif' }}>
            🖼️ NFT Gallery
          </h1>
          <p className="text-slate-400 mt-1">{nfts.length} observation{nfts.length !== 1 ? 's' : ''} minted</p>
        </div>
        {nfts.length > 0 && (
          <Link href="/sky" className="text-sm text-[#38F0FF] hover:underline">
            + Add more →
          </Link>
        )}
      </div>

      {nfts.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-[rgba(56, 240, 255, 0.12)] rounded-xl">
          <p className="text-4xl mb-4">🌌</p>
          <p className="text-slate-400 mb-4">No observations minted yet</p>
          <Link href="/sky" className="px-6 py-3 bg-gradient-to-r from-[#FFD166] to-[#CC9A33] text-black font-bold rounded-lg">
            🔭 Start Observing
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {nfts.map(m => (
            <NFTCard key={m.txId} mission={m} onDelete={() => removeMission(m.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
