'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { type CSSProperties } from 'react';

// Three.js bundle is large — load it client-side only, after first paint.
const SaturnCanvas = dynamic(() => import('./SaturnCanvas'), {
  ssr: false,
  loading: () => null,
});

export default function HeroSaturn() {
  return (
    <section
      className="relative w-full overflow-hidden flex items-center"
      style={{
        minHeight: '100vh',
        height: '100vh',
        // Deep cosmic base + warm amber halo on the right matching Saturn's lit hemisphere
        background: [
          'radial-gradient(ellipse 78% 95% at 82% 52%, rgba(255, 168, 85, 0.18) 0%, rgba(255, 122, 58, 0.09) 26%, transparent 56%)',
          'radial-gradient(ellipse 60% 70% at 18% 35%, rgba(70, 110, 210, 0.07) 0%, transparent 60%)',
          'linear-gradient(180deg, #04081A 0%, #08122A 48%, #050A1C 100%)',
        ].join(', '),
      }}
    >
      {/* === Static CSS starfield (covers full hero, behind WebGL) === */}
      <div aria-hidden className="hero-starfield" />

      {/* === WebGL Saturn (planet + orbiting ring particles + parallax) === */}
      <SaturnCanvas />

      {/* === Left-side vignette keeps the copy readable on bright Saturn === */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(4,8,26,0.88) 0%, rgba(6,12,32,0.45) 26%, transparent 50%)',
        }}
      />

      {/* === Copy === */}
      <div className="relative z-10 w-full max-w-[1280px] mx-auto px-6 md:px-10 lg:px-12 pointer-events-none">
        <div className="max-w-[640px]">
          <h1
            className="text-white leading-[1.02] tracking-[-0.01em]"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(34px, 5.4vw, 68px)',
              fontWeight: 500, /* Orbitron Medium */
            }}
          >
            Find every planet.
            <br />
            Earn rewards.
          </h1>

          <p
            className="mt-6 md:mt-7 text-[15px] md:text-[18px] leading-[1.5]"
            style={{
              color: 'rgba(255, 220, 230, 0.72)',
              maxWidth: 520,
            }}
          >
            Find what&apos;s up tonight. Photograph it.
            <br className="hidden sm:block" />
            Redeem Stars for a real telescope.
          </p>

          <div className="mt-9 md:mt-12 flex flex-wrap gap-3 pointer-events-auto">
            <CTA href="/missions" tone="primary">Earn Rewards</CTA>
            <CTA href="/sky" tone="secondary">Start Observing</CTA>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTA({
  href,
  tone,
  children,
}: {
  href: string;
  tone: 'primary' | 'secondary';
  children: React.ReactNode;
}) {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 168,
    padding: '16px 28px',
    borderRadius: 8,
    fontFamily: 'var(--font-display)',
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: '0.005em',
    textDecoration: 'none',
    transition: 'background 140ms ease, filter 140ms ease',
    cursor: 'pointer',
  };
  const skin: CSSProperties =
    tone === 'primary'
      ? { background: '#FFB347', color: '#0A1735', border: 'none' }
      : { background: '#1A2540', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.06)' };

  return (
    <Link
      href={href}
      style={{ ...base, ...skin }}
      className={tone === 'primary' ? 'hero-cta-primary' : 'hero-cta-secondary'}
    >
      {children}
    </Link>
  );
}
