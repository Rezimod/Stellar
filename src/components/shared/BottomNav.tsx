'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CloudSun, Satellite, Home, ShoppingBag, User } from 'lucide-react';
export default function BottomNav() {
  const pathname = usePathname();

  const tabs = [
    { href: '/sky',         label: 'Sky',      icon: <CloudSun size={18} />,   center: false },
    { href: '/missions',    label: 'Missions', icon: <Satellite size={18} />,  center: false },
    { href: '/',            label: 'Home',     icon: <Home size={22} />,        center: true  },
    { href: '/marketplace', label: 'Shop',     icon: <ShoppingBag size={18} />, center: false },
    { href: '/profile',     label: 'Profile',  icon: <User size={18} />,        center: false },
  ];

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(7,11,20,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-stretch">
        {tabs.map(tab => {
          const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
          const activeColor = '#34d399';
          const inactiveColor = 'rgba(255,255,255,0.35)';

          if (tab.center) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex-1 flex flex-col items-center justify-end pb-2"
                style={{ color: isActive ? activeColor : inactiveColor, textDecoration: 'none' }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'rgba(52,211,153,0.15)',
                    border: `1px solid ${isActive ? 'rgba(52,211,153,0.5)' : 'rgba(52,211,153,0.3)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    marginTop: -12,
                    color: isActive ? activeColor : 'rgba(255,255,255,0.55)',
                  }}
                >
                  {tab.icon}
                </div>
                <span style={{ fontSize: 9, fontWeight: 500, marginTop: 2 }}>{tab.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-[44px] transition-colors"
              style={{ color: isActive ? activeColor : inactiveColor, textDecoration: 'none' }}
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
