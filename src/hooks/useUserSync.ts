'use client';

import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';

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

// Embedded Solana wallets surface in `user.linkedAccounts` as soon as Privy
// finishes login — earlier and more reliably than the
// @privy-io/react-auth/solana `useWallets` hook, which is gated on the
// Standard-Wallet adapter being ready. Reading from linkedAccounts also
// avoids the wrong-import bug where `useWallets` from the root entry
// returns Ethereum wallets only.
type EmbeddedSolanaLinkedAccount = {
  type: 'wallet';
  chainType: 'solana';
  walletClientType: string;
  address: string;
};

function findEmbeddedSolanaAddress(
  linkedAccounts: ReadonlyArray<{ type: string }> | undefined,
): string | null {
  if (!linkedAccounts) return null;
  const match = linkedAccounts.find(
    (a): a is EmbeddedSolanaLinkedAccount =>
      a.type === 'wallet' &&
      (a as { chainType?: string }).chainType === 'solana' &&
      (a as { walletClientType?: string }).walletClientType === 'privy',
  );
  return match?.address ?? null;
}

export function useUserSync() {
  const { authenticated, user, getAccessToken } = usePrivy();

  useEffect(() => {
    if (!authenticated || !user) return;

    const email = user.email?.address ?? null;
    const walletAddress = findEmbeddedSolanaAddress(user.linkedAccounts);

    // Wait until the embedded Solana wallet exists before upserting. Privy
    // creates it asynchronously after first login; firing now would persist
    // walletAddress=null and (worse) overwrite a previously-saved address.
    if (!walletAddress) return;

    // Dedupe: only upsert once per session per (privyId + walletAddress) combo.
    const dedupeKey = UPSERT_KEY_PREFIX + user.id + ':' + walletAddress;
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
  }, [authenticated, user, getAccessToken]);
}
