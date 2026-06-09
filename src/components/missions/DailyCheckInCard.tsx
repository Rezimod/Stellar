'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Flame, Check } from 'lucide-react';
import { hasCheckedInToday, saveCheckIn, getStreakDays } from '@/lib/daily-checkin';
import { getTierForStreak } from '@/lib/constellation-streak';
import { toast } from '@/components/ui/Toast';
import { track } from '@/lib/track';

interface DailyCheckInCardProps {
  lat: number;
  lon: number;
  address: string | null;
  getAccessToken: () => Promise<string | null>;
}

/** Base Stars for a check-in, before the streak multiplier (×1.0 → ×3.0). */
const BASE_REWARD = 5;

const COPY = {
  en: {
    eyebrow: 'Daily check-in',
    streakOne: 'day streak',
    streakMany: 'day streak',
    checkInCta: 'Check in',
    checkedToday: 'Checked in today',
    comeBack: 'Come back tomorrow to keep the streak',
    nextTier: (name: string, n: number) => `${n} more night${n === 1 ? '' : 's'} → ${name}`,
    earned: (n: number) => `+${n} ✦`,
  },
  ka: {
    eyebrow: 'ყოველდღიური ჩექ-ინი',
    streakOne: 'დღე ზედიზედ',
    streakMany: 'დღე ზედიზედ',
    checkInCta: 'ჩექ-ინი',
    checkedToday: 'დღეს უკვე შესრულდა',
    comeBack: 'დაბრუნდი ხვალ, რომ სერია გააგრძელო',
    nextTier: (name: string, n: number) => `კიდევ ${n} ღამე → ${name}`,
    earned: (n: number) => `+${n} ✦`,
  },
} as const;

export function DailyCheckInCard({ lat, lon, address, getAccessToken }: DailyCheckInCardProps) {
  const locale = useLocale() === 'ka' ? 'ka' : 'en';
  const c = COPY[locale];
  const [checked, setChecked] = useState(false);
  const [streak, setStreak] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setChecked(hasCheckedInToday());
    setStreak(getStreakDays());
  }, []);

  const tier = getTierForStreak(streak);
  const pendingReward = Math.round(BASE_REWARD * tier.multiplier);

  async function checkIn() {
    if (busy || checked) return;
    setBusy(true);

    // Record the check-in alongside tonight's sky score (cheap, best-effort).
    let skyScore: number | undefined;
    let skyGrade: string | undefined;
    try {
      const r = await fetch(`/api/sky/score?lat=${lat}&lon=${lon}`);
      if (r.ok) {
        const d = await r.json();
        skyScore = d.score;
        skyGrade = d.grade;
      }
    } catch {
      /* offline — check in anyway */
    }
    saveCheckIn({ skyScore, skyGrade, lat, lon });

    const newStreak = getStreakDays();
    const amount = Math.round(BASE_REWARD * getTierForStreak(newStreak).multiplier);
    setStreak(newStreak);
    setChecked(true);

    track('stars_earned', { source: 'checkin', amount, streak: newStreak }, address);

    if (address) {
      const dateStr = new Date().toISOString().slice(0, 10);
      try {
        let token: string | null = null;
        try { token = await getAccessToken(); } catch { /* external wallet */ }
        const res = await fetch('/api/award-stars', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            recipientAddress: address,
            amount,
            reason: 'daily_checkin',
            idempotencyKey: `checkin:${address}:${dateStr}`,
          }),
        });
        const data = res.ok ? await res.json().catch(() => null) : null;
        if (res.ok && data && !data.cached) {
          toast.reward(`${c.earned(amount)} · ${newStreak} ${c.streakMany}`);
          window.dispatchEvent(new Event('stellar:stars-synced'));
        } else {
          toast.success(c.checkedToday);
        }
      } catch {
        toast.success(c.checkedToday);
      }
    }
    setBusy(false);
  }

  return (
    <div
      className="mis-checkin flex items-center gap-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-2.5"
    >
      {/* Streak flame */}
      <div className="flex flex-col items-center justify-center shrink-0 w-[58px]">
        <div className="flex items-center gap-1">
          <Flame size={16} className={streak > 0 ? 'text-[#FFB347]' : 'text-white/30'} strokeWidth={1.8} />
          <span className="font-mono text-[20px] leading-none tabular-nums text-white/90">{streak}</span>
        </div>
        <span className="text-[9px] uppercase tracking-[0.14em] text-white/35 mt-1 text-center leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
          {c.streakMany}
        </span>
      </div>

      <div className="w-px self-stretch bg-white/[0.06]" />

      {/* Tier + next */}
      <div className="flex-1 min-w-0">
        <span className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white/40" style={{ fontFamily: 'var(--font-display)' }}>
          {c.eyebrow}
        </span>
        <p className="text-white text-[15px] font-medium leading-tight mt-0.5">
          {tier.name}
          {tier.multiplier > 1 && <span className="text-[#FFB347] ml-1.5 font-mono text-[13px]">×{tier.multiplier}</span>}
        </p>
        {tier.nextName && (
          <p className="text-white/40 text-[11px] leading-tight mt-0.5 truncate">
            {c.nextTier(tier.nextName, tier.nightsToNext)}
          </p>
        )}
      </div>

      {/* CTA */}
      {checked ? (
        <div className="flex items-center gap-1.5 shrink-0 text-[#5EEAD4] text-[13px] font-medium">
          <Check size={16} strokeWidth={2.2} />
          <span className="hidden sm:inline">{c.checkedToday}</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={checkIn}
          disabled={busy}
          className="shrink-0 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-semibold text-[#0A0E1A] transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ background: '#FFD166', fontFamily: 'var(--font-cta, var(--font-body))' }}
        >
          {c.checkInCta}
          <span className="font-mono text-[13px]">{c.earned(pendingReward)}</span>
        </button>
      )}
    </div>
  );
}
