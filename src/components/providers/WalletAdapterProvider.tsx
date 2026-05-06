'use client';

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { WalletAdapterNetwork, type Adapter, type WalletError } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

const network = WalletAdapterNetwork.Devnet;

// Phantom/Solflare/Backpack adapter SDKs are ~150KB combined and only matter
// when the user actually opens the wallet modal. Most users sign in via Privy
// and never see this. Defer the import until idle so initial JS shrinks.
function useDeferredAdapters(): Adapter[] {
  const [wallets, setWallets] = useState<Adapter[]>([]);

  useEffect(() => {
    let cancelled = false;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
    };
    const load = async () => {
      const [{ PhantomWalletAdapter }, { SolflareWalletAdapter }, { BackpackWalletAdapter }] =
        await Promise.all([
          import('@solana/wallet-adapter-phantom'),
          import('@solana/wallet-adapter-solflare'),
          import('@solana/wallet-adapter-backpack'),
        ]);
      if (cancelled) return;
      setWallets([
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter({ network }),
        new BackpackWalletAdapter(),
      ]);
    };
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(() => { void load(); }, { timeout: 3000 });
    } else {
      window.setTimeout(() => { void load(); }, 1500);
    }
    return () => { cancelled = true; };
  }, []);

  return wallets;
}

export function WalletAdapterProvider({ children }: { children: ReactNode }) {
  const endpoint = useMemo(
    () =>
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
      process.env.NEXT_PUBLIC_HELIUS_RPC_URL ??
      clusterApiUrl(network),
    [],
  );

  const wallets = useDeferredAdapters();

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
