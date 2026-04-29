'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';
import type { ReactNode } from 'react';
import { useUserSync } from '@/hooks/useUserSync';

const solanaConnectors = toSolanaWalletConnectors({ shouldAutoConnect: false });

if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
  throw new Error('NEXT_PUBLIC_PRIVY_APP_ID is not set');
}

const DEVNET_HTTP_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
  process.env.NEXT_PUBLIC_HELIUS_RPC_URL ??
  'https://api.devnet.solana.com';

function toWsUrl(url: string): string {
  if (url.startsWith('https://')) return `wss://${url.slice('https://'.length)}`;
  if (url.startsWith('http://')) return `ws://${url.slice('http://'.length)}`;
  return url;
}

const DEVNET_WS_URL = toWsUrl(DEVNET_HTTP_URL);

function UserSyncWrapper({ children }: { children: ReactNode }) {
  useUserSync();
  return <>{children}</>;
}

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID!.trim();

export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['email', 'sms', 'google'],
        appearance: {
          theme: 'dark',
          accentColor: '#E8826B',
          logo: '/brand/logo-mark.svg',
          loginMessage: 'Sign in to Stellar',
          showWalletLoginFirst: false,
        },
        embeddedWallets: {
          ethereum: { createOnLogin: 'off' },
          solana: { createOnLogin: 'users-without-wallets' },
        },
        externalWallets: {
          solana: { connectors: solanaConnectors },
        },
        solana: {
          rpcs: {
            'solana:devnet': {
              rpc: createSolanaRpc(DEVNET_HTTP_URL),
              rpcSubscriptions: createSolanaRpcSubscriptions(DEVNET_WS_URL),
              blockExplorerUrl: 'https://explorer.solana.com?cluster=devnet',
            },
          },
        },
      }}
    >
      <UserSyncWrapper>{children}</UserSyncWrapper>
    </PrivyProvider>
  );
}
