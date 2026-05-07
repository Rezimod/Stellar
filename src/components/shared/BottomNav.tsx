'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CloudSun, Satellite, Home, Sparkles, LayoutGrid } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Tab = { href: string; label: string; icon: LucideIcon };

const TABS: Tab[] = [
  { href: '/sky',      label: 'Sky',      icon: CloudSun },
  { href: '/missions', label: 'Missions', icon: Satellite },
  { href: '/',         label: 'Home',     icon: Home },
  { href: '/feed',     label: 'Feed',     icon: Sparkles },
  { href: '/hub',      label: 'Hub',      icon: LayoutGrid },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: '#050812',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 10px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          height: 70,
          padding: '6px 4px 0',
        }}
      >
        {TABS.map(tab => {
          const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 4,
                paddingTop: 6,
                textDecoration: 'none',
                WebkitTapHighlightColor: 'transparent',
                position: 'relative',
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 44,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.2 : 1.7}
                  color={isActive ? 'var(--stl-gold)' : '#ffffff'}
                />
              </div>

              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 10.5,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--stl-text-bright)' : '#ffffff',
                  letterSpacing: '0.01em',
                  lineHeight: 1,
                  transition: 'color 0.2s ease',
                }}
              >
                {tab.label}
              </span>

              {isActive && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    bottom: 2,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 32,
                    height: 2,
                    borderRadius: 2,
                    background: 'var(--stl-gold)',
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
