'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAppState } from '@/hooks/useAppState';
import { useState, useEffect } from 'react';
import { CloudSun, BookOpen, ShoppingBag, Satellite, User, Search, Map, AlignLeft, X, ExternalLink } from 'lucide-react';
import AstroLogo from './AstroLogo';
import { useTranslations } from 'next-intl';
import SearchModal from './SearchModal';

const NAV_LINKS = [
  { href: '/sky',         label: 'Sky Forecast',  desc: "Tonight's conditions" },
  { href: '/missions',    label: 'Missions',       desc: 'Observe & earn Stars' },
  { href: '/chat',        label: 'ASTRA AI',       desc: 'Your AI astronomer' },
  { href: '/darksky',     label: 'Dark Sky Map',   desc: 'Find dark sky sites' },
  { href: '/marketplace', label: 'Marketplace',    desc: 'Shop telescopes' },
  { href: '/nfts',        label: 'Discoveries',    desc: 'Your on-chain NFTs' },
  { href: '/profile',     label: 'Profile',        desc: 'Account & stats' },
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
  const t = useTranslations('nav');

  useEffect(() => {
    setSearchOpen(false);
  }, [pathname]);

  const tabs = [
    { href: '/sky',         label: t('sky'),         icon: <CloudSun size={16} /> },
    { href: '/missions',    label: t('missions'),    icon: <Satellite size={16} /> },
    { href: '/learn',       label: 'Learn',          icon: <BookOpen size={16} /> },
    { href: '/darksky',     label: 'Dark Sky',       icon: <Map size={16} /> },
    { href: '/marketplace', label: t('marketplace'), icon: <ShoppingBag size={16} /> },
  ];

  const solanaWallet = wallets.find(w => (w as { chainType?: string }).chainType === 'solana');

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
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* Sidebar drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60]" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(7,11,20,0.75)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease' }} />
          <div
            className="absolute top-0 left-0 h-full flex flex-col"
            style={{
              width: 'min(300px, 85vw)',
              background: 'rgba(10,14,26,0.98)',
              borderRight: '1px solid rgba(255,255,255,0.08)',
              animation: 'slideInLeft 0.22s cubic-bezier(0.22,1,0.36,1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ color: '#FFD166', fontSize: 14, letterSpacing: '0.18em', fontWeight: 800, fontFamily: 'monospace' }}>✦ STELLAR</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
              >
                <X size={13} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: 'none' }}>
              {NAV_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setDrawerOpen(false)}
                  className="flex flex-col px-4 py-3 rounded-xl mb-0.5 transition-all"
                  style={{ textDecoration: 'none', background: 'transparent' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>{link.label}</span>
                  <span className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{link.desc}</span>
                </Link>
              ))}
            </nav>
            <div className="px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <a href="https://stellarrclub.vercel.app" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mb-2" style={{ color: '#34d399', fontSize: 11, textDecoration: 'none' }}>
                stellarrclub.vercel.app <ExternalLink size={9} />
              </a>
              <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, margin: 0 }}>© 2026 Stellar · Built on Solana Devnet</p>
            </div>
          </div>
        </div>
      )}

    <nav className="glass-nav sticky top-0 z-40">
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
              <AstroLogo heightClass="h-7" />
            </Link>
          </div>

          {/* ── DESKTOP LEFT: logo ── */}
          <div className="hidden sm:flex items-center flex-shrink-0 mr-6">
            <Link href="/" title="Stellar">
              <AstroLogo heightClass="h-7" />
            </Link>
          </div>

          {/* ── DESKTOP CENTER: tabs ── */}
          <div className="hidden sm:flex flex-1 items-center justify-center gap-0.5">
            {tabs.map(tab => (
              <Link
                key={tab.href}
                href={tab.href}
                title={tab.label}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all duration-200 ${
                  pathname === tab.href
                    ? 'text-white'
                    : 'text-[rgba(255,255,255,0.45)] hover:text-white hover:bg-white/5'
                }`}
                style={pathname === tab.href ? { color: '#38F0FF' } : {}}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </Link>
            ))}
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
                  padding: '4px 10px',
                  borderRadius: 9999,
                  background: 'rgba(255,209,102,0.08)',
                  border: '1px solid rgba(255,209,102,0.18)',
                  color: '#FFD166',
                  fontSize: 11,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: 9 }}>✦</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {(state.completedMissions.length * 50).toLocaleString()}
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
                  style={{
                    height: 34,
                    borderRadius: 9999,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.65)',
                    padding: '0 12px',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    gap: 5,
                  }}
                >
                  <User size={13} />
                  <span className="hidden sm:inline">Profile</span>
                </button>

                {showMenu && (
                  <div className="absolute right-0 top-full mt-2 glass-card p-2 w-40 z-50 flex flex-col gap-0.5">
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
                style={{
                  height: 30,
                  borderRadius: 9999,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  color: 'rgba(255,255,255,0.75)',
                  padding: '0 14px',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
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
