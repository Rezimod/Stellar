// STELLAR Homepage v2.0 — Redesigned for Colosseum Frontier Hackathon 2026
// Sections: Hero → Sky Preview → Missions + Leaderboard → How It Works → ASTRA → Rewards → Footer
// Colors: #070B14 bg · #34d399 teal · #FFD166 gold · #38F0FF blue
'use client';
import { useRef, useEffect } from 'react';
import Link from 'next/link';

import { useTranslations } from 'next-intl';
import { usePrivy } from '@privy-io/react-auth';
import { useAppState } from '@/hooks/useAppState';
import { Telescope, Camera, Satellite, Layers, ChevronDown } from 'lucide-react';

export default function HomePage() {
  const t = useTranslations();
  const { user } = usePrivy();
  const { state } = useAppState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<HTMLElement>(null);

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

  const stepIcons = [Telescope, Camera, Satellite, Layers];
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
          minHeight: '100vh',
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

        {/* Announcement bar */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          height: 32,
          background: 'rgba(52,211,153,0.08)',
          borderBottom: '1px solid rgba(52,211,153,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
              Live: Sky conditions updating · Tbilisi clear 12%
            </span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, display: 'none' }} className="sm:inline-block">
            2nd place · Superteam Georgia Hackathon ✦
          </span>
        </div>

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
          padding: '48px 16px 80px',
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
              Observe the
            </span>
            <span className="hero-line-2" style={{
              display: 'block',
              background: 'linear-gradient(135deg, #34d399, #38F0FF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Night Sky.
            </span>
            <span className="hero-line-3" style={{
              display: 'block',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.38em',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              marginTop: 12,
            }}>
              Earn your place.
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
            Complete telescope observations. Earn Stars tokens. Collect verified NFTs. Shop with real discounts from Georgia&apos;s first astronomy store.
          </p>

          {/* CTA row */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link
                href="/sky"
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
                href="/sky"
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
              Free to join · No seed phrase required
            </p>
          </div>

          {/* Live stats strip */}
          <div style={{
            display: 'flex',
            gap: 12,
            maxWidth: 480,
            width: '100%',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            {[
              { icon: '✦', title: 'Stars Token', sub: 'Live on Solana', color: '#34d399' },
              { icon: '🔭', title: 'NFT Missions', sub: 'Seal your obs.', color: '#FFD166' },
              { icon: '🛒', title: 'Real Rewards', sub: 'From Astroman', color: 'white' },
            ].map(stat => (
              <div
                key={stat.title}
                style={{
                  flex: '1 1 120px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: '12px 16px',
                  textAlign: 'center',
                  minWidth: 100,
                }}
              >
                <p style={{ color: stat.color, fontSize: 12, fontWeight: 600, margin: 0 }}>
                  {stat.icon} {stat.title}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2, marginBottom: 0 }}>
                  {stat.sub}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="hero-scroll"
          style={{
            position: 'absolute',
            bottom: 28,
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(255,255,255,0.25)',
            zIndex: 1,
            lineHeight: 1,
          }}
        >
          <ChevronDown size={20} />
        </div>
      </section>

      {/* Remaining sections */}
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-16 flex flex-col items-center gap-8 sm:gap-12 animate-page-enter">

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
                {/* Step number circle */}
                <div style={{
                  width: 40, height: 40,
                  borderRadius: '50%',
                  background: 'rgba(52,211,153,0.08)',
                  border: '1px solid rgba(52,211,153,0.15)',
                  color: 'rgba(52,211,153,0.6)',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {String(item.step).padStart(2, '0')}
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

          {/* Sky condition banner */}
          <div style={{
            background: 'rgba(52,211,153,0.06)',
            border: '1px solid rgba(52,211,153,0.12)',
            borderRadius: 12,
            padding: '8px 16px',
            marginBottom: 12,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 14px' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Cloud Cover: 12%</span>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                Visibility: <span style={{ color: '#34d399' }}>Excellent</span>
              </span>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Best time: 21:00–01:00</span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>📍 Tbilisi, Georgia</span>
          </div>

          {/* Planet cards horizontal scroll */}
          <div style={{
            display: 'flex',
            gap: 10,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            touchAction: 'pan-x',
            marginBottom: 12,
            paddingBottom: 4,
          }}>
            {[
              { name: 'Moon', emoji: '🌕', status: 'Excellent', time: 'Rises 18:40' },
              { name: 'Jupiter', emoji: '🪐', status: 'Excellent', time: 'Rises 20:14' },
              { name: 'Saturn', emoji: '🪐', status: 'Good', time: 'Rises 22:30' },
              { name: 'Orion Nebula', emoji: '✨', status: 'Good', time: 'Visible 21:00' },
              { name: 'Pleiades', emoji: '⭐', status: 'Excellent', time: 'Visible 20:45' },
              { name: 'Andromeda', emoji: '🌌', status: 'Good', time: 'Visible 22:00' },
            ].map(target => {
              const badge =
                target.status === 'Excellent' ? { bg: 'rgba(52,211,153,0.15)', color: '#34d399' }
                : target.status === 'Good'    ? { bg: 'rgba(255,209,102,0.15)', color: '#FFD166' }
                :                               { bg: 'rgba(148,163,184,0.15)', color: 'rgba(255,255,255,0.5)' };
              return (
                <Link
                  key={target.name}
                  href="/missions"
                  style={{
                    minWidth: 140,
                    flexShrink: 0,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 16,
                    padding: 16,
                    textDecoration: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    transition: 'border-color 0.2s, transform 0.2s',
                  }}
                  onMouseOver={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = 'rgba(52,211,153,0.3)';
                    el.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = 'rgba(255,255,255,0.08)';
                    el.style.transform = 'translateY(0)';
                  }}
                >
                  <span style={{ fontSize: 30 }}>{target.emoji}</span>
                  <p style={{ color: 'white', fontSize: 13, fontWeight: 600, marginTop: 8, marginBottom: 6 }}>{target.name}</p>
                  <span style={{
                    background: badge.bg,
                    color: badge.color,
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 999,
                  }}>
                    {target.status}
                  </span>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 6, marginBottom: 0 }}>{target.time}</p>
                </Link>
              );
            })}
          </div>
          {/* Hide scrollbar for webkit */}
          <style>{`.sky-hscroll::-webkit-scrollbar { display: none; }`}</style>

          {/* 7-day forecast ribbon */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', touchAction: 'pan-x' }}>
            {([
              { day: 'Mon', badge: 'Go' },
              { day: 'Tue', badge: 'Go' },
              { day: 'Wed', badge: 'Maybe' },
              { day: 'Thu', badge: 'Skip' },
              { day: 'Fri', badge: 'Go' },
              { day: 'Sat', badge: 'Go' },
              { day: 'Sun', badge: 'Maybe' },
            ] as { day: string; badge: 'Go' | 'Maybe' | 'Skip' }[]).map((d, i) => {
              const bs =
                d.badge === 'Go'    ? { bg: 'rgba(52,211,153,0.15)', color: '#34d399' }
                : d.badge === 'Maybe' ? { bg: 'rgba(255,209,102,0.12)', color: '#FFD166' }
                :                       { bg: 'rgba(148,163,184,0.08)', color: 'rgba(148,163,184,0.7)' };
              return (
                <div key={d.day} style={{
                  flex: '0 0 auto',
                  width: 80,
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${i === 0 ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 10,
                  padding: '8px 12px',
                  textAlign: 'center',
                }}>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: '0 0 4px 0' }}>{d.day}</p>
                  <span style={{
                    background: bs.bg,
                    color: bs.color,
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: 999,
                    whiteSpace: 'nowrap',
                  }}>
                    {d.badge}
                  </span>
                </div>
              );
            })}
          </div>
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

          {/* RIGHT — Leaderboard */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Header */}
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
                This week
              </span>
            </div>

            {/* Leaderboard card */}
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              overflow: 'hidden',
            }}>
              {[
                { rank: 1, name: 'AstroHunter', location: 'Tbilisi', stars: 1280 },
                { rank: 2, name: 'StarFinder',  location: 'Lisbon',  stars: 940 },
                { rank: 3, name: 'NebulaScout', location: 'Tokyo',   stars: 820 },
                { rank: 4, name: 'CosmicEye',   location: 'Arizona', stars: 650 },
                { rank: 5, name: 'MoonWatcher', location: 'Berlin',  stars: 410 },
              ].map((entry, i) => {
                const rankColor =
                  entry.rank === 1 ? '#34d399'
                  : entry.rank === 2 ? '#FFD166'
                  : entry.rank === 3 ? 'rgba(255,180,100,0.8)'
                  : 'rgba(255,255,255,0.3)';
                const avatarBg = [
                  'rgba(52,211,153,0.2)',
                  'rgba(56,240,255,0.2)',
                  'rgba(255,209,102,0.2)',
                  'rgba(148,163,184,0.2)',
                ][i % 4];
                const isFirst = entry.rank === 1;
                return (
                  <div
                    key={entry.rank}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      background: isFirst ? 'rgba(52,211,153,0.06)' : 'transparent',
                      borderLeft: isFirst ? '2px solid #34d399' : '2px solid transparent',
                    }}
                  >
                    <span style={{ color: rankColor, fontWeight: 700, fontSize: 13, width: 20, textAlign: 'center', flexShrink: 0 }}>
                      {entry.rank}
                    </span>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: avatarBg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0,
                    }}>
                      {entry.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: 'white', fontSize: 13, fontWeight: 500, margin: 0 }}>{entry.name}</p>
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: 0 }}>{entry.location}</p>
                    </div>
                    <span style={{ color: '#FFD166', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                      {isFirst ? '🔭 ' : ''}{entry.stars} ✦
                    </span>
                  </div>
                );
              })}
            </div>

            {/* NFT count */}
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, textAlign: 'center', margin: 0 }}>
              47 observations sealed on Solana this week
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
              "What's visible tonight in Tbilisi?",
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
              Complete missions → earn Stars tokens → redeem for Astroman gear.
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

      </div>
    </>
  );
}
