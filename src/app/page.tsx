// STELLAR Homepage v2.0 — Redesigned for Colosseum Frontier Hackathon 2026
// Sections: Hero → Sky Preview → Missions + Leaderboard → How It Works → ASTRA → Rewards → Footer
// Colors: #070B14 bg · #34d399 teal · #FFD166 gold · #38F0FF blue
'use client';
import { useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';

import { useTranslations } from 'next-intl';
import HomeSkyPreview from '@/components/home/HomeSkyPreview';
import { usePrivy } from '@privy-io/react-auth';
import { useAppState } from '@/hooks/useAppState';
import { Telescope, Camera, Star, ShoppingBag } from 'lucide-react';
import LocationPicker from '@/components/LocationPicker';
import { useLocation } from '@/lib/location';

export default function HomePage() {
  const t = useTranslations();
  const { user } = usePrivy();
  const { state } = useAppState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  const { location } = useLocation();

  const walletAddress =
    (user?.linkedAccounts.find(
      (a): a is Extract<typeof a, { type: 'wallet' }> =>
        a.type === 'wallet' && 'chainType' in a && (a as { chainType?: string }).chainType === 'solana'
    )?.address) ?? null;

  useEffect(() => {
    const canvas = canvasRef.current;
    const hero = heroRef.current;
    if (!canvas || !hero) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    let w = hero.offsetWidth;
    let h = hero.offsetHeight;
    canvas.width = w;
    canvas.height = h;

    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.5 + Math.random() * 0.7,
      o: 0.2 + Math.random() * 0.5,
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.o})`;
        ctx.fill();
        s.y += 0.15;
        if (s.y > h) {
          s.y = 0;
          s.x = Math.random() * w;
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    const handleResize = () => {
      w = hero.offsetWidth;
      h = hero.offsetHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const stepIcons = [Telescope, Camera, Star, ShoppingBag];
  const howItWorksSteps = [
    { step: 1, icon: stepIcons[0], title: t('home.steps.observe'), desc: t('home.steps.observeDesc') },
    { step: 2, icon: stepIcons[1], title: t('home.steps.capture'), desc: t('home.steps.captureDesc') },
    { step: 3, icon: stepIcons[2], title: t('home.steps.verify'), desc: t('home.steps.verifyDesc') },
    { step: 4, icon: stepIcons[3], title: t('home.steps.mint'),   desc: t('home.steps.mintDesc') },
  ];

  return (
    <>
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes heroBounce {
            0%, 100% { transform: translateX(-50%) translateY(0); }
            50% { transform: translateX(-50%) translateY(6px); }
          }
          .hero-line-1 { opacity: 0; animation: fadeInUp 0.8s ease-out 0.1s forwards; }
          .hero-line-2 { opacity: 0; animation: fadeInUp 0.8s ease-out 0.3s forwards; }
          .hero-line-3 { opacity: 0; animation: fadeInUp 0.8s ease-out 0.5s forwards; }
          .hero-scroll { animation: heroBounce 1.5s ease-in-out infinite; }
          @keyframes pulseDot {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(52,211,153,0.2); }
            50% { transform: scale(1.4); box-shadow: 0 0 0 4px rgba(52,211,153,0.2); }
          }
          .pulse-dot { animation: pulseDot 2s infinite; display: inline-block; }
          @keyframes typingDot {
            0%, 100% { opacity: 0.2; }
            50% { opacity: 1; }
          }
          .typing-dot-1 { animation: typingDot 1.2s ease-in-out 0s infinite; }
          .typing-dot-2 { animation: typingDot 1.2s ease-in-out 0.3s infinite; }
          .typing-dot-3 { animation: typingDot 1.2s ease-in-out 0.6s infinite; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-line-1, .hero-line-2, .hero-line-3 { opacity: 1; }
          .typing-dot-1, .typing-dot-2, .typing-dot-3 { opacity: 0.6; }
        }
        .hiw-arrow { display: none; }
        @media (min-width: 768px) { .hiw-arrow { display: flex !important; } }
      `}</style>

      {/* Hero — full viewport */}
      <section
        ref={heroRef}
        style={{
          position: 'relative',
          minHeight: 'calc(100dvh - 64px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#070B14',
        }}
      >
        {/* Canvas starfield */}
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        />
        {/* Radial gradient overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(52,211,153,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Hero content */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 24,
          padding: '16px 16px 32px',
        }}>
          {/* Badge */}
          <p style={{ color: '#FFD166', fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'monospace', margin: 0 }}>
            ✦ STELLAR ✦
          </p>

          {/* Headline */}
          <h1 style={{
            fontFamily: 'Georgia, serif',
            fontSize: 'clamp(2.2rem, 6vw, 4rem)',
            fontWeight: 700,
            lineHeight: 1.1,
            margin: 0,
          }}>
            <span className="hero-line-1" style={{ display: 'block', color: 'rgba(255,255,255,0.9)' }}>
              Observe the sky.
            </span>
            <span className="hero-line-2" style={{
              display: 'block',
              background: 'linear-gradient(135deg, #34d399, #38F0FF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Earn on Solana.
            </span>
          </h1>

          {/* Sub-copy */}
          <p style={{
            maxWidth: 480,
            lineHeight: 1.7,
            color: 'rgba(255,255,255,0.55)',
            fontSize: 14,
            margin: 0,
          }}>
            Photograph the night sky. Get AI-verified. Earn Stars tokens on Solana.
          </p>

          <LocationPicker compact />

          {/* CTA row */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link
                href="/missions"
                style={{
                  background: 'linear-gradient(135deg, #FFD166, #CC9A33)',
                  color: '#070B14',
                  padding: '12px 24px',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: 'none',
                  display: 'inline-block',
                  boxShadow: '0 0 32px rgba(255,209,102,0.3), 0 4px 20px rgba(0,0,0,0.4)',
                }}
              >
                Start Observing →
              </Link>
              <Link
                href="/missions"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: 12,
                  fontSize: 14,
                  textDecoration: 'none',
                  display: 'inline-block',
                  transition: 'background 0.2s',
                }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
              >
                Tonight&apos;s Targets
              </Link>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, margin: 0 }}>
              Free to join · No wallet needed · Powered by Solana
            </p>
          </div>

          {/* App nav shortcuts */}
          <div style={{
            display: 'flex',
            gap: 10,
            maxWidth: 480,
            width: '100%',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            {[
              { href: '/sky',         icon: '☁',  label: 'Sky',      sub: "Tonight's forecast",  color: '#38F0FF' },
              { href: '/darksky',     icon: '🗺️', label: 'Dark Sky', sub: 'Light pollution map', color: '#34d399' },
              { href: '/chat',        icon: '✦',  label: 'Learn',   sub: 'AI + knowledge',      color: '#8B5CF6' },
              { href: '/marketplace', icon: '🛒', label: 'Shop',     sub: 'Partner stores',      color: '#FFD166' },
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  flex: '1 1 80px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16,
                  padding: '14px 12px',
                  textAlign: 'center',
                  textDecoration: 'none',
                  minWidth: 72,
                }}
              >
                <p style={{ fontSize: 20, margin: '0 0 4px' }}>{item.icon}</p>
                <p style={{ color: item.color, fontSize: 12, fontWeight: 600, margin: 0 }}>{item.label}</p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 2, marginBottom: 0 }}>{item.sub}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Remaining sections */}
      <div className="max-w-3xl w-full mx-auto px-4 py-8 sm:py-16 flex flex-col items-center gap-6 sm:gap-12 animate-page-enter">

        {/* How It Works */}
        <div id="how-it-works" className="w-full">
          <p className="text-center text-xs mb-8 tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
            — {t('home.howItWorks')} —
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }} className="hiw-grid">
            <style>{`@media (min-width: 768px) { .hiw-grid { grid-template-columns: repeat(4, 1fr) !important; gap: 28px !important; } }`}</style>
            {howItWorksSteps.map((item, i) => (
              <div key={item.step} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 16,
                padding: 20,
                position: 'relative',
              }}>
                {/* Arrow connector — desktop only */}
                {i < 3 && (
                  <div className="hiw-arrow" style={{
                    position: 'absolute',
                    right: -20,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    alignItems: 'center',
                    zIndex: 2,
                  }}>
                    <div style={{ width: 14, height: 1, background: 'rgba(52,211,153,0.2)' }} />
                    <span style={{ color: 'rgba(52,211,153,0.4)', fontSize: 10, lineHeight: 1, marginLeft: 1 }}>▶</span>
                  </div>
                )}
                {/* Step icon */}
                <div style={{
                  width: 48, height: 48,
                  borderRadius: 12,
                  background: 'rgba(52,211,153,0.08)',
                  border: '1px solid rgba(52,211,153,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <item.icon size={22} color="#34d399" />
                </div>
                <p style={{ color: 'white', fontWeight: 600, fontSize: 13, marginTop: 12, marginBottom: 4 }}>{item.title}</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tonight's Sky Preview Strip */}
        <div style={{ width: '100%' }}>
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ color: 'white', fontFamily: 'Georgia, serif', fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
                Tonight&apos;s Sky
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span className="pulse-dot" style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'rgba(52,211,153,0.8)',
                }} />
                <span style={{ color: 'rgba(52,211,153,0.8)', fontSize: 11 }}>Live</span>
              </div>
            </div>
            <Link href="/sky" style={{ color: '#34d399', fontSize: 13, textDecoration: 'none' }}>
              View full forecast →
            </Link>
          </div>

          <Suspense fallback={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ height: 38, borderRadius: 12, background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.08)' }} />
              <div style={{ display: 'flex', gap: 10 }}>
                {[0,1,2,3,4].map(i => (
                  <div key={i} style={{ minWidth: 140, height: 112, flexShrink: 0, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16 }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[0,1,2,3,4,5,6].map(i => (
                  <div key={i} style={{ width: 80, height: 52, flexShrink: 0, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10 }} />
                ))}
              </div>
            </div>
          }>
            <HomeSkyPreview />
          </Suspense>
        </div>

        {/* Missions + Leaderboard — side-by-side */}
        <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr', gap: 24 }} className="md-two-col">
          <style>{`
            @media (min-width: 768px) { .md-two-col { grid-template-columns: 1fr 1fr !important; } }
          `}</style>

          {/* LEFT — Active Missions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ color: 'white', fontFamily: 'Georgia, serif', fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
                Active Missions
              </h2>
              <Link href="/missions" style={{ color: '#34d399', fontSize: 13, textDecoration: 'none' }}>
                All missions →
              </Link>
            </div>

            {/* Mission cards */}
            {[
              { emoji: '🌕', name: 'Lunar Observation', difficulty: 'Beginner' as const, stars: 50, desc: 'Observe and photograph the Moon\'s craters through your telescope.', progress: 0 },
              { emoji: '🪐', name: 'Jupiter\'s Moons', difficulty: 'Advanced' as const, stars: 120, desc: 'Track the four Galilean moons over a single evening.', progress: 35 },
              { emoji: '✨', name: 'Deep Sky Survey', difficulty: 'Expert' as const, stars: 200, desc: 'Locate and capture 5 Messier objects in one night.', progress: 0 },
            ].map(m => {
              const diff = m.difficulty === 'Beginner'
                ? { bg: 'rgba(52,211,153,0.15)', color: '#34d399' }
                : m.difficulty === 'Advanced'
                ? { bg: 'rgba(56,240,255,0.12)', color: '#38F0FF' }
                : { bg: 'rgba(255,100,100,0.12)', color: '#ff6464' };
              return (
                <Link
                  key={m.name}
                  href="/missions"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 16,
                    padding: 16,
                    textDecoration: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    transition: 'border-color 0.2s, transform 0.2s',
                  }}
                  onMouseOver={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = 'rgba(255,255,255,0.15)';
                    el.style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = 'rgba(255,255,255,0.08)';
                    el.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Top row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{m.emoji}</span>
                    <span style={{ color: 'white', fontWeight: 600, fontSize: 13, flex: 1 }}>{m.name}</span>
                    <span style={{
                      background: diff.bg,
                      color: diff.color,
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 999,
                      whiteSpace: 'nowrap',
                    }}>
                      {m.difficulty}
                    </span>
                  </div>
                  {/* Description */}
                  <p style={{
                    color: 'rgba(255,255,255,0.45)',
                    fontSize: 11,
                    margin: 0,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                  }}>
                    {m.desc}
                  </p>
                  {/* Bottom row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#FFD166', fontWeight: 700, fontSize: 13 }}>✦ +{m.stars}</span>
                    <div style={{ width: 120, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{
                        width: `${m.progress}%`,
                        height: '100%',
                        background: 'rgba(52,211,153,0.6)',
                        borderRadius: 999,
                      }} />
                    </div>
                  </div>
                </Link>
              );
            })}

            {/* Motivator */}
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, textAlign: 'center', margin: 0 }}>
              Complete all missions to unlock: Free Custom Star Map + 20% telescope discount
            </p>
          </div>

          {/* RIGHT — First Observer CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ color: 'white', fontFamily: 'Georgia, serif', fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
                Leaderboard
              </h2>
              <span style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.4)',
                fontSize: 11,
                padding: '2px 10px',
                borderRadius: 999,
              }}>
                All time
              </span>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(52,211,153,0.15)',
              borderRadius: 16,
              padding: '32px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 12,
              flex: 1,
            }}>
              <span style={{ fontSize: 40 }}>🌌</span>
              <p style={{ color: 'white', fontWeight: 600, fontSize: 15, margin: 0 }}>
                Be among the first observers
              </p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 1.6, margin: 0 }}>
                The leaderboard is empty. Complete your first telescope observation to claim the #1 spot and earn the Early Observer badge.
              </p>
              <Link href="/missions" style={{
                marginTop: 4,
                background: 'linear-gradient(135deg, #34d399, #14B8A6)',
                color: '#070B14',
                fontWeight: 700,
                fontSize: 13,
                padding: '10px 24px',
                borderRadius: 10,
                textDecoration: 'none',
                display: 'inline-block',
              }}>
                Start Observing →
              </Link>
            </div>

            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, textAlign: 'center', margin: 0 }}>
              Observations sealed as NFTs on Solana
            </p>
          </div>
        </div>

        {/* ASTRA AI Teaser */}
        <div style={{ width: '100%' }}>
          {/* Section header */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h2 style={{ color: 'white', fontFamily: 'Georgia, serif', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
              Meet ASTRA
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 4, marginBottom: 0 }}>
              Your AI astronomer. Available 24/7.
            </p>
          </div>

          {/* Chat bubble mockup */}
          <div style={{
            maxWidth: 480,
            width: '100%',
            margin: '0 auto',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 24,
            padding: 24,
            overflow: 'hidden',
          }}>
            {/* Bubble 1 — user */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{
                background: 'rgba(56,240,255,0.12)',
                border: '1px solid rgba(56,240,255,0.2)',
                color: 'white',
                fontSize: 13,
                borderRadius: '16px 16px 2px 16px',
                padding: '8px 16px',
                maxWidth: '80%',
              }}>
                What can I see tonight with a 70mm telescope?
              </div>
            </div>

            {/* Bubble 2 — ASTRA */}
            <div style={{ marginTop: 12 }}>
              <p style={{ color: '#34d399', fontSize: 11, margin: '0 0 4px 0' }}>ASTRA ✦</p>
              <div style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.85)',
                fontSize: 13,
                borderRadius: '16px 16px 16px 2px',
                padding: '8px 16px',
                maxWidth: '85%',
                lineHeight: 1.5,
              }}>
                Tonight is excellent! Jupiter is at magnitude -2.4, well above 40° altitude. You&apos;ll see the four Galilean moons in a line. Saturn rises at 22:30 with its rings at 26° tilt — stunning through your scope.
              </div>
            </div>

            {/* Bubble 3 — user */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <div style={{
                background: 'rgba(56,240,255,0.12)',
                border: '1px solid rgba(56,240,255,0.2)',
                color: 'white',
                fontSize: 13,
                borderRadius: '16px 16px 2px 16px',
                padding: '8px 16px',
                maxWidth: '80%',
              }}>
                Best viewing window?
              </div>
            </div>

            {/* Typing indicator */}
            <div style={{ marginTop: 12 }}>
              <div style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px 16px 16px 2px',
                padding: '8px 16px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {([1, 2, 3] as const).map(n => (
                    <div
                      key={n}
                      className={`typing-dot-${n}`}
                      style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }}
                    />
                  ))}
                </div>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>ASTRA is thinking...</span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Link
              href="/chat"
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, rgba(56,240,255,0.15), rgba(52,211,153,0.15))',
                border: '1px solid rgba(52,211,153,0.3)',
                color: 'white',
                borderRadius: 12,
                padding: '12px 24px',
                fontSize: 14,
                textDecoration: 'none',
                transition: 'border-color 0.2s, background 0.2s',
              }}
              onMouseOver={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'rgba(52,211,153,0.6)';
                el.style.background = 'linear-gradient(135deg, rgba(56,240,255,0.22), rgba(52,211,153,0.22))';
              }}
              onMouseOut={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'rgba(52,211,153,0.3)';
                el.style.background = 'linear-gradient(135deg, rgba(56,240,255,0.15), rgba(52,211,153,0.15))';
              }}
            >
              Ask ASTRA anything →
            </Link>
          </div>

          {/* Prompt pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12 }}>
            {[
              "What's visible tonight?",
              'Telescope recommendations for beginners',
              "Explain Jupiter's Red Spot",
            ].map(pill => (
              <Link
                key={pill}
                href="/chat"
                style={{
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.45)',
                  fontSize: 11,
                  padding: '6px 12px',
                  borderRadius: 999,
                  textDecoration: 'none',
                  transition: 'border-color 0.2s',
                  cursor: 'pointer',
                }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(52,211,153,0.3)'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
              >
                {pill}
              </Link>
            ))}
          </div>
        </div>

        {/* Earn Stars. Spend Stars. */}
        <div style={{ width: '100%' }}>
          {/* Section header */}
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ color: 'white', fontFamily: 'Georgia, serif', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
              Earn Stars. Spend Real Rewards.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 6, marginBottom: 0, lineHeight: 1.6 }}>
              Complete missions → earn Stars tokens → redeem at partner stores worldwide.
            </p>
          </div>

          {/* Rewards tier cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }} className="rewards-grid">
            <style>{`@media (max-width: 639px) { .rewards-grid { grid-template-columns: 1fr !important; } }`}</style>

            {[
              { emoji: '🌙', title: 'First Observation', reward: 'Free Moon Lamp', stars: '50 ✦', progress: 0 },
              { emoji: '⭐', title: 'Mission Complete', reward: 'Custom Star Map PDF', stars: '500 ✦', progress: 0 },
              { emoji: '🔭', title: 'Power Observer', reward: '20% telescope discount', stars: '1000 ✦', progress: 0 },
            ].map(card => (
              <div
                key={card.title}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16,
                  padding: 20,
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 30 }}>{card.emoji}</span>
                <p style={{ color: 'white', fontWeight: 600, fontSize: 14, margin: 0 }}>{card.title}</p>
                <p style={{ color: '#FFD166', fontWeight: 700, fontSize: 13, margin: 0 }}>{card.reward}</p>
                <p style={{ color: '#34d399', fontSize: 12, margin: 0 }}>{card.stars}</p>
                {/* Progress bar */}
                <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 999, marginTop: 4 }}>
                  <div style={{ width: `${card.progress}%`, height: '100%', background: '#34d399', borderRadius: 999 }} />
                </div>
                {/* Lock icon */}
                <span style={{
                  position: 'absolute', bottom: 14, right: 14,
                  color: 'rgba(255,255,255,0.2)', fontSize: 14,
                }}>🔒</span>
              </div>
            ))}
          </div>

          {/* Progress teaser */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 20,
          }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '0 0 4px 0' }}>Your Stars</p>
              <p style={{ color: '#FFD166', fontWeight: 700, fontSize: 24, margin: 0 }}>0 ✦</p>
            </div>
            <div style={{ flex: 1, minWidth: 160, maxWidth: 280 }}>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '0 0 6px 0' }}>Next reward at 50 ✦</p>
              <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 999 }}>
                <div style={{ width: '0%', height: '100%', background: '#34d399', borderRadius: 999 }} />
              </div>
            </div>
          </div>

          {/* Store preview */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 10 }}>
            <Link href="/marketplace" style={{ color: '#34d399', fontSize: 13, textDecoration: 'none' }}>
              Shop with Stars →
            </Link>
          </div>
          <div style={{
            display: 'flex',
            gap: 12,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            touchAction: 'pan-x',
            paddingBottom: 4,
          }}>
            {[
              { name: 'Custom Star Map', price: '29 GEL', stars: '500 ✦' },
              { name: 'Moon Lamp', price: '45 GEL', stars: '750 ✦' },
              { name: 'Bresser Junior Telescope', price: '299 GEL', stars: '5000 ✦' },
            ].map(product => (
              <div
                key={product.name}
                style={{
                  minWidth: 180,
                  flexShrink: 0,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <p style={{ color: 'white', fontWeight: 600, fontSize: 13, margin: 0 }}>{product.name}</p>
                <p style={{ color: '#FFD166', fontWeight: 700, fontSize: 15, margin: 0 }}>{product.price}</p>
                <p style={{ color: '#34d399', fontSize: 11, margin: 0 }}>or {product.stars}</p>
                <Link
                  href="/marketplace"
                  style={{
                    marginTop: 4,
                    display: 'inline-block',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'white',
                    fontSize: 12,
                    padding: '5px 12px',
                    borderRadius: 8,
                    textDecoration: 'none',
                    transition: 'border-color 0.2s',
                    alignSelf: 'flex-start',
                  }}
                  onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = '#34d399'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
                >
                  View →
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Partner Stores */}
        <div style={{ width: '100%' }}>
          <p style={{ color: 'white', fontFamily: 'Georgia, serif', fontSize: '1.25rem', fontWeight: 700, textAlign: 'center', margin: '0 0 6px' }}>
            Partner Telescope Stores
          </p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', margin: '0 0 24px' }}>
            Earn Stars anywhere. Spend them at your local dealer.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 16,
            maxWidth: 512,
            margin: '0 auto',
          }} className="partner-grid">
            <style>{`@media (max-width: 480px) { .partner-grid { grid-template-columns: 1fr !important; } }`}</style>

            {/* Astroman */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 20,
              padding: 20,
            }}>
              <p style={{ color: 'white', fontWeight: 600, fontSize: 14, margin: '0 0 4px' }}>🔭 Astroman</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '0 0 8px', lineHeight: 1.5 }}>
                Georgia&apos;s first astronomy store
              </p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '0 0 8px' }}>
                Ships to: 🇬🇪 🇦🇲 🇦🇿 🇹🇷
              </p>
              <a
                href="https://astroman.ge"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#34d399', fontSize: 12, textDecoration: 'none' }}
              >
                Visit store →
              </a>
            </div>

            {/* High Point Scientific */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 20,
              padding: 20,
            }}>
              <p style={{ color: 'white', fontWeight: 600, fontSize: 14, margin: '0 0 4px' }}>🔭 High Point Scientific</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '0 0 8px', lineHeight: 1.5 }}>
                America&apos;s trusted telescope retailer
              </p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '0 0 8px' }}>
                Ships to: 🇺🇸 🇨🇦
              </p>
              <a
                href="https://www.highpointscientific.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#34d399', fontSize: 12, textDecoration: 'none' }}
              >
                Visit store →
              </a>
            </div>
          </div>

          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, textAlign: 'center', marginTop: 16 }}>
            Want to sell on Stellar?{' '}
            <a href="mailto:rezi@astroman.ge" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
              Contact us →
            </a>
          </p>
        </div>

      </div>
    </>
  );
}
