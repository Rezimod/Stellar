'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useEffect } from 'react';
import { useAppState } from '@/hooks/useAppState';
import Card from '@/components/shared/Card';
import Button from '@/components/shared/Button';

export default function WalletStep() {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { state, setWallet } = useAppState();
  const done = state.walletConnected;

  useEffect(() => {
    if (connected && publicKey && !state.walletConnected) {
      console.log('[Wallet] Connected:', publicKey.toBase58());
      setWallet(publicKey.toBase58());
    }
  }, [connected, publicKey]);

  return (
    <Card glow={done ? 'emerald' : null}>
      <div className="flex items-start gap-4">
        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 ${
          done ? 'bg-[#34d399] border-[#34d399] text-black' : 'border-[#c9a84c] text-[#c9a84c]'
        }`}>
          {done ? '✓' : '1'}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">Connect Wallet</h3>
          <p className="text-slate-400 text-sm mb-4">Phantom or any Solana wallet</p>
          {done ? (
            <p className="text-[#34d399] font-mono text-sm">
              {state.walletAddress.slice(0, 8)}...{state.walletAddress.slice(-8)}
            </p>
          ) : (
            <Button variant="solana" onClick={() => setVisible(true)} className="w-full sm:w-auto">
              👻 Connect Phantom Wallet
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
