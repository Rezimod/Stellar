'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAppState } from '@/hooks/useAppState';
import { useState } from 'react';
import { CloudSun, Sparkles, ShoppingBag, Satellite, User } from 'lucide-react';
import AstroLogo from './AstroLogo';
import LanguageToggle from '@/components/nav/LanguageToggle';
import { useTranslations } from 'next-intl';

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, authenticated, ready, login } = usePrivy();
  const { wallets } = useWallets();
  const { reset, state } = useAppState();
  const starsBalance = state.completedMissions.reduce((sum, m) => sum + m.stars, 0);
  const [showLogout, setShowLogout] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const t = useTranslations('nav');

  const tabs = [
    { href: '/sky',         label: t('sky'),         icon: <CloudSun size={17} /> },
    { href: '/chat',        label: t('learn'),       icon: <Sparkles size={17} /> },
    { href: '/marketplace', label: t('marketplace'), icon: <ShoppingBag size={17} /> },
    { href: '/missions',    label: t('missions'),    icon: <Satellite size={17} /> },
    { href: '/profile',     label: t('profile'),     icon: <User size={17} /> },
  ];

  const solanaWallet = wallets.find(w => (w as { chainType?: string }).chainType === 'solana');
  const walletShort = solanaWallet
    ? `${solanaWallet.address.slice(0, 4)}...${solanaWallet.address.slice(-4)}`
    : '';

  const handleLogout = async () => {
    await logout();
    reset();
    router.push('/');
    setShowLogout(false);
    setConfirmStep(false);
  };

  return (
    <nav className="glass-nav sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-3 sm:px-4">

        {/* Main row */}
        <div className="h-16 flex items-center justify-between gap-2">
          <Link href="/" className="flex-shrink-0" title="Stellar">
            <AstroLogo heightClass="h-7" />
          </Link>

          {/* Desktop Tabs */}
          <div className="hidden sm:flex items-center overflow-x-auto scrollbar-hide gap-0.5">
            {tabs.map(tab => (
              <Link
                key={tab.href}
                href={tab.href}
                title={tab.label}
                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all duration-200 ${
                  pathname === tab.href
                    ? 'text-white border-b-2 border-[#34d399]'
                    : 'text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <LanguageToggle />
            {authenticated && (
              <Link
                href="/profile"
                className="text-[#FFD166] font-semibold text-sm rounded-lg hidden sm:block"
                style={{
                  background: 'rgba(255,209,102,0.1)',
                  border: '1px solid rgba(255,209,102,0.2)',
                  padding: '4px 12px',
                  textDecoration: 'none',
                }}
              >
                ✦ {starsBalance}
              </Link>
            )}

            {!ready ? (
              <div className="w-20 h-7 rounded-lg bg-white/10 animate-pulse" />
            ) : authenticated ? (
              <div className="relative">
                <button
                  onClick={() => { setShowLogout(v => !v); setConfirmStep(false); }}
                  className="text-[#34d399] font-hash bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.2)] px-2 py-1 rounded-lg hover:bg-[rgba(52,211,153,0.15)] text-xs"
                >
                  🟢 {walletShort}
                </button>
                {showLogout && (
                  <div className="absolute right-0 top-full mt-2 glass-card p-3 w-48 z-50">
                    {solanaWallet && (
                      <p className="text-[var(--text-secondary)] text-xs mb-3 truncate font-hash">
                        {solanaWallet.address.slice(0, 8)}...{solanaWallet.address.slice(-6)}
                      </p>
                    )}
                    {confirmStep ? (
                      <div>
                        <p className="text-slate-400 text-xs mb-2">Are you sure?</p>
                        <button onClick={handleLogout} className="w-full text-left text-red-400 hover:text-red-300 text-xs py-1.5 px-2 rounded bg-red-500/10 hover:bg-red-500/20 transition-all">
                          Yes, sign out
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmStep(true)} className="w-full text-left text-red-400 hover:text-red-300 text-xs py-1.5 px-2 rounded hover:bg-red-500/10 transition-all">
                        {t('signOut')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => login()}
                className="rounded-lg font-medium text-white transition-colors hover:bg-white/5"
                style={{ border: '1px solid rgba(255,255,255,0.3)', fontSize: 13, padding: '6px 14px' }}
              >
                {t('signIn')}
              </button>
            )}
          </div>
        </div>

      </div>
    </nav>
  );
}
