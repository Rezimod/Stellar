'use client';

import Link from 'next/link';
import { useAppState } from '@/hooks/useAppState';
import WalletStep from '@/components/club/WalletStep';
import MembershipStep from '@/components/club/MembershipStep';
import TelescopeStep from '@/components/club/TelescopeStep';
import { ECOSYSTEM } from '@/lib/constants';

export default function ClubPage() {
  const { state } = useAppState();
  const allDone = state.walletConnected && state.membershipMinted && !!state.telescope;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#c9a84c]" style={{ fontFamily: 'Georgia, serif' }}>
          🏛️ AstroClub
        </h1>
        <p className="text-slate-400 mt-2">Three steps to start your observation journey</p>
      </div>

      <div className="flex flex-col gap-4">
        <WalletStep />
        <MembershipStep />
        <TelescopeStep />
      </div>

      {allDone && (
        <div className="mt-8 bg-[#0f1a2e] border border-[#34d399] rounded-xl p-6 text-center animate-slide-up glow-emerald">
          <p className="text-2xl mb-2">✅</p>
          <h2 className="text-xl font-bold text-[#34d399] mb-4">You&apos;re ready to observe!</h2>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/sky"
              className="px-6 py-3 bg-gradient-to-r from-[#c9a84c] to-[#a07840] text-black font-bold rounded-lg hover:from-[#d4b05c] transition-all duration-200"
            >
              🌌 Go to Sky Dashboard →
            </Link>
            <a
              href={ECOSYSTEM.store}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 border border-[#1a2d4d] hover:border-[#c9a84c] text-slate-300 hover:text-[#c9a84c] rounded-lg transition-all duration-200"
            >
              🛒 Browse Telescopes at astroman.ge →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
