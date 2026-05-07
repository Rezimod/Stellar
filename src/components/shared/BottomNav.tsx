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
              {/* Active pill — filled tab background behind icon */}
              <div
                style={{
                  position: 'relative',
                  width: 44,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  background: isActive
                    ? 'radial-gradient(ellipse at 50% 55%, rgba(255, 179, 71,0.22) 0%, rgba(255, 179, 71,0.05) 55%, transparent 75%)'
                    : 'transparent',
                  transition: 'background 0.2s ease',
                }}
              >
                {isActive && (
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      top: -6,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 20,
                      height: 2,
                      borderRadius: 2,
                      background: 'var(--stl-gold)',
                      boxShadow: '0 0 10px rgba(255, 179, 71,0.8)',
                    }}
                  />
                )}
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.2 : 1.7}
                  color={isActive ? 'var(--stl-gold)' : '#ffffff'}
                  style={{
                    filter: isActive ? 'drop-shadow(0 0 6px rgba(255, 179, 71,0.45))' : 'none',
                    transition: 'color 0.2s ease, filter 0.2s ease',
                  }}
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
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
