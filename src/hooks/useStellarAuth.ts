'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useWallet as useWalletAdapter } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useCallback } from 'react';

export function useStellarAuth() {
  const { login: privyLogin, logout: privyLogout } = usePrivy();
  const { disconnect: adapterDisconnect } = useWalletAdapter();
  const { setVisible: setWalletModalVisible } = useWalletModal();

  const loginWithEmail = useCallback(() => {
    privyLogin();
  }, [privyLogin]);

  const connectWallet = useCallback(() => {
    setWalletModalVisible(true);
  }, [setWalletModalVisible]);

  const logout = useCallback(async () => {
    await Promise.allSettled([privyLogout(), adapterDisconnect()]);
  }, [privyLogout, adapterDisconnect]);

  return { loginWithEmail, connectWallet, logout };
}
