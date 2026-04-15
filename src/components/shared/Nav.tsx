'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useAppState } from '@/hooks/useAppState';
import { useState, useEffect } from 'react';
import {
  CloudSun, ShoppingBag, Satellite, User, Search, BookOpen,
  Trophy, Map, MessageCircle, Telescope, LogOut, Settings, Gem,
} from 'lucide-react';
import AstroLogo from './AstroLogo';
import { useTranslations } from 'next-intl';
import SearchModal from './SearchModal';

const SECTIONS = [
  {
    label: 'Explore',
    links: [
      { href: '/sky',         label: 'Sky Forecast',  desc: "Tonight's conditions",     icon: CloudSun },
      { href: '/missions',    label: 'Missions',       desc: 'Observe & earn Stars',     icon: Satellite },
      { href: '/learn',       label: 'Learning',       desc: 'Planets, quizzes & more',  icon: BookOpen },
      { href: '/darksky',     label: 'Dark Sky Map',   desc: 'Find dark sky sites',      icon: Map },
      { href: '/chat',        label: 'ASTRA AI',       desc: 'Your space companion',     icon: MessageCircle },
    ],
  },
  {
    label: 'Community',
    links: [
      { href: '/leaderboard', label: 'Leaderboard',   desc: 'Top observers',            icon: Trophy },
      { href: '/nfts',        label: 'Discoveries',   desc: 'Your on-chain NFTs',       icon: Gem },
      { href: '/club',        label: 'My Telescope',  desc: 'Register your scope',      icon: Telescope },
    ],
  },
  {
    label: 'Shop',
    links: [
      { href: '/marketplace', label: 'Marketplace',   desc: 'Shop telescopes',          icon: ShoppingBag },
    ],
  },
];

const QUICK_TABS = [
  { href: '/sky',         label: 'Sky',       icon: CloudSun },
  { href: '/missions',    label: 'Missions',  icon: Satellite },
  { href: '/learn',       label: 'Learning',  icon: BookOpen },
  { href: '/marketplace', label: 'Shop',      icon: ShoppingBag },
  { href: '/nfts',        label: 'Gallery',   icon: Gem },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, authenticated, ready, login, user } = usePrivy();
  const { setWallet } = useAppState();
  const [showMenu, setShowMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const t = useTranslations('nav');

  useEffect(() => { setSearchOpen(false); setDropdownOpen(false); setShowMenu(false); }, [pathname]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setDropdownOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dropdownOpen]);

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
        @keyframes fadeInBackdrop { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .nav-icon-btn { transition: color 0.15s ease, background 0.15s ease; }
        .nav-icon-btn:hover { background: rgba(255,255,255,0.07) !important; color: rgba(255,255,255,0.9) !important; }
        .nav-tab { position: relative; transition: all 0.18s ease; border-radius: 9999px; }
        .nav-tab:hover:not(.nav-tab-active) { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.9) !important; }
        .nav-login-btn:hover { background: rgba(124,58,237,0.2) !important; border-color: rgba(124,58,237,0.6) !important; }
        .dd-link { transition: background 0.15s ease, transform 0.15s ease; }
        .dd-link:hover { background: rgba(56,240,255,0.07) !important; }
        .hamburger-bar { display: block; height: 1.5px; border-radius: 2px; transition: all 0.22s cubic-bezier(0.22,1,0.36,1); transform-origin: center; }
      `}</style>

      {/* Compact left-anchored dropdown */}
      {dropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-[55]"
            onClick={() => setDropdownOpen(false)}
          />
          <div
            className="fixed z-[56]"
            style={{
              top: 52,
              left: 8,
              width: 200,
              animation: 'dropIn 0.18s cubic-bezier(0.22,1,0.36,1)',
              background: 'rgba(8,12,24,0.97)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
              padding: '6px',
            }}
          >
            {SECTIONS.map((section, si) => (
              <div key={section.label}>
                {si > 0 && <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 2px' }} />}
                <p style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)',
                  padding: '4px 8px 2px', margin: 0,
                }}>
                  {section.label}
                </p>
                {section.links.map(link => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setDropdownOpen(false)}
                      className="dd-link flex items-center gap-2.5 px-2.5 py-2 rounded-lg"
                      style={{
                        textDecoration: 'none',
                        background: isActive ? 'rgba(56,240,255,0.08)' : 'transparent',
                      }}
                    >
                      <Icon size={13} style={{ color: isActive ? '#38F0FF' : 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
                      <span style={{
                        fontSize: 12.5, fontWeight: 600,
                        color: isActive ? '#38F0FF' : 'rgba(255,255,255,0.8)',
                        fontFamily: 'var(--font-display)',
                      }}>
                        {link.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ))}
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

            {/* Hamburger — all screen sizes */}
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className="nav-icon-btn w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0"
              style={{ color: 'rgba(255,255,255,0.6)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
              aria-label={dropdownOpen ? 'Close navigation' : 'Open navigation'}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', justifyContent: 'center', width: 18 }}>
                <span className="hamburger-bar" style={{
                  width: dropdownOpen ? 16 : 16,
                  background: dropdownOpen ? 'rgba(56,240,255,0.8)' : 'rgba(255,255,255,0.6)',
                  transform: dropdownOpen ? 'translateY(5.5px) rotate(45deg)' : 'none',
                }} />
                <span className="hamburger-bar" style={{
                  width: 11,
                  background: 'rgba(56,240,255,0.7)',
                  opacity: dropdownOpen ? 0 : 1,
                  transform: dropdownOpen ? 'scaleX(0)' : 'none',
                }} />
                <span className="hamburger-bar" style={{
                  width: dropdownOpen ? 16 : 14,
                  background: dropdownOpen ? 'rgba(56,240,255,0.8)' : 'rgba(255,255,255,0.6)',
                  transform: dropdownOpen ? 'translateY(-5.5px) rotate(-45deg)' : 'none',
                }} />
              </div>
            </button>

            {/* Logo — mobile: absolutely centered; sm+: in flow */}
            <div className="sm:hidden absolute left-0 right-0 flex justify-center pointer-events-none">
              <Link href="/" className="pointer-events-auto" title="Stellar">
                <div style={{
                  filter: 'drop-shadow(0 0 18px rgba(56,240,255,0.6)) drop-shadow(0 0 36px rgba(56,240,255,0.25))',
                }}>
                  <AstroLogo heightClass="h-8" size={30} />
                </div>
              </Link>
            </div>
            <div className="hidden sm:flex items-center flex-shrink-0">
              <Link href="/" title="Stellar">
                <div style={{
                  filter: 'drop-shadow(0 0 18px rgba(56,240,255,0.6)) drop-shadow(0 0 36px rgba(56,240,255,0.25))',
                }}>
                  <AstroLogo heightClass="h-8" size={30} />
                </div>
              </Link>
            </div>

            {/* Quick tabs — sm/md only */}
            <div className="hidden sm:flex lg:hidden flex-1 items-center justify-center gap-1">
              {QUICK_TABS.map(tab => {
                const Icon = tab.icon;
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
                    <Icon size={15} />
                    <span>{tab.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Right cluster: search + profile/login */}
            <div className="ml-auto flex items-center gap-1 flex-shrink-0 z-10">
              <button
                onClick={() => setSearchOpen(true)}
                className="nav-icon-btn w-9 h-9 flex items-center justify-center rounded-xl"
                style={{ color: 'rgba(255,255,255,0.5)', background: 'transparent', border: 'none', cursor: 'pointer' }}
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
                      animation: 'dropIn 0.18s cubic-bezier(0.22,1,0.36,1)',
                    }}>
                      <Link href="/profile" onClick={() => setShowMenu(false)} className="text-slate-300 hover:text-white text-xs py-2 px-3 rounded-lg hover:bg-white/5 transition-all flex items-center gap-2">
                        <User size={12} /> Profile
                      </Link>
                      <Link href="/profile?tab=settings" onClick={() => setShowMenu(false)} className="text-slate-300 hover:text-white text-xs py-2 px-3 rounded-lg hover:bg-white/5 transition-all flex items-center gap-2">
                        <Settings size={12} /> Settings
                      </Link>
                      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />
                      <button onClick={handleLogout} className="w-full text-left text-red-400 hover:text-red-300 text-xs py-2 px-3 rounded-lg hover:bg-red-500/10 transition-all flex items-center gap-2">
                        <LogOut size={12} /> Sign out
                      </button>
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
