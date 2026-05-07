'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { useStellarAuth } from '@/hooks/useStellarAuth';
import { useDisplayProfile } from '@/hooks/useDisplayProfile';
import { AuthModal } from '@/components/auth/AuthModal';
import { avatarById } from '@/lib/avatars';
import {
  CloudSun, ShoppingBag, Satellite, Search, BookOpen,
  Sparkles, Telescope, LayoutGrid, User, Gem, LogOut,
} from 'lucide-react';
import AstroLogo from './AstroLogo';
import SearchModal from './SearchModal';

const NAV_ITEMS = [
  { href: '/sky',         label: 'Sky',       icon: CloudSun },
  { href: '/missions',    label: 'Missions',  icon: Satellite },
  { href: '/feed',        label: 'Feed',      icon: Sparkles },
  { href: '/learn',       label: 'Learning',  icon: BookOpen },
  { href: '/marketplace', label: 'Shop',      icon: ShoppingBag },
];

const AVATAR_ITEMS: { href: string; label: string; icon: typeof User }[] = [
  { href: '/profile', label: 'Profile',         icon: User },
  { href: '/club',    label: 'My telescope',    icon: Telescope },
  { href: '/nfts',    label: 'My discoveries',  icon: Gem },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useStellarAuth();
  const { authenticated, ready, displayName, email, initials, avatarId } = useDisplayProfile();
  const [searchOpen, setSearchOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const avatarWrapRef = useRef<HTMLDivElement>(null);
  const avatarTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { setSearchOpen(false); setAvatarOpen(false); }, [pathname]);

  useEffect(() => {
    if (!avatarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setAvatarOpen(false); avatarTriggerRef.current?.focus(); }
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (avatarWrapRef.current && !avatarWrapRef.current.contains(t)) setAvatarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [avatarOpen]);

  const avatarDef = avatarId ? avatarById(avatarId) : null;
  const showAvatarIcon = avatarDef && avatarDef.id !== 'initial';

  const renderAvatarFace = (size: number) => {
    if (showAvatarIcon && avatarDef) {
      return <avatarDef.Icon size={Math.round(size * 0.62)} tint="#FFFFFF" />;
    }
    if (initials) {
      return (
        <span style={{ color: 'white', fontSize: Math.max(10, Math.round(size * 0.36)), fontWeight: 500, letterSpacing: '0.02em', lineHeight: 1 }}>
          {initials}
        </span>
      );
    }
    return <Telescope size={Math.round(size * 0.45)} strokeWidth={1.75} color="white" />;
  };

  // Premium gradient face when an avatar is selected; deep cosmic surface otherwise.
  const avatarSurfaceStyle = (size: number): CSSProperties => {
    const base: CSSProperties = {
      borderRadius: 9999,
      border: '1px solid rgba(255,255,255,0.10)',
      overflow: 'hidden',
    };
    if (showAvatarIcon && avatarDef) {
      return {
        ...base,
        background: avatarDef.gradient,
        boxShadow: `0 ${Math.round(size * 0.10)}px ${Math.round(size * 0.28)}px ${-Math.round(size * 0.10)}px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 ${-Math.round(size * 0.12)}px ${Math.round(size * 0.26)}px rgba(0,0,0,0.28)`,
      };
    }
    return {
      ...base,
      background: '#0A1735',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -8px 16px rgba(0,0,0,0.35)',
    };
  };

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
        .hub-btn { width: 32px; height: 32px; display: none; align-items: center; justify-content: center; border-radius: 8px; background: transparent; border: 1px solid transparent; cursor: pointer; padding: 0; color: rgba(255,255,255,0.7); transition: all 0.15s ease; text-decoration: none; }
        @media (min-width: 768px) { .hub-btn { display: flex; } }
        .hub-btn:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); color: rgba(255,255,255,0.95); }
        .hub-btn[data-active="true"] { background: rgba(255,179,71,0.10); border-color: rgba(255,179,71,0.25); color: #FFB347; }
        .avatar-btn { width: 32px; height: 32px; min-width: 32px; min-height: 32px; aspect-ratio: 1 / 1; flex-shrink: 0; padding: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.18s ease, filter 0.18s ease; }
        .avatar-btn:hover { transform: translateY(-1px); filter: brightness(1.05); }
        .avatar-btn[data-active="true"] { box-shadow: 0 0 0 1.5px rgba(255,179,71,0.55), 0 4px 12px -4px rgba(255,179,71,0.30) !important; }
        .dd-link { transition: background 0.15s ease; text-decoration: none; }
        .dd-link:hover { background: rgba(255,255,255,0.04); }
      `}</style>

      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: '#050812',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-14 relative flex items-center">

            {/* LEFT cluster: logo */}
            <div className="flex items-center flex-shrink-0 gap-2">
              <Link href="/" title="Stellar" className="flex items-center">
                <div style={{ filter: 'drop-shadow(0 0 14px rgba(255, 179, 71,0.55)) drop-shadow(0 0 28px rgba(255, 179, 71,0.22))' }}>
                  <AstroLogo heightClass="h-6" size={22} />
                </div>
              </Link>
            </div>

            {/* MIDDLE cluster: centered nav (md+) */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-1">
              {NAV_ITEMS.map(tab => {
                const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`nav-tab px-3.5 py-1.5 text-xs font-semibold ${isActive ? 'nav-tab-active' : ''}`}
                    style={isActive ? {
                      background: 'linear-gradient(135deg, rgba(255, 179, 71,0.22) 0%, rgba(255, 179, 71,0.12) 100%)',
                      border: '1px solid rgba(255, 179, 71,0.35)',
                      color: '#FFB347',
                      textDecoration: 'none',
                      boxShadow: '0 0 16px rgba(255, 179, 71,0.18), inset 0 1px 0 rgba(255,255,255,0.08)',
                      textShadow: '0 0 10px rgba(255, 179, 71,0.45)',
                    } : {
                      color: 'rgba(255,255,255,0.6)',
                      border: '1px solid transparent',
                      textDecoration: 'none',
                    }}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>

            {/* RIGHT cluster: search → hub → avatar/sign-in */}
            <div className="ml-auto flex items-center gap-2 flex-shrink-0 z-10">
              <button
                onClick={() => setSearchOpen(true)}
                className="nav-icon-btn"
                style={{ width: 32, height: 32, borderRadius: 8, color: 'rgba(255,255,255,0.85)' }}
                aria-label="Search"
              >
                <Search size={17} strokeWidth={1.9} />
              </button>

              <Link
                href="/hub"
                className="hub-btn"
                data-active={pathname.startsWith('/hub')}
                aria-label="Hub"
              >
                <LayoutGrid size={17} strokeWidth={1.9} />
              </Link>

              {!ready ? (
                <div className="w-8 h-8 rounded-full bg-[var(--surface-hover)] animate-pulse shrink-0" style={{ aspectRatio: '1 / 1' }} />
              ) : !authenticated ? (
                <button
                  onClick={() => setAuthOpen(true)}
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
                    data-active={avatarOpen || pathname.startsWith('/profile')}
                    aria-label="Open profile menu"
                    aria-expanded={avatarOpen}
                    aria-controls="avatar-menu"
                    aria-haspopup="menu"
                    style={avatarSurfaceStyle(32)}
                  >
                    {renderAvatarFace(32)}
                  </button>

                  {avatarOpen && (
                    <div
                      id="avatar-menu"
                      role="menu"
                      className="absolute z-[60]"
                      style={{
                        top: 'calc(100% + 8px)',
                        right: 0,
                        width: 240,
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
                          width: 36, height: 36, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white',
                          ...avatarSurfaceStyle(36),
                        }}>
                          {renderAvatarFace(36)}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{
                            color: 'white', fontSize: 13, fontWeight: 500,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            fontFamily: 'var(--font-display)',
                          }}>
                            {displayName}
                          </div>
                          {email && (
                            <div style={{
                              color: 'rgba(255,255,255,0.4)', fontSize: 11,
                              fontFamily: 'var(--font-mono)',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                              {email}
                            </div>
                          )}
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
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
