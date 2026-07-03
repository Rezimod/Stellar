'use client';

import { useEffect, useRef } from 'react';

/* Twinkling starfield behind the hero. Canvas, ~240 stars whose opacity
   oscillates. Honours prefers-reduced-motion: draws a single static frame
   and stops. Cheap — one rAF loop, cancelled on unmount, re-fit on resize. */
export default function HeroStarfield({ density = 240 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const fit = () => {
      c.width = c.offsetWidth * dpr;
      c.height = c.offsetHeight * dpr;
    };
    fit();
    window.addEventListener('resize', fit);

    const stars = Array.from({ length: Math.round(density) }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.3 + 0.3,
      p: Math.random() * Math.PI * 2,
      s: Math.random() * 0.9 + 0.25,
    }));

    const paint = (t: number) => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const st of stars) {
        const a = 0.25 + 0.75 * Math.abs(Math.sin(st.p + t * 0.0006 * st.s));
        ctx.globalAlpha = a * 0.85;
        ctx.fillStyle = '#dfe8ff';
        ctx.beginPath();
        ctx.arc(st.x * c.width, st.y * c.height, st.r * dpr, 0, 7);
        ctx.fill();
      }
    };

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    if (reduce) {
      paint(0);
    } else {
      const loop = (t: number) => {
        paint(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      window.removeEventListener('resize', fit);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [density]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
