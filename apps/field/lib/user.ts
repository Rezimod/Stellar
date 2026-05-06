import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePrivy } from '@privy-io/expo';

const ANON_KEY = 'stellar.field.anon-id.v1';

function makeId() {
  return `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useUserId(): string {
  const privy = usePrivy();
  const privyId =
    (privy as any)?.user?.id ?? (privy as any)?.user?.linkedAccounts?.[0]?.id ?? null;

  const [anonId, setAnonId] = useState<string>('');

  useEffect(() => {
    if (privyId) return;
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
  }, [privyId]);

  return privyId ?? anonId;
}
