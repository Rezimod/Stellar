'use client';

import { useEffect } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { useAppState } from '@/hooks/useAppState';

export default function WalletSync() {
  const { wallets } = useWallets();
  const { setWallet } = useAppState();
  const solWallet = wallets.find(w => (w as { chainType?: string }).chainType === 'solana');

  useEffect(() => {
    if (solWallet?.address) setWallet(solWallet.address);
  }, [solWallet?.address, setWallet]);

  return null;
}
