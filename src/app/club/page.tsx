'use client';

import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { useAppState } from '@/hooks/useAppState';
import WalletStep from '@/components/club/WalletStep';
import MembershipStep from '@/components/club/MembershipStep';
import TelescopeStep from '@/components/club/TelescopeStep';
import { ECOSYSTEM } from '@/lib/constants';

function StepProgress({ steps }: { steps: { label: string; done: boolean; active: boolean }[] }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              step.done
                ? 'bg-[#FFD166] border-2 border-[#FFD166] text-black'
                : step.active
                  ? 'border-2 border-[#FFD166] text-[#FFD166] bg-transparent'
                  : 'border-2 border-[var(--text-dim)] text-[var(--text-dim)] bg-transparent'
            }`}>
              {step.done ? <CheckCircle2 size={16} /> : i + 1}
            </div>
            <span className={`text-xs font-medium ${step.done ? 'text-[#FFD166]' : step.active ? 'text-[var(--text-secondary)]' : 'text-[var(--text-dim)]'}`}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-16 sm:w-24 h-0.5 mb-5 mx-1 transition-all duration-300 ${step.done ? 'bg-[#FFD166]' : 'bg-[var(--text-dim)]'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function ClubPage() {
  const { state } = useAppState();
  const allDone = state.walletConnected && state.membershipMinted && !!state.telescope;

  const steps = [
    { label: 'Wallet', done: state.walletConnected, active: !state.walletConnected },
    { label: 'Membership', done: state.membershipMinted, active: state.walletConnected && !state.membershipMinted },
    { label: 'Telescope', done: !!state.telescope, active: state.membershipMinted && !state.telescope },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-12 animate-page-enter">
      <div className="mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#FFD166]">Join Stellar Club</h1>
        <p className="text-[var(--text-primary)] mt-2 text-sm sm:text-base">
          Observe the night sky, earn real rewards from{' '}
          <a href="https://astroman.ge" target="_blank" rel="noopener noreferrer" className="text-[#38F0FF] hover:underline">astroman.ge</a>
        </p>
        <p className="text-[var(--text-dim)] mt-1 text-xs">
          Connect → Mint your free membership → Register your telescope → Start earning
        </p>
      </div>

      <StepProgress steps={steps} />

      <div className="flex flex-col gap-4">
        <WalletStep />
        <MembershipStep />
        <TelescopeStep />
      </div>

      {allDone && (
        <div className="mt-8 glass-card border border-[#34d399]/50 p-6 text-center animate-slide-up glow-emerald">
          <CheckCircle2 size={32} className="text-[#34d399] mx-auto mb-3" />
          <h2 className="text-xl font-bold text-[#34d399] mb-4">You&apos;re ready to observe!</h2>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/missions" className="btn-primary px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2">
              Start Missions →
            </Link>
            <a
              href={ECOSYSTEM.store}
              target="_blank" rel="noopener noreferrer"
              className="btn-ghost px-6 py-3 rounded-xl inline-flex items-center gap-2"
            >
              Browse Telescopes ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
