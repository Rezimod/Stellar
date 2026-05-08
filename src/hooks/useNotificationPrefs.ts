'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_PREFS,
  NotificationCategory,
  NotificationPrefs,
  PREFS_STORAGE_KEY,
  permissionState,
  readPrefs,
  requestPermission,
  writePrefs,
} from '@/lib/notifications';

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    setPrefs(readPrefs());
    setPermission(permissionState());
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === PREFS_STORAGE_KEY) setPrefs(readPrefs());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const update = useCallback((patch: Partial<NotificationPrefs>) => {
    setPrefs(prev => {
      const next = { ...prev, ...patch };
      writePrefs(next);
      return next;
    });
  }, []);

  const toggleMaster = useCallback(async () => {
    if (!prefs.master) {
      const result = await requestPermission();
      setPermission(result);
      if (result === 'granted') update({ master: true });
    } else {
      update({ master: false });
    }
  }, [prefs.master, update]);

  const toggleCategory = useCallback((c: NotificationCategory) => {
    update({ [c]: !prefs[c] } as Partial<NotificationPrefs>);
  }, [prefs, update]);

  return { prefs, permission, toggleMaster, toggleCategory, update };
}
