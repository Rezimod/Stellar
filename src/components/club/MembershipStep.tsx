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

  const handleJoin = async () => {
    setJoining(true);
    await new Promise(r => setTimeout(r, 800));
    setMembership('local_' + Date.now().toString(36));
    setJoining(false);
  };

  return (
    <Card glow={done ? 'gold' : null} className={`${done ? 'animate-pulse-success' : ''} ${!unlocked ? 'opacity-40 pointer-events-none transition-opacity duration-500' : 'transition-opacity duration-500'}`}>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 ${
          done ? 'bg-[#FFD166] border-[#FFD166] text-black' : 'border-[#FFD166] text-[#FFD166]'
        }`}>
          {done ? '✓' : '2'}
        </div>
        <div className="w-full">
          <h3 className="text-lg font-semibold text-white">Claim Membership</h3>
          <p className="text-slate-400 text-sm mb-3">Claim your free membership to unlock sky missions and earn rewards.</p>
          {done ? (
            <div className="bg-[#0F1F3D] border border-[#FFD166]/40 rounded-lg p-4 flex items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#FFD166]/10 border border-[#FFD166]/20 flex items-center justify-center">
                <Shield size={22} className="text-[#FFD166]" />
              </div>
              <div className="text-left">
                <p className="text-[#FFD166] font-semibold">Stellar Club Member</p>
                <p className="text-slate-400 text-xs">Founding Member · Observations mint on Solana</p>
              </div>
            </div>
          ) : (
            <Button variant="brass" onClick={handleJoin} disabled={!unlocked || joining} className="w-full">
              {joining ? 'Claiming...' : 'Claim Membership ✦'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
