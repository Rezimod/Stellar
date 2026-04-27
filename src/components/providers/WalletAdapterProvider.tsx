'use client';

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { WalletAdapterNetwork, type WalletError } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';
import { useCallback, useMemo, type ReactNode } from 'react';

export function WalletAdapterProvider({ children }: { children: ReactNode }) {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(
    () =>
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
      process.env.NEXT_PUBLIC_HELIUS_RPC_URL ??
      clusterApiUrl(network),
    [network],
  );

  const onError = useCallback((error: WalletError) => {
    console.error('[Wallet adapter]', error);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} onError={onError} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
