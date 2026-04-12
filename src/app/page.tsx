// STELLAR Homepage v2.0 — Redesigned for Colosseum Frontier Hackathon 2026
// Sections: Hero → Sky Preview → Missions + Leaderboard → How It Works → ASTRA → Rewards → Footer
// Colors: #070B14 bg · #34d399 teal · #FFD166 gold · #38F0FF blue
'use client';
import { useRef, useEffect, Suspense, useState } from 'react';
import Link from 'next/link';

import { useTranslations } from 'next-intl';
import HomeSkyPreview from '@/components/home/HomeSkyPreview';
import { usePrivy } from '@privy-io/react-auth';
import { useAppState } from '@/hooks/useAppState';
import { Telescope, Camera, Star, ShoppingBag, CloudSun, Satellite, Sparkles, Moon, Lock, Orbit } from 'lucide-react';
import { MISSIONS } from '@/lib/constants';
import LocationPicker from '@/components/LocationPicker';
import { useLocation } from '@/lib/location';
import OnboardingOverlay from '@/components/shared/OnboardingOverlay';
import PageTransition from '@/components/ui/PageTransition';

function EmailSubscribe() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) { setStatus('error'); return; }
    // Store in localStorage as a lightweight demo; replace with real API call when ready
    try {
      const existing = JSON.parse(localStorage.getItem('stellar_subscribers') ?? '[]') as string[];
      localStorage.setItem('stellar_subscribers', JSON.stringify([...existing, email]));
    } catch {}
    setStatus('sent');
    setEmail('');
  }

  return (
    <div style={{
      marginTop: 32,
      padding: '24px 20px',
      borderRadius: 16,
      background: 'rgba(52,211,153,0.04)',
      border: '1px solid rgba(52,211,153,0.12)',
      textAlign: 'center',
    }}>
      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>
        Get sky alerts &amp; telescope tips
      </p>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, margin: '0 0 16px' }}>
        We&apos;ll notify you when conditions are perfect in your area.
      </p>
      {status === 'sent' ? (
        <p style={{ color: '#34d399', fontSize: 13, fontWeight: 600 }}>✦ You&apos;re on the list — clear skies ahead!</p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, maxWidth: 360, margin: '0 auto' }}>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setStatus('idle'); }}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 10, fontSize: 13,
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${status === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`,
              color: 'white', outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: 'rgba(52,211,153,0.15)',
              border: '1px solid rgba(52,211,153,0.3)',
              color: '#34d399',
              whiteSpace: 'nowrap',
            }}
          >
            Notify me
          </button>
        </form>
      )}
    </div>
  );
}

export default function HomePage() {
  const t = useTranslations();
  const { user } = usePrivy();
  const { state } = useAppState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const stepPausedRef = useRef(false);

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

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    let initialized = false;
    let w = 0, h = 0;
    let handleResize: () => void;

    const init = () => {
      if (initialized) return;
      initialized = true;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      w = hero.offsetWidth;
      h = hero.offsetHeight;
      canvas.width = w;
      canvas.height = h;

      const stars = Array.from({ length: 120 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.5 + Math.random() * 0.7,
        o: 0.2 + Math.random() * 0.5,
      }));

      const draw = () => {
        ctx.clearRect(0, 0, w, h);
        for (const s of stars) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${s.o})`;
          ctx.fill();
        }
      };
      draw();

      handleResize = () => {
        w = hero.offsetWidth;
        h = hero.offsetHeight;
        canvas.width = w;
        canvas.height = h;
        draw();
      };
      window.addEventListener('resize', handleResize);
    };

    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          init();
          observer.disconnect();
        }
      }, { threshold: 0 });
      observer.observe(canvas);
      return () => {
        observer.disconnect();
        if (handleResize) window.removeEventListener('resize', handleResize);
      };
    } else {
      init();
      return () => {
        if (handleResize) window.removeEventListener('resize', handleResize);
      };
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!stepPausedRef.current) {
        setActiveStep(s => (s + 1) % 4);
      }
    }, 3500);
    return () => clearInterval(timer);
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
      <OnboardingOverlay />
      <PageTransition>
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
        @media (max-width: 639px) { .hero-section { min-height: auto !important; } }
      `}</style>

      {/* Hero — full viewport */}
      <section
        ref={heroRef}
        className="hero-section"
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
        {/* Radial glow orb — teal brand color */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56,240,255,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
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
          {/* Headline */}
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.2rem, 6vw, 4rem)',
            fontWeight: 800,
            lineHeight: 1.1,
            margin: 0,
          }}>
            <span className="hero-line-1" style={{ display: 'block', color: 'rgba(255,255,255,0.9)' }}>
              Observe the
            </span>
            <span className="hero-line-2" style={{ display: 'block', color: '#34d399' }}>
              Night Sky.
            </span>
            <span className="hero-line-3" style={{
              display: 'block',
              background: 'linear-gradient(135deg, #34d399, #38F0FF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Earn on Solana.
            </span>
          </h1>

          {/* Tagline */}
          <p style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.12em',
            color: 'rgba(52,211,153,0.7)',
            margin: '-8px 0 0',
            textTransform: 'uppercase',
          }}>
            Observe · Verify · Earn Stars
          </p>

          {/* Sub-copy */}
          <p style={{
            maxWidth: 480,
            lineHeight: 1.7,
            color: 'rgba(255,255,255,0.55)',
            fontSize: 14,
            margin: 0,
          }}>
            Photograph celestial objects from anywhere in the world. Earn Stars tokens, collect discovery NFTs, and shop telescopes at your local dealer.
          </p>

          <LocationPicker compact />

          {/* CTA row */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link href="/missions" className="btn-primary" style={{ textDecoration: 'none' }}>
                Start Observing →
              </Link>
              <Link href="/sky" className="btn-ghost" style={{ textDecoration: 'none' }}>
                Tonight&apos;s Sky →
              </Link>
            </div>
            <span className="badge-pill badge-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span className="live-dot" />
              Live on Solana Devnet
            </span>
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
              { href: '/sky',         Icon: CloudSun,    label: 'Sky',      sub: "Tonight's forecast",  color: 'var(--accent)' },
              { href: '/missions',    Icon: Satellite,   label: 'Missions', sub: 'Earn Stars tokens',   color: 'var(--success)' },
              { href: '/chat',        Icon: Sparkles,    label: 'ASTRA',    sub: 'AI astronomer',       color: '#A855F7' },
              { href: '/marketplace', Icon: ShoppingBag, label: 'Shop',     sub: 'Partner stores',      color: 'var(--stars)' },
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="card-base"
                style={{
                  flex: '1 1 80px',
                  padding: '14px 12px',
                  textAlign: 'center',
                  textDecoration: 'none',
                  minWidth: 72,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <item.Icon size={20} color={item.color} strokeWidth={1.5} />
                <p style={{ color: item.color, fontSize: 12, fontWeight: 600, margin: 0, fontFamily: 'var(--font-display)' }}>{item.label}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 10, margin: 0 }}>{item.sub}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Remaining sections */}
      <div className="max-w-3xl w-full mx-auto px-4 pt-1 pb-4 sm:pb-8 flex flex-col items-center gap-5 sm:gap-8 animate-page-enter overflow-x-hidden">

        {/* How It Works — interactive stepper */}
        <div id="how-it-works" className="w-full"
          onMouseEnter={() => { stepPausedRef.current = true; }}
          onMouseLeave={() => { stepPausedRef.current = false; }}
          onTouchStart={() => { stepPausedRef.current = true; }}
        >
          <p className="text-center text-xs mb-4 tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
            — {t('home.howItWorks')} —
          </p>

          {/* Step selector tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {howItWorksSteps.map((item, i) => {
              const active = activeStep === i;
              return (
                <button
                  key={i}
                  onClick={() => { setActiveStep(i); stepPausedRef.current = true; }}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: 12,
                    border: 'none',
                    borderBottom: `2px solid ${active ? '#34d399' : 'transparent'}`,
                    background: active ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.25s',
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: active ? 'var(--accent-dim)' : 'rgba(255,255,255,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.25s',
                  }}>
                    <span style={{
                      fontSize: 11,
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      color: active ? 'var(--accent)' : 'rgba(255,255,255,0.25)',
                    }}>
                      {i + 1}
                    </span>
                  </div>
                  <item.icon
                    size={18}
                    color={active ? '#34d399' : 'rgba(255,255,255,0.25)'}
                    strokeWidth={active ? 2 : 1.5}
                  />
                </button>
              );
            })}
          </div>

          {/* Active step detail card */}
          {(() => {
            const step = howItWorksSteps[activeStep];
            const StepIcon = step.icon;
            return (
              <div className="card-base" style={{
                padding: '18px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}>
                <div style={{
                  width: 52, height: 52, flexShrink: 0,
                  borderRadius: 14,
                  background: 'var(--accent-dim)',
                  border: '1px solid var(--accent-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <StepIcon size={24} color="var(--accent)" strokeWidth={1.5} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: '0 0 4px' }}>
                    {step.title}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 1.6, margin: 0 }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Progress dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
            {howItWorksSteps.map((_, i) => (
              <div
                key={i}
                onClick={() => { setActiveStep(i); stepPausedRef.current = true; }}
                style={{
                  width: activeStep === i ? 20 : 5,
                  height: 4,
                  borderRadius: 2,
                  background: activeStep === i ? '#34d399' : 'rgba(255,255,255,0.15)',
                  transition: 'all 0.3s',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>

        {/* Tonight's Sky Preview Strip */}
        <div style={{ width: '100%', overflow: 'hidden' }}>
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                Tonight&apos;s Sky
              </h2>
              <span className="badge-pill badge-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10 }}>
                <span className="live-dot" />
                Live
              </span>
            </div>
            <Link href="/sky" style={{ color: 'var(--accent)', fontSize: 13, textDecoration: 'none', fontFamily: 'var(--font-display)', fontWeight: 500 }}>
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
        <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr', gap: 24, overflow: 'hidden' }} className="md-two-col">
          <style>{`
            @media (min-width: 768px) { .md-two-col { grid-template-columns: 1fr 1fr !important; } }
          `}</style>

          {/* LEFT — Active Missions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                Active Missions
              </h2>
              <Link href="/missions" style={{ color: 'var(--accent)', fontSize: 13, textDecoration: 'none', fontFamily: 'var(--font-display)', fontWeight: 500 }}>
                View all missions →
              </Link>
            </div>

            {/* Tonight's Sky card */}
            <Link
              href="/sky"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(52,211,153,0.2)',
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
                el.style.borderColor = 'rgba(52,211,153,0.4)';
                el.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'rgba(52,211,153,0.2)';
                el.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(52,211,153,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CloudSun size={18} color="#34d399" strokeWidth={1.5} />
                </div>
                <span style={{ color: 'white', fontWeight: 600, fontSize: 13, flex: 1 }}>Tonight&apos;s Sky</span>
                <span style={{
                  background: 'rgba(52,211,153,0.15)',
                  color: '#34d399',
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 999,
                  whiteSpace: 'nowrap',
                }}>
                  Free · Always Available
                </span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, margin: 0 }}>
                Check tonight&apos;s forecast, planet positions, and best observation windows.
              </p>
            </Link>

            {/* Mission cards */}
            {MISSIONS.slice(0, 4).map(m => {
              const diffClass = m.difficulty === 'Beginner'
                ? 'badge-pill badge-success'
                : m.difficulty === 'Intermediate'
                ? 'badge-pill badge-accent'
                : m.difficulty === 'Hard'
                ? 'badge-pill badge-warning'
                : 'badge-pill badge-error';
              const iconBg = m.difficulty === 'Beginner'
                ? 'var(--success-dim)'
                : m.difficulty === 'Intermediate'
                ? 'var(--accent-dim)'
                : m.difficulty === 'Hard'
                ? 'var(--warning-dim)'
                : 'var(--error-dim)';
              return (
                <Link
                  key={m.id}
                  href="/missions"
                  className="card-base"
                  style={{ padding: 16, textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
                      {m.emoji}
                    </div>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13, flex: 1, fontFamily: 'var(--font-display)' }}>{m.name}</span>
                    <span className={diffClass} style={{ fontSize: 10, whiteSpace: 'nowrap' }}>{m.difficulty}</span>
                  </div>
                  <p style={{
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    margin: 0,
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {m.desc}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="badge-pill badge-stars" style={{ fontSize: 12 }}>✦ +{m.stars}</span>
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
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              flex: 1,
            }}>
              {[
                { medal: '🥇', name: 'AstroNova', obs: 12, stars: 1240 },
                { medal: '🥈', name: 'CosmicRezi', obs: 8, stars: 890 },
                { medal: '🥉', name: 'StarGazer_GE', obs: 5, stars: 620 },
              ].map(entry => (
                <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>{entry.medal}</span>
                  <span style={{ color: 'white', fontSize: 13, flex: 1 }}>{entry.name}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{entry.obs} obs · {entry.stars} ✦</span>
                </div>
              ))}
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, margin: '4px 0 0', textAlign: 'center' }}>
                Real rankings update daily
              </p>
            </div>

            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, textAlign: 'center', margin: 0 }}>
              Observations sealed as NFTs on Solana
            </p>
          </div>
        </div>

        {/* ASTRA AI Teaser */}
        <div style={{ width: '100%', background: 'linear-gradient(180deg, rgba(139,92,246,0.04) 0%, transparent 100%)', borderRadius: 20, padding: '28px 20px', border: '1px solid rgba(139,92,246,0.05)' }}>
          {/* Section header */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h2 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
              Meet ASTRA
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4, marginBottom: 0 }}>
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
                background: 'var(--accent-dim)',
                border: '1px solid var(--accent-border)',
                color: 'var(--text-primary)',
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
              <p style={{ color: 'var(--accent)', fontSize: 11, margin: '0 0 4px 0', fontFamily: 'var(--font-display)', fontWeight: 600 }}>ASTRA ✦</p>
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
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
                background: 'var(--accent-dim)',
                border: '1px solid var(--accent-border)',
                color: 'var(--text-primary)',
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
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border-default)',
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
                      style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }}
                    />
                  ))}
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>ASTRA is thinking...</span>
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
        <div style={{ width: '100%', background: 'linear-gradient(180deg, rgba(255,209,102,0.03) 0%, transparent 100%)', borderRadius: 20, padding: '28px 20px', border: '1px solid rgba(255,209,102,0.04)' }}>
          {/* Section header */}
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
              Earn Stars. Spend Real Rewards.
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 6, marginBottom: 0, lineHeight: 1.6 }}>
              Complete sky missions to earn Stars tokens and compressed NFTs on Solana. Redeem Stars at partner telescope stores worldwide.
            </p>
          </div>

          {/* Rewards tier cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }} className="rewards-grid">
            <style>{`@media (max-width: 639px) { .rewards-grid { grid-template-columns: 1fr !important; } }`}</style>

            {[
              { icon: Moon, iconBg: 'rgba(52,211,153,0.1)', iconColor: '#34d399', title: 'First Observation', reward: 'Free Moon Lamp for your first lunar observation', stars: '50 ✦', progress: 0 },
              { icon: Star, iconBg: 'rgba(255,209,102,0.1)', iconColor: '#FFD166', title: 'Mission Complete', reward: 'Free Custom Star Map for completing all 5 missions', stars: '500 ✦', progress: 0 },
              { icon: Telescope, iconBg: 'rgba(56,240,255,0.1)', iconColor: '#38F0FF', title: 'Power Observer', reward: 'Discounts up to 20% on telescopes at partner stores', stars: '1000 ✦', progress: 0 },
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
                <div style={{ width: 44, height: 44, borderRadius: 12, background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <card.icon size={22} color={card.iconColor} strokeWidth={1.5} />
                </div>
                <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14, margin: 0, fontFamily: 'var(--font-display)' }}>{card.title}</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>{card.reward}</p>
                <p style={{ color: 'var(--stars)', fontSize: 12, margin: 0, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{card.stars}</p>
                {/* Progress bar */}
                <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 999, marginTop: 4 }}>
                  <div style={{ width: `${card.progress}%`, height: '100%', background: '#34d399', borderRadius: 999 }} />
                </div>
                {/* Lock icon */}
                <Lock size={14} style={{ position: 'absolute', bottom: 14, right: 14, color: 'rgba(255,255,255,0.15)' }} />
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
              <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 4px 0' }}>Your Stars</p>
              <p style={{ color: 'var(--stars)', fontWeight: 700, fontSize: 24, margin: 0, fontFamily: 'var(--font-mono)' }}>0 ✦</p>
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
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 4,
          }}>
            {[
              { name: 'Custom Star Map', price: '29 GEL (~$10)', stars: '500 ✦' },
              { name: 'Moon Lamp', price: '45 GEL (~$16)', stars: '750 ✦' },
              { name: 'Bresser Junior Telescope', price: '299 GEL (~$105)', stars: '5000 ✦' },
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

        {/* Partner Stores — compact banner */}
        <div style={{ width: '100%' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16,
            padding: '14px 20px',
            maxWidth: 560,
            margin: '0 auto',
          }}>
            <span style={{ fontSize: 24 }}>🔭</span>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: 0, flex: 1 }}>
              Shop telescopes from partner stores worldwide
            </p>
            <Link
              href="/marketplace"
              style={{ color: '#34d399', fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              Browse Store →
            </Link>
          </div>

          <EmailSubscribe />
        </div>

      </div>
      </PageTransition>
    </>
  );
}
