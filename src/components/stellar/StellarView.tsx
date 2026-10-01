'use client';

import { useEffect } from 'react';
import { track } from '@/lib/track';

export type StellarStep = 'landing' | 'set' | 'card' | 'capsules' | 'capsule' | 'collection' | 'tonight';

/** One funnel step, counted once per page view. */
export default function StellarView({ step }: { step: StellarStep }) {
  useEffect(() => {
    track('stellar_view', { step });
  }, [step]);
  return null;
}
