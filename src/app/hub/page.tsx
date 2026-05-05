'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Sun, TrendingUp, Target, Sparkles, BookOpen, Globe, MessageCircle,
  Trophy, Gem, Telescope, ShoppingBag, Search, User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import SearchModal from '@/components/shared/SearchModal';

type HubItem = { href: string; label: string; icon: LucideIcon };
type HubSection = { label: string; items: HubItem[] };

const SECTIONS: HubSection[] = [
  {
    label: 'You',
    items: [
      { href: '/profile',     label: 'Profile',      icon: User },
      { href: '/club',        label: 'My telescope', icon: Telescope },
      { href: '/nfts',        label: 'Discoveries',  icon: Gem },
    ],
  },
  {
    label: 'Explore',
    items: [
      { href: '/sky',         label: 'Sky forecast', icon: Sun },
      { href: '/markets',     label: 'Markets',      icon: TrendingUp },
      { href: '/missions',    label: 'Missions',     icon: Target },
      { href: '/feed',        label: 'Feed',         icon: Sparkles },
      { href: '/learn',       label: 'Learning',     icon: BookOpen },
      { href: '/network',     label: 'Network',      icon: Globe },
      { href: '/chat',        label: 'ASTRA AI',     icon: MessageCircle },
    ],
  },
  {
    label: 'Community',
    items: [
      { href: '/leaderboard', label: 'Leaderboard',  icon: Trophy },
    ],
  },
  {
    label: 'Shop',
    items: [
      { href: '/marketplace', label: 'Marketplace',  icon: ShoppingBag },
    ],
  },
];

export default function HubPage() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1
          className="text-[28px] sm:text-[36px] font-bold text-white mb-6 sm:mb-8 tracking-[-0.01em]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Hub
        </h1>

        <button
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 mb-8 sm:mb-10 rounded-xl border border-white/[0.08] bg-[#11172A] text-left text-[#9BA3B4] hover:border-white/[0.14] hover:bg-[#161D34] transition-colors"
          aria-label="Open search"
        >
          <Search size={18} strokeWidth={1.8} />
          <span className="text-[14px]">Search</span>
        </button>

        {SECTIONS.map(section => (
          <section key={section.label} className="mb-8 sm:mb-10 last:mb-0">
            <h2
              className="text-[11px] font-semibold tracking-[0.16em] uppercase text-white/40 mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {section.label}
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4">
              {section.items.map(item => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex flex-col items-center gap-3 p-4 rounded-xl bg-[#11172A] border border-white/[0.06] hover:border-white/[0.14] hover:bg-[#161D34] transition-colors no-underline text-center"
                  >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                      <Icon size={22} strokeWidth={1.6} color="#FFD166" />
                    </div>
                    <span className="text-[12px] sm:text-[13px] text-white font-medium leading-tight">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
