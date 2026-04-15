'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAppState } from '@/hooks/useAppState';
import { useState, useEffect } from 'react';
import { CloudSun, ShoppingBag, Satellite, User, Search, AlignLeft, X, ExternalLink, BookOpen } from 'lucide-react';
import AstroLogo from './AstroLogo';
import { useTranslations } from 'next-intl';
import SearchModal from './SearchModal';

const NAV_LINKS = [
  { href: '/sky',         label: 'Sky Forecast',   desc: "Tonight's conditions" },
  { href: '/missions',    label: 'Missions',        desc: 'Observe & earn Stars' },
  { href: '/learn',       label: 'Learning',        desc: 'Planets, quizzes & more' },
  { href: '/marketplace', label: 'Marketplace',     desc: 'Shop telescopes' },
  { href: '/nfts',        label: 'Discoveries',     desc: 'Your on-chain NFTs' },
  { href: '/club',        label: 'My Telescope',    desc: 'Register your scope' },
  { href: '/profile',     label: 'Profile',         desc: 'Account & stats' },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, authenticated, ready, login, user } = usePrivy();
  const { wallets } = useWallets();
  const { setWallet } = useAppState();
  const [showMenu, setShowMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const t = useTranslations('nav');

  useEffect(() => { setSearchOpen(false); }, [pathname]);

  const tabs = [
    { href: '/sky',         label: t('sky'),      icon: <CloudSun size={15} /> },
    { href: '/missions',    label: t('missions'), icon: <Satellite size={15} /> },
    { href: '/learn',       label: 'Learning',    icon: <BookOpen size={15} /> },
    { href: '/marketplace', label: 'Shop',        icon: <ShoppingBag size={15} /> },
    { href: '/nfts',        label: 'Gallery',     icon: <Satellite size={15} /> },
  ];

  const solanaWallet = wallets.find(
    w => w.walletClientType === 'privy' && (w as { chainType?: string }).chainType === 'solana'
  );

  const userEmail =
    user?.email?.address ??
    (user?.linkedAccounts?.find(a => a.type === 'email') as { address?: string } | undefined)?.address ??
    '';
  const username = userEmail ? userEmail.split('@')[0] : '';

  const handleLogout = async () => {
    await logout();
    setWallet('');
    router.push('/');
    setShowMenu(false);
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
        .nav-tab {
          position: relative;
          transition: all 0.18s ease;
          border-radius: 9999px;
        }
        .nav-tab:hover:not(.nav-tab-active) {
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.9) !important;
        }
        .drawer-nav-link {
          border-left: 2px solid transparent;
          transition: all 0.15s ease;
        }
        .drawer-nav-link:hover {
          background: rgba(56,240,255,0.05) !important;
          border-left-color: rgba(56,240,255,0.5) !important;
        }
        .nav-icon-btn { transition: color 0.15s ease, background 0.15s ease; }
        .nav-icon-btn:hover { background: rgba(255,255,255,0.06) !important; color: rgba(255,255,255,0.9) !important; }
        .nav-login-btn:hover {
          background: rgba(124,58,237,0.2) !important;
          border-color: rgba(124,58,237,0.6) !important;
        }
      `}</style>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60]" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(4,7,15,0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', animation: 'fadeIn 0.18s ease' }} />
          <div
            className="absolute top-0 left-0 h-full flex flex-col"
            style={{ width: 'min(280px, 80vw)', background: 'linear-gradient(180deg, #070C1A 0%, #060A15 100%)', borderRight: '1px solid rgba(124,58,237,0.2)', boxShadow: '4px 0 48px rgba(0,0,0,0.8)', animation: 'slideInLeft 0.22s cubic-bezier(0.22,1,0.36,1)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer top accent */}
            <div style={{ height: 2, background: 'linear-gradient(90deg, rgba(124,58,237,0.9) 0%, rgba(56,240,255,1) 60%, transparent 100%)', flexShrink: 0 }} />

            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(124,58,237,0.1)' }}>
              <div className="flex items-center gap-2.5">
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'radial-gradient(circle, #a78bfa, #38F0FF)', boxShadow: '0 0 12px rgba(167,139,250,0.9)', display: 'inline-block' }} />
                <span style={{ color: '#fff', fontSize: 13, letterSpacing: '0.22em', fontWeight: 700, fontFamily: 'Georgia, serif' }}>STELLAR</span>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                <X size={13} />
              </button>
            </div>

            {/* Drawer nav links */}
            <nav className="flex-1 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: 'none' }}>
              {NAV_LINKS.map(link => (
                <Link key={link.href} href={link.href} onClick={() => setDrawerOpen(false)} className="drawer-nav-link flex flex-col px-4 py-2.5 rounded-xl mb-0.5" style={{ textDecoration: 'none', background: 'transparent' }}>
                  <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.88)' }}>{link.label}</span>
                  <span className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{link.desc}</span>
                </Link>
              ))}
            </nav>

            {/* Drawer footer: settings + logout */}
            <div className="px-3 pb-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {authenticated && (
                <>
                  <Link href="/profile" onClick={() => setDrawerOpen(false)} className="drawer-nav-link flex items-center gap-3 px-4 py-2.5 rounded-xl mt-2" style={{ textDecoration: 'none' }}>
                    <User size={14} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
                    <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {username || 'Profile'}
                    </span>
                  </Link>
                  <Link href="/profile?tab=settings" onClick={() => setDrawerOpen(false)} className="drawer-nav-link flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ textDecoration: 'none' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, flexShrink: 0 }}>⚙</span>
                    <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>Settings</span>
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setDrawerOpen(false); }}
                    className="drawer-nav-link w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left"
                    style={{ background: 'transparent', border: 'none' }}
                  >
                    <span style={{ color: 'rgba(248,113,113,0.7)', fontSize: 14, flexShrink: 0 }}>→</span>
                    <span className="text-sm font-semibold" style={{ color: 'rgba(248,113,113,0.8)' }}>Sign out</span>
                  </button>
                </>
              )}
              <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10, margin: '8px 16px 0', letterSpacing: '0.04em' }}>© 2026 Stellar · Built on Solana</p>
            </div>
          </div>
        </div>
      )}

      <nav
        className="fixed top-0 left-0 right-0 z-40"
        style={{
          background: 'rgba(5, 8, 18, 0.95)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-6xl mx-auto px-3">
          <div className="h-14 flex items-center gap-2">

            {/* Hamburger — mobile + tablet only */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="nav-icon-btn lg:hidden w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0"
              style={{ color: 'rgba(255,255,255,0.55)', background: 'transparent' }}
              aria-label="Open navigation"
            >
              <AlignLeft size={17} />
            </button>

            {/* Logo — mobile: absolutely centered; desktop: in flow */}
            <div className="sm:hidden absolute left-0 right-0 flex justify-center pointer-events-none">
              <Link href="/" className="pointer-events-auto" title="Stellar">
                <div style={{ filter: 'drop-shadow(0 0 12px rgba(56,240,255,0.4))' }}>
                  <AstroLogo heightClass="h-7" />
                </div>
              </Link>
            </div>
            <div className="hidden sm:flex items-center flex-shrink-0">
              <Link href="/" title="Stellar">
                <div style={{ filter: 'drop-shadow(0 0 14px rgba(56,240,255,0.35))' }}>
                  <AstroLogo heightClass="h-7" />
                </div>
              </Link>
            </div>

            {/* Search icon — mobile/tablet only (desktop search is in right cluster) */}
            <button
              onClick={() => setSearchOpen(true)}
              className="nav-icon-btn lg:hidden w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0"
              style={{ color: 'rgba(255,255,255,0.5)', background: 'transparent' }}
              aria-label="Search"
            >
              <Search size={16} />
            </button>

            {/* Nav tabs — sm/md only (lg+ uses sidebar) */}
            <div className="hidden sm:flex lg:hidden flex-1 items-center justify-center gap-1">
              {tabs.map(tab => {
                const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`nav-tab px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 ${isActive ? 'nav-tab-active' : ''}`}
                    style={isActive ? {
                      background: 'linear-gradient(135deg, rgba(124,58,237,0.3) 0%, rgba(56,240,255,0.18) 100%)',
                      border: '1px solid rgba(56,240,255,0.3)',
                      color: '#67e8f9',
                      textDecoration: 'none',
                      boxShadow: '0 0 16px rgba(56,240,255,0.15), inset 0 1px 0 rgba(255,255,255,0.08)',
                      textShadow: '0 0 10px rgba(56,240,255,0.5)',
                    } : {
                      color: 'rgba(255,255,255,0.6)',
                      border: '1px solid transparent',
                      textDecoration: 'none',
                    }}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Right: search (desktop) + profile / login */}
            <div className="ml-auto flex items-center gap-1 flex-shrink-0 z-10">
              {/* Search — desktop only */}
              <button
                onClick={() => setSearchOpen(true)}
                className="nav-icon-btn hidden lg:flex w-9 h-9 items-center justify-center rounded-xl"
                style={{ color: 'rgba(255,255,255,0.5)', background: 'transparent' }}
                aria-label="Search"
              >
                <Search size={16} />
              </button>
              {!ready ? (
                <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
              ) : authenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(v => !v)}
                    style={{
                      height: 34, borderRadius: 9999, cursor: 'pointer',
                      background: 'rgba(124,58,237,0.12)',
                      border: '1px solid rgba(124,58,237,0.35)',
                      color: 'rgba(255,255,255,0.85)',
                      padding: '0 12px',
                      display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 600, gap: 6,
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <User size={13} />
                    <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {username || 'Profile'}
                    </span>
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-full mt-2 p-1.5 w-44 z-50 flex flex-col gap-0.5" style={{
                      background: 'rgba(6,9,18,0.97)',
                      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                      border: '1px solid rgba(124,58,237,0.2)',
                      borderRadius: 14,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.02)',
                    }}>
                      <Link href="/profile" onClick={() => setShowMenu(false)} className="text-slate-300 hover:text-white text-xs py-2 px-3 rounded-lg hover:bg-white/5 transition-all">Profile</Link>
                      <Link href="/profile?tab=settings" onClick={() => setShowMenu(false)} className="text-slate-300 hover:text-white text-xs py-2 px-3 rounded-lg hover:bg-white/5 transition-all">Settings</Link>
                      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />
                      <button onClick={handleLogout} className="w-full text-left text-red-400 hover:text-red-300 text-xs py-2 px-3 rounded-lg hover:bg-red-500/10 transition-all">Sign out</button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => login()}
                  className="nav-login-btn"
                  style={{
                    height: 34, borderRadius: 9999, cursor: 'pointer',
                    background: 'rgba(124,58,237,0.15)',
                    border: '1px solid rgba(124,58,237,0.5)',
                    color: '#c4b5fd',
                    padding: '0 16px',
                    fontSize: 12, fontWeight: 700,
                    letterSpacing: '0.04em',
                    transition: 'all 0.18s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Log In
                </button>
              )}
            </div>
          </div>
        </div>
        <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      </nav>
    </>
  );
}
