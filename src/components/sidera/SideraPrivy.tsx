'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useEffect, type ReactNode } from 'react';
import { SolanaWalletProvider } from '@/components/providers/PrivyProvider';
import { useSideraAuth } from './SideraAuth';

/** Opens Privy's sign-in window if Sign in is what loaded it. */
function LoginOnArrival() {
  const { ready, authenticated, login } = usePrivy();
  const { wantsLogin, loginOpened } = useSideraAuth();
  useEffect(() => {
    if (!ready || !wantsLogin) return;
    loginOpened();
    if (!authenticated) login();
  }, [ready, wantsLogin, authenticated, login, loginOpened]);
  return null;
}

export default function SideraPrivy({ children }: { children: ReactNode }) {
  return (
    <SolanaWalletProvider>
      <LoginOnArrival />
      {children}
    </SolanaWalletProvider>
  );
}
