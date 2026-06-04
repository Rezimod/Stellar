'use client';

import { useEffect } from 'react';
import { track } from '@/lib/track';

/** Fires the `open` event once per browser session. Mounted at the app root. */
export function AnalyticsBoot() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem('stellar_open_tracked')) return;
      sessionStorage.setItem('stellar_open_tracked', '1');
    } catch {
      // private mode — fall through and still track once per mount
    }
    track('open');
  }, []);

  return null;
}
