'use client';

// Explore Mode on the front door. A child who lands on the site should see
// the solar system moving before they read a word: a small living orrery,
// drawn on a canvas at a few dozen lines of work per frame, with the way in
// under it in one amber key. The canvas stops when it leaves the screen or
// the tab is hidden, and holds still for anyone who asked motion to stop.

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

interface Body { r: number; size: number; color: string; period: number; phase: number; ring?: boolean; glow?: string }

/** Distances and sizes are for the picture, not the ephemeris. */
const BODIES: Body[] = [
  { r: 0.13, size: 2.2, color: '#b9b2a8', period: 9, phase: 0.2 },
  { r: 0.19, size: 3.4, color: '#e8c58a', period: 15, phase: 2.1 },
  { r: 0.26, size: 3.6, color: '#6fa8ff', period: 22, phase: 4.0, glow: 'rgba(111,168,255,0.55)' },
  { r: 0.33, size: 2.8, color: '#e07a4d', period: 34, phase: 1.1 },
  { r: 0.46, size: 7.5, color: '#d8b48a', period: 70, phase: 5.2 },
  { r: 0.58, size: 6.2, color: '#e9d7a8', period: 110, phase: 3.3, ring: true },
  { r: 0.7, size: 4.4, color: '#8fd3e6', period: 180, phase: 0.7 },
  { r: 0.8, size: 4.2, color: '#5b7cf0', period: 260, phase: 2.6 },
];

function Orrery() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let visible = true;
    let w = 0; let h = 0; let dpr = 1;
    const stars: { x: number; y: number; b: number; s: number }[] = [];
    const seed = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
    for (let i = 0; i < 140; i++) stars.push({ x: seed(i), y: seed(i + 900), b: 0.25 + seed(i + 1800) * 0.75, s: 0.6 + seed(i + 2700) * 1.1 });
    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, Math.round(rect.width)); h = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    };
    fit();
    const t0 = performance.now();
    const draw = (now: number) => {
      raf = 0;
      const t = still ? 40 : (now - t0) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      // On a wide card the words take the left half, so the sun sits in the
      // right half; on a phone the words fill the lower part of the card and
      // the system sits in a band above them.
      const wide = w > 720;
      const cx = wide ? w * 0.68 : w * 0.52; const cy = wide ? h * 0.52 : h * 0.2;
      const R = wide ? Math.min(w * 0.42, h * 0.9) : Math.min(w * 0.7, h * 0.5);
      for (const s of stars) {
        const tw = still ? 1 : 0.7 + 0.3 * Math.sin(t * (0.6 + s.s) + s.x * 40);
        ctx.fillStyle = `rgba(220,230,255,${(s.b * tw * 0.9).toFixed(3)})`;
        ctx.fillRect(s.x * w, s.y * h, s.s, s.s);
      }
      // Orbits: faint rings, a little squashed so the picture has depth.
      ctx.lineWidth = 1;
      for (const b of BODIES) {
        ctx.strokeStyle = 'rgba(160,180,230,0.13)';
        ctx.beginPath(); ctx.ellipse(cx, cy, b.r * R, b.r * R * 0.42, 0, 0, Math.PI * 2); ctx.stroke();
      }
      // The sun.
      const sunG = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.16);
      sunG.addColorStop(0, 'rgba(255,240,200,1)'); sunG.addColorStop(0.28, 'rgba(255,190,90,0.9)'); sunG.addColorStop(1, 'rgba(255,150,40,0)');
      ctx.fillStyle = sunG; ctx.beginPath(); ctx.arc(cx, cy, R * 0.16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff2cf'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.045, 0, Math.PI * 2); ctx.fill();
      // Planets, far side first so the near ones draw over the sun's glow.
      const placed = BODIES.map((b) => {
        const a = b.phase + (t / b.period) * Math.PI * 2;
        return { b, x: cx + Math.cos(a) * b.r * R, y: cy + Math.sin(a) * b.r * R * 0.42, near: Math.sin(a) > 0 };
      }).sort((p, q) => p.y - q.y);
      for (const p of placed) {
        const size = p.b.size * (0.85 + (p.near ? 0.3 : 0));
        if (p.b.glow) { ctx.fillStyle = p.b.glow; ctx.beginPath(); ctx.arc(p.x, p.y, size * 2.2, 0, Math.PI * 2); ctx.fill(); }
        if (p.b.ring) {
          ctx.strokeStyle = 'rgba(232,215,168,0.75)'; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.ellipse(p.x, p.y, size * 2.1, size * 0.7, -0.35, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.fillStyle = p.b.color; ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, Math.PI * 2); ctx.fill();
        // A terminator: the side away from the sun goes dark.
        const away = Math.atan2(p.y - cy, p.x - cx);
        ctx.fillStyle = 'rgba(4,8,20,0.55)';
        ctx.beginPath(); ctx.arc(p.x, p.y, size, away - Math.PI / 2, away + Math.PI / 2); ctx.fill();
      }
      // The ship: a spark on its own long arc, with a short trail.
      const sa = 1.9 + (t / 26) * Math.PI * 2;
      const sr = 0.4 + 0.14 * Math.sin(t / 9);
      for (let k = 6; k >= 0; k--) {
        const aa = sa - k * 0.035;
        const x = cx + Math.cos(aa) * sr * R; const y = cy + Math.sin(aa) * sr * R * 0.42;
        ctx.fillStyle = k === 0 ? '#ffffff' : `rgba(140,210,255,${(0.5 - k * 0.07).toFixed(2)})`;
        ctx.beginPath(); ctx.arc(x, y, k === 0 ? 2.2 : 1.4, 0, Math.PI * 2); ctx.fill();
      }
      if (!still && visible && !document.hidden) raf = requestAnimationFrame(draw);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(draw); };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); });
    io.observe(canvas);
    const onVis = () => { if (!document.hidden) kick(); };
    document.addEventListener('visibilitychange', onVis);
    const ro = new ResizeObserver(() => { fit(); kick(); });
    ro.observe(canvas);
    kick();
    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

export default function HomeExplore() {
  const t = useTranslations('home.explore');
  return (
    <section className="px-4 md:px-8 pt-10 md:pt-14" aria-labelledby="home-explore-title">
      <Link
        href="/solar-system"
        className="home-explore group relative mx-auto block max-w-[1040px] overflow-hidden rounded-[22px] border no-underline"
        style={{
          borderColor: 'rgba(140,165,235,0.18)',
          background: 'radial-gradient(120% 90% at 20% 100%, #0b1a3a 0%, #060a16 55%, #04060d 100%)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        <div className="relative min-h-[560px] md:min-h-[360px]">
          <Orrery />
          {/* A soft dark under the words so they read over the stars: from
              the bottom on a phone, from the left on a wide card. */}
          <div className="pointer-events-none absolute inset-0 md:hidden" style={{ background: 'linear-gradient(180deg, rgba(4,6,14,0) 22%, rgba(4,6,14,0.72) 42%, rgba(4,6,14,0.9) 100%)' }} />
          <div className="pointer-events-none absolute inset-0 hidden md:block" style={{ background: 'linear-gradient(90deg, rgba(4,6,14,0.82) 0%, rgba(4,6,14,0.5) 42%, rgba(4,6,14,0) 70%)' }} />
          <div className="relative flex h-full flex-col justify-end gap-4 p-6 pt-44 md:max-w-[520px] md:p-10">
            <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.24em] text-[#FFB347]">{t('eyebrow')}</div>
            <h2 id="home-explore-title" className="text-[28px] font-semibold leading-[1.08] tracking-[-0.02em] text-white md:text-[40px]">
              {t('title')}
            </h2>
            <p className="max-w-[420px] text-[14.5px] leading-[1.55] text-[#aab4d4] md:text-[16px]">{t('subtitle')}</p>
            <ul className="flex flex-wrap gap-2" aria-label={t('chipsLabel')}>
              {(['fly', 'land', 'find'] as const).map((k) => (
                <li key={k} className="rounded-full border px-3 py-1 font-mono text-[11px] tracking-[0.06em] text-[#dbe4ff]" style={{ borderColor: 'rgba(140,165,235,0.28)', background: 'rgba(10,18,40,0.55)' }}>
                  {t(`chips.${k}`)}
                </li>
              ))}
            </ul>
            <span
              className="hero-pill-primary mt-1 inline-flex w-full items-center justify-center gap-2.5 rounded-xl px-7 py-4 text-[15px] font-semibold transition-transform group-hover:-translate-y-0.5 md:w-auto md:self-start"
              style={{
                background: 'linear-gradient(180deg,#ffc866 0%,#f59e2e 55%,#df8214 100%)',
                color: '#241503',
                fontFamily: 'var(--font-cta, var(--font-body))',
                boxShadow: 'inset 0 1px 0 rgba(255,235,200,0.7), inset 0 -2px 0 rgba(120,60,0,0.35), 0 8px 26px rgba(245,158,46,0.35)',
              }}
            >
              {t('cta')}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </span>
            <span className="font-mono text-[11px] tracking-[0.08em] text-[#7f8cad]">{t('note')}</span>
          </div>
        </div>
      </Link>
    </section>
  );
}
