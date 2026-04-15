'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CloudSun, Satellite, User, BookOpen, Home } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/sky',      label: 'Sky',      icon: CloudSun },
  { href: '/missions', label: 'Missions', icon: Satellite },
  { href: '/',         label: 'Home',     icon: Home },
  { href: '/learn',    label: 'Learn',    icon: BookOpen },
  { href: '/profile',  label: 'Profile',  icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(5, 8, 18, 0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 10px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          height: 68,
        }}
      >
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
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                textDecoration: 'none',
                WebkitTapHighlightColor: 'transparent',
                position: 'relative',
              }}
            >
              {/* Active top indicator */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: '28%',
                  right: '28%',
                  height: 2,
                  borderRadius: '0 0 2px 2px',
                  background: '#34d399',
                }} />
              )}

              <Icon
                size={26}
                strokeWidth={isActive ? 2 : 1.5}
                color={isActive ? '#34d399' : 'rgba(255,255,255,0.38)'}
              />

              <span style={{
                fontSize: 11,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.38)',
                letterSpacing: '0.01em',
                lineHeight: 1,
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
