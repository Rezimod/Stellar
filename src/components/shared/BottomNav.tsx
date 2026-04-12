'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CloudSun, Satellite, Home, ShoppingBag, User } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { href: '/sky',         label: 'Sky',      icon: <CloudSun size={18} />,    center: false },
    { href: '/missions',    label: 'Missions', icon: <Satellite size={18} />,   center: false },
    { href: '/',            label: 'Home',     icon: <Home size={22} />,         center: true  },
    { href: '/marketplace', label: 'Shop',     icon: <ShoppingBag size={18} />, center: false },
    { href: '/profile',     label: 'Profile',  icon: <User size={18} />,         center: false },
  ];

  const activeColor   = '#34d399';
  const inactiveColor = 'rgba(255,255,255,0.35)';

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(7,11,20,0.94)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        willChange: 'transform',
      }}
    >
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
                className="flex-1 flex flex-col items-center justify-end pb-2"
                style={{ color, background: 'none', border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: isActive ? 'rgba(52,211,153,0.18)' : 'rgba(52,211,153,0.1)',
                    border: `1px solid ${isActive ? 'rgba(52,211,153,0.55)' : 'rgba(52,211,153,0.25)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: -12,
                    color: isActive ? activeColor : 'rgba(255,255,255,0.5)',
                    transition: 'background 0.15s, border-color 0.15s',
                    willChange: 'transform',
                  }}
                >
                  {tab.icon}
                </div>
                <span style={{ fontSize: 9, fontWeight: 500, marginTop: 2, color }}>{tab.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-[44px] transition-colors"
              style={{ color, textDecoration: 'none', WebkitTapHighlightColor: 'transparent' }}
            >
              {tab.icon}
              <span className="text-[9px] font-medium truncate max-w-full px-1">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
