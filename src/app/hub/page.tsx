'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Sun, TrendingUp, Target, Sparkles, BookOpen, Globe, MessageCircle,
  Trophy, Gem, Telescope, ShoppingBag, Search, User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import SearchModal from '@/components/shared/SearchModal';
type HubItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  gradient: string;
  comingSoon?: boolean;
};
type HubSection = { label: string; items: HubItem[] };

const G = {
  amber:   'linear-gradient(135deg, #FFB347 0%, #FFB347 100%)',
  violet:  'linear-gradient(135deg, #8B5CF6 0%, #8B5CF6 100%)',
  fuchsia: 'linear-gradient(135deg, #8B5CF6 0%, #8B5CF6 100%)',
  emerald: 'linear-gradient(135deg, #34D399 0%, #5EEAD4 100%)',
  blue:    'linear-gradient(135deg, #5EEAD4 0%, #3B82F6 100%)',
  teal:    'linear-gradient(135deg, #5EEAD4 0%, #5EEAD4 100%)',
  rose:    'linear-gradient(135deg, #FB7185 0%, #E11D48 100%)',
  orange:  'linear-gradient(135deg, #FB923C 0%, #EA580C 100%)',
  indigo:  'linear-gradient(135deg, #8B5CF6 0%, #4F46E5 100%)',
};

const SECTIONS: HubSection[] = [
  {
    label: 'Explore',
    items: [
      { href: '/sky',         label: 'Sky Watcher',  icon: Sun,           gradient: G.amber },
      { href: '/markets',     label: 'Markets',      icon: TrendingUp,    gradient: G.emerald, comingSoon: true },
      { href: '/missions',    label: 'Missions',     icon: Target,        gradient: G.violet },
      { href: '/chat',        label: 'ASTRA AI',     icon: MessageCircle, gradient: G.fuchsia },
      { href: '/feed',        label: 'Feed',         icon: Sparkles,      gradient: G.orange },
      { href: '/learn',       label: 'Learning',     icon: BookOpen,      gradient: G.blue },
      { href: '/network',     label: 'Network',      icon: Globe,         gradient: G.teal,    comingSoon: true },
      { href: '/leaderboard', label: 'Leaderboard',  icon: Trophy,        gradient: G.amber,   comingSoon: true },
      { href: '/marketplace', label: 'Marketplace',  icon: ShoppingBag,   gradient: G.indigo },
    ],
  },
  {
    label: 'You',
    items: [
      { href: '/profile', label: 'Profile',      icon: User,      gradient: G.blue },
      { href: '/club',    label: 'My telescope', icon: Telescope, gradient: G.violet },
      { href: '/nfts',    label: 'Discoveries',  icon: Gem,       gradient: G.rose },
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
                const dimmed = item.comingSoon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex flex-col items-center justify-center gap-2.5 p-4 sm:p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.16] hover:bg-white/[0.04] transition-colors no-underline text-center ${dimmed ? 'opacity-70' : ''}`}
                  >
                    {item.comingSoon && (
                      <span
                        className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-semibold tracking-[0.18em] uppercase"
                        style={{
                          color: 'rgba(255,179,71,0.85)',
                          background: 'rgba(255,179,71,0.08)',
                          border: '1px solid rgba(255,179,71,0.28)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        Soon
                      </span>
                    )}
                    <div
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: item.gradient,
                        boxShadow: '0 6px 16px -4px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
                      }}
                    >
                      <Icon size={22} strokeWidth={2.2} color="#FFFFFF" />
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
