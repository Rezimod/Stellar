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
    label: 'Explore',
    items: [
      { href: '/sky',         label: 'Sky forecast', icon: Sun },
      { href: '/markets',     label: 'Markets',      icon: TrendingUp },
      { href: '/missions',    label: 'Missions',     icon: Target },
      { href: '/chat',        label: 'ASTRA AI',     icon: MessageCircle },
      { href: '/feed',        label: 'Feed',         icon: Sparkles },
      { href: '/learn',       label: 'Learning',     icon: BookOpen },
      { href: '/network',     label: 'Network',      icon: Globe },
      { href: '/leaderboard', label: 'Leaderboard',  icon: Trophy },
      { href: '/marketplace', label: 'Marketplace',  icon: ShoppingBag },
    ],
  },
  {
    label: 'You',
    items: [
      { href: '/profile', label: 'Profile',      icon: User },
      { href: '/club',    label: 'My telescope', icon: Telescope },
      { href: '/nfts',    label: 'Discoveries',  icon: Gem },
    ],
  },
];

export default function HubPage() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <header className="mb-6 sm:mb-8">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.02] text-left text-[#A8B4C8] hover:border-white/[0.16] hover:bg-white/[0.04] transition-colors"
            aria-label="Open search"
          >
            <Search size={16} strokeWidth={1.8} />
            <span className="text-[13px] sm:text-[14px]">Search</span>
            <span
              className="ml-auto hidden sm:inline-flex items-center gap-1 text-[11px] text-white/40 px-1.5 py-0.5 rounded border border-white/[0.08]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              ⌘K
            </span>
          </button>
        </header>

        {SECTIONS.map((section) => (
          <section key={section.label} className="mb-6 sm:mb-8 last:mb-0">
            <div className="flex items-center gap-3 mb-3">
              <h2
                className="text-[10px] sm:text-[11px] font-semibold tracking-[0.22em] uppercase text-white/40"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {section.label}
              </h2>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex flex-col items-center justify-center gap-2.5 p-4 sm:p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.16] hover:bg-white/[0.04] transition-colors no-underline text-center"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#FFD166]/[0.08] border border-[#FFD166]/[0.16] flex items-center justify-center shrink-0">
                      <Icon size={18} strokeWidth={1.8} color="#FFD166" />
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
