'use client';

import { useEffect, useState } from 'react';
import { Mail, CheckCircle2 } from 'lucide-react';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useAppState } from '@/hooks/useAppState';
import { AuthModal } from '@/components/auth/AuthModal';
import Card from '@/components/shared/Card';
import Button from '@/components/shared/Button';

export default function WalletStep() {
  const { authenticated, ready, address: walletAddress } = useStellarUser();
  const { state, setWallet } = useAppState();
  const [authOpen, setAuthOpen] = useState(false);
  const done = state.walletConnected;

  // When Privy auth completes and the embedded Solana wallet is available, sync into AppState
  useEffect(() => {
    if (authenticated && walletAddress && !state.walletConnected) {
      setWallet(walletAddress);
    }
  }, [authenticated, walletAddress, state.walletConnected, setWallet]);

  // Show loading state while Privy SDK initialises
  if (!ready) {
    return (
      <Card glow={null} className="">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--terracotta)] flex items-center justify-center text-sm font-bold text-[var(--terracotta)]">
            1
          </div>
          <p className="text-text-muted text-sm animate-pulse">Loading…</p>
        </div>
      </Card>
    );
  }

  return (
    <Card glow={done ? 'emerald' : null} className={done ? 'animate-pulse-success' : ''}>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 ${
          done ? 'bg-[var(--seafoam)] border-[var(--seafoam)] text-black' : 'border-[var(--terracotta)] text-[var(--terracotta)]'
        }`}>
          {done ? '✓' : '1'}
        </div>
        <div className="w-full">
          <h3 className="text-lg font-semibold text-text-primary">Create Your Account</h3>
          {done ? (
            <div className="mt-2 flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-2 text-[var(--seafoam)]">
                <CheckCircle2 size={15} />
                <span className="text-sm font-medium">Account created & ready</span>
              </div>
              <p className="text-text-muted text-xs mt-1">Your astronomy profile is set up</p>
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-4">
              {/* Email / social — primary */}
              <div className="bg-[var(--surface)] rounded-xl p-4 flex flex-col gap-3" style={{ border: '1px solid rgba(232, 130, 107,0.2)' }}>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-[var(--terracotta)]" />
                    <p className="text-text-primary text-sm font-semibold">Join with your Email</p>
                  </div>
                  <p className="text-text-muted text-xs ml-6">No downloads needed. Takes 30 seconds.</p>
                </div>
                <Button variant="brass" onClick={() => setAuthOpen(true)} className="w-full min-h-[44px]">
                  Join Stellar →
                </Button>
                <p className="text-text-muted text-xs text-center">Email, Google, SMS, or connect a Solana wallet.</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </Card>
  );
}
