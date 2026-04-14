'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CloudSun, Satellite, User, BookOpen, Home } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/sky',      label: 'Sky',      icon: CloudSun },
  { href: '/missions', label: 'Missions', icon: Satellite },
  { href: '/',         label: 'Home',     icon: Home },
  { href: '/learn',    label: 'Learning', icon: BookOpen },
  { href: '/profile',  label: 'Profile',  icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(5, 8, 18, 0.96)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex">
        {TABS.map(tab => {
          const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          const handleClick = tab.href === '/' && pathname === '/'
            ? (e: React.MouseEvent) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
            : undefined;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={handleClick}
              className="flex-1 flex flex-col items-center py-2"
              style={{ textDecoration: 'none', position: 'relative', WebkitTapHighlightColor: 'transparent' }}
            >
              {/* Active top bar */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: -1,
                  left: '20%',
                  right: '20%',
                  height: 2.5,
                  borderRadius: '0 0 4px 4px',
                  background: 'linear-gradient(90deg, rgba(52,211,153,0.4), #34d399, rgba(52,211,153,0.4))',
                  boxShadow: '0 0 8px rgba(52,211,153,0.3)',
                }} />
              )}

              {/* Icon container */}
              <div style={{
                width: 40,
                height: 34,
                borderRadius: 12,
                background: isActive
                  ? 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(52,211,153,0.08))'
                  : 'transparent',
                border: isActive
                  ? '1px solid rgba(52,211,153,0.15)'
                  : '1px solid transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}>
                <Icon
                  size={19}
                  strokeWidth={isActive ? 2.2 : 1.5}
                  color={isActive ? '#34d399' : 'rgba(255,255,255,0.3)'}
                  style={{ transition: 'color 0.2s' }}
                />
              </div>

              {/* Label */}
              <span style={{
                fontSize: 9.5,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#34d399' : 'rgba(255,255,255,0.3)',
                marginTop: 3,
                letterSpacing: isActive ? '0.04em' : '0.02em',
                transition: 'all 0.2s ease',
              }}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
