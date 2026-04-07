'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAppState } from '@/hooks/useAppState';
import { useState } from 'react';
import { CloudSun, Bot, ShoppingBag, Satellite, User } from 'lucide-react';
import AstroLogo from './AstroLogo';
import LanguageToggle from '@/components/nav/LanguageToggle';
import { useTranslations } from 'next-intl';

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const { reset } = useAppState();
  const [showLogout, setShowLogout] = useState(false);
  const t = useTranslations('nav');

  const tabs = [
    { href: '/sky',         label: t('sky'),         icon: <CloudSun size={17} /> },
    { href: '/chat',        label: t('chat'),        icon: <Bot size={17} /> },
    { href: '/marketplace', label: t('marketplace'), icon: <ShoppingBag size={17} /> },
    { href: '/missions',    label: t('missions'),    icon: <Satellite size={17} /> },
    { href: '/profile',     label: t('profile'),     icon: <User size={17} /> },
  ];

  const solanaWallet = wallets.find(w => (w as { chainType?: string }).chainType === 'solana');
  const walletShort = solanaWallet
    ? `${solanaWallet.address.slice(0, 4)}...${solanaWallet.address.slice(-4)}`
    : '';

  const handleLogout = async () => {
    if (!confirm('Log out and clear all data?')) return;
    await logout();
    reset();
    router.push('/');
    setShowLogout(false);
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
                    ? 'text-[#FFD166] bg-[rgba(255,209,102,0.1)] border-b-2 border-[#FFD166]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
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

            {authenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowLogout(v => !v)}
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
                    <button onClick={handleLogout} className="w-full text-left text-red-400 hover:text-red-300 text-xs py-1.5 px-2 rounded hover:bg-red-500/10 transition-all">
                      {t('signOut')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => login()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#8B5CF6] hover:bg-[#7C3AED] text-white transition-colors"
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
