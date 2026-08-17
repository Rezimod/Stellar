'use client';

import { useEffect, useState } from 'react';

type Remaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  reached: boolean;
};

function remainingUntil(targetMs: number, nowMs: number): Remaining {
  const total = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
    reached: total === 0,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

export default function CountdownTimer({ targetMs }: { targetMs: number }) {
  // Server and client sit on different clocks, so rendering real digits during
  // SSR guarantees a hydration mismatch. Render the layout with placeholders and
  // fill it on mount — same box, no reflow.
  const [remaining, setRemaining] = useState<Remaining | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(remainingUntil(targetMs, Date.now()));
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [targetMs]);

  const units: { label: string; value: string }[] = [
    { label: 'DAYS', value: remaining ? pad(remaining.days) : '--' },
    { label: 'HRS', value: remaining ? pad(remaining.hours) : '--' },
    { label: 'MIN', value: remaining ? pad(remaining.minutes) : '--' },
    { label: 'SEC', value: remaining ? pad(remaining.seconds) : '--' },
  ];

  return (
    <div className="dsc-glass w-full max-w-[420px] px-3 py-4 sm:px-5 sm:py-5">
      {/* The digit grid ticks every second; announcing that would make the page
          unusable with a screen reader. Digits are hidden from AT and a single
          coarse summary is exposed instead, politely and without live updates. */}
      <div className="grid grid-cols-4" role="presentation" aria-hidden="true">
        {units.map((unit, i) => (
          <div
            key={unit.label}
            className="flex flex-col items-center justify-start"
            style={{
              borderLeft: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <span className="dsc-digit">{unit.value}</span>
            <span className="dsc-unit-label">{unit.label}</span>
          </div>
        ))}
      </div>

      <p className="sr-only" aria-live="off">
        {remaining === null
          ? 'Loading time remaining until the reveal.'
          : remaining.reached
            ? 'The reveal date has arrived.'
            : `${remaining.days} days and ${remaining.hours} hours remain until the reveal on 21 October 2026.`}
      </p>
    </div>
  );
}
