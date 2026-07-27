'use client';

import { useRef, useEffect, type ReactNode } from 'react';

export default function PageTransition({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onEnd = () => {
      el.style.willChange = 'auto';
      // `transform` on this wrapper makes `position: fixed` descendants use this box as
      // their containing block (not the viewport). The animation fills forwards, so its
      // final transform outranks an inline `none` — drop the animation itself, then clear.
      el.style.animation = 'none';
      el.style.transform = 'none';
    };
    el.addEventListener('animationend', onEnd, { once: true });
    return () => el.removeEventListener('animationend', onEnd);
  }, []);

  return (
    <div ref={ref} className="animate-page-enter" style={{ minHeight: '100%' }}>
      {children}
    </div>
  );
}
