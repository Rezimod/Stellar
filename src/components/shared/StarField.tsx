'use client';
import { useMemo, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

interface Star {
  id: number;
  top: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
}

export default function StarField() {
  const pathname = usePathname();
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

  // Homepage hero already has a full starfield + WebGL Saturn — skip the global
  // layer there to avoid doubling compositor work. Elsewhere keep a small static
  // sprinkle (no twinkle animation — opacity tweens wake the GPU every frame).
  const onHome = pathname === '/';
  const starCount = reduceMotion || onHome ? 0 : isMobile ? 6 : 10;

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
    <div data-stellar-chrome="starfield" className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
      {stars.map((s) => (
        <div
          key={s.id}
          className="star star--static"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
          }}
        />
      ))}
    </div>
  );
}
