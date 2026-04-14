'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CloudSun, Satellite, Home, ShoppingBag, User } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { href: '/sky',         label: 'Sky',      icon: <CloudSun size={20} />,    center: false },
    { href: '/missions',    label: 'Missions', icon: <Satellite size={20} />,   center: false },
    { href: '/',            label: 'Home',     icon: <Home size={24} />,         center: true  },
    { href: '/marketplace', label: 'Shop',     icon: <ShoppingBag size={20} />, center: false },
    { href: '/profile',     label: 'Profile',  icon: <User size={20} />,         center: false },
  ];

  const activeColor   = '#38F0FF';
  const inactiveColor = 'rgba(255,255,255,0.32)';

  return (
    <>
      <style>{`
        @keyframes homeGlow {
          0%, 100% { box-shadow: 0 0 16px rgba(139,92,246,0.45), 0 0 32px rgba(56,240,255,0.2); }
          50%       { box-shadow: 0 0 24px rgba(139,92,246,0.65), 0 0 48px rgba(56,240,255,0.3); }
        }
        @keyframes tabActiveDot {
          from { transform: translateX(-50%) scaleX(0); opacity: 0; }
          to   { transform: translateX(-50%) scaleX(1); opacity: 1; }
        }
        .bottom-tab-active-dot {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 2px;
          background: linear-gradient(90deg, #8B5CF6, #38F0FF);
          border-radius: 0 0 3px 3px;
          box-shadow: 0 0 8px rgba(56,240,255,0.7);
          animation: tabActiveDot 0.2s ease forwards;
        }
      `}</style>
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: 'linear-gradient(180deg, rgba(5,8,17,0.96) 0%, rgba(4,7,15,0.99) 100%)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          willChange: 'transform',
          boxShadow: '0 -1px 0 rgba(56,240,255,0.08), 0 -4px 24px rgba(0,0,0,0.6)',
        }}
      >
        {/* Gradient top border */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 1,
          background: 'linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.6) 20%, rgba(56,240,255,0.8) 50%, rgba(139,92,246,0.6) 80%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        <div className="flex items-stretch">
          {tabs.map(tab => {
            const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
            const color = isActive ? activeColor : inactiveColor;

            if (tab.center) {
              const handlePress = () => {
                if (pathname === '/') {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  router.push('/');
                }
              };

              return (
                <button
                  key={tab.href}
                  onClick={handlePress}
                  className="flex-1 flex flex-col items-center justify-end pb-2 relative"
                  style={{ color, background: 'none', border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(139,92,246,0.35) 0%, rgba(56,240,255,0.25) 100%)'
                        : 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(56,240,255,0.1) 100%)',
                      border: isActive
                        ? '1.5px solid rgba(56,240,255,0.55)'
                        : '1.5px solid rgba(139,92,246,0.3)',
                      animation: isActive ? 'homeGlow 2.5s ease-in-out infinite' : undefined,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: -18,
                      color: isActive ? '#38F0FF' : 'rgba(255,255,255,0.5)',
                      transition: 'all 0.2s ease',
                      willChange: 'transform',
                      position: 'relative',
                    }}
                  >
                    {/* Inner ring */}
                    <div style={{
                      position: 'absolute',
                      inset: 4,
                      borderRadius: '50%',
                      border: isActive ? '1px solid rgba(56,240,255,0.2)' : '1px solid rgba(255,255,255,0.05)',
                      pointerEvents: 'none',
                    }} />
                    {tab.icon}
                  </div>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 600,
                    marginTop: 4,
                    color,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    textShadow: isActive ? '0 0 8px rgba(56,240,255,0.5)' : undefined,
                  }}>{tab.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 min-h-[52px] relative"
                style={{ color, textDecoration: 'none', WebkitTapHighlightColor: 'transparent' }}
              >
                {isActive && <div className="bottom-tab-active-dot" />}
                <div style={{
                  color: isActive ? '#38F0FF' : inactiveColor,
                  filter: isActive ? 'drop-shadow(0 0 6px rgba(56,240,255,0.6))' : undefined,
                  transition: 'all 0.18s ease',
                }}>
                  {tab.icon}
                </div>
                <span style={{
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color,
                  textShadow: isActive ? '0 0 8px rgba(56,240,255,0.4)' : undefined,
                }}>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
