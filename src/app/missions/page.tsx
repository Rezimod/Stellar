'use client';

import Link from 'next/link';
import { Satellite } from 'lucide-react';
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
      <div className="max-w-2xl mx-auto px-4 py-12 sm:py-20 animate-page-enter text-center">
        <div className="glass-card p-6 sm:p-8 max-w-md mx-auto">
          <Satellite size={32} className="text-[#38F0FF] mx-auto mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
            Sky Missions
          </h2>
          <p className="text-[var(--text-secondary)] text-sm mb-1">
            Observe the Moon, Jupiter, Saturn, Orion Nebula and more.
          </p>
          <p className="text-[var(--text-secondary)] text-sm mb-6">
            Earn real rewards from{' '}
            <a href="https://astroman.ge" target="_blank" rel="noopener noreferrer" className="text-[#38F0FF] hover:underline">astroman.ge</a>.
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
          <p className="text-[var(--text-dim)] text-xs mt-4">Free to join · No SOL required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 sm:py-8 animate-page-enter">
      <div className="mb-2 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#38F0FF] flex items-center gap-2" style={{ fontFamily: 'Georgia, serif' }}>
          <Satellite size={22} strokeWidth={1.5} className="text-[#38F0FF]" />
          Missions
        </h1>
        <p className="text-slate-400 mt-0.5 text-sm">Observe. Verify. Collect.</p>
      </div>

      <div className="ornament-line mb-4 mt-1" />
      <StatsBar />
      <MissionList />
      <RewardsSection />
      <ObservationLog />
      <div className="ornament-line mt-6 mb-2" />
    </div>
  );
}
