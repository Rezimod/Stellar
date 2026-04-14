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
              {/* Active pill background */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: 6,
                  left: '12%',
                  right: '12%',
                  bottom: 6,
                  borderRadius: 14,
                  background: 'rgba(52,211,153,0.1)',
                  border: '1px solid rgba(52,211,153,0.18)',
                }} />
              )}

              {/* Icon */}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.2 : 1.5}
                  color={isActive ? '#fff' : 'rgba(255,255,255,0.4)'}
                />
              </div>

              {/* Label */}
              <span style={{
                position: 'relative',
                zIndex: 1,
                fontSize: 10,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
                marginTop: 3,
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
