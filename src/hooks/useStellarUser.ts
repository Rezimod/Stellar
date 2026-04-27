'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useWallets as usePrivySolanaWallets } from '@privy-io/react-auth/solana';
import { useWallet as useWalletAdapter } from '@solana/wallet-adapter-react';
import { useMemo } from 'react';

export type StellarAuthSource = 'privy' | 'wallet-adapter' | null;

export interface StellarUser {
  authenticated: boolean;
  source: StellarAuthSource;
  address: string | null;
  displayName: string | null;
  email: string | null;
  ready: boolean;
}

export function useStellarUser(): StellarUser {
  const privy = usePrivy();
  const privySolana = usePrivySolanaWallets();
  const adapter = useWalletAdapter();

  const privyEmbeddedAddress = useMemo(() => {
    const embedded = privySolana.wallets.find(
      (w) => (w as { walletClientType?: string }).walletClientType === 'privy',
    );
    return embedded?.address ?? privySolana.wallets[0]?.address ?? null;
  }, [privySolana.wallets]);

  return useMemo<StellarUser>(() => {
    const ready = privy.ready;

    if (adapter.connected && adapter.publicKey) {
      const address = adapter.publicKey.toBase58();
      return {
        authenticated: true,
        source: 'wallet-adapter',
        address,
        displayName: adapter.wallet?.adapter.name ?? shortAddress(address),
        email: null,
        ready,
      };
    }

    if (privy.authenticated && privy.user) {
      const email =
        privy.user.email?.address ??
        (privy.user.linkedAccounts.find((a) => a.type === 'email') as { address?: string } | undefined)?.address ??
        null;
      return {
        authenticated: true,
        source: 'privy',
        address: privyEmbeddedAddress,
        displayName: email ?? (privyEmbeddedAddress ? shortAddress(privyEmbeddedAddress) : null),
        email,
        ready,
      };
    }

    return {
      authenticated: false,
      source: null,
      address: null,
      displayName: null,
      email: null,
      ready,
    };
  }, [
    privy.ready,
    privy.authenticated,
    privy.user,
    privyEmbeddedAddress,
    adapter.connected,
    adapter.publicKey,
    adapter.wallet,
  ]);
}

function shortAddress(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}
