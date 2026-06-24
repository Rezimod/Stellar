'use client';

import { useEffect } from 'react';
import { track } from '@/lib/track';
import { captureAttribution } from '@/lib/attribution';

/**
 * App-root analytics boot. Two jobs, both on first mount:
 *  1. Snapshot acquisition UTMs before the URL params are navigated away — read
 *     back at signup time to write the user_cohorts row.
 *  2. Fire the `open` event once per browser session.
 * Authenticated, wallet-attributed `session_open` events (the retention signal)
 * are emitted from useUserSync, which has the wallet.
 */
export function AnalyticsBoot() {
  useEffect(() => {
    captureAttribution();

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
