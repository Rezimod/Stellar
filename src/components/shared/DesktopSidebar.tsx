'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useAppState } from '@/hooks/useAppState';
import {
  CloudSun, Satellite, ShoppingBag, User, BookOpen,
  Trophy, Map, MessageCircle, Telescope, LogOut, Settings,
} from 'lucide-react';
import AstroLogo from './AstroLogo';

const NAV_SECTIONS = [
  {
    label: 'Explore',
    links: [
      { href: '/sky',         label: 'Sky Forecast',   icon: CloudSun,       desc: "Tonight's conditions" },
      { href: '/missions',    label: 'Missions',        icon: Satellite,      desc: 'Observe & earn Stars' },
      { href: '/learn',       label: 'Learning',        icon: BookOpen,       desc: 'Planets, quizzes & more' },
      { href: '/darksky',     label: 'Dark Sky Map',    icon: Map,            desc: 'Find dark sky sites' },
      { href: '/chat',        label: 'ASTRA AI',        icon: MessageCircle,  desc: 'AI space companion' },
    ],
  },
  {
    label: 'Community',
    links: [
      { href: '/leaderboard', label: 'Leaderboard',    icon: Trophy,         desc: 'Top observers' },
      { href: '/nfts',        label: 'Discoveries',    icon: Satellite,      desc: 'On-chain NFTs' },
      { href: '/club',        label: 'My Telescope',   icon: Telescope,      desc: 'Register your scope' },
    ],
  },
  {
    label: 'Shop',
    links: [
      { href: '/marketplace', label: 'Marketplace',    icon: ShoppingBag,    desc: 'Shop telescopes' },
    ],
  },
];

export default function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { authenticated, ready, login, logout, user } = usePrivy();
  const { setWallet } = useAppState();

  const userEmail =
    user?.email?.address ??
    (user?.linkedAccounts?.find(a => a.type === 'email') as { address?: string } | undefined)?.address ??
    '';
  const username = userEmail ? userEmail.split('@')[0] : '';

  const handleLogout = async () => {
    await logout();
    setWallet('');
    router.push('/');
  };

  return (
    <aside
      className="hidden lg:flex flex-col fixed left-0 top-14 h-[calc(100vh-56px)] z-30 overflow-y-auto"
      style={{
        width: 232,
        background: 'rgba(5, 8, 18, 0.97)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        scrollbarWidth: 'none',
      }}
    >
      <style>{`
        .sidebar-link { transition: background 0.15s ease, color 0.15s ease; border-left: 2px solid transparent; }
        .sidebar-link:hover:not(.sidebar-link-active) {
          background: rgba(56,240,255,0.04) !important;
          border-left-color: rgba(56,240,255,0.25) !important;
          color: rgba(255,255,255,0.85) !important;
        }
        .sidebar-link-active {
          background: rgba(56,240,255,0.08) !important;
          border-left-color: rgba(56,240,255,0.7) !important;
          color: #38F0FF !important;
        }
        .sidebar-section-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.2);
          padding: 0 16px;
          margin: 16px 0 6px;
        }
      `}</style>

      {/* Nav sections */}
      <nav className="flex-1 py-3">
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            <p className="sidebar-section-label">{section.label}</p>
            {section.links.map(link => {
              const Icon = link.icon;
              const isActive = link.href === '/'
                ? pathname === '/'
                : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`sidebar-link flex items-center gap-3 px-4 py-2.5 mx-2 rounded-r-xl ${isActive ? 'sidebar-link-active' : ''}`}
                  style={{ textDecoration: 'none' }}
                >
                  <Icon
                    size={15}
                    style={{ color: isActive ? '#38F0FF' : 'rgba(255,255,255,0.35)', flexShrink: 0 }}
                  />
                  <div className="min-w-0">
                    <p style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: isActive ? '#38F0FF' : 'rgba(255,255,255,0.75)',
                      margin: 0,
                      lineHeight: 1.2,
                    }}>
                      {link.label}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom: auth */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '12px 8px' }}>
        {!ready ? null : authenticated ? (
          <>
            <Link
              href="/profile"
              className="sidebar-link flex items-center gap-3 px-4 py-2.5 rounded-xl"
              style={{ textDecoration: 'none' }}
            >
              <User size={14} style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {username || 'Profile'}
              </span>
            </Link>
            <Link
              href="/profile?tab=settings"
              className="sidebar-link flex items-center gap-3 px-4 py-2.5 rounded-xl"
              style={{ textDecoration: 'none' }}
            >
              <Settings size={14} style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>Settings</span>
            </Link>
            <button
              onClick={handleLogout}
              className="sidebar-link w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <LogOut size={14} style={{ color: 'rgba(248,113,113,0.6)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(248,113,113,0.7)' }}>Sign out</span>
            </button>
          </>
        ) : (
          <button
            onClick={() => login()}
            className="w-full"
            style={{
              padding: '9px 16px', borderRadius: 10, cursor: 'pointer',
              background: 'rgba(124,58,237,0.15)',
              border: '1px solid rgba(124,58,237,0.45)',
              color: '#c4b5fd',
              fontSize: 13, fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            Log In
          </button>
        )}
        <p style={{ color: 'rgba(255,255,255,0.12)', fontSize: 10, textAlign: 'center', marginTop: 10, letterSpacing: '0.04em' }}>
          © 2026 Stellar · Built on Solana
        </p>
      </div>
    </aside>
  );
}
