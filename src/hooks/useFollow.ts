'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';

type State = {
  isFollowing: boolean;
  loading: boolean;
  saving: boolean;
};

/**
 * Follow / unfollow another wallet. The hook resolves both the live status
 * and an optimistic toggle. `targetWallet` may be null — in that case the
 * hook is inert.
 */
export function useFollow(targetWallet: string | null) {
  const { authenticated, address } = useStellarUser();
  const { getAccessToken } = usePrivy();
  const [state, setState] = useState<State>({ isFollowing: false, loading: false, saving: false });

  const isSelf = authenticated && address && targetWallet && address === targetWallet;

  useEffect(() => {
    if (!targetWallet || !address || isSelf) {
      setState({ isFollowing: false, loading: false, saving: false });
      return;
    }
    let cancelled = false;
    setState(s => ({ ...s, loading: true }));
    fetch(`/api/feed/follow?follower=${encodeURIComponent(address)}&followed=${encodeURIComponent(targetWallet)}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        setState({ isFollowing: !!d.isFollowing, loading: false, saving: false });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ isFollowing: false, loading: false, saving: false });
      });
    return () => { cancelled = true };
  }, [targetWallet, address, isSelf]);

  const toggle = useCallback(async () => {
    if (!authenticated || !address || !targetWallet || isSelf || state.saving) return;
    const next = !state.isFollowing;
    setState(s => ({ ...s, saving: true, isFollowing: next }));
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('no token');
      const res = await fetch(
        next ? '/api/feed/follow' : `/api/feed/follow?followed=${encodeURIComponent(targetWallet)}`,
        {
          method: next ? 'POST' : 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: next ? JSON.stringify({ followed: targetWallet }) : undefined,
        },
      );
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setState(s => ({ ...s, isFollowing: !!data.isFollowing, saving: false }));
    } catch {
      setState(s => ({ ...s, isFollowing: !next, saving: false }));
    }
  }, [authenticated, address, targetWallet, isSelf, state.saving, state.isFollowing, getAccessToken]);

  return {
    isFollowing: state.isFollowing,
    loading: state.loading,
    saving: state.saving,
    isSelf: !!isSelf,
    canFollow: authenticated && !isSelf && !!targetWallet,
    toggle,
  };
}
