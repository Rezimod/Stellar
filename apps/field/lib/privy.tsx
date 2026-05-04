import React from 'react';
import { PrivyProvider, type PrivyConfig } from '@privy-io/expo';
import { env } from './env';

const config: PrivyConfig = {
  embedded: {
    solana: {
      createOnLogin: 'users-without-wallets',
    },
  },
};

export function StellarPrivyProvider({ children }: { children: React.ReactNode }) {
  if (!env.privyAppId) {
    throw new Error('EXPO_PUBLIC_PRIVY_APP_ID is not set');
  }
  return (
    <PrivyProvider appId={env.privyAppId} clientId={env.privyClientId} config={config}>
      {children}
    </PrivyProvider>
  );
}
