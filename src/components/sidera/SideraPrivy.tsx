'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';
import { useEffect } from 'react';
import { SolanaWalletProvider } from '@/components/providers/PrivyProvider';
import { useSideraAuth, type PrivyState } from './SideraAuth';

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

/** Reads Privy inside its provider and reports every change up to SideraAuth. */
function Report({ onState }: { onState: (s: PrivyState) => void }) {
  const privy = usePrivy();
  const { wallets } = useWallets();
  useEffect(() => onState({ privy, wallets }), [privy, wallets, onState]);
  return null;
}

/** Privy's provider, mounted beside the page: it renders nothing of its own but its sign-in window. */
export default function SideraPrivy({ onState }: { onState: (s: PrivyState) => void }) {
  return (
    <SolanaWalletProvider>
      <LoginOnArrival />
      <Report onState={onState} />
    </SolanaWalletProvider>
  );
}
