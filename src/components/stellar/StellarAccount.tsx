'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { usePrivySafe as usePrivy } from './usePrivySafe';
import { useStellarHolder } from './useStellarHolder';

const DEVNET = process.env.NEXT_PUBLIC_SOLANA_CLUSTER === 'devnet';
const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_HELIUS_RPC_URL ?? (DEVNET ? 'https://api.devnet.solana.com' : 'https://api.mainnet-beta.solana.com');

/** The holder's helmet: white shell, gold visor with the sky in it. */
function Helmet() {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg viewBox="3 3 34 34" width="40" height="40" aria-hidden="true">
      <defs>
        <radialGradient id={`${u}s`} cx="36%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="55%" stopColor="#d9dbe0" />
          <stop offset="100%" stopColor="#7d828c" />
        </radialGradient>
        <linearGradient id={`${u}v`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#fff1b8" />
          <stop offset="22%" stopColor="#f2b33d" />
          <stop offset="60%" stopColor="#9a5a12" />
          <stop offset="100%" stopColor="#2a1404" />
        </linearGradient>
        <linearGradient id={`${u}r`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c9ccd3" />
          <stop offset="100%" stopColor="#5b606a" />
        </linearGradient>
        <clipPath id={`${u}c`}>
          <path d={VISOR} />
        </clipPath>
      </defs>
      <rect x="3" y="3" width="34" height="34" fill="#0b0b0e" />
      <circle cx="7" cy="8" r="0.7" fill="#fff" opacity="0.8" />
      <circle cx="34" cy="10" r="0.5" fill="#fff" opacity="0.6" />
      <path d="M11 30.5h18a2 2 0 0 1 2 2V37H9v-4.5a2 2 0 0 1 2-2z" fill={`url(#${u}r)`} />
      <rect x="9" y="33" width="22" height="1.1" fill="#3d4149" opacity="0.6" />
      <rect x="5.6" y="16" width="3.6" height="7" rx="1.6" fill="#a9adb6" />
      <rect x="30.8" y="16" width="3.6" height="7" rx="1.6" fill="#a9adb6" />
      <path d="M20 4.5c7.6 0 12.6 5.6 12.6 13.3 0 6.4-3.3 11.4-7.6 13.2H15c-4.3-1.8-7.6-6.8-7.6-13.2C7.4 10.1 12.4 4.5 20 4.5z" fill={`url(#${u}s)`} />
      <path d="M9.6 18.6c0-6 4.6-9.6 10.4-9.6s10.4 3.6 10.4 9.6c0 5-3.8 8.4-10.4 8.4S9.6 23.6 9.6 18.6z" fill="#1d1f24" />
      <path d={VISOR} fill={`url(#${u}v)`} />
      <g clipPath={`url(#${u}c)`}>
        <path d="M9 21c5-1.6 11-1.4 22 1.2V30H9z" fill="#120a03" opacity="0.55" />
        <path d="M12.6 15.8c1.4-2.6 4-4.1 7.2-4.3" fill="none" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" opacity="0.9" />
        <path d="M13 18.3c.3-.8.7-1.4 1.2-2" fill="none" stroke="#fff" strokeWidth="0.9" strokeLinecap="round" opacity="0.6" />
        <circle cx="25.5" cy="14.6" r="0.55" fill="#fff" opacity="0.9" />
        <circle cx="23.4" cy="20.4" r="0.4" fill="#fff" opacity="0.7" />
      </g>
      <rect x="17.2" y="28" width="5.6" height="1.2" rx="0.6" fill="#8b9099" />
      <rect x="25.6" y="27" width="2.6" height="1.7" rx="0.3" fill="#d33a2c" />
      <rect x="25.6" y="27" width="1.1" height="0.9" fill="#2b4fae" />
    </svg>
  );
}
const VISOR = 'M10.6 18.6c0-5.3 4.2-8.6 9.4-8.6s9.4 3.3 9.4 8.6c0 4.4-3.3 7.4-9.4 7.4s-9.4-3-9.4-7.4z';

/** Two cards, one over the other. */
const CardsGlyph = (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
    <rect x="5" y="2" width="8.5" height="11.5" rx="1.6" />
    <path d="M3.2 5.2v8.2A1.6 1.6 0 0 0 4.8 15h6.4" />
  </svg>
);

/**
 * The account corner: how many cards the holder has, and the holder's helmet,
 * which opens the profile: cards, wallet and its SOL balance.
 */
export default function StellarAccount() {
  const router = useRouter();
  const { login, logout } = usePrivy();
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
        <Helmet />
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
          {sol !== null && (
            <div className="sd-menu__id sd-menu__bal">
              <span className="sd-label">Balance</span>
              <span className="sd-menu__sol">
                <i className={sol ? 'is-funded' : ''} aria-hidden="true" />
                {sol.toFixed(sol < 1 ? 3 : 2)} <small>SOL</small>
              </span>
            </div>
          )}
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
