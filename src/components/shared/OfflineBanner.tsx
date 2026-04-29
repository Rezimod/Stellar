'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const goOnline = () => {
      setOffline(false);
      setTimeout(() => setVisible(false), 3000);
    };
    const goOffline = () => {
      setOffline(true);
      setVisible(true);
    };

    if (!navigator.onLine) {
      setOffline(true);
      setVisible(true);
    }

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`relative z-50 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium transition-all duration-500 ${
        offline
          ? 'bg-terracotta border-b border-terracotta text-terracotta'
          : 'bg-seafoam border-b border-seafoam text-seafoam'
      }`}
    >
      {offline ? <WifiOff size={13} /> : <Wifi size={13} />}
      {offline
        ? 'Offline — observations will queue and sync when you reconnect'
        : '✓ Back online — syncing queued observations…'}
    </div>
  );
}
