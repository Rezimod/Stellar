'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A figure that counts up the first time it is looked at.
 *
 * The real number is what renders on the server and what a reader without
 * JavaScript keeps — the count only starts once the client has the element in
 * view, so the stat row never lays out twice and never flashes a zero.
 */
export default function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const started = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - started) / 900, 1);
          setShown(Math.round(value * (1 - (1 - p) ** 3)));
          if (p < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return <span ref={ref}>{shown.toLocaleString('en-GB')}</span>;
}
