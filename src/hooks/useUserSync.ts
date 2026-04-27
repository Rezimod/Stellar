'use client';

import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth';

export function useUserSync() {
  const { authenticated, user, getAccessToken } = usePrivy();
  const { wallets } = useWallets();

  useEffect(() => {
    if (!authenticated || !user) return;

    const email = user.email?.address ?? null;
    const solanaWallet = wallets.find(
      (w) => w.walletClientType === 'privy' && (w as { chainType?: string }).chainType === 'solana',
    );
    const walletAddress = solanaWallet?.address ?? null;

    getAccessToken()
      .then((token) => {
        if (!token) return;
        fetch('/api/users/upsert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ privyId: user.id, email, walletAddress }),
        }).catch(() => {});
      })
      .catch(() => {});
  }, [authenticated, user, wallets, getAccessToken]);
}
