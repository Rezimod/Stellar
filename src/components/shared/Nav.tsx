'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAppState } from '@/hooks/useAppState';
import { useState, useEffect } from 'react';
import { CloudSun, Sparkles, ShoppingBag, Satellite, User, Search } from 'lucide-react';
import AstroLogo from './AstroLogo';
import { useTranslations } from 'next-intl';
import SearchModal from './SearchModal';

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, authenticated, ready, login, user } = usePrivy();
  const { wallets } = useWallets();
  const { setWallet } = useAppState();
  const [showMenu, setShowMenu] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const t = useTranslations('nav');

  useEffect(() => {
    setSearchOpen(false);
  }, [pathname]);

  const tabs = [
    { href: '/sky',         label: t('sky'),         icon: <CloudSun size={16} /> },
    { href: '/missions',    label: t('missions'),    icon: <Satellite size={16} /> },
    { href: '/chat',        label: 'ASTRA',          icon: <Sparkles size={16} /> },
    { href: '/marketplace', label: t('marketplace'), icon: <ShoppingBag size={16} /> },
    { href: '/profile',     label: t('profile'),     icon: <User size={16} /> },
  ];

  const solanaWallet = wallets.find(w => (w as { chainType?: string }).chainType === 'solana');

  // Derive initial for avatar
  const userEmail =
    user?.email?.address ??
    (user?.linkedAccounts?.find(a => a.type === 'email') as { address?: string } | undefined)?.address ??
    '';
  const initial = userEmail ? userEmail[0].toUpperCase() : solanaWallet ? 'A' : '?';

  const handleLogout = async () => {
    await logout();
    setWallet('');
    router.push('/');
    setShowMenu(false);
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

          {/* Right side: search + auth only */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Search size={16} />
            </button>

            {!ready ? (
              <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
            ) : authenticated ? (
              <div className="relative">
                {/* Avatar button — gradient ring effect */}
                <button
                  onClick={() => { setShowMenu(v => !v); setConfirmStep(false); }}
                  className="transition-all hover:ring-2 hover:ring-[#14B8A6]/40 rounded-full"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'conic-gradient(from 0deg, #8B5CF6, #14B8A6, #8B5CF6)',
                    padding: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Account"
                >
                  <div style={{
                    width: 31,
                    height: 31,
                    borderRadius: '50%',
                    background: '#0D1321',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'white' }}>{initial}</span>
                  </div>
                </button>

                {/* Dropdown */}
                {showMenu && (
                  <div className="absolute right-0 top-full mt-2 glass-card p-3 w-44 z-50 flex flex-col gap-1">
                    <Link
                      href="/profile"
                      onClick={() => setShowMenu(false)}
                      className="text-slate-300 hover:text-white text-xs py-1.5 px-2 rounded hover:bg-white/5 transition-all"
                    >
                      View profile
                    </Link>
                    {confirmStep ? (
                      <button onClick={handleLogout} className="w-full text-left text-red-400 hover:text-red-300 text-xs py-1.5 px-2 rounded bg-red-500/10 hover:bg-red-500/20 transition-all">
                        Confirm sign out
                      </button>
                    ) : (
                      <button onClick={() => setConfirmStep(true)} className="w-full text-left text-red-400 hover:text-red-300 text-xs py-1.5 px-2 rounded hover:bg-red-500/10 transition-all">
                        {t('signOut')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={() => login()}
                  className="rounded-lg font-medium text-white transition-colors hover:bg-white/10"
                  style={{ border: '1px solid rgba(255,255,255,0.2)', fontSize: 12, padding: '5px 10px', background: 'rgba(255,255,255,0.06)' }}
                >
                  Log In
                </button>
                <button
                  onClick={() => login()}
                  className="rounded-lg font-semibold transition-colors hover:bg-[rgba(52,211,153,0.25)]"
                  style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.35)', color: '#34d399', fontSize: 12, padding: '5px 10px' }}
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>

      </div>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </nav>
  );
}
