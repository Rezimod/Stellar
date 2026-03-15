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
              <Satellite size={26} className="text-[#38F0FF]" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Georgia, serif' }}>
              Sky Missions
            </h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              Observe the Moon, Jupiter, Saturn, Orion Nebula and more. Earn real rewards.
            </p>
            <Link
              href="/club"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
              style={{
                background: 'linear-gradient(135deg, #FFD166, #CC9A33)',
                color: '#070B14',
              }}
            >
              {!state.walletConnected ? 'Connect Wallet to Start →' : 'Complete Setup →'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 sm:py-8 animate-page-enter flex flex-col gap-6">

      {/* ── Observer Dashboard ── */}
      <section>
        {/* Section header */}
        <div className="flex items-center gap-2 mb-4">
          <Satellite size={16} strokeWidth={1.5} className="text-[#38F0FF]" />
          <h1 className="text-xl sm:text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
            Missions
          </h1>
          <span className="ml-auto text-[10px] text-slate-700 uppercase tracking-widest">Devnet</span>
        </div>

        {/* Stats card — visually isolated */}
        <StatsBar />
      </section>

      {/* Divider */}
      <div className="flex items-center gap-3 -mt-2">
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(255,209,102,0.2), rgba(56,240,255,0.15), transparent)' }} />
        <span
          className="text-[10px] uppercase tracking-[0.2em] font-medium px-3 py-1 rounded-full"
          style={{ color: 'rgba(255,209,102,0.6)', border: '1px solid rgba(255,209,102,0.12)', background: 'rgba(255,209,102,0.04)' }}
        >
          Tonight&apos;s Targets
        </span>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(255,209,102,0.2), rgba(56,240,255,0.15), transparent)' }} />
      </div>

      {/* ── Mission Cards ── */}
      <section>
        <MissionList />
      </section>

      {/* ── Rewards & Log ── */}
      <RewardsSection />
      <ObservationLog />
    </div>
  );
}
