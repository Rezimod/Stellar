'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useState, useEffect, useRef } from 'react';
import {
  CloudSun, ShoppingBag, Satellite, User, Search, BookOpen,
  Trophy, Globe, Sun, Target, MessageCircle, Telescope, Gem,
  TrendingUp, LogOut,
} from 'lucide-react';
import AstroLogo from './AstroLogo';
import SearchModal from './SearchModal';

type SectionLink = { href: string; label: string; icon: typeof CloudSun };
type Section = { label: string; links: SectionLink[] };

const SECTIONS: Section[] = [
  {
    label: 'Explore',
    links: [
      { href: '/sky',         label: 'Sky forecast',  icon: Sun },
      { href: '/markets',     label: 'Markets',       icon: TrendingUp },
      { href: '/missions',    label: 'Missions',      icon: Target },
      { href: '/learn',       label: 'Learning',      icon: BookOpen },
      { href: '/network',     label: 'Network',       icon: Globe },
      { href: '/chat',        label: 'ASTRA AI',      icon: MessageCircle },
    ],
  },
  {
    label: 'Community',
    links: [
      { href: '/leaderboard', label: 'Leaderboard',   icon: Trophy },
      { href: '/nfts',        label: 'Discoveries',   icon: Gem },
      { href: '/club',        label: 'My telescope',  icon: Telescope },
    ],
  },
  {
    label: 'Shop',
    links: [
      { href: '/marketplace', label: 'Marketplace',   icon: ShoppingBag },
    ],
  },
];

const NAV_ITEMS = [
  { href: '/sky',         label: 'Sky',       icon: CloudSun },
  { href: '/missions',    label: 'Missions',  icon: Satellite },
  { href: '/markets',     label: 'Markets',   icon: TrendingUp },
  { href: '/learn',       label: 'Learning',  icon: BookOpen },
  { href: '/network',     label: 'Network',   icon: Globe },
  { href: '/marketplace', label: 'Shop',      icon: ShoppingBag },
];

const AVATAR_ITEMS: { href: string; label: string; icon: typeof User }[] = [
  { href: '/profile', label: 'Profile',         icon: User },
  { href: '/club',    label: 'My telescope',    icon: Telescope },
  { href: '/nfts',    label: 'My discoveries',  icon: Gem },
];

function getInitials(name: string | null | undefined): string {
  const src = (name ?? '?').trim();
  if (!src) return '?';
  const parts = src.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function shortAddr(addr: string | null | undefined): string {
  if (!addr) return '';
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { authenticated, ready, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const menuWrapRef = useRef<HTMLDivElement>(null);
  const avatarWrapRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const avatarTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { setSearchOpen(false); setMenuOpen(false); setAvatarOpen(false); }, [pathname]);

  useEffect(() => {
    if (!menuOpen && !avatarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (menuOpen) { setMenuOpen(false); menuTriggerRef.current?.focus(); }
        if (avatarOpen) { setAvatarOpen(false); avatarTriggerRef.current?.focus(); }
      }
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuOpen && menuWrapRef.current && !menuWrapRef.current.contains(t)) setMenuOpen(false);
      if (avatarOpen && avatarWrapRef.current && !avatarWrapRef.current.contains(t)) setAvatarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [menuOpen, avatarOpen]);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth < 768) { setMenuOpen(false); setAvatarOpen(false); } };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const solanaWallet = wallets.find(w => (w as { chainType?: string }).chainType === 'solana');
  const walletAddress = solanaWallet?.address ?? null;
  const email =
    user?.email?.address ??
    (user?.linkedAccounts.find(a => a.type === 'email') as { address?: string } | undefined)?.address ??
    null;
  const displayName = email ? email.split('@')[0] : (walletAddress ? shortAddr(walletAddress) : 'Astronomer');
  const initials = getInitials(email ?? walletAddress);

  const handleLogout = async () => {
    setAvatarOpen(false);
    try { await logout(); } catch {}
    router.push('/');
  };

  return (
    <>
      <style>{`
        @keyframes dropIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        .nav-icon-btn { transition: color 0.15s ease, background 0.15s ease; background: transparent; border: none; cursor: pointer; }
        .nav-icon-btn:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.95); }
        .nav-tab { position: relative; transition: all 0.18s ease; border-radius: 9999px; }
        .nav-tab:hover:not(.nav-tab-active) { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.9) !important; }
        .signin-btn { transition: all 0.18s ease; }
        .signin-btn:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.25); color: white; }
        .dd-link { transition: background 0.15s ease; text-decoration: none; }
        .dd-link:hover { background: rgba(255,255,255,0.04); }
        .hamburger-hline { display: block; height: 1.5px; width: 18px; border-radius: 2px; background: rgba(255,255,255,0.7); transition: all 0.22s cubic-bezier(0.22,1,0.36,1); transform-origin: center; }
        .hamburger-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: transparent; border: 1px solid transparent; cursor: pointer; padding: 0; transition: all 0.15s ease; }
        .hamburger-btn:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); }
        .hamburger-btn[data-open="true"] { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.12); }
        .avatar-btn { width: 30px; height: 30px; border-radius: 9999px; padding: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; overflow: hidden; transition: box-shadow 0.18s ease; background: linear-gradient(135deg, #534AB7, #7F77DD); border: 1.5px solid rgba(255,255,255,0.15); }
        .avatar-btn:hover { box-shadow: 0 0 0 2px rgba(127,119,221,0.2); }
        .avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .menu-dropdown { width: 240px; }
        @media (max-width: 480px) { .menu-dropdown { width: calc(100vw - 32px); } }
      `}</style>

      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: 'rgba(5, 8, 18, 0.95)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-14 relative flex items-center">

            {/* LEFT cluster: hamburger + logo */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div ref={menuWrapRef} className="relative">
                <button
                  ref={menuTriggerRef}
                  onClick={() => setMenuOpen(v => !v)}
                  className="hamburger-btn"
                  data-open={menuOpen}
                  aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                  aria-expanded={menuOpen}
                  aria-controls="primary-menu"
                  aria-haspopup="menu"
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', width: 18 }}>
                    <span className="hamburger-hline" style={{ transform: menuOpen ? 'translateY(5.5px) rotate(45deg)' : 'none' }} />
                    <span className="hamburger-hline" style={{ opacity: menuOpen ? 0 : 1 }} />
                    <span className="hamburger-hline" style={{ transform: menuOpen ? 'translateY(-5.5px) rotate(-45deg)' : 'none' }} />
                  </div>
                </button>

                {menuOpen && (
                  <div
                    id="primary-menu"
                    role="menu"
                    className="menu-dropdown absolute z-[60]"
                    style={{
                      top: 'calc(100% + 8px)',
                      left: 0,
                      animation: 'dropIn 0.15s cubic-bezier(0.22,1,0.36,1)',
                      background: '#0d1424',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 10,
                      padding: 8,
                      boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                    }}
                  >
                    {SECTIONS.map((section, si) => (
                      <div key={section.label}>
                        <p style={{
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: 'rgba(255,255,255,0.35)',
                          margin: si === 0 ? '8px 12px 6px' : '12px 12px 6px',
                          fontFamily: 'var(--font-display)',
                        }}>
                          {section.label}
                        </p>
                        {section.links.map(link => {
                          const Icon = link.icon;
                          const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
                          return (
                            <Link
                              key={link.href}
                              href={link.href}
                              role="menuitem"
                              onClick={() => setMenuOpen(false)}
                              className="dd-link flex items-center"
                              style={{
                                gap: 10,
                                padding: '8px 12px',
                                color: isActive ? '#a5b4fc' : 'rgba(255,255,255,0.85)',
                                fontSize: 13,
                                borderRadius: 6,
                                fontFamily: 'var(--font-display)',
                              }}
                            >
                              <Icon size={14} strokeWidth={1.75} />
                              <span>{link.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Link href="/" title="Stellar" className="flex items-center" style={{ marginLeft: 4 }}>
                <div style={{ filter: 'drop-shadow(0 0 18px rgba(99,102,241,0.6)) drop-shadow(0 0 36px rgba(99,102,241,0.25))' }}>
                  <AstroLogo heightClass="h-8" size={30} />
                </div>
              </Link>
            </div>

            {/* MIDDLE cluster: centered nav (md+) */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-1">
              {NAV_ITEMS.map(tab => {
                const Icon = tab.icon;
                const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`nav-tab px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 ${isActive ? 'nav-tab-active' : ''}`}
                    style={isActive ? {
                      background: 'linear-gradient(135deg, rgba(124,58,237,0.3) 0%, rgba(99,102,241,0.18) 100%)',
                      border: '1px solid rgba(99,102,241,0.3)',
                      color: '#67e8f9',
                      textDecoration: 'none',
                      boxShadow: '0 0 16px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.08)',
                      textShadow: '0 0 10px rgba(99,102,241,0.5)',
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

            {/* RIGHT cluster: search + avatar (or sign-in) */}
            <div className="ml-auto flex items-center gap-2 flex-shrink-0 z-10">
              <button
                onClick={() => setSearchOpen(true)}
                className="nav-icon-btn"
                style={{ width: 32, height: 32, borderRadius: 8, color: 'rgba(255,255,255,0.85)' }}
                aria-label="Search"
              >
                <Search size={17} strokeWidth={1.9} />
              </button>

              {!ready ? (
                <div className="w-[30px] h-[30px] rounded-full bg-white/10 animate-pulse" />
              ) : !authenticated ? (
                <button
                  onClick={() => login()}
                  className="signin-btn text-xs"
                  style={{
                    padding: '6px 12px',
                    borderRadius: 9999,
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.18)',
                    color: 'rgba(255,255,255,0.85)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Sign in
                </button>
              ) : (
                <div ref={avatarWrapRef} className="relative">
                  <button
                    ref={avatarTriggerRef}
                    onClick={() => setAvatarOpen(v => !v)}
                    className="avatar-btn"
                    aria-label="Open profile menu"
                    aria-expanded={avatarOpen}
                    aria-controls="avatar-menu"
                    aria-haspopup="menu"
                  >
                    <span style={{ color: 'white', fontSize: 11, fontWeight: 500, letterSpacing: '0.02em', lineHeight: 1 }}>
                      {initials}
                    </span>
                  </button>

                  {avatarOpen && (
                    <div
                      id="avatar-menu"
                      role="menu"
                      className="absolute z-[60]"
                      style={{
                        top: 'calc(100% + 8px)',
                        right: 0,
                        width: 220,
                        animation: 'dropIn 0.15s cubic-bezier(0.22,1,0.36,1)',
                        background: '#0d1424',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 10,
                        padding: 8,
                        boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                      }}
                    >
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        marginBottom: 4,
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 9999, flexShrink: 0,
                          background: 'linear-gradient(135deg, #534AB7, #7F77DD)',
                          border: '1.5px solid rgba(255,255,255,0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontSize: 11, fontWeight: 500,
                        }}>
                          {initials}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{
                            color: 'white', fontSize: 13, fontWeight: 500,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            fontFamily: 'var(--font-display)',
                          }}>
                            {displayName}
                          </div>
                          <div style={{
                            color: 'rgba(255,255,255,0.4)', fontSize: 11,
                            fontFamily: 'var(--font-mono)',
                          }}>
                            {walletAddress ? shortAddr(walletAddress) : 'No wallet'}
                          </div>
                        </div>
                      </div>

                      {AVATAR_ITEMS.map(item => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            role="menuitem"
                            onClick={() => setAvatarOpen(false)}
                            className="dd-link flex items-center"
                            style={{
                              gap: 10,
                              padding: '8px 12px',
                              color: 'rgba(255,255,255,0.85)',
                              fontSize: 13,
                              borderRadius: 6,
                              fontFamily: 'var(--font-display)',
                            }}
                          >
                            <Icon size={14} strokeWidth={1.75} />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}

                      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />

                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                        className="dd-link flex items-center w-full"
                        style={{
                          gap: 10,
                          padding: '8px 12px',
                          color: 'rgba(255,140,140,0.85)',
                          fontSize: 13,
                          borderRadius: 6,
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontFamily: 'var(--font-display)',
                        }}
                      >
                        <LogOut size={14} strokeWidth={1.75} />
                        <span>Sign out</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
