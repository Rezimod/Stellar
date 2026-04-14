'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CloudSun, Satellite, ShoppingBag, User, BookOpen } from 'lucide-react';

const TABS = [
  { href: '/sky',         label: 'Sky',      icon: <CloudSun size={19} /> },
  { href: '/missions',    label: 'Missions', icon: <Satellite size={19} /> },
  { href: '/learn',       label: 'Learning', icon: <BookOpen size={19} /> },
  { href: '/marketplace', label: 'Shop',     icon: <ShoppingBag size={19} /> },
  { href: '/profile',     label: 'Profile',  icon: <User size={19} /> },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      <style>{`
        @keyframes tabSlideIn {
          from { transform: translateX(-50%) scaleX(0); opacity: 0; }
          to   { transform: translateX(-50%) scaleX(1); opacity: 1; }
        }
        .btm-tab-indicator {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 28px;
          height: 2px;
          background: linear-gradient(90deg, #7c3aed, #38F0FF);
          border-radius: 0 0 4px 4px;
          box-shadow: 0 0 10px rgba(56,240,255,0.8);
          animation: tabSlideIn 0.2s ease forwards;
        }
        .btm-tab {
          transition: all 0.18s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .btm-tab:active { transform: scale(0.92); }
      `}</style>
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: 'rgba(5, 8, 18, 0.92)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderTop: '1px solid rgba(124,58,237,0.22)',
          boxShadow: '0 -1px 0 rgba(56,240,255,0.06), 0 -8px 40px rgba(0,0,0,0.7)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          willChange: 'transform',
        }}
      >
        {/* Top accent line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2, pointerEvents: 'none',
          background: 'linear-gradient(90deg, transparent 0%, rgba(124,58,237,0.9) 20%, rgba(56,240,255,1) 50%, rgba(124,58,237,0.9) 80%, transparent 100%)',
        }} />

        <div className="flex items-stretch">
          {TABS.map(tab => {
            const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="btm-tab flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] relative"
                style={{ textDecoration: 'none', WebkitTapHighlightColor: 'transparent' }}
              >
                {isActive && <div className="btm-tab-indicator" />}

                {/* Icon container */}
                <div style={{
                  width: 36, height: 36,
                  borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(124,58,237,0.3) 0%, rgba(56,240,255,0.18) 100%)'
                    : 'transparent',
                  border: isActive ? '1px solid rgba(56,240,255,0.28)' : '1px solid transparent',
                  boxShadow: isActive ? '0 0 14px rgba(56,240,255,0.18), inset 0 1px 0 rgba(255,255,255,0.06)' : undefined,
                  color: isActive ? '#67e8f9' : 'rgba(255,255,255,0.38)',
                  filter: isActive ? 'drop-shadow(0 0 6px rgba(56,240,255,0.5))' : undefined,
                  transition: 'all 0.18s ease',
                }}>
                  {tab.icon}
                </div>

                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: isActive ? '#67e8f9' : 'rgba(255,255,255,0.38)',
                  textShadow: isActive ? '0 0 8px rgba(56,240,255,0.5)' : undefined,
                  transition: 'all 0.18s ease',
                }}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
