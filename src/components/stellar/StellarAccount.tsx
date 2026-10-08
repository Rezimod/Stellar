'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { usePrivySafe as usePrivy } from './usePrivySafe';
import { useStellarHolder } from './useStellarHolder';

const DEVNET = process.env.NEXT_PUBLIC_SOLANA_CLUSTER === 'devnet';
const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_HELIUS_RPC_URL ?? (DEVNET ? 'https://api.devnet.solana.com' : 'https://api.mainnet-beta.solana.com');

/** A small world drawn from the wallet address: the same holder, the same planet, lit from the upper left. */
function Avatar({ seed }: { seed: string }) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  const ringed = h % 3 === 0;
  return (
    <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
      <defs>
        <radialGradient id={`av-${h}`} cx="34%" cy="30%" r="78%">
          <stop offset="0%" stopColor={`hsl(${hue} 72% 80%)`} />
          <stop offset="55%" stopColor={`hsl(${(hue + 28) % 360} 58% 42%)`} />
          <stop offset="100%" stopColor={`hsl(${(hue + 48) % 360} 55% 12%)`} />
        </radialGradient>
        <radialGradient id={`av-${h}s`} cx="28%" cy="24%" r="60%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="40" height="40" fill="#0d0b0a" />
      <circle cx="20" cy="20" r="11.5" fill={`url(#av-${h})`} />
      <circle cx="20" cy="20" r="11.5" fill={`url(#av-${h}s)`} />
      {ringed && <ellipse cx="20" cy="20" rx="17" ry="4.5" fill="none" stroke={`hsl(${hue} 70% 82%)`} strokeOpacity="0.7" strokeWidth="1.2" transform="rotate(-20 20 20)" />}
      <circle cx="8" cy="9" r="0.8" fill="#fff" opacity="0.8" />
      <circle cx="33" cy="31" r="0.6" fill="#fff" opacity="0.6" />
    </svg>
  );
}

/** Two cards, one over the other. */
const CardsGlyph = (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
    <rect x="5" y="2" width="8.5" height="11.5" rx="1.6" />
    <path d="M3.2 5.2v8.2A1.6 1.6 0 0 0 4.8 15h6.4" />
  </svg>
);

/**
 * The account corner: how many cards the holder has, what the wallet holds,
 * and the holder's own small planet, which opens the menu.
 */
export default function StellarAccount() {
  const router = useRouter();
  const { user, login, logout } = usePrivy();
  const { authenticated, ready, address } = useStellarHolder();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cards, setCards] = useState<number | null>(null);
  const [sol, setSol] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!address) return;
    let live = true;
    fetch(`/api/stellar/holder?wallet=${address}`)
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

  if (!ready) return <span className="sd-chip sd-chip--cta" aria-hidden="true" style={{ visibility: 'hidden' }}>Log in</span>;

  if (!authenticated) {
    return (
      <>
        <button type="button" className="sd-chip sd-chip--cta" onClick={() => login()}>
          Log in
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
      <div className="sd-acct">
        <Link href="/collection" className="sd-acct__seg sd-acct__cards" aria-label={cards === null ? 'Your Collection' : `Your Collection, ${cards} cards`}>
          {CardsGlyph}
          {cards !== null && (
            <span className="sd-acct__in">
              <strong>{cards}</strong>
              <span>{cards === 1 ? 'card' : 'cards'}</span>
            </span>
          )}
        </Link>
        {sol !== null && (
          <span className="sd-acct__seg sd-acct__sol" title={address ?? undefined}>
            <span className="sd-acct__in">
              <strong>{sol.toFixed(sol < 1 ? 3 : 2)}</strong>
              <span>SOL</span>
            </span>
            <i className={sol ? 'is-funded' : ''} aria-hidden="true" />
          </span>
        )}
      </div>
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
        <Avatar seed={address ?? user?.id ?? 'stellar'} />
      </button>

      {menuOpen && (
        <div id="sd-account-menu" role="menu" className="sd-menu">
          <div className="sd-menu__head">
            <span className="sd-label">Cards held</span>
            <span className="sd-menu__big">
              {cards !== null && (
                <>
                  {cards} <small>cards</small>
                </>
              )}
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
          <button role="menuitem" type="button" onClick={signOut}>
            Log out <span aria-hidden="true">⎋</span>
          </button>
          {address && (
            <a role="menuitem" className="sd-menu__chain" href={`https://solscan.io/account/${address}${DEVNET ? '?cluster=devnet' : ''}`} target="_blank" rel="noreferrer">
              View on-chain record <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
