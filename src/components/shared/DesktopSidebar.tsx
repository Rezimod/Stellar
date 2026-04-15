'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useAppState } from '@/hooks/useAppState';
import {
  CloudSun, Satellite, ShoppingBag, User, BookOpen,
  Trophy, Map, MessageCircle, Telescope, LogOut, Settings, ChevronRight,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import AstroLogo from './AstroLogo';

const SECTIONS = [
  {
    label: 'Explore',
    links: [
      { href: '/sky',         label: 'Sky Forecast',  icon: CloudSun },
      { href: '/missions',    label: 'Missions',       icon: Satellite },
      { href: '/learn',       label: 'Learning',       icon: BookOpen },
      { href: '/darksky',     label: 'Dark Sky Map',   icon: Map },
      { href: '/chat',        label: 'ASTRA AI',       icon: MessageCircle },
    ],
  },
  {
    label: 'Community',
    links: [
      { href: '/leaderboard', label: 'Leaderboard',   icon: Trophy },
      { href: '/nfts',        label: 'Discoveries',   icon: Satellite },
      { href: '/club',        label: 'My Telescope',  icon: Telescope },
    ],
  },
  {
    label: 'Shop',
    links: [
      { href: '/marketplace', label: 'Marketplace',   icon: ShoppingBag },
    ],
  },
];

export default function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { authenticated, ready, login, logout, user } = usePrivy();
  const { setWallet } = useAppState();
  const [collapsed, setCollapsed] = useState(true);

  const userEmail =
    user?.email?.address ??
    (user?.linkedAccounts?.find(a => a.type === 'email') as { address?: string } | undefined)?.address ??
    '';
  const username = userEmail ? userEmail.split('@')[0] : '';

  useEffect(() => {
    if (collapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
    return () => { document.body.classList.remove('sidebar-collapsed'); };
  }, [collapsed]);

  const handleLogout = async () => {
    await logout();
    setWallet('');
    router.push('/');
  };

  return (
    <aside
      className="hidden lg:flex flex-col fixed left-0 top-14 h-[calc(100vh-56px)] z-30 overflow-hidden"
      style={{
        width: collapsed ? 52 : 216,
        transition: 'width 0.22s cubic-bezier(0.16,1,0.3,1)',
        background: 'rgba(4, 6, 14, 0.98)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <style>{`
        .sb-link {
          display: flex;
          align-items: center;
          gap: 10px;
          border-radius: 10px;
          text-decoration: none;
          transition: background 0.15s ease, color 0.15s ease;
          white-space: nowrap;
          overflow: hidden;
          position: relative;
        }
        .sb-link:hover:not(.sb-link-active) {
          background: rgba(56,240,255,0.06);
        }
        .sb-link-active {
          background: rgba(56,240,255,0.1);
        }
        .sb-link-active .sb-icon {
          color: #38F0FF !important;
        }
        .sb-link-active .sb-label {
          color: #38F0FF !important;
        }
        .sb-section {
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px;
          overflow: hidden;
          background: rgba(255,255,255,0.015);
        }
        .sb-toggle {
          transition: background 0.15s ease;
          border-radius: 10px;
          flex-shrink: 0;
        }
        .sb-toggle:hover {
          background: rgba(255,255,255,0.06);
        }
      `}</style>

      {/* Toggle button */}
      <div style={{ padding: collapsed ? '10px 8px' : '10px 10px', flexShrink: 0 }}>
        <button
          onClick={() => setCollapsed(v => !v)}
          className="sb-toggle w-full flex items-center gap-2.5"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: collapsed ? '6px 6px' : '6px 8px',
            height: 36,
            justifyContent: collapsed ? 'center' : 'space-between',
          }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ filter: 'drop-shadow(0 0 6px rgba(56,240,255,0.4))' }}>
                <AstroLogo heightClass="h-5" />
              </div>
            </div>
          )}
          {/* Lines icon when collapsed, chevron when expanded */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 3.5, flexShrink: 0,
            alignItems: 'center', justifyContent: 'center',
            width: 18,
          }}>
            {collapsed ? (
              <>
                <span style={{ display: 'block', width: 16, height: 1.5, borderRadius: 2, background: 'rgba(255,255,255,0.45)' }} />
                <span style={{ display: 'block', width: 11, height: 1.5, borderRadius: 2, background: 'rgba(56,240,255,0.6)' }} />
                <span style={{ display: 'block', width: 14, height: 1.5, borderRadius: 2, background: 'rgba(255,255,255,0.45)' }} />
              </>
            ) : (
              <ChevronRight
                size={14}
                style={{ color: 'rgba(255,255,255,0.35)', transform: 'rotate(180deg)' }}
              />
            )}
          </div>
        </button>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', flexShrink: 0, margin: '0 8px' }} />

      {/* Nav sections */}
      <nav
        className="flex-1 overflow-y-auto"
        style={{
          padding: collapsed ? '10px 6px' : '10px 8px',
          display: 'flex', flexDirection: 'column', gap: 8,
          scrollbarWidth: 'none',
        }}
      >
        {SECTIONS.map(section => (
          <div key={section.label} className="sb-section">
            {/* Section label — only when expanded */}
            {!collapsed && (
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)',
                padding: '8px 10px 4px',
              }}>
                {section.label}
              </div>
            )}
            <div style={{ padding: collapsed ? '4px' : '4px 4px' }}>
              {section.links.map(link => {
                const Icon = link.icon;
                const isActive = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`sb-link ${isActive ? 'sb-link-active' : ''}`}
                    style={{
                      padding: collapsed ? '8px 6px' : '7px 8px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      marginBottom: 1,
                    }}
                    title={collapsed ? link.label : undefined}
                  >
                    <Icon
                      size={15}
                      className="sb-icon"
                      style={{
                        color: isActive ? '#38F0FF' : 'rgba(255,255,255,0.38)',
                        flexShrink: 0,
                        transition: 'color 0.15s',
                      }}
                    />
                    {!collapsed && (
                      <span
                        className="sb-label"
                        style={{
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: isActive ? '#38F0FF' : 'rgba(255,255,255,0.68)',
                          transition: 'color 0.15s',
                          letterSpacing: '0.01em',
                        }}
                      >
                        {link.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom auth */}
      <div style={{
        flexShrink: 0,
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: collapsed ? '8px 6px' : '8px 8px',
      }}>
        {!ready ? null : authenticated ? (
          <div className="sb-section" style={{ padding: collapsed ? '4px' : '4px' }}>
            <Link
              href="/profile"
              className="sb-link"
              style={{
                padding: collapsed ? '7px 6px' : '7px 8px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                marginBottom: 1,
              }}
              title={collapsed ? (username || 'Profile') : undefined}
            >
              <User size={14} style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
              {!collapsed && <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{username || 'Profile'}</span>}
            </Link>
            <Link
              href="/profile?tab=settings"
              className="sb-link"
              style={{
                padding: collapsed ? '7px 6px' : '7px 8px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                marginBottom: 1,
              }}
              title={collapsed ? 'Settings' : undefined}
            >
              <Settings size={14} style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
              {!collapsed && <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Settings</span>}
            </Link>
            <button
              onClick={handleLogout}
              className="sb-link w-full"
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: collapsed ? '7px 6px' : '7px 8px',
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
              title={collapsed ? 'Sign out' : undefined}
            >
              <LogOut size={14} style={{ color: 'rgba(248,113,113,0.55)', flexShrink: 0 }} />
              {!collapsed && <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(248,113,113,0.65)' }}>Sign out</span>}
            </button>
          </div>
        ) : (
          <button
            onClick={() => login()}
            style={{
              width: '100%',
              padding: collapsed ? '8px 4px' : '8px 12px',
              borderRadius: 10, cursor: 'pointer',
              background: 'rgba(124,58,237,0.14)',
              border: '1px solid rgba(124,58,237,0.4)',
              color: '#c4b5fd',
              fontSize: 12, fontWeight: 700,
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap', overflow: 'hidden',
            }}
            title={collapsed ? 'Log In' : undefined}
          >
            {collapsed ? (
              <User size={14} style={{ display: 'block', margin: '0 auto', color: '#c4b5fd' }} />
            ) : 'Log In'}
          </button>
        )}
      </div>
    </aside>
  );
}
