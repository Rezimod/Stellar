'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useAppState } from '@/hooks/useAppState';
import { useState, useEffect } from 'react';
import { CloudSun, ShoppingBag, Satellite, User, Search, AlignLeft, ExternalLink, BookOpen } from 'lucide-react';
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
  const { setWallet } = useAppState();
  const [showMenu, setShowMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const t = useTranslations('nav');

  useEffect(() => { setSearchOpen(false); setDrawerOpen(false); }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [drawerOpen]);

  const tabs = [
    { href: '/sky',         label: t('sky'),      icon: <CloudSun size={15} /> },
    { href: '/missions',    label: t('missions'), icon: <Satellite size={15} /> },
    { href: '/learn',       label: 'Learning',    icon: <BookOpen size={15} /> },
    { href: '/marketplace', label: 'Shop',        icon: <ShoppingBag size={15} /> },
    { href: '/nfts',        label: 'Gallery',     icon: <Satellite size={15} /> },
  ];

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
        @keyframes dropdownOpen {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dropdownClose {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(-8px); }
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
        .nav-icon-btn { transition: color 0.15s ease, background 0.15s ease; }
        .nav-icon-btn:hover { background: rgba(255,255,255,0.06) !important; color: rgba(255,255,255,0.9) !important; }
        .nav-login-btn:hover {
          background: rgba(124,58,237,0.2) !important;
          border-color: rgba(124,58,237,0.6) !important;
        }
      `}</style>

      {/* Dropdown */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[55]"
            onClick={() => setDrawerOpen(false)}
            style={{ background: 'rgba(4,7,15,0.6)', animation: 'fadeIn 0.15s ease' }}
          />

          {/* Dropdown panel — positioned below navbar */}
          <div
            className="fixed left-0 right-0 z-[56]"
            style={{
              top: 56,
              animation: 'dropdownOpen 0.2s cubic-bezier(0.22,1,0.36,1)',
              background: 'rgba(7,11,20,0.98)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
              maxHeight: 'calc(100vh - 56px - 80px)',
              overflowY: 'auto',
            }}
          >
            {/* Accent line at top */}
            <div style={{
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(56,240,255,0.3) 30%, rgba(255,209,102,0.25) 70%, transparent)',
            }} />

            {/* Nav links */}
            <div style={{ padding: '8px 12px' }}>
              {NAV_LINKS.map((link, i) => {
                const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-between px-4 py-3 rounded-xl"
                    style={{
                      textDecoration: 'none',
                      background: isActive ? 'rgba(56,240,255,0.06)' : 'transparent',
                      borderLeft: isActive ? '2px solid #38F0FF' : '2px solid transparent',
                      animation: `dropdownOpen 0.2s cubic-bezier(0.22,1,0.36,1) ${i * 30}ms both`,
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <div>
                      <p style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 600,
                        color: isActive ? '#38F0FF' : 'rgba(255,255,255,0.85)',
                        fontFamily: 'var(--font-display)',
                      }}>
                        {link.label}
                      </p>
                      <p style={{
                        margin: '2px 0 0',
                        fontSize: 11,
                        color: isActive ? 'rgba(56,240,255,0.5)' : 'rgba(255,255,255,0.3)',
                      }}>
                        {link.desc}
                      </p>
                    </div>
                    {isActive && (
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: '#38F0FF',
                        boxShadow: '0 0 8px rgba(56,240,255,0.6)',
                        flexShrink: 0,
                      }} />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{
              padding: '10px 16px 14px',
              borderTop: '1px solid rgba(255,255,255,0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: 11, margin: 0 }}>
                © 2026 Stellar · Solana
              </p>
              <a
                href="https://astroman.ge"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'rgba(255,209,102,0.5)',
                  fontSize: 11,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                astroman.ge <ExternalLink size={9} />
              </a>
            </div>
          </div>
        </>
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

            {/* Hamburger — desktop only, toggles sidebar */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('stellar:sidebar-toggle'))}
              className="nav-icon-btn hidden lg:flex w-9 h-9 items-center justify-center rounded-xl flex-shrink-0"
              style={{ color: 'rgba(255,255,255,0.55)', background: 'transparent' }}
              aria-label="Toggle sidebar"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3.5, alignItems: 'flex-start' }}>
                <span style={{ display: 'block', width: 16, height: 1.5, borderRadius: 2, background: 'rgba(255,255,255,0.55)' }} />
                <span style={{ display: 'block', width: 11, height: 1.5, borderRadius: 2, background: 'rgba(56,240,255,0.7)' }} />
                <span style={{ display: 'block', width: 14, height: 1.5, borderRadius: 2, background: 'rgba(255,255,255,0.55)' }} />
              </div>
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
