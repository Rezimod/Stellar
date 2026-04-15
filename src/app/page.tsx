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
import { Telescope, Camera, Star, ShoppingBag, CloudSun, Sparkles, Moon, Lock, Orbit } from 'lucide-react';
import { MISSIONS } from '@/lib/constants';
import LocationPicker from '@/components/LocationPicker';
import { useLocation } from '@/lib/location';
import PageTransition from '@/components/ui/PageTransition';
import LoadingRing from '@/components/ui/LoadingRing';
import AstraQuickAsk from '@/components/AstraQuickAsk';

function EmailSubscribe() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) { setStatus('error'); return; }
    try {
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setStatus('sent');
      setEmail('');
    } catch {
      setStatus('error');
    }
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
  const { user, ready, authenticated } = usePrivy();
  const { state } = useAppState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const stepPausedRef = useRef(false);
  const [liveLeaders, setLiveLeaders] = useState<{ handle: string; observations: number; stars: number }[]>([]);
  const [leadersLoading, setLeadersLoading] = useState(true);
  const [homeStars, setHomeStars] = useState(0);
  const [homeStarsLoaded, setHomeStarsLoaded] = useState(false);
  const [heroSkyScore, setHeroSkyScore] = useState<{ score: number; grade: string; emoji: string } | null>(null);

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
    let raf = 0;

    const init = () => {
      if (initialized) return;
      initialized = true;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      w = hero.offsetWidth;
      h = hero.offsetHeight;
      canvas.width = w;
      canvas.height = h;

      const stars = Array.from({ length: 160 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.3 + Math.random() * 0.9,
        baseO: 0.15 + Math.random() * 0.45,
        speed: 0.2 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2,
      }));

      let t = 0;
      const draw = () => {
        ctx.clearRect(0, 0, w, h);
        t += 0.008;
        for (const s of stars) {
          const o = s.baseO + Math.sin(t * s.speed + s.phase) * 0.18;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${Math.max(0, Math.min(1, o))})`;
          ctx.fill();
        }
        raf = requestAnimationFrame(draw);
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
        if (raf) cancelAnimationFrame(raf);
      };
    } else {
      init();
      return () => {
        if (handleResize) window.removeEventListener('resize', handleResize);
        if (raf) cancelAnimationFrame(raf);
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

  useEffect(() => {
    fetch('/api/leaderboard?period=all&limit=3')
      .then(r => r.json())
      .then(data => {
        const entries = (data.leaderboard ?? []).slice(0, 3).map((e: { wallet: string; observations: number; total_stars: number }) => ({
          handle: e.wallet.length > 8 ? `${e.wallet.slice(0, 4)}…${e.wallet.slice(-4)}` : e.wallet,
          observations: e.observations,
          stars: e.total_stars,
        }));
        setLiveLeaders(entries);
      })
      .catch(() => setLiveLeaders([]))
      .finally(() => setLeadersLoading(false));
  }, []);

  useEffect(() => {
    const addr = walletAddress ?? state.walletAddress;
    if (!authenticated || !addr) { setHomeStarsLoaded(true); return; }
    fetch(`/api/stars-balance?address=${encodeURIComponent(addr)}`)
      .then(r => r.json())
      .then(d => setHomeStars(d.balance ?? 0))
      .catch(() => {})
      .finally(() => setHomeStarsLoaded(true));
  }, [authenticated, walletAddress, state.walletAddress]);

  useEffect(() => {
    const lat = location.lat || 41.6941;
    const lon = location.lon || 44.8337;
    fetch(`/api/sky/score?lat=${lat}&lon=${lon}`)
      .then(r => r.json())
      .then(d => { if (d?.score != null) setHeroSkyScore(d); })
      .catch(() => {});
  }, [location.lat, location.lon]);

  const stepIcons = [Telescope, Camera, Star, ShoppingBag];
  const howItWorksSteps = [
    { step: 1, icon: stepIcons[0], title: t('home.steps.observe'), desc: t('home.steps.observeDesc') },
    { step: 2, icon: stepIcons[1], title: t('home.steps.capture'), desc: t('home.steps.captureDesc') },
    { step: 3, icon: stepIcons[2], title: t('home.steps.verify'), desc: t('home.steps.verifyDesc') },
    { step: 4, icon: stepIcons[3], title: t('home.steps.mint'),   desc: t('home.steps.mintDesc') },
  ];

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingRing />
      </div>
    );
  }

  return (
    <>
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

          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .earn-rewards-text {
            background: linear-gradient(135deg, #34d399, #38F0FF, #a78bfa, #34d399);
            background-size: 300% 300%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: gradientShift 6s ease infinite;
          }
          @keyframes twinkleStar {
            0%, 100% { opacity: 0.25; transform: scale(0.7); }
            50% { opacity: 1; transform: scale(1.3); }
          }
          .tagline-star-1 { display: inline-block; animation: twinkleStar 2.1s ease-in-out 0s infinite; }
          .tagline-star-2 { display: inline-block; animation: twinkleStar 2.1s ease-in-out 0.7s infinite; }
          .tagline-star-3 { display: inline-block; animation: twinkleStar 2.1s ease-in-out 1.4s infinite; }
          @keyframes cosmicGlowPulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0), 0 2px 16px rgba(52,211,153,0.06); }
            50% { box-shadow: 0 0 0 4px rgba(52,211,153,0.07), 0 2px 32px rgba(52,211,153,0.18); }
          }
          .step-card-active { animation: cosmicGlowPulse 3s ease-in-out infinite; }
          @keyframes stepContentEnter {
            from { opacity: 0; transform: translateY(10px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          .step-content-enter { animation: stepContentEnter 0.35s cubic-bezier(0.22,1,0.36,1) forwards; }
          @keyframes iconGlow {
            0%, 100% { filter: drop-shadow(0 0 0px rgba(52,211,153,0)); }
            50% { filter: drop-shadow(0 0 8px rgba(52,211,153,0.85)); }
          }
          .step-icon-active { animation: iconGlow 2.2s ease-in-out infinite; }
          @keyframes orbitRing {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes locationGlow {
            0%, 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0), 0 0 0 1px rgba(52,211,153,0.15); }
            50% { box-shadow: 0 0 8px 2px rgba(52,211,153,0.12), 0 0 0 1px rgba(52,211,153,0.35); }
          }
          .location-pill-anim { animation: locationGlow 3s ease-in-out infinite; }
          @keyframes nightSkyHover {
            0% { text-shadow: 0 0 0px rgba(52,211,153,0); }
            100% { text-shadow: 0 0 20px rgba(52,211,153,0.4), 0 0 40px rgba(52,211,153,0.15); }
          }
          .night-sky-text:hover {
            color: #5eead4 !important;
            transition: color 0.3s ease;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-line-1, .hero-line-2, .hero-line-3 { opacity: 1; }
          .typing-dot-1, .typing-dot-2, .typing-dot-3 { opacity: 0.6; }
          .earn-rewards-text {
            background: linear-gradient(135deg, #34d399, #38F0FF);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
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
          minHeight: 'calc(100dvh - 56px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#070B14',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Canvas starfield */}
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        />
        {/* Deep glow orbs */}
        <div style={{
          position: 'absolute', top: '40%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(52,211,153,0.05) 0%, rgba(56,240,255,0.03) 30%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0,
        }} />
        <div style={{
          position: 'absolute', top: '60%', left: '30%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 65%)',
          pointerEvents: 'none', zIndex: 0,
        }} />
        <div style={{
          position: 'absolute', top: '30%', left: '70%',
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56,240,255,0.04) 0%, transparent 65%)',
          pointerEvents: 'none', zIndex: 0,
        }} />

        {/* Hero content — mobile: centered column | lg: two-column */}
        <div className="hero-inner" style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', alignItems: 'center', padding: '16px 16px 32px' }}>
          <style>{`
            .hero-inner { flex-direction: column; text-align: center; justify-content: center; gap: 24px; }
            @media (min-width: 1024px) {
              .hero-inner { flex-direction: row; text-align: left; justify-content: center; gap: 0; max-width: 1000px; margin: 0 auto; width: 100%; padding: 48px 48px 56px; }
              .hero-left { flex: 1; display: flex; flex-direction: column; gap: 22px; align-items: flex-start; padding-right: 56px; }
              .hero-right { width: 340px; flex-shrink: 0; display: flex; flex-direction: column; gap: 16px; }
              .hero-tagline-center { align-self: flex-start !important; }
              .hero-cta-row { justify-content: flex-start !important; }
            }
            @media (max-width: 1023px) {
              .hero-left { display: contents; }
              .hero-right { display: none; }
            }
          `}</style>

          {/* Left: text content */}
          <div className="hero-left">
            {/* Headline */}
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.2rem, 5vw, 3.6rem)',
              fontWeight: 800,
              lineHeight: 1.1,
              margin: 0,
            }}>
              <span className="hero-line-1" style={{ display: 'block', color: 'rgba(255,255,255,0.9)' }}>
                Observe the
              </span>
              <span className="hero-line-2 night-sky-text" style={{ display: 'block', color: '#34d399', cursor: 'default', transition: 'color 0.3s ease' }}>
                Night Sky.
              </span>
              <span className="hero-line-3 earn-rewards-text" style={{ display: 'block' }}>
                Earn rewards.
              </span>
            </h1>

            {/* Tagline */}
            <p className="hero-tagline-center" style={{
              fontSize: 13, fontWeight: 600, letterSpacing: '0.12em',
              color: 'rgba(52,211,153,0.7)', margin: '-8px 0 0', textTransform: 'uppercase',
            }}>
              Observe <span className="tagline-star-1" style={{ color: '#38F0FF', margin: '0 2px' }}>✦</span> Verify <span className="tagline-star-2" style={{ color: '#38F0FF', margin: '0 2px' }}>✦</span> Earn Stars <span className="tagline-star-3" style={{ color: '#38F0FF', margin: '0 2px' }}>✦</span>
            </p>

            {/* Sub-copy */}
            <p style={{ maxWidth: 480, lineHeight: 1.7, color: 'rgba(255,255,255,0.55)', fontSize: 14, margin: 0 }}>
              Observe the night sky. Get AI-verified by ASTRA. Earn Stars tokens and compressed NFTs sealed on Solana — redeemable for real telescopes at Astroman.ge and partner stores worldwide.
            </p>

            <LocationPicker compact />

            {/* CTA row */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div className="hero-cta-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Link href="/missions" className="btn-primary" style={{ textDecoration: 'none' }}>
                  Start Observing →
                </Link>
                <Link href="/sky" className="btn-ghost" style={{ textDecoration: 'none' }}>
                  Tonight&apos;s Sky →
                </Link>
              </div>
            </div>
          </div>

          {/* Right: live stats panel — desktop only */}
          <div className="hero-right">
            {/* Sky score */}
            {heroSkyScore && (
              <div style={{
                padding: '20px 24px', borderRadius: 20,
                background: 'rgba(12,18,33,0.7)',
                backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                border: `1px solid ${heroSkyScore.score >= 70 ? 'rgba(52,211,153,0.2)' : heroSkyScore.score >= 50 ? 'rgba(255,209,102,0.2)' : 'rgba(255,255,255,0.07)'}`,
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 28 }}>{heroSkyScore.emoji}</span>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Sky Score Tonight</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ color: heroSkyScore.score >= 70 ? '#34d399' : heroSkyScore.score >= 50 ? '#FFD166' : 'rgba(255,255,255,0.5)', fontSize: 36, fontWeight: 700, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{heroSkyScore.score}</span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>/100</span>
                    </div>
                    <div style={{ color: heroSkyScore.score >= 70 ? '#34d399' : heroSkyScore.score >= 50 ? '#FFD166' : 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600 }}>{heroSkyScore.grade} conditions</div>
                  </div>
                </div>
                <Link href="/sky" style={{ display: 'block', textAlign: 'center', padding: '8px', borderRadius: 10, background: 'rgba(56,240,255,0.06)', border: '1px solid rgba(56,240,255,0.15)', color: '#38F0FF', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                  Full forecast →
                </Link>
              </div>
            )}

            {/* Top observers */}
            {liveLeaders.length > 0 && (
              <div style={{
                padding: '18px 20px', borderRadius: 20,
                background: 'rgba(12,18,33,0.7)',
                backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Top Observers</span>
                  <Link href="/leaderboard" style={{ color: 'rgba(56,240,255,0.7)', fontSize: 11, textDecoration: 'none' }}>View all →</Link>
                </div>
                {liveLeaders.map((leader, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: i === 0 ? '#FFD166' : 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: 700, width: 16, textAlign: 'center' }}>{i + 1}</span>
                    <span style={{ flex: 1, color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{leader.handle}</span>
                    <span style={{ color: '#FFD166', fontSize: 12, fontWeight: 700 }}>{leader.stars.toLocaleString()} ✦</span>
                  </div>
                ))}
              </div>
            )}

            {/* ASTRA quick link */}
            <Link href="/chat" style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 16,
              background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)',
              textDecoration: 'none', transition: 'border-color 0.2s',
            }}
              onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.4)'; }}
              onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.2)'; }}
            >
              <span style={{ fontSize: 22 }}>🤖</span>
              <div>
                <div style={{ color: '#c4b5fd', fontSize: 13, fontWeight: 700 }}>Ask ASTRA</div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>AI space companion</div>
              </div>
              <span style={{ marginLeft: 'auto', color: 'rgba(124,58,237,0.6)', fontSize: 16 }}>→</span>
            </Link>
          </div>

          {/* Sky Score pill — mobile/tablet only */}
          {heroSkyScore && (
            <div className="lg:hidden" style={{
              display: 'inline-flex', alignItems: 'center', gap: 12,
              padding: '10px 20px', borderRadius: 999,
              background: heroSkyScore.score >= 70 ? 'rgba(52,211,153,0.08)' : heroSkyScore.score >= 50 ? 'rgba(255,209,102,0.08)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${heroSkyScore.score >= 70 ? 'rgba(52,211,153,0.2)' : heroSkyScore.score >= 50 ? 'rgba(255,209,102,0.2)' : 'rgba(255,255,255,0.08)'}`,
            }}>
              <span style={{ fontSize: 16 }}>{heroSkyScore.emoji}</span>
              <span style={{ color: heroSkyScore.score >= 70 ? '#34d399' : heroSkyScore.score >= 50 ? '#FFD166' : 'rgba(255,255,255,0.5)', fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{heroSkyScore.score}</span>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600 }}>{heroSkyScore.grade} sky tonight</div>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>Sky Score · Your location</div>
              </div>
            </div>
          )}
        </div>
      </section>


      {/* Remaining sections */}
      <div className="max-w-3xl lg:max-w-5xl w-full mx-auto px-4 lg:px-8 pt-6 pb-8 sm:pb-12 flex flex-col gap-6 sm:gap-8 animate-page-enter" style={{ overflowX: 'clip' }}>

        {/* How It Works — 4 step cards */}
        <div id="how-it-works" className="w-full"
          onMouseEnter={() => { stepPausedRef.current = true; }}
          onMouseLeave={() => { stepPausedRef.current = false; }}
          onTouchStart={() => { stepPausedRef.current = true; }}
        >
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 32, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15))' }} />
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              {t('home.howItWorks')}
            </span>
            <div style={{ width: 32, height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.15), transparent)' }} />
          </div>

          {/* 4 cards — horizontal scroll snap on mobile, 4-in-a-row on sm+ */}
          <style>{`
            .hiw-scroll {
              display: flex;
              gap: 10px;
              overflow-x: auto;
              scroll-snap-type: x mandatory;
              -webkit-overflow-scrolling: touch;
              scrollbar-width: none;
              padding-bottom: 4px;
            }
            .hiw-scroll::-webkit-scrollbar { display: none; }
            @keyframes hiwSlideUp {
              from { opacity: 0; transform: translateY(16px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .hiw-card {
              flex: 0 0 72%;
              scroll-snap-align: center;
              min-height: 172px;
            }
            @media (min-width: 640px) {
              .hiw-scroll {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                overflow-x: visible;
                scroll-snap-type: none;
              }
              .hiw-card { flex: none; }
            }
          `}</style>

          <div className="hiw-scroll">
            {howItWorksSteps.map((item, i) => {
              const active = activeStep === i;
              return (
                <button
                  key={i}
                  className="hiw-card"
                  onClick={() => { setActiveStep(i); stepPausedRef.current = true; }}
                  style={{
                    position: 'relative',
                    padding: '22px 18px 24px',
                    borderRadius: 16,
                    background: 'rgba(12, 18, 33, 0.6)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: `1px solid ${active ? 'rgba(56, 240, 255, 0.25)' : 'var(--stellar-border)'}`,
                    boxShadow: active
                      ? 'inset 0 1px 0 rgba(255,255,255,0.03), 0 0 20px rgba(56,240,255,0.06), 0 0 40px rgba(56,240,255,0.03)'
                      : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0,
                    transition: 'border-color 0.5s, box-shadow 0.5s, transform 0.3s ease',
                    transform: active ? 'translateY(-2px)' : 'translateY(0)',
                    opacity: 0,
                    animation: `hiwSlideUp 0.6s ease forwards`,
                    animationDelay: `${i * 0.12}s`,
                  }}
                >
                  {/* Step badge */}
                  <span style={{
                    display: 'inline-block',
                    fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
                    padding: '2px 8px', borderRadius: 6,
                    background: 'linear-gradient(135deg, rgba(153,69,255,0.15), rgba(56,240,255,0.15))',
                    color: 'rgba(255,255,255,0.75)',
                    marginBottom: 14,
                    alignSelf: 'flex-start',
                  }}>
                    0{i + 1}
                  </span>

                  {/* Icon circle */}
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: 'radial-gradient(circle, rgba(56,240,255,0.08) 0%, transparent 70%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 14,
                    transition: 'background 0.4s ease',
                  }}>
                    <item.icon
                      size={20}
                      color={active ? 'rgba(56,240,255,1)' : 'rgba(56,240,255,0.5)'}
                      strokeWidth={1.5}
                      style={{ transition: 'color 0.4s ease' }}
                    />
                  </div>

                  {/* Text */}
                  <p style={{
                    color: active ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.6)',
                    fontWeight: 600, fontSize: 14, margin: '0 0 6px',
                    fontFamily: 'var(--font-display)',
                    transition: 'color 0.3s',
                  }}>{item.title}</p>
                  <p style={{
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: 12, lineHeight: 1.55, margin: 0,
                  }}>{item.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Progress dots */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 }}>
            {howItWorksSteps.map((_, i) => (
              <div
                key={i}
                onClick={() => { setActiveStep(i); stepPausedRef.current = true; }}
                style={{
                  width: activeStep === i ? 20 : 8,
                  height: 8,
                  borderRadius: 4,
                  cursor: 'pointer',
                  background: activeStep === i ? 'var(--stellar-teal)' : 'rgba(255,255,255,0.15)',
                  transition: 'width 0.3s ease, background 0.3s ease',
                }}
              />
            ))}
          </div>
        </div>

        {/* Section separator */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, margin: '-4px 0' }}>
          <div style={{ width: 1, height: 32, background: 'linear-gradient(to bottom, transparent, rgba(56,240,255,0.15), transparent)' }} />
        </div>

        {/* Tonight's Sky Preview Strip */}
        <div style={{
          width: '100%',
          position: 'relative',
          borderRadius: 20,
          background: 'rgba(12, 18, 33, 0.4)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid var(--stellar-border)',
          boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
          padding: 24,
          overflow: 'hidden',
        }}>
          {/* Ambient pseudo-glow via absolute divs */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
            background: 'var(--stellar-gradient-sol)',
            borderRadius: 20,
          }} />
          <div style={{
            position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%',
            background: 'radial-gradient(circle at 30% 40%, rgba(56,240,255,0.02) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(153,69,255,0.015) 0%, transparent 50%)',
            pointerEvents: 'none', zIndex: 0,
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.375rem', fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>
                  Tonight&apos;s Sky
                </h2>
                {/* Redesigned Live badge */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 10px', borderRadius: 999,
                  background: 'rgba(52, 211, 153, 0.1)',
                  border: '1px solid rgba(52, 211, 153, 0.2)',
                  fontSize: 11, letterSpacing: '0.05em',
                  color: 'rgba(52, 211, 153, 0.9)',
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#34d399', flexShrink: 0,
                    animation: 'livePulse 2s ease-in-out infinite',
                  }} />
                  Live
                </span>
              </div>
              <Link href="/sky" style={{ color: 'var(--stellar-teal)', fontSize: 13, textDecoration: 'none', fontFamily: 'var(--font-display)', fontWeight: 500 }}>
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
          </div>{/* end z-index relative */}
        </div>{/* end Tonight's Sky container */}

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
              {leadersLoading ? (
                [0,1,2].map(i => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                    <div style={{ width: 20, height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.05)', animation: 'pulse 2s ease-in-out infinite' }} />
                    <div style={{ flex: 1, height: 13, borderRadius: 4, background: 'rgba(255,255,255,0.04)', animation: 'pulse 2s ease-in-out infinite' }} />
                    <div style={{ width: 60, height: 11, borderRadius: 4, background: 'rgba(255,255,255,0.03)', animation: 'pulse 2s ease-in-out infinite' }} />
                  </div>
                ))
              ) : liveLeaders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                  No observers yet — be the first!
                </div>
              ) : (
                liveLeaders.map((entry, i) => {
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <div key={entry.handle} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 16 }}>{medals[i]}</span>
                      <span style={{ color: 'white', fontSize: 13, flex: 1, fontFamily: 'var(--font-mono)' }}>{entry.handle}</span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{entry.observations} obs · {entry.stars} ✦</span>
                    </div>
                  );
                })
              )}
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
              <p style={{ color: 'var(--stars)', fontWeight: 700, fontSize: 24, margin: 0, fontFamily: 'var(--font-mono)' }}>{homeStarsLoaded ? `${homeStars} ✦` : '— ✦'}</p>
            </div>
            <div style={{ flex: 1, minWidth: 160, maxWidth: 280 }}>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '0 0 6px 0' }}>
                {homeStars >= 250 ? 'Next reward at 500 ✦' : homeStars >= 50 ? 'Next reward at 250 ✦' : 'Next reward at 50 ✦'}
              </p>
              <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 999 }}>
                <div style={{ width: `${Math.min(100, Math.round((homeStars / 50) * 100))}%`, height: '100%', background: '#34d399', borderRadius: 999 }} />
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
      <AstraQuickAsk />
    </>
  );
}
