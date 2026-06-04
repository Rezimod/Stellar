'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { CalendarCheck, Sparkles, Crosshair, Eye, Telescope, Orbit, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Rung {
  Icon: LucideIcon;
  label: { en: string; ka: string };
  reward: string;
  href?: string;
}

// Ordered low-friction → high. The reward figures track the real payouts:
// check-in 5×mult, cosmic quiz 3, aim 10, naked-eye 50, telescope 75–100,
// deep-sky 175–250, quiz 100, event missions double.
const RUNGS: Rung[] = [
  { Icon: CalendarCheck, label: { en: 'Check in daily', ka: 'ყოველდღიური ჩექ-ინი' }, reward: '+5 ✦' },
  { Icon: Sparkles, label: { en: 'Cosmic daily quiz', ka: 'კოსმოსური ვიქტორინა' }, reward: '+3 ✦' },
  { Icon: Crosshair, label: { en: 'Aim at a target', ka: 'დაამიზნე ობიექტი' }, reward: '+10 ✦', href: '/sky' },
  { Icon: Eye, label: { en: 'Naked-eye observation', ka: 'შეუიარაღებელი დაკვირვება' }, reward: '+50 ✦', href: '/observe' },
  { Icon: Telescope, label: { en: 'Telescope target', ka: 'ტელესკოპის ობიექტი' }, reward: '+75–100 ✦', href: '/observe' },
  { Icon: Orbit, label: { en: 'Deep-sky object', ka: 'შორეული ობიექტი' }, reward: '+175–250 ✦', href: '/observe' },
  { Icon: Trophy, label: { en: 'Event mission', ka: 'ღონისძიების მისია' }, reward: '×2 ✦' },
];

const HEADING = { en: 'Ways to earn', ka: 'როგორ მოიპოვო' } as const;

export function EarningLadder() {
  const locale = useLocale() === 'ka' ? 'ka' : 'en';

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 sm:px-5 py-4 mb-5">
      <span className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white/40 block mb-3" style={{ fontFamily: 'var(--font-display)' }}>
        {HEADING[locale]}
      </span>
      <ul className="divide-y divide-white/[0.06]">
        {RUNGS.map((r) => {
          const row = (
            <div className="flex items-center gap-3 py-2.5">
              <span className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                <r.Icon size={14} strokeWidth={1.8} className="text-white/55" />
              </span>
              <span className="flex-1 text-white/85 text-[13.5px] leading-tight">{r.label[locale]}</span>
              <span className="font-mono text-[#FFD166] text-[12.5px] tabular-nums shrink-0">{r.reward}</span>
            </div>
          );
          return (
            <li key={r.label.en}>
              {r.href ? (
                <Link href={r.href} className="block no-underline transition-colors hover:bg-white/[0.015] -mx-2 px-2 rounded-lg">
                  {row}
                </Link>
              ) : (
                row
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
