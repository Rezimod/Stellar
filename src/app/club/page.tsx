'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import BackButton from '@/components/shared/BackButton';
import { useAppState } from '@/hooks/useAppState';
import WalletStep from '@/components/club/WalletStep';
import MembershipStep from '@/components/club/MembershipStep';
import TelescopeStep from '@/components/club/TelescopeStep';

function StepProgress({ current, steps }: { current: number; steps: { label: string; done: boolean }[] }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              step.done
                ? 'bg-[#FFD166] border-2 border-[#FFD166] text-black'
                : i + 1 === current
                  ? 'border-2 border-[#FFD166] text-[#FFD166] bg-transparent'
                  : 'border-2 border-[var(--text-dim)] text-[var(--text-dim)] bg-transparent'
            }`}>
              {step.done ? <CheckCircle2 size={16} /> : i + 1}
            </div>
            <span className={`text-xs font-medium ${step.done ? 'text-[#FFD166]' : i + 1 === current ? 'text-[var(--text-secondary)]' : 'text-[var(--text-dim)]'}`}>
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
  const router = useRouter();

  // Initialize current step from saved state
  const getInitialStep = () => {
    if (!state.walletConnected) return 1;
    if (!state.membershipMinted) return 2;
    if (!state.telescope) return 3;
    return 3;
  };
  const [currentStep, setCurrentStep] = useState(getInitialStep);
  const [transitioning, setTransitioning] = useState(false);

  // Auto-advance: wallet connected → step 2
  useEffect(() => {
    if (state.walletConnected && currentStep === 1) {
      setTransitioning(true);
      setTimeout(() => {
        setCurrentStep(2);
        setTransitioning(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 700);
    }
  }, [state.walletConnected]);

  // Auto-advance: membership claimed → step 3
  useEffect(() => {
    if (state.membershipMinted && currentStep === 2) {
      setTransitioning(true);
      setTimeout(() => {
        setCurrentStep(3);
        setTransitioning(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 700);
    }
  }, [state.membershipMinted]);

  // Auto-advance: telescope registered → missions
  useEffect(() => {
    if (state.telescope && currentStep === 3) {
      setTransitioning(true);
      setTimeout(() => {
        router.push('/missions');
      }, 900);
    }
  }, [state.telescope]);

  const steps = [
    { label: 'Join', done: state.walletConnected },
    { label: 'Start', done: state.membershipMinted },
    { label: 'Telescope', done: !!state.telescope },
  ];

  const stepTitles = ['Create Your Account', 'Activate Observer Status', 'Register Your Telescope'];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-12 animate-page-enter">
      <BackButton />
      <div className="mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#FFD166]">Start Your Observation Journey</h1>
        <p className="text-[var(--text-primary)] mt-2 text-sm sm:text-base">
          Join thousands of astronomers. Free forever.
        </p>
      </div>

      <StepProgress current={currentStep} steps={steps} />

      {/* Step label */}
      <p className="text-center text-[var(--text-dim)] text-xs mb-4 tracking-widest uppercase">
        Step {currentStep} of 3 — {stepTitles[currentStep - 1]}
      </p>

      {/* Single step view with fade transition */}
      <div
        className="transition-all duration-300"
        style={{ opacity: transitioning ? 0 : 1, transform: transitioning ? 'translateY(8px)' : 'translateY(0)' }}
      >
        {currentStep === 1 && <WalletStep />}
        {currentStep === 2 && <MembershipStep />}
        {currentStep === 3 && <TelescopeStep />}
      </div>

      {/* Back link if not on step 1 */}
      {currentStep > 1 && !transitioning && (
        <button
          onClick={() => setCurrentStep(s => s - 1)}
          className="mt-4 w-full text-center text-xs text-slate-600 hover:text-slate-400 transition-colors py-2"
        >
          ← Back
        </button>
      )}
    </div>
  );
}
