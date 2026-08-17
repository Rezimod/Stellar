'use client';

import { useEffect, useRef, useState } from 'react';

type Phase = 'black' | 'light' | 'card';

const BLACKOUT_MS = 1_500;
const LIGHT_MS = 2_500;

/**
 * The reveal sequence: blackout, a point of light, an expanding wave, then the
 * card materialises.
 *
 * Runs once per pass. It is skippable, and users with prefers-reduced-motion
 * never see it at all — four seconds of forced animation is a cost, not a gift,
 * on every visit after the first.
 */
export default function RevealSequence({
  seenKey,
  children,
}: {
  /** localStorage key marking the sequence as played. `null` replays every
   *  time and persists nothing — used by ?preview so a tier can be demoed
   *  repeatedly. */
  seenKey: string | null;
  children: React.ReactNode;
}) {
  const [phase, setPhase] = useState<Phase>('black');
  const timers = useRef<number[]>([]);

  function markSeen() {
    if (!seenKey) return;
    try {
      window.localStorage.setItem(seenKey, '1');
    } catch {
      // Private mode. The sequence simply plays again next visit.
    }
  }

  function finish() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    markSeen();
    setPhase('card');
  }

  useEffect(() => {
    let alreadySeen = false;
    if (seenKey) {
      try {
        alreadySeen = window.localStorage.getItem(seenKey) === '1';
      } catch {
        alreadySeen = false;
      }
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (alreadySeen || reduced) {
      setPhase('card');
      return;
    }

    setPhase('black');
    timers.current = [
      window.setTimeout(() => setPhase('light'), BLACKOUT_MS),
      window.setTimeout(() => {
        setPhase('card');
        if (seenKey) {
          try {
            window.localStorage.setItem(seenKey, '1');
          } catch {
            /* ignore */
          }
        }
      }, BLACKOUT_MS + LIGHT_MS),
    ];

    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, [seenKey]);

  if (phase === 'card') {
    return <div className="dsc-materialize">{children}</div>;
  }

  return (
    <div className="dsc-stage">
      {phase === 'light' && (
        <>
          <span className="dsc-shockwave" aria-hidden="true" />
          <span className="dsc-spark" aria-hidden="true" />
        </>
      )}

      <p className="sr-only" role="status">
        Revealing your object.
      </p>

      <button type="button" className="dsc-skip" onClick={finish}>
        Skip
      </button>
    </div>
  );
}
