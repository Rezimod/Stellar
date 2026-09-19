'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useStellarAuth } from '@/hooks/useStellarAuth';
import { useDisplayProfile } from '@/hooks/useDisplayProfile';
import { AuthModal } from '@/components/auth/AuthModal';

/**
 * The account control from the global Nav — same Privy session, same sign-in
 * modal — set in the Sidera register: a mono text button and a plain menu.
 */
export default function SideraAccount() {
  const router = useRouter();
  const { logout } = useStellarAuth();
  const { authenticated, ready, displayName } = useDisplayProfile();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMenuOpen(false); triggerRef.current?.focus(); }
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

  if (!ready) return <span className="sd-account-btn" aria-hidden="true" style={{ visibility: 'hidden' }}>Sign in</span>;

  if (!authenticated) {
    return (
      <>
        <button type="button" className="sd-account-btn" onClick={() => setAuthOpen(true)}>Sign in</button>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </>
    );
  }

  const signOut = async () => {
    setMenuOpen(false);
    try { await logout(); } catch {}
    router.push('/');
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        type="button"
        className="sd-account-btn"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls="sd-account-menu"
        onClick={() => setMenuOpen((v) => !v)}
        style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {displayName || 'Account'}
      </button>
      {menuOpen && (
        <div id="sd-account-menu" role="menu" className="sd-account-menu">
          <Link role="menuitem" href="/collection" onClick={() => setMenuOpen(false)}>Collection</Link>
          <Link role="menuitem" href="/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
          <button role="menuitem" type="button" onClick={signOut}>Sign out</button>
        </div>
      )}
    </div>
  );
}
