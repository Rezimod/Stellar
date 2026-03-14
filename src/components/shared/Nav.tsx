'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAppState } from '@/hooks/useAppState';
import { getPollinetStatus } from '@/lib/pollinet';
import { useEffect, useState, useCallback } from 'react';
import { Lock, Telescope, Satellite, ImageIcon, User } from 'lucide-react';
import AstroLogo from './AstroLogo';

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { disconnect, connected } = useWallet();
  const { state, pendingCount, reset } = useAppState();
  const [pollinetIcon, setPollinetIcon] = useState('🟢');
  const [showLogout, setShowLogout] = useState(false);
  const clubDone = state.walletConnected && state.membershipMinted && !!state.telescope;
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setEmail(localStorage.getItem('stellar_wallet_email'));
  }, [state.walletConnected]);

  const updatePollinet = useCallback(() => {
    const s = getPollinetStatus();
    setPollinetIcon(s.icon + (pendingCount > 0 ? ` ${pendingCount}⏳` : ''));
  }, [pendingCount]);

  useEffect(() => {
    updatePollinet();
    window.addEventListener('online', updatePollinet);
    window.addEventListener('offline', updatePollinet);
    return () => {
      window.removeEventListener('online', updatePollinet);
      window.removeEventListener('offline', updatePollinet);
    };
  }, [updatePollinet]);

  const handleLogout = async () => {
    if (!confirm('Log out and clear all data?')) return;
    if (connected) await disconnect();
    localStorage.removeItem('stellar_wallet_email');
    localStorage.removeItem('stellar_wallet_address');
    reset();
    router.push('/');
    setShowLogout(false);
  };

  const tabs = [
    { href: '/club', label: 'Club', icon: <Telescope size={17} /> },
    { href: '/missions', label: 'Missions', icon: <Satellite size={17} />, locked: !clubDone },
    { href: '/proof', label: 'Gallery', icon: <ImageIcon size={17} />, locked: !clubDone },
    { href: '/profile', label: 'Profile', icon: <User size={17} />, locked: !clubDone },
  ];

  const walletShort = state.walletAddress
    ? `${state.walletAddress.slice(0, 4)}...${state.walletAddress.slice(-4)}`
    : '';
  const walletLabel = email ? `✉️ ${email.split('@')[0]}` : `🟢 ${walletShort}`;

  return (
    <nav className="glass-nav sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-3 sm:px-4">

        {/* Main row */}
        <div className="h-16 flex items-center justify-between gap-2">
          <Link href="/" className="flex-shrink-0" title="Stellar">
            <AstroLogo heightClass="h-7" />
          </Link>

          {/* Tabs */}
          <div className="hidden sm:flex items-center overflow-x-auto scrollbar-hide gap-0.5">
            {tabs.map(tab => (
              <div key={tab.href}>
                {tab.locked ? (
                  <span
                    title={tab.label}
                    className="px-3 py-2 text-[var(--text-dim)] text-sm flex items-center gap-1.5 cursor-not-allowed"
                  >
                    <Lock size={13} />
                    <span>{tab.label}</span>
                  </span>
                ) : (
                  <Link
                    href={tab.href}
                    title={tab.label}
                    className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all duration-200 ${
                      pathname === tab.href
                        ? 'text-[#FFD166] bg-[rgba(255,209,102,0.1)] border-b-2 border-[#FFD166]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Mobile wallet pill */}
          {state.walletConnected && (
            <button
              onClick={handleLogout}
              className="flex sm:hidden items-center gap-1.5 text-[#34d399] font-hash bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.2)] px-2 py-1 rounded-lg text-[10px] flex-shrink-0"
              title="Tap to sign out"
            >
              <span>{pollinetIcon}</span>
              <span>{walletShort}</span>
            </button>
          )}

          {/* Desktop wallet */}
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
            <span
              className="text-xs text-[var(--text-dim)] cursor-help"
              title="Network Status: Online — Direct to Solana"
            >
              {pollinetIcon}
            </span>
            {state.walletConnected && (
              <div className="relative">
                <button
                  onClick={() => setShowLogout(v => !v)}
                  className="text-[#34d399] font-hash bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.2)] px-2 py-1 rounded-lg hover:bg-[rgba(52,211,153,0.15)] text-xs"
                >
                  {walletLabel}
                </button>
                {showLogout && (
                  <div className="absolute right-0 top-full mt-2 glass-card p-3 w-52 z-50">
                    <p className="text-[var(--text-secondary)] text-xs mb-1 truncate font-hash">{state.walletAddress.slice(0,8)}...{state.walletAddress.slice(-6)}</p>
                    {email && <p className="text-[var(--text-dim)] text-xs mb-3">{email}</p>}
                    <button onClick={handleLogout} className="w-full text-left text-red-400 hover:text-red-300 text-xs py-1.5 px-2 rounded hover:bg-red-500/10 transition-all">
                      Sign out &amp; clear data
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </nav>
  );
}
