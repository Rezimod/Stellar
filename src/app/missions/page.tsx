'use client';

import Link from 'next/link';
import { Telescope } from 'lucide-react';
import { useAppState } from '@/hooks/useAppState';
import StatsBar from '@/components/sky/StatsBar';
import MissionList from '@/components/sky/MissionList';
import ObservationLog from '@/components/sky/ObservationLog';
import RewardsSection from '@/components/sky/RewardsSection';

export default function MissionsPage() {
  const { state } = useAppState();
  const clubDone = state.walletConnected && state.membershipMinted && !!state.telescope;

  if (!clubDone) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 animate-page-enter">
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
    <div className="max-w-3xl mx-auto px-4 py-12 animate-page-enter">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#38F0FF] flex items-center gap-3" style={{ fontFamily: 'Georgia, serif' }}>
          <Telescope size={28} strokeWidth={1.5} className="text-[#38F0FF]" />
          Tonight&apos;s Missions
        </h1>
        <p className="text-slate-400 mt-1">Observe. Verify. Collect.</p>
      </div>

      <StatsBar />
      <MissionList />
      <RewardsSection />
      <ObservationLog />
    </div>
  );
}
