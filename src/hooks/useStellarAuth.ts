'use client';

import { useLogin, usePrivy } from '@privy-io/react-auth';
import { useWallet as useWalletAdapter } from '@solana/wallet-adapter-react';
import { useCallback } from 'react';

// Single source of truth for sign-in.
// Both buttons route through Privy so EVERY signed-in user has a Privy
// session (and a JWT). The wallet-adapter modal is no longer used as a
// login path — wallets log in via Privy's `solanaConnectors` and inherit
// a Privy `userId` like email users do. Without this, Phantom users had
// no Privy session and every server endpoint that calls
// `privy.verifyAuthToken` would 401.
export function useStellarAuth() {
  const { logout: privyLogout } = usePrivy();
  const { disconnect: adapterDisconnect } = useWalletAdapter();
  const { login } = useLogin({
    onError: (error) => {
      console.error('[privy login]', error);
    },
  });

  const loginWithEmail = useCallback(() => {
    login({ loginMethods: ['email', 'sms', 'google'] });
  }, [login]);

  const connectWallet = useCallback(() => {
    login({ loginMethods: ['wallet'], walletChainType: 'solana-only' });
  }, [login]);

  const logout = useCallback(async () => {
    await Promise.allSettled([privyLogout(), adapterDisconnect()]);
  }, [privyLogout, adapterDisconnect]);

  return { loginWithEmail, connectWallet, logout };
}
