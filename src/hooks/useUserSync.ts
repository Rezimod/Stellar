'use client';

import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth';

const UPSERT_KEY_PREFIX = 'stellar:upserted:';

// Defer to the next idle frame so we never compete with first paint.
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

    // Dedupe: only upsert once per session per (privyId + walletAddress) combo.
    const dedupeKey = UPSERT_KEY_PREFIX + user.id + ':' + (walletAddress ?? 'none');
    try {
      if (sessionStorage.getItem(dedupeKey) === '1') return;
    } catch {}

    let cancelled = false;
    runWhenIdle(() => {
      if (cancelled) return;
      getAccessToken()
        .then((token) => {
          if (!token || cancelled) return;
          return fetch('/api/users/upsert', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ privyId: user.id, email, walletAddress }),
          }).then(() => {
            try { sessionStorage.setItem(dedupeKey, '1'); } catch {}
          }).catch(() => {});
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [authenticated, user, wallets, getAccessToken]);
}
