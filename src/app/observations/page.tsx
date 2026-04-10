'use client';

import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Telescope, ExternalLink, List } from 'lucide-react';
import BackButton from '@/components/shared/BackButton';
import Link from 'next/link';

interface ObservationRow {
  id: string;
  target: string;
  stars: number;
  confidence: string;
  mint_tx: string | null;
  created_at: string;
}

interface StreakData {
  streak: number;
  todayCompleted: boolean;
  bonusStars: number;
  totalObservations: number;
}

function confidenceBadge(confidence: string) {
  switch (confidence) {
    case 'high':
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/20 text-green-400">High</span>;
    case 'medium':
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400">Medium</span>;
    case 'low':
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/20 text-slate-400">Low</span>;
    case 'rejected':
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-400">Rejected</span>;
    default:
      return null;
  }
}

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return minutes <= 1 ? 'Just now' : `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(isoString).toLocaleDateString();
}

export default function ObservationsPage() {
  const { authenticated, ready, login } = usePrivy();
  const { wallets } = useWallets();
  const [observations, setObservations] = useState<ObservationRow[]>([]);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  const solanaWallet = wallets.find(w => (w as { chainType?: string }).chainType === 'solana');
  const address = solanaWallet?.address ?? null;

  useEffect(() => {
    if (!authenticated || !address) {
      setLoading(false);
      return;
    }

    Promise.all([
      fetch(`/api/observe/history?walletAddress=${encodeURIComponent(address)}`).then(r => r.json()),
      fetch(`/api/streak?walletAddress=${encodeURIComponent(address)}`).then(r => r.json()),
    ])
      .then(([histData, streakData]) => {
        setObservations(histData.observations ?? []);
        setStreak(streakData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authenticated, address]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 rounded-full border-2 border-[#38F0FF] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 animate-page-enter">
        <div className="max-w-sm w-full text-center">
          <div
            className="rounded-2xl p-8"
            style={{
              background: 'linear-gradient(135deg, rgba(56,240,255,0.05), rgba(15,31,61,0.5))',
              border: '1px solid rgba(56,240,255,0.1)',
            }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(56,240,255,0.08)', border: '1px solid rgba(56,240,255,0.15)' }}
            >
              <List size={26} className="text-[#38F0FF]" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Georgia, serif' }}>
              My Observations
            </h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              Sign in to view your observation history.
            </p>
            <button
              onClick={login}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #FFD166, #CC9A33)', color: '#070B14' }}
            >
              Sign In to View →
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalStars = observations.reduce((sum, o) => sum + (o.stars ?? 0), 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 animate-page-enter flex flex-col gap-4">
      <BackButton />
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
          My Observations
        </h1>
        {!loading && (
          <span className="bg-white/[0.06] px-2 py-0.5 rounded-full text-xs text-white/50">
            {observations.length}
          </span>
        )}
      </div>

      {/* Stats row */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: observations.length },
            { label: 'Streak', value: streak ? `${streak.streak}d` : '0d' },
            { label: 'Stars Earned', value: `${totalStars} ✦` },
          ].map(s => (
            <div
              key={s.label}
              className="rounded-xl p-3 text-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-white font-bold text-base">{s.value}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-[#38F0FF] border-t-transparent animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && observations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(56,240,255,0.06)', border: '1px solid rgba(56,240,255,0.1)' }}
          >
            <Telescope size={28} className="text-[#38F0FF]/50" />
          </div>
          <div>
            <p className="text-white font-semibold mb-1">No observations yet</p>
            <p className="text-slate-500 text-sm">Photograph the night sky to get started.</p>
          </div>
          <Link
            href="/observe"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #FFD166, #CC9A33)', color: '#070B14' }}
          >
            Start Observing →
          </Link>
        </div>
      )}

      {/* Observation list */}
      {!loading && observations.length > 0 && (
        <div className="flex flex-col gap-3">
          {observations.map(obs => (
            <div
              key={obs.id}
              className="rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{obs.target}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {confidenceBadge(obs.confidence)}
                    {obs.mint_tx && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/20 text-teal-400">
                        On-chain ✓
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 text-[10px] mt-1.5">{relativeTime(obs.created_at)}</p>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className="text-[#FFD166] text-sm font-bold">+{obs.stars} ✦</span>
                  {obs.mint_tx && (
                    <a
                      href={`https://explorer.solana.com/tx/${obs.mint_tx}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-[#38F0FF] hover:opacity-80"
                    >
                      Explorer <ExternalLink size={9} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
