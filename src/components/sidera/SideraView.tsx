'use client';

import { useEffect } from 'react';
import { track } from '@/lib/track';

export type SideraStep = 'landing' | 'set' | 'card' | 'capsules' | 'capsule' | 'collection' | 'tonight';

/** One funnel step, counted once per page view. */
export default function SideraView({ step }: { step: SideraStep }) {
  useEffect(() => {
    track('sidera_view', { step });
  }, [step]);
  return null;
}
