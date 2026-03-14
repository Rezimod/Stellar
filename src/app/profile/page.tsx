'use client';

import { Telescope, Star, Trophy, Award } from 'lucide-react';
import { useAppState } from '@/hooks/useAppState';
import { getRank } from '@/lib/rewards';
import Link from 'next/link';

export default function ProfilePage() {
  const { state } = useAppState();
  const clubDone = state.walletConnected && state.membershipMinted && !!state.telescope;

  if (!clubDone) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center animate-page-enter">
        <p className="text-4xl mb-4">🔒</p>
        <h2 className="text-2xl font-bold text-[#FFD166] mb-3" style={{ fontFamily: 'Georgia, serif' }}>
          Join Stellar Club First
        </h2>
        <p className="text-slate-400 mb-6 text-sm">Complete setup to view your profile.</p>
        <Link href="/club" className="px-6 py-3 bg-gradient-to-r from-[#FFD166] to-[#CC9A33] text-black font-bold rounded-lg transition-all duration-200">
          Join Club ✦
        </Link>
      </div>
    );
  }

  const completed = state.completedMissions.filter(m => m.status === 'completed');
  const totalStars = completed.reduce((sum, m) => sum + (m.stars ?? 0), 0);
  const rank = getRank(completed.length);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 animate-page-enter">
      <h1 className="text-3xl font-bold text-[#FFD166] mb-8" style={{ fontFamily: 'Georgia, serif' }}>
        Observer Profile
      </h1>

      {/* Wallet */}
      <div className="glass-card p-5 mb-4">
        <p className="text-[var(--text-secondary)] text-xs uppercase tracking-wider mb-2">Wallet</p>
        <p className="font-mono text-sm text-[#38F0FF] break-all">{state.walletAddress}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon: <Telescope size={16} className="text-[#38F0FF]" />, label: 'Observations', value: completed.length },
          { icon: <Star size={16} className="text-[#FFD166]" />, label: 'Stars', value: `${totalStars} ✦` },
          { icon: <Trophy size={16} className="text-[#7A5FFF]" />, label: 'Rank', value: rank.name },
          { icon: <Award size={16} className="text-[#34d399]" />, label: 'Rewards', value: state.claimedRewards.length },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">{s.icon}<span className="text-[var(--text-dim)] text-xs">{s.label}</span></div>
            <p className="font-bold text-lg text-[var(--text-primary)]">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Telescope */}
      {state.telescope && (
        <div className="glass-card p-5 mb-4">
          <p className="text-[var(--text-secondary)] text-xs uppercase tracking-wider mb-2">Registered Telescope</p>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔭</span>
            <div>
              <p className="text-[#38F0FF] font-semibold">{state.telescope.brand} {state.telescope.model}</p>
              <p className="text-[var(--text-dim)] text-xs">Aperture: {state.telescope.aperture}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="flex gap-3 flex-wrap">
        <Link href="/missions" className="text-sm text-[#38F0FF] hover:underline">View Missions →</Link>
        <Link href="/proof" className="text-sm text-[#FFD166] hover:underline">View Gallery →</Link>
      </div>
    </div>
  );
}
