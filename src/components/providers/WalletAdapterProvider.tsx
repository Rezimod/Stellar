'use client';

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { WalletAdapterNetwork, type WalletError } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
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

  // Register Phantom/Solflare/Backpack explicitly so the wallet modal still
  // lists them when no extension is installed. Each adapter's `Loadable` state
  // triggers the modal to deep-link into the wallet's mobile in-app browser
  // (e.g. phantom.app/ul/browse/...) on mobile, or open the install page on
  // desktop. Without these, the modal is empty for users without an extension.
  // Modern wallets that auto-register via Wallet Standard (e.g. Phantom in its
  // own in-app browser) are still detected on top of these — no double-listing.
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new BackpackWalletAdapter(),
    ],
    [network],
  );

  const onError = useCallback((error: WalletError) => {
    console.error('[Wallet adapter]', error);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} onError={onError} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
