'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useSideraAuth } from './SideraAuth';

type Privy = ReturnType<typeof usePrivy>;

/**
 * usePrivy, before Privy has loaded: nobody is signed in, and signing in loads
 * it. `ready` from SideraAuth never changes under a mounted component — Privy
 * arriving remounts the page inside its provider — so the hook order holds.
 */
export function usePrivySafe(): Privy {
  const auth = useSideraAuth();
  if (!auth.ready) {
    return {
      ready: true,
      authenticated: false,
      user: null,
      login: () => auth.enable(true),
      logout: async () => {},
      getAccessToken: async () => null,
    } as unknown as Privy;
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks -- see above
  return usePrivy();
}
