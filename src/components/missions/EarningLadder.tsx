'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { CalendarCheck, Crosshair, Eye, Telescope, Orbit, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Rung {
  Icon: LucideIcon;
  label: { en: string; ka: string };
  reward: string;
  href?: string;
}

// Ordered low-friction → high. The reward figures track the real payouts:
// check-in 5×mult, aim 10, naked-eye 50, telescope 75–100, deep-sky 175–250,
// event missions double.
const RUNGS: Rung[] = [
  { Icon: CalendarCheck, label: { en: 'Check in daily', ka: 'ყოველდღიური ჩექ-ინი' }, reward: '+5' },
  { Icon: Crosshair, label: { en: 'Aim at a target', ka: 'დაამიზნე ობიექტი' }, reward: '+10', href: '/sky' },
  { Icon: Eye, label: { en: 'Naked-eye observation', ka: 'შეუიარაღებელი დაკვირვება' }, reward: '+50', href: '/observe' },
  { Icon: Telescope, label: { en: 'Telescope target', ka: 'ტელესკოპის ობიექტი' }, reward: '+75–100', href: '/observe' },
  { Icon: Orbit, label: { en: 'Deep-sky object', ka: 'შორეული ობიექტი' }, reward: '+175–250', href: '/observe' },
  { Icon: Trophy, label: { en: 'Event mission', ka: 'ღონისძიების მისია' }, reward: '×2' },
];

const HEADING = { en: 'Ways to earn', ka: 'როგორ მოიპოვო' } as const;

export function EarningLadder() {
  const locale = useLocale() === 'ka' ? 'ka' : 'en';

  return (
    <div className="flex flex-col gap-1.5">
      {RUNGS.map((r) => {
        const inner = (
          <>
            <span className="w-7 h-7 rounded-md bg-white/[0.04] flex items-center justify-center shrink-0">
              <r.Icon size={14} strokeWidth={1.8} className="text-white/55" />
            </span>
            <span className="flex-1 min-w-0 truncate text-white/80 text-[13px] leading-tight">{r.label[locale]}</span>
            <span className="font-mono text-[#FFD166] text-[12px] tabular-nums shrink-0">{r.reward} ✦</span>
          </>
        );
        const cls = 'flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5';
        return r.href ? (
          <Link key={r.label.en} href={r.href} className={`${cls} no-underline transition-colors hover:bg-white/[0.04]`}>
            {inner}
          </Link>
        ) : (
          <div key={r.label.en} className={cls}>{inner}</div>
        );
      })}
    </div>
  );
}
