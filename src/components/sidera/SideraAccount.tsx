'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { usePrivySafe as usePrivy } from './usePrivySafe';
import { useSideraHolder } from './useSideraHolder';

const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_HELIUS_RPC_URL ?? 'https://api.mainnet-beta.solana.com';

/** A small world drawn from the wallet address: the same holder, the same planet. */
function Avatar({ seed }: { seed: string }) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  const ringed = h % 3 === 0;
  return (
    <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
      <defs>
        <radialGradient id={`av-${h}`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor={`hsl(${hue} 80% 78%)`} />
          <stop offset="60%" stopColor={`hsl(${(hue + 30) % 360} 60% 42%)`} />
          <stop offset="100%" stopColor={`hsl(${(hue + 50) % 360} 55% 16%)`} />
        </radialGradient>
      </defs>
      <rect width="40" height="40" fill="#070e22" />
      <circle cx="20" cy="20" r="11" fill={`url(#av-${h})`} />
      {ringed && <ellipse cx="20" cy="20" rx="17" ry="4.5" fill="none" stroke={`hsl(${hue} 70% 80%)`} strokeOpacity="0.7" strokeWidth="1.2" transform="rotate(-20 20 20)" />}
      <circle cx="8" cy="9" r="0.8" fill="#fff" opacity="0.8" />
      <circle cx="33" cy="31" r="0.6" fill="#fff" opacity="0.6" />
    </svg>
  );
}

/**
 * The account corner: how many cards the holder has, what the wallet holds,
 * and the holder's own small planet, which opens the menu.
 */
export default function SideraAccount() {
  const router = useRouter();
  const { user, login, logout } = usePrivy();
  const { authenticated, ready, address } = useSideraHolder();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cards, setCards] = useState<number | null>(null);
  const [sol, setSol] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!address) return;
    let live = true;
    fetch(`/api/sidera/holder?wallet=${address}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => live && d && setCards(d.cards))
      .catch(() => {});
    fetch(RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address] }),
    })
      .then((r) => r.json())
      .then((d) => live && typeof d?.result?.value === 'number' && setSol(d.result.value / 1e9))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [address]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, [menuOpen]);

  if (!ready) return <span className="sd-chip" aria-hidden="true" style={{ visibility: 'hidden' }}>Sign in</span>;

  if (!authenticated) {
    return (
      <>
        <button type="button" className="sd-chip sd-chip--cta" onClick={() => login()}>
          Sign in
        </button>
      </>
    );
  }

  const short = address ? `${address.slice(0, 4)}…${address.slice(-4)}` : '—';
  const copy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {}
  };
  const signOut = async () => {
    setMenuOpen(false);
    try {
      await logout();
    } catch {}
    router.push('/');
  };

  return (
    <div ref={wrapRef} className="sd-account">
      <Link href="/collection" className="sd-chip">
        <strong>{cards ?? '—'}</strong> <span>Cards</span>
      </Link>
      <span className="sd-chip sd-chip--wallet" title={address ?? undefined}>
        <strong>{sol === null ? '—' : sol.toFixed(sol < 1 ? 3 : 2)}</strong> <span>SOL</span>
        <i className={sol ? 'is-funded' : ''} aria-hidden="true" />
      </span>
      <button
        ref={triggerRef}
        type="button"
        className="sd-avatar"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls="sd-account-menu"
        aria-label="Account"
        onClick={() => setMenuOpen((v) => !v)}
      >
        <Avatar seed={address ?? user?.id ?? 'sidera'} />
      </button>

      {menuOpen && (
        <div id="sd-account-menu" role="menu" className="sd-menu">
          <div className="sd-menu__head">
            <span className="sd-label">Cards held</span>
            <span className="sd-menu__big">
              {cards ?? '—'} <small>cards</small>
            </span>
          </div>
          <p className="sd-menu__note">Every card you own is a numbered edition, yours alone.</p>
          <div className="sd-menu__id">
            <span className="sd-label">Wallet</span>
            <button type="button" className="sd-menu__copy" onClick={copy} aria-label="Copy wallet address">
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="sd-menu__addr">{address ?? 'No Solana wallet yet'}</p>
          <div className="sd-menu__rule" />
          <Link role="menuitem" href="/collection" onClick={() => setMenuOpen(false)}>
            Your Collection <span aria-hidden="true">{short}</span>
          </Link>
          <Link role="menuitem" href="/tonight" onClick={() => setMenuOpen(false)}>
            Tonight’s vote <span aria-hidden="true">→</span>
          </Link>
          {address && (
            <a role="menuitem" href={`https://solscan.io/account/${address}`} target="_blank" rel="noreferrer">
              Your transactions <span aria-hidden="true">↗</span>
            </a>
          )}
          <button role="menuitem" type="button" onClick={signOut}>
            Log out <span aria-hidden="true">⎋</span>
          </button>
        </div>
      )}
    </div>
  );
}
