'use client';

import dynamic from 'next/dynamic';
import { useSideraAuth } from './SideraAuth';

const SideraAccount = dynamic(() => import('./SideraAccount'), {
  ssr: false,
  loading: () => (
    <span className="sd-chip" aria-hidden="true" style={{ visibility: 'hidden' }}>
      Sign in
    </span>
  ),
});

/** The account corner: a plain Sign in until Privy is wanted, then the full menu. */
export default function SideraAccountGate() {
  const { ready, enable } = useSideraAuth();
  if (!ready)
    return (
      <button type="button" className="sd-chip sd-chip--cta" onClick={() => enable(true)}>
        Sign in
      </button>
    );
  return <SideraAccount />;
}
