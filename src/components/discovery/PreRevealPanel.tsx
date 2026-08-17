'use client';

import { useEffect, useState } from 'react';
import SealedObject from '@/components/discovery/SealedObject';
import { REVEAL_AT_MS } from '@/lib/discovery/constants';
import { remainingUntil } from '@/lib/discovery/countdown';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Locked state — the pass is held, the object is not yet assigned.
 * Ticks once a minute: the copy only resolves to days and hours.
 */
export default function PreRevealPanel({ passNumber }: { passNumber: number }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => {
      const r = remainingUntil(REVEAL_AT_MS, Date.now());
      setLabel(
        r.reached
          ? 'Your object is being revealed.'
          : `Your object reveals in ${plural(r.days, 'day')} ${plural(r.hours, 'hour')}`,
      );
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="dsc-locked-card">
        <SealedObject size={120} />

        <div className="flex flex-col items-center gap-2">
          <span className="dsc-card-eyebrow">Sealed until reveal</span>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--dsc-text)',
              margin: 0,
              minHeight: 22,
            }}
          >
            {label ?? ' '}
          </p>
        </div>

        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--dsc-cyan)',
            margin: 0,
          }}
        >
          You hold Pass #{passNumber.toLocaleString('en-US')}
        </p>
      </div>

      <p
        className="text-center"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11.5,
          lineHeight: 1.55,
          color: 'var(--dsc-ghost-dim)',
          maxWidth: 380,
          margin: 0,
        }}
      >
        Every pass reveals at the same moment — 21 October 2026, 00:00 UTC. Nothing is assigned
        before then.
      </p>
    </div>
  );
}
