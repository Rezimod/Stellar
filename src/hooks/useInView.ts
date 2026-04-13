'use client';

import { useRef, useState, useEffect, type RefObject } from 'react';

export function useInView<T extends Element = HTMLDivElement>(
  threshold = 0.1
): [RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [isInView, setIsInView] = useState(prefersReduced);

  useEffect(() => {
    if (prefersReduced) {
      setIsInView(true);
      return;
    }
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, prefersReduced]);

  return [ref, isInView];
}
