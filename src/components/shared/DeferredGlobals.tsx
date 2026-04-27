'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const AstraPopup = dynamic(() => import('./AstraPopup'), { ssr: false });
const CookieConsent = dynamic(() => import('./CookieConsent'), { ssr: false });
const PullToRefresh = dynamic(() => import('./PullToRefresh'), { ssr: false });
const OfflineBanner = dynamic(() => import('./OfflineBanner'), { ssr: false });

export default function DeferredGlobals() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
    };
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(() => setReady(true), { timeout: 2000 });
    } else {
      const t = window.setTimeout(() => setReady(true), 800);
      return () => window.clearTimeout(t);
    }
  }, []);

  if (!ready) return null;

  return (
    <>
      <OfflineBanner />
      <PullToRefresh />
      <AstraPopup />
      <CookieConsent />
    </>
  );
}
