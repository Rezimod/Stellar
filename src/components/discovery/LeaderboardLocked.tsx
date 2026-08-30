'use client';

import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import PassTicker from '@/components/discovery/PassTicker';
import { REVEAL_AT_MS, TOTAL_PASSES } from '@/lib/discovery/constants';
import { remainingUntil } from '@/lib/discovery/countdown';
import { TIER_BY_ID } from '@/lib/discovery/tiers';

const fmt = (n: number) => n.toLocaleString('en-US');

/**
 * The board before reveal day. There is nothing to rank yet — every pass
 * resolves at the same instant — so this states what is at stake instead of
 * faking a partial board.
 */
export default function LeaderboardLocked() {
  // The countdown is clock-dependent, so it cannot be rendered during SSR
  // without a hydration mismatch. Same placeholder pattern as CountdownTimer.
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setDays(remainingUntil(REVEAL_AT_MS, Date.now()).days);
    tick();
    // Days change once a day; a minute is plenty to catch the rollover.
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const stats = [
    { value: fmt(TOTAL_PASSES), label: 'passes' },
    { value: fmt(TIER_BY_ID.legendary.count), label: 'Legendary objects hidden' },
    { value: days === null ? '—' : fmt(days), label: days === 1 ? 'day to reveal' : 'days to reveal' },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="dsc-glass flex flex-col items-center gap-4 px-5 py-9 text-center">
        <Lock size={20} strokeWidth={1.5} color="rgba(255,255,255,0.45)" aria-hidden="true" />

        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 17,
            fontWeight: 600,
            lineHeight: 1.35,
            color: 'var(--dsc-text)',
            maxWidth: 380,
            margin: 0,
          }}
        >
          Leaderboard reveals October 21 with all discoveries
        </p>

        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13.5,
            lineHeight: 1.55,
            color: 'var(--dsc-ghost)',
            maxWidth: 400,
            margin: 0,
          }}
        >
          Every pass resolves at the same instant, so there is nothing to rank until it does.
        </p>

        <div className="mt-2 flex flex-wrap items-start justify-center gap-x-8 gap-y-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1.5">
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 22,
                  fontWeight: 700,
                  lineHeight: 1,
                  color: 'var(--dsc-cyan)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {stat.value}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 10.5,
                  fontWeight: 500,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--dsc-ghost-dim)',
                }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--dsc-ghost-dim)',
            margin: 0,
          }}
        >
          Recent activity
        </h2>
        <PassTicker />
      </div>
    </div>
  );
}
