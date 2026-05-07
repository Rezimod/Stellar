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

const ACTIVE_RED = '#E63E4F';
const INACTIVE_RED = 'rgba(230, 62, 79, 0.45)';
const INACTIVE_LABEL = 'rgba(220, 220, 240, 0.55)';

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom), 0px)',
        background: 'transparent',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          pointerEvents: 'auto',
          background: '#1A1B3E',
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          height: 76,
          padding: '10px 4px 8px',
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
                gap: 6,
                paddingTop: 4,
                textDecoration: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <Icon
                size={24}
                strokeWidth={2}
                color={isActive ? ACTIVE_RED : INACTIVE_RED}
                fill={isActive ? ACTIVE_RED : INACTIVE_RED}
                style={{ transition: 'color 0.2s ease, fill 0.2s ease' }}
              />

              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 11,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#FFFFFF' : INACTIVE_LABEL,
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
                    marginTop: 2,
                    width: 22,
                    height: 2,
                    borderRadius: 2,
                    background: '#FFFFFF',
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
