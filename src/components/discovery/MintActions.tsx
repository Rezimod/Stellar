'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { toast } from '@/components/ui/Toast';

const short = (address: string) => `${address.slice(0, 4)}…${address.slice(-4)}`;

/**
 * Connect → mint call to action.
 *
 * Uses the app's existing wallet-adapter modal (WalletModalProvider is already
 * mounted in the root layout). The mint itself is not wired to chain yet, so
 * the connected state deliberately stops at an explanatory toast rather than
 * pretending to build a transaction.
 */
export default function MintActions() {
  const { connected, connecting, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  // The adapter restores its last session on the client, so the first paint can
  // disagree with the server. Render the resolved state only after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button type="button" className="dsc-cta dsc-cta--ghost" disabled>
        Connect Wallet
      </button>
    );
  }

  if (!connected || !publicKey) {
    return (
      <button
        type="button"
        className="dsc-cta dsc-cta--ghost"
        onClick={() => setVisible(true)}
        disabled={connecting}
      >
        {connecting ? 'Connecting…' : 'Connect Wallet'}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        className="dsc-cta"
        onClick={() =>
          toast.info('Minting is not open yet. Passes go on sale ahead of the October 21 reveal.')
        }
      >
        Mint Your Pass
      </button>

      <div className="flex items-center justify-between gap-3">
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--dsc-ghost-dim)',
          }}
        >
          {short(publicKey.toBase58())}
        </span>
        <button
          type="button"
          onClick={() => void disconnect()}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            minHeight: 0,
            color: 'var(--dsc-ghost-dim)',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
            cursor: 'pointer',
          }}
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}
