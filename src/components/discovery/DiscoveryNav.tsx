'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

/**
 * The only chrome the discovery funnel has.
 *
 * /discovery hides the app's global Nav, BottomNav and Footer (see the
 * immersive block in discovery.css), so this bar carries the whole job: the
 * way back to the main site, movement between the three discovery surfaces,
 * and the wallet.
 */

const LINKS = [
  { href: '/discovery/mint', label: 'Mint' },
  { href: '/discovery/reveal', label: 'My Discovery' },
  { href: '/discovery/leaderboard', label: 'Leaderboard' },
];

const short = (address: string) => `${address.slice(0, 4)}…${address.slice(-4)}`;

function WalletPill() {
  const { connected, connecting, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  // The adapter restores its last session on the client, so the first paint
  // can disagree with the server. Hold the neutral label until mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button type="button" className="dsc-nav-wallet" disabled>
        Connect
      </button>
    );
  }

  if (!connected || !publicKey) {
    return (
      <button
        type="button"
        className="dsc-nav-wallet"
        disabled={connecting}
        onClick={() => setVisible(true)}
      >
        {connecting ? 'Connecting…' : 'Connect'}
      </button>
    );
  }

  const address = publicKey.toBase58();

  return (
    <button
      type="button"
      className="dsc-nav-wallet dsc-nav-wallet--connected"
      aria-label={`Disconnect wallet ${address}`}
      title="Disconnect"
      onClick={() => void disconnect()}
    >
      {short(address)}
    </button>
  );
}

export default function DiscoveryNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close on navigation — the sheet is fixed, so it would otherwise survive
  // the route change and cover the page the user just asked for.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    // The sheet is opaque and full-screen; letting the page scroll underneath
    // it means closing the menu lands the user somewhere else.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = (href: string) => (pathname === href ? 'page' : undefined);

  return (
    <>
      <header className="dsc-nav">
        <nav className="dsc-nav-inner" aria-label="Discovery">
          <Link href="/" className="dsc-nav-brand">
            Stellarr
          </Link>

          <div className="dsc-nav-links">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="dsc-nav-link"
                aria-current={current(link.href)}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="dsc-nav-right">
            <WalletPill />

            <button
              type="button"
              className="dsc-nav-burger"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="dsc-nav-sheet"
              onClick={() => setOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </nav>
      </header>

      {/* Sibling of the bar, not a child: .dsc-nav carries a backdrop-filter,
          which makes it the containing block for fixed descendants — a sheet
          nested inside it would size itself to the 48px bar. */}
      {open && (
        <div id="dsc-nav-sheet" className="dsc-nav-sheet">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="dsc-nav-sheet-link"
              aria-current={current(link.href)}
            >
              {link.label}
            </Link>
          ))}

          <Link
            href="/discovery"
            className="dsc-nav-sheet-link"
            aria-current={current('/discovery')}
          >
            Overview
          </Link>

          <p className="dsc-nav-sheet-foot">Reveal: Oct 21, 2026 · stellarr.club</p>
        </div>
      )}
    </>
  );
}
