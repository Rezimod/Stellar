import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ANON_KEY = 'stellar.field.anon-id.v1';

function makeId() {
  return `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Returns a stable user id for the current device.
 *
 * In the full Stellar build, Stellar Field shares the Privy embedded
 * Solana wallet with the web app and uses Privy's user.id here. In this
 * verification build Privy is disabled (the @privy-io/expo native peer
 * deps were the second-largest source of EAS build failures, separate
 * from QVAC's Bare-runtime issues), so we fall back to a device-local
 * anon UUID stored once in AsyncStorage. Observations recorded with the
 * anon id can be reattributed to the real Privy user on first login.
 */
export function useUserId(): string {
  const [anonId, setAnonId] = useState<string>('');

  useEffect(() => {
    (async () => {
      const existing = await AsyncStorage.getItem(ANON_KEY);
      if (existing) {
        setAnonId(existing);
        return;
      }
      const fresh = makeId();
      await AsyncStorage.setItem(ANON_KEY, fresh);
      setAnonId(fresh);
    })();
  }, []);

  return anonId;
}
