'use client';

import { useEffect, useRef } from 'react';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useAppState } from '@/hooks/useAppState';

const FUND_KEY_PREFIX = 'stellar:funded:';

export default function WalletSync() {
  const { address, source } = useStellarUser();
  const { setWallet } = useAppState();
  const fundingRef = useRef<string | null>(null);

  useEffect(() => {
    if (address) setWallet(address);
  }, [address, setWallet]);

  // External wallets (Phantom, Solflare, Backpack…) start with 0 SOL on devnet,
  // so any signed transaction would fail. Drip a tiny gas budget once per address
  // so users can place bets, claim winnings, and otherwise sign without surprises.
  useEffect(() => {
    if (source !== 'wallet-adapter' || !address) return;
    if (fundingRef.current === address) return;
    try {
      if (sessionStorage.getItem(FUND_KEY_PREFIX + address) === '1') return;
    } catch {}
    fundingRef.current = address;
    fetch('/api/wallet/fund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    })
      .then((r) => r.json().catch(() => null))
      .then((data) => {
        if (data && data.funded) {
          console.log('[wallet-fund] dripped 0.02 SOL →', data.txId);
        }
        try { sessionStorage.setItem(FUND_KEY_PREFIX + address, '1'); } catch {}
      })
      .catch((err) => {
        console.warn('[wallet-fund] failed (will retry next session):', err);
      });
  }, [address, source]);

  return null;
}
