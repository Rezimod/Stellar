'use client';

import { useState } from 'react';
import { Shield } from 'lucide-react';
import { useAppState } from '@/hooks/useAppState';
import Card from '@/components/shared/Card';
import Button from '@/components/shared/Button';

export default function MembershipStep() {
  const { state, setMembership } = useAppState();
  const unlocked = state.walletConnected;
  const done = state.membershipMinted;
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async () => {
    if (!state.walletAddress) return;
    setJoining(true);
    setError('');
    try {
      const res = await fetch('/api/club/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: state.walletAddress }),
      });
      const data = await res.json();
      if (data.txId) {
        setMembership(data.txId);
      } else {
        setError('Activation failed — try again');
      }
    } catch {
      setError('Activation failed — try again');
    } finally {
      setJoining(false);
    }
  };

  return (
    <Card glow={done ? 'gold' : null} className={`${done ? 'animate-pulse-success' : ''} ${!unlocked ? 'opacity-40 pointer-events-none transition-opacity duration-500' : 'transition-opacity duration-500'}`}>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 ${
          done ? 'bg-[var(--terracotta)] border-[var(--terracotta)] text-black' : 'border-[var(--terracotta)] text-[var(--terracotta)]'
        }`}>
          {done ? '✓' : '2'}
        </div>
        <div className="w-full">
          <h3 className="text-lg font-semibold text-text-primary">Activate Observer Status</h3>
          <p className="text-text-muted text-sm mb-3">Activate your free observer status to unlock tonight&apos;s sky missions.</p>
          {done ? (
            <div className="bg-[var(--surface)] border border-[var(--terracotta)]/40 rounded-lg p-4 flex items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[var(--terracotta)]/10 border border-[var(--terracotta)]/20 flex items-center justify-center">
                <Shield size={22} className="text-[var(--terracotta)]" />
              </div>
              <div className="text-left">
                <p className="text-[var(--terracotta)] font-semibold">Observer Status: Active</p>
                <p className="text-text-muted text-xs">Founding Observer · Discovering since 2026</p>
              </div>
            </div>
          ) : (
            <>
              <Button variant="brass" onClick={handleJoin} disabled={!unlocked || joining} className="w-full">
                {joining ? 'Activating...' : 'Activate Now — It\'s Free ✦'}
              </Button>
              {error && <p className="text-terracotta text-xs mt-2">{error}</p>}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
