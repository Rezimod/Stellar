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

type EmbeddedSolanaLinkedAccount = {
  type: 'wallet';
  chainType: 'solana';
  walletClientType: string;
  address: string;
};

function findEmbeddedSolanaAddress(
  linkedAccounts: ReadonlyArray<{ type: string }> | undefined,
): string | null {
  if (!linkedAccounts) return null;
  const match = linkedAccounts.find(
    (a): a is EmbeddedSolanaLinkedAccount =>
      a.type === 'wallet' &&
      (a as { chainType?: string }).chainType === 'solana' &&
      (a as { walletClientType?: string }).walletClientType === 'privy',
  );
  return match?.address ?? null;
}

export function useStellarUser(): StellarUser {
  const privy = usePrivy();
  const privySolana = usePrivySolanaWallets();
  const adapter = useWalletAdapter();

  // Prefer the address from `user.linkedAccounts` — it's available the moment
  // Privy reports `authenticated`. The /solana useWallets hook is a strict
  // upgrade path (returns the live signer) but lags behind login by a tick or
  // two, which would otherwise leave us with `authenticated:true,address:null`.
  const linkedEmbedded = useMemo(
    () => findEmbeddedSolanaAddress(privy.user?.linkedAccounts),
    [privy.user],
  );

  const liveSolanaAddress = useMemo(() => {
    if (!privySolana.ready) return null;
    return privySolana.wallets[0]?.address ?? null;
  }, [privySolana.ready, privySolana.wallets]);

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
      const address = liveSolanaAddress ?? linkedEmbedded;
      return {
        authenticated: true,
        source: 'privy',
        address,
        displayName: email ?? (address ? shortAddress(address) : null),
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
    linkedEmbedded,
    liveSolanaAddress,
    adapter.connected,
    adapter.publicKey,
    adapter.wallet,
  ]);
}

function shortAddress(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}
