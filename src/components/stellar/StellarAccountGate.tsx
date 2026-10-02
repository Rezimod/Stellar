'use client';

import dynamic from 'next/dynamic';
import { useStellarSession } from './StellarAuth';

const StellarAccount = dynamic(() => import('./StellarAccount'), {
  ssr: false,
  loading: () => (
    <span className="sd-chip" aria-hidden="true" style={{ visibility: 'hidden' }}>
      Log in
    </span>
  ),
});

/** The account corner: a plain Log in until Privy is wanted, then the full menu. */
export default function StellarAccountGate() {
  const { ready, enable } = useStellarSession();
  if (!ready)
    return (
      <button type="button" className="sd-chip sd-chip--cta" onClick={() => enable(true)}>
        Log in
      </button>
    );
  return <StellarAccount />;
}
