'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppState } from '@/hooks/useAppState';
import { Lock, Telescope, Satellite, ImageIcon, User } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();
  const { state } = useAppState();
  const clubDone = state.walletConnected && state.membershipMinted && !!state.telescope;

  const tabs = [
    { href: '/club', label: 'Club', icon: <Telescope size={20} /> },
    { href: '/missions', label: 'Missions', icon: <Satellite size={20} />, locked: !clubDone },
    { href: '/proof', label: 'Gallery', icon: <ImageIcon size={20} />, locked: !clubDone },
    { href: '/profile', label: 'Profile', icon: <User size={20} />, locked: !clubDone },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-[rgba(7,11,20,0.95)] backdrop-blur-xl border-t border-white/10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-stretch">
        {tabs.map(tab => (
          tab.locked ? (
            <span key={tab.href} className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[var(--text-dim)] cursor-not-allowed">
              <Lock size={18} />
              <span className="text-[10px]">{tab.label}</span>
            </span>
          ) : (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
                pathname === tab.href
                  ? 'text-[#FFD166]'
                  : 'text-[var(--text-secondary)] active:text-[var(--text-primary)]'
              }`}
            >
              {tab.icon}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          )
        ))}
      </div>
    </nav>
  );
}
