'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAppState } from '@/hooks/useAppState';
import { useState, useEffect } from 'react';
import { CloudSun, ShoppingBag, Satellite, User, Search, AlignLeft, X, ExternalLink } from 'lucide-react';
import AstroLogo from './AstroLogo';
import { useTranslations } from 'next-intl';
import SearchModal from './SearchModal';

const NAV_LINKS = [
  { href: '/sky',         label: 'Sky Forecast',       desc: "Tonight's conditions" },
  { href: '/missions',    label: 'Missions',            desc: 'Observe & earn Stars' },
  { href: '/chat',        label: 'ASTRA AI',            desc: 'Your AI astronomer' },
  { href: '/marketplace', label: 'Marketplace',         desc: 'Shop telescopes' },
  { href: '/nfts',        label: 'Discoveries',         desc: 'Your on-chain NFTs' },
  { href: '/club',        label: 'My Telescope',        desc: 'Register your scope' },
  { href: '/profile',     label: 'Profile',             desc: 'Account & stats' },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, authenticated, ready, login, user } = usePrivy();
  const { wallets } = useWallets();
  const { setWallet, state } = useAppState();
  const [showMenu, setShowMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [starsBalance, setStarsBalance] = useState<number | null>(null);
  const t = useTranslations('nav');

  useEffect(() => {
    setSearchOpen(false);
  }, [pathname]);

  const tabs = [
    { href: '/sky',         label: t('sky'),         icon: <CloudSun size={16} /> },
    { href: '/missions',    label: t('missions'),    icon: <Satellite size={16} /> },
    { href: '/chat',        label: 'ASTRA',          icon: <Search size={16} /> },
    { href: '/marketplace', label: t('marketplace'), icon: <ShoppingBag size={16} /> },
    { href: '/profile',     label: 'Profile',        icon: <User size={16} /> },
  ];

  const solanaWallet = wallets.find(
    w => w.walletClientType === 'privy' && (w as { chainType?: string }).chainType === 'solana'
  );

  useEffect(() => {
    if (!authenticated || !solanaWallet?.address) { setStarsBalance(null); return; }
    fetch(`/api/stars-balance?address=${encodeURIComponent(solanaWallet.address)}`)
      .then(r => r.json())
      .then(d => setStarsBalance(d.balance ?? 0))
      .catch(() => setStarsBalance(0));
  }, [authenticated, solanaWallet?.address]);

  // Derive display name for avatar
  const userEmail =
    user?.email?.address ??
    (user?.linkedAccounts?.find(a => a.type === 'email') as { address?: string } | undefined)?.address ??
    '';
  const username = userEmail ? userEmail.split('@')[0] : '';
  const displayName = username.length > 0 && username.length <= 10
    ? username
    : userEmail
      ? userEmail[0].toUpperCase()
      : solanaWallet
        ? 'A'
        : '?';
  const isName = username.length > 0 && username.length <= 10;

  const handleLogout = async () => {
    await logout();
    setWallet('');
    router.push('/');
    setShowMenu(false);
  };

  return (
    <>
      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes starPulse {
          0%, 100% { box-shadow: 0 0 6px rgba(255,209,102,0.25); }
          50%       { box-shadow: 0 0 14px rgba(255,209,102,0.5), 0 0 28px rgba(255,209,102,0.12); }
        }
        .nav-tab-pill { position: relative; transition: all 0.18s ease; }
        .nav-tab-pill.active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 50%;
          transform: translateX(-50%);
          width: 18px;
          height: 2px;
          background: linear-gradient(90deg, #8B5CF6, #38F0FF);
          border-radius: 99px;
          box-shadow: 0 0 6px rgba(56,240,255,0.7);
        }
        .nav-login-btn { transition: all 0.18s ease; }
        .nav-login-btn:hover {
          background: rgba(56,240,255,0.09) !important;
          border-color: rgba(56,240,255,0.45) !important;
          color: #38F0FF !important;
          box-shadow: 0 0 18px rgba(56,240,255,0.15);
        }
        .nav-profile-btn { transition: all 0.18s ease; }
        .nav-profile-btn:hover {
          background: rgba(56,240,255,0.06) !important;
          border-color: rgba(56,240,255,0.2) !important;
          color: white !important;
        }
        .drawer-nav-link {
          border-left: 2px solid transparent;
          transition: all 0.15s ease;
        }
        .drawer-nav-link:hover {
          background: rgba(56,240,255,0.04) !important;
          border-left-color: rgba(56,240,255,0.4) !important;
        }
      `}</style>

      {/* Sidebar drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60]" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(5,8,18,0.82)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', animation: 'fadeIn 0.18s ease' }} />
          <div
            className="absolute top-0 left-0 h-full flex flex-col"
            style={{
              width: 'min(290px, 82vw)',
              background: 'linear-gradient(180deg, #070C1A 0%, #060A15 100%)',
              borderRight: '1px solid rgba(56,240,255,0.1)',
              boxShadow: '4px 0 40px rgba(0,0,0,0.7), inset -1px 0 0 rgba(255,255,255,0.02)',
              animation: 'slideInLeft 0.22s cubic-bezier(0.22,1,0.36,1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer top accent line */}
            <div style={{ height: 2, background: 'linear-gradient(90deg, rgba(139,92,246,0.8) 0%, rgba(56,240,255,0.9) 60%, transparent 100%)', flexShrink: 0 }} />
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(56,240,255,0.07)', background: 'linear-gradient(90deg, rgba(56,240,255,0.03) 0%, rgba(139,92,246,0.03) 100%)' }}
            >
              <div className="flex items-center gap-2.5">
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'radial-gradient(circle, #38F0FF, #8B5CF6)', boxShadow: '0 0 10px rgba(56,240,255,0.9)', display: 'inline-block', flexShrink: 0 }} />
                <span style={{ color: '#fff', fontSize: 13, letterSpacing: '0.22em', fontWeight: 700, fontFamily: 'Georgia, serif', textShadow: '0 0 20px rgba(56,240,255,0.35)' }}>STELLAR</span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}
              >
                <X size={13} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4" style={{ scrollbarWidth: 'none' }}>
              {NAV_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setDrawerOpen(false)}
                  className="drawer-nav-link flex flex-col px-4 py-3 rounded-xl mb-1"
                  style={{ textDecoration: 'none', background: 'transparent' }}
                >
                  <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>{link.label}</span>
                  <span className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.28)' }}>{link.desc}</span>
                </Link>
              ))}
            </nav>
            <div className="px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(56,240,255,0.06)' }}>
              <a href="https://stellarrclub.vercel.app" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mb-2" style={{ color: '#38F0FF', fontSize: 11, textDecoration: 'none', opacity: 0.65 }}>
                stellarrclub.vercel.app <ExternalLink size={9} />
              </a>
              <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: 11, margin: 0 }}>© 2026 Stellar · Built on Solana</p>
            </div>
          </div>
        </div>
      )}

    <nav
      className="sticky top-0 z-40"
      style={{
        background: 'linear-gradient(180deg, rgba(5,9,19,0.97) 0%, rgba(6,11,21,0.95) 100%)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 1px 0 rgba(56,240,255,0.09), 0 4px 32px rgba(0,0,0,0.55)',
      }}
    >
      {/* Cosmic gradient top accent */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.7) 25%, rgba(56,240,255,0.9) 60%, transparent 100%)', pointerEvents: 'none' }} />
      <div className="max-w-5xl mx-auto px-4">

        {/* ── Main row ── */}
        <div className="h-14 flex items-center relative">

          {/* ── MOBILE LEFT: hamburger + search ── */}
          <div className="flex sm:hidden items-center gap-1 z-10 flex-shrink-0">
            <button
              onClick={() => setDrawerOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Open navigation"
            >
              <AlignLeft size={18} />
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Search"
            >
              <Search size={16} />
            </button>
          </div>

          {/* ── MOBILE CENTER: logo absolutely centered ── */}
          <div className="sm:hidden absolute inset-0 flex items-center justify-center pointer-events-none">
            <Link href="/" className="pointer-events-auto flex-shrink-0" title="Stellar">
              <div style={{ filter: 'drop-shadow(0 0 10px rgba(56,240,255,0.3))' }}>
                <AstroLogo heightClass="h-7" />
              </div>
            </Link>
          </div>

          {/* ── DESKTOP LEFT: logo ── */}
          <div className="hidden sm:flex items-center flex-shrink-0 mr-8">
            <Link href="/" title="Stellar">
              <div style={{ filter: 'drop-shadow(0 0 12px rgba(56,240,255,0.25))' }}>
                <AstroLogo heightClass="h-7" />
              </div>
            </Link>
          </div>

          {/* ── DESKTOP CENTER: tabs ── */}
          <div className="hidden sm:flex flex-1 items-center justify-center gap-1">
            {tabs.map(tab => {
              const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  title={tab.label}
                  className={`nav-tab-pill${isActive ? ' active' : ''} px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5`}
                  style={isActive
                    ? {
                        color: '#38F0FF',
                        background: 'rgba(56,240,255,0.07)',
                        border: '1px solid rgba(56,240,255,0.14)',
                        textShadow: '0 0 10px rgba(56,240,255,0.45)',
                        textDecoration: 'none',
                      }
                    : {
                        color: 'rgba(255,255,255,0.42)',
                        border: '1px solid transparent',
                        textDecoration: 'none',
                      }
                  }
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.88)';
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.42)';
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }
                  }}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>

          {/* ── RIGHT: stars + auth ── */}
          <div className="ml-auto sm:ml-0 flex items-center gap-2 z-10 flex-shrink-0">
            {authenticated && (
              <Link
                href="/profile"
                title="Stars balance"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '5px 11px',
                  borderRadius: 9999,
                  background: 'rgba(255,209,102,0.07)',
                  border: '1px solid rgba(255,209,102,0.25)',
                  color: '#FFD166',
                  fontSize: 11,
                  fontWeight: 700,
                  textDecoration: 'none',
                  animation: 'starPulse 3s ease-in-out infinite',
                  letterSpacing: '0.02em',
                }}
              >
                <span style={{ fontSize: 9 }}>✦</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {starsBalance === null ? '—' : starsBalance.toLocaleString()}
                </span>
              </Link>
            )}

            {!ready ? (
              <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
            ) : authenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(v => !v)}
                  title="Account"
                  className="nav-profile-btn"
                  style={{
                    height: 34,
                    borderRadius: 9999,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.6)',
                    padding: '0 13px',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    gap: 6,
                  }}
                >
                  <User size={13} />
                  <span className="hidden sm:inline">Profile</span>
                </button>

                {showMenu && (
                  <div
                    className="absolute right-0 top-full mt-2 p-1.5 w-44 z-50 flex flex-col gap-0.5"
                    style={{
                      background: 'rgba(7,11,21,0.97)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: '1px solid rgba(56,240,255,0.12)',
                      borderRadius: 14,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.02)',
                    }}
                  >
                    <Link
                      href="/profile"
                      onClick={() => setShowMenu(false)}
                      className="text-slate-300 hover:text-white text-xs py-2 px-3 rounded-lg hover:bg-white/5 transition-all"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/profile?tab=settings"
                      onClick={() => setShowMenu(false)}
                      className="text-slate-300 hover:text-white text-xs py-2 px-3 rounded-lg hover:bg-white/5 transition-all"
                    >
                      Settings
                    </Link>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left text-red-400 hover:text-red-300 text-xs py-2 px-3 rounded-lg hover:bg-red-500/10 transition-all"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => login()}
                className="nav-login-btn"
                style={{
                  height: 32,
                  borderRadius: 9999,
                  background: 'rgba(56,240,255,0.05)',
                  border: '1px solid rgba(56,240,255,0.28)',
                  color: 'rgba(255,255,255,0.82)',
                  padding: '0 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.02em',
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
