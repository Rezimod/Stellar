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
        background: 'rgba(5, 8, 18, 0.95)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
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
              className="flex-1 flex flex-col items-center pt-2 pb-1.5"
              style={{ textDecoration: 'none', position: 'relative', WebkitTapHighlightColor: 'transparent' }}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: '25%',
                  right: '25%',
                  height: 2,
                  borderRadius: '0 0 2px 2px',
                  background: '#34d399',
                }} />
              )}

              {/* Icon container */}
              <div style={{
                width: 36,
                height: 32,
                borderRadius: 10,
                background: isActive ? 'rgba(52,211,153,0.12)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}>
                <Icon size={20} color={isActive ? '#34d399' : 'rgba(255,255,255,0.35)'} strokeWidth={isActive ? 2 : 1.5} />
              </div>

              {/* Label */}
              <span style={{
                fontSize: 10,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#34d399' : 'rgba(255,255,255,0.35)',
                marginTop: 2,
                letterSpacing: '0.02em',
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
