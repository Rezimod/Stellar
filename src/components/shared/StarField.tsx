'use client';
import { useMemo, useEffect, useState } from 'react';

interface Star {
  id: number;
  top: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
}

export default function StarField() {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia('(max-width: 639px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);

    const reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(reducedMq.matches);
    const reducedHandler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    reducedMq.addEventListener('change', reducedHandler);

    return () => {
      mq.removeEventListener('change', handler);
      reducedMq.removeEventListener('change', reducedHandler);
    };
  }, []);

  // Cut from 30/14 — at this density the difference is invisible but each
  // animated DOM node is its own compositor candidate. Pages also have their
  // own gradient backgrounds; the field is a subtle ambient layer.
  const starCount = reduceMotion ? 0 : isMobile ? 10 : 18;

  const stars = useMemo<Star[]>(
    () =>
      Array.from({ length: starCount }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() * 1.4 + 0.4,
        duration: Math.random() * 5 + 4,
        delay: Math.random() * 8,
      })),
    [starCount],
  );

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
      {stars.map((s) => (
        <div
          key={s.id}
          className="star"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
