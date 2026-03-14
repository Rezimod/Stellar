'use client';

import { useState } from 'react';
import { useAppState } from '@/hooks/useAppState';
import { mintNFT } from '@/lib/solana';
import Card from '@/components/shared/Card';
import Button from '@/components/shared/Button';
import MintAnimation from '@/components/shared/MintAnimation';

export default function MembershipStep() {
  const { state, setMembership } = useAppState();
  const unlocked = state.walletConnected;
  const done = state.membershipMinted;
  const [minting, setMinting] = useState(false);
  const [mintDone, setMintDone] = useState(false);

  const handleMint = async () => {
    setMinting(true);
    console.log('[Mint] Starting membership NFT mint');
    const result = await mintNFT('Astroman Explorer Membership', 'ASTRO');
    setMintDone(true);
    setTimeout(() => {
      setMinting(false);
      setMintDone(false);
      setMembership(result.txId);
    }, 1200);
  };

  return (
    <>
      {minting && <MintAnimation done={mintDone} />}
      <Card glow={done ? 'brass' : null} className={!unlocked ? 'opacity-40 pointer-events-none' : ''}>
        <div className="flex items-start gap-4">
          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 ${
            done ? 'bg-[#c9a84c] border-[#c9a84c] text-black' : 'border-[#c9a84c] text-[#c9a84c]'
          }`}>
            {done ? '✓' : '2'}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">Explorer Membership</h3>
            <p className="text-slate-400 text-sm mb-4">Mint your on-chain membership NFT</p>
            {done ? (
              <div className="bg-[#0f1a2e] border border-[#c9a84c]/40 rounded-lg p-4 flex items-center gap-4">
                <span className="text-3xl">🏛️</span>
                <div>
                  <p className="text-[#c9a84c] font-semibold">Astroman Explorer Membership</p>
                  <p className="text-slate-400 text-xs">Founding Member</p>
                  <p className="font-mono text-xs text-slate-500 mt-1">
                    {state.membershipTx.slice(0, 8)}...{state.membershipTx.slice(-8)}
                  </p>
                </div>
              </div>
            ) : (
              <Button variant="brass" onClick={handleMint} disabled={!unlocked} className="w-full sm:w-auto">
                🏛️ Mint Explorer Membership NFT
              </Button>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}
