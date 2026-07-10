'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Sun, Target, Sparkles, BookOpen, MessageCircle,
  Trophy, Gem, ShoppingBag, Search, User, Orbit,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import SearchModal from '@/components/shared/SearchModal';
import { HubTonightBand } from '@/components/hub/HubTonightBand';
type HubItem = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  gradient: string;
  comingSoon?: boolean;
};
type HubSection = { labelKey: string; items: HubItem[] };

const G = {
  amber:   'linear-gradient(135deg, #FFB347 0%, #FFB347 100%)',
  violet:  'linear-gradient(135deg, var(--terracotta) 0%, var(--terracotta) 100%)',
  fuchsia: 'linear-gradient(135deg, var(--terracotta) 0%, var(--terracotta) 100%)',
  emerald: 'linear-gradient(135deg, #34D399 0%, #5EEAD4 100%)',
  blue:    'linear-gradient(135deg, #5EEAD4 0%, var(--seafoam) 100%)',
  teal:    'linear-gradient(135deg, #5EEAD4 0%, #5EEAD4 100%)',
  rose:    'linear-gradient(135deg, #FB7185 0%, #E11D48 100%)',
  orange:  'linear-gradient(135deg, #FB923C 0%, #EA580C 100%)',
  indigo:  'linear-gradient(135deg, var(--terracotta) 0%, var(--terracotta) 100%)',
};

const SECTIONS: HubSection[] = [
  {
    labelKey: 'explore',
    items: [
      { href: '/sky',           labelKey: 'skyWatcher',    icon: Sun,           gradient: G.amber },
      { href: '/solar-system',  labelKey: 'solarSystem3d', icon: Orbit,         gradient: G.blue },
      { href: '/missions',    labelKey: 'missions',    icon: Target,        gradient: G.violet },
      { href: '/marketplace', labelKey: 'marketplace', icon: ShoppingBag,   gradient: G.indigo },
      { href: '/chat',        labelKey: 'astraAi',     icon: MessageCircle, gradient: G.fuchsia },
      { href: '/learn',       labelKey: 'learning',    icon: BookOpen,      gradient: G.blue },
      { href: '/feed',        labelKey: 'feed',        icon: Sparkles,      gradient: G.orange },
      { href: '/leaderboard', labelKey: 'leaderboard', icon: Trophy,        gradient: G.amber },
    ],
  },
  {
    labelKey: 'you',
    items: [
      { href: '/profile', labelKey: 'profile',     icon: User,  gradient: G.blue },
      { href: '/nfts',    labelKey: 'discoveries', icon: Gem,   gradient: G.rose },
    ],
  },
];

export default function HubPage() {
  const t = useTranslations('hub');
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <header className="mb-4">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-left text-[#A8B4C8] hover:border-white/[0.16] hover:bg-white/[0.04] transition-colors"
            aria-label={t('openSearch')}
          >
            <Search size={16} strokeWidth={1.8} />
            <span className="text-[13px] sm:text-[14px]">{t('search')}</span>
            <span
              className="ml-auto hidden sm:inline-flex items-center gap-1 text-[11px] text-white/40 px-1.5 py-0.5 rounded border border-white/[0.08]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              ⌘K
            </span>
          </button>
        </header>

        <HubTonightBand />

        {SECTIONS.map((section) => (
          <section key={section.labelKey} className="mb-4 last:mb-0">
            <div className="flex items-center gap-3 mb-2.5">
              <h2
                className="text-[10px] sm:text-[11px] font-semibold tracking-[0.22em] uppercase text-white/40"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {t(section.labelKey)}
              </h2>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>
            <div
              className={
                section.items.length <= 2
                  ? 'grid grid-cols-2 gap-2 sm:gap-2.5'
                  : 'grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-8 gap-2 sm:gap-2.5'
              }
            >
              {section.items.map((item) => {
                const Icon = item.icon;
                const dimmed = item.comingSoon;
                const wide = section.items.length <= 2;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.16] hover:bg-white/[0.04] transition-colors no-underline text-center ${
                      wide ? 'flex-row gap-3 px-3 py-3' : 'flex-col gap-2 px-1.5 py-3 sm:py-3.5'
                    } ${dimmed ? 'opacity-70' : ''}`}
                  >
                    {item.comingSoon && (
                      <span
                        className="absolute top-1.5 right-1.5 px-1 py-0.5 rounded text-[7.5px] font-semibold tracking-[0.16em] uppercase"
                        style={{
                          color: 'rgba(255,179,71,0.85)',
                          background: 'rgba(255,179,71,0.08)',
                          border: '1px solid rgba(255,179,71,0.28)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {t('soon')}
                      </span>
                    )}
                    <div
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: item.gradient,
                        boxShadow: '0 6px 16px -4px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
                      }}
                    >
                      <Icon size={20} strokeWidth={2.2} color="#FFFFFF" />
                    </div>
                    <span className="text-[11px] sm:text-[12px] text-white font-medium leading-tight">
                      {t(item.labelKey)}
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
