'use client';

import { useEffect, useRef } from 'react';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useAppState } from '@/hooks/useAppState';

const FUND_KEY_PREFIX = 'stellar:funded:';
const SYNCED_KEY_PREFIX = 'stellar:synced:';

function runWhenIdle(cb: () => void) {
  if (typeof window === 'undefined') return;
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
  };
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(cb, { timeout: 2000 });
  } else {
    window.setTimeout(cb, 600);
  }
}

export default function WalletSync() {
  const { address, source } = useStellarUser();
  const { state, setWallet } = useAppState();
  const fundingRef = useRef<string | null>(null);
  const syncingRef = useRef<string | null>(null);

  // Keep cached state.walletAddress in sync with the live address.
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
    runWhenIdle(() => {
      fetch('/api/wallet/fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      })
        .then((r) => r.json().catch(() => null))
        .then((data) => {
          if (data && data.funded && process.env.NODE_ENV === 'development') {
            console.log('[wallet-fund] dripped 0.02 SOL →', data.txId);
          }
          try { sessionStorage.setItem(FUND_KEY_PREFIX + address, '1'); } catch {}
        })
        .catch((err) => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[wallet-fund] failed (will retry next session):', err);
          }
        });
    });
  }, [address, source]);

  // Stars are minted to whichever wallet was active at the time the user
  // completed each mission. When the user switches wallets (e.g. signs in
  // with Phantom after earning stars on the Privy embedded wallet), the
  // currently-connected address has fewer Stars than the user has actually
  // earned. Top up the active wallet to match local-state lifetime total
  // once per address — the server endpoint is a no-op if balance already
  // meets the target.
  useEffect(() => {
    if (!address) return;
    if (syncingRef.current === address) return;
    const expected = state.completedMissions
      .filter((m) => m.status === 'completed')
      .reduce((sum, m) => sum + (m.stars ?? 0), 0);
    if (expected <= 0) return;
    try {
      if (sessionStorage.getItem(SYNCED_KEY_PREFIX + address) === '1') return;
    } catch {}
    syncingRef.current = address;
    runWhenIdle(() => {
      fetch('/api/stars/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, expectedTotal: expected }),
      })
        .then((r) => r.json().catch(() => null))
        .then((data) => {
          if (data?.synced) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`[stars-sync] minted ${data.minted} ✦ to ${address.slice(0, 8)}… → ${data.txId}`);
            }
            window.dispatchEvent(new CustomEvent('stellar:stars-synced', { detail: data }));
          }
          try { sessionStorage.setItem(SYNCED_KEY_PREFIX + address, '1'); } catch {}
        })
        .catch((err) => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[stars-sync] failed:', err);
          }
        });
    });
  }, [address, state.completedMissions]);

  return null;
}
