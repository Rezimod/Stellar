'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import PreRevealPanel from '@/components/discovery/PreRevealPanel';
import RevealActions from '@/components/discovery/RevealActions';
import RevealSequence from '@/components/discovery/RevealSequence';
import RevealedCard from '@/components/discovery/RevealedCard';
import { REVEAL_AT_MS } from '@/lib/discovery/constants';
import { MOCK_PASS_NUMBER, MOCK_REVEALS, mockTierForAddress } from '@/lib/discovery/mockReveal';
import type { TierId } from '@/lib/discovery/tiers';

/**
 * Routes between the two states of reveal day.
 *
 * `previewTier` forces the post-reveal state with mock data — without it the
 * revealed branch is unreachable until 21 October 2026, so there would be no
 * way to review or demo it.
 */
export default function RevealExperience({ previewTier }: { previewTier: TierId | null }) {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Wallet state is client-only, so nothing can be decided during SSR.
  if (!mounted) {
    return <div style={{ minHeight: '60dvh' }} />;
  }

  // Preview renders mock data, so there is nothing for a wallet to prove. Gating
  // it would mean installing a wallet to review a fixture.
  if (previewTier) {
    const object = MOCK_REVEALS[previewTier];
    return (
      <RevealSequence seenKey={null}>
        <div className="flex flex-col items-center gap-5">
          <RevealedCard object={object} />
          <RevealActions object={object} />
        </div>
      </RevealSequence>
    );
  }

  if (!connected || !publicKey) {
    return (
      <div className="flex flex-col items-center gap-5 py-10 text-center">
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 17,
            fontWeight: 600,
            color: 'var(--dsc-text)',
            margin: 0,
          }}
        >
          Connect the wallet holding your pass
        </p>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13.5,
            lineHeight: 1.55,
            color: 'var(--dsc-ghost)',
            maxWidth: 360,
            margin: 0,
          }}
        >
          Your object is tied to the pass, not to this browser. Connect to see what you hold.
        </p>
        <div className="w-full max-w-[300px]">
          <button type="button" className="dsc-cta dsc-cta--ghost" onClick={() => setVisible(true)}>
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  if (Date.now() < REVEAL_AT_MS) {
    return <PreRevealPanel passNumber={MOCK_PASS_NUMBER} />;
  }

  const tier = mockTierForAddress(publicKey.toBase58());
  const object = MOCK_REVEALS[tier];

  return (
    <RevealSequence seenKey={`stellar_discovery_reveal_seen:${tier}`}>
      <div className="flex flex-col items-center gap-5">
        <RevealedCard object={object} />
        <RevealActions object={object} />
      </div>
    </RevealSequence>
  );
}
