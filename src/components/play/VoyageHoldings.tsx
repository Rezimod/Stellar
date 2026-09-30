'use client';

import { useEffect } from 'react';
import { useStellarHolder } from '@/components/stellar/useStellarHolder';
import { holdings } from '@/game/destinations';
import type { VoyageDestination } from '@/lib/stellar/voyage';

/** The holder's cards become the game's destinations; signed out, none are held. */
export default function VoyageHoldings() {
  const { ready, authenticated, address } = useStellarHolder();
  useEffect(() => {
    if (!ready) return;
    if (!authenticated || !address) {
      holdings.set({ status: 'signedOut', held: [] });
      return;
    }
    const ctrl = new AbortController();
    holdings.set({ status: 'loading', held: [] });
    fetch(`/api/stellar/voyage?wallet=${encodeURIComponent(address)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<{ destinations: VoyageDestination[] }>) : Promise.reject(new Error(String(r.status)))))
      .then(({ destinations }) => holdings.set({ status: 'ready', held: destinations }))
      .catch(() => {
        if (!ctrl.signal.aborted) holdings.set({ status: 'unavailable', held: [] });
      });
    return () => ctrl.abort();
  }, [ready, authenticated, address]);
  return null;
}
