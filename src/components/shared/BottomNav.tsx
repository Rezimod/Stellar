'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CloudSun, Bot, ShoppingBag, User } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  const tabs = [
    { href: '/sky', label: t('sky'), icon: <CloudSun size={20} /> },
    { href: '/chat', label: t('chat'), icon: <Bot size={20} /> },
    { href: '/marketplace', label: t('marketplace'), icon: <ShoppingBag size={20} /> },
    { href: '/profile', label: t('profile'), icon: <User size={20} /> },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-[rgba(7,11,20,0.95)] backdrop-blur-xl border-t border-white/10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-stretch">
        {tabs.map(tab => (
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
        ))}
      </div>
    </nav>
  );
}
