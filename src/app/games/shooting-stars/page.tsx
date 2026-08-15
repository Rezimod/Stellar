'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useTranslations } from 'next-intl';
import { Star, Zap, ChevronLeft, RefreshCw } from 'lucide-react';
import { useStellarUser } from '@/hooks/useStellarUser';
import { scoreToStars, SHOOTING_STARS_DURATION, SHOOTING_STARS_SPAWN_MS } from '@/lib/games/shooting-stars';

const KEYFRAMES = `
@keyframes meteor-fly {
  from { transform: translateX(0); opacity: 1; }
  75%  { opacity: 1; }
  to   { transform: translateX(var(--d)); opacity: 0; }
}
@keyframes score-pop {
  0%   { transform: translate(-50%, 0) scale(1); opacity: 1; }
  60%  { transform: translate(-50%, -32px) scale(1.3); opacity: 1; }
  100% { transform: translate(-50%, -52px) scale(0.8); opacity: 0; }
}
@keyframes twinkle {
  0%, 100% { opacity: var(--op); }
  50%       { opacity: calc(var(--op) * 0.3); }
}
@keyframes game-in {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

interface Meteor {
  id: number;
  top: number;
  left: number;
  angle: number;
  dist: number;
  dur: number;
  caught: boolean;
}

interface PopUp {
  id: number;
  x: number;
  y: number;
}

type Phase = 'intro' | 'playing' | 'done';

const BG = 'linear-gradient(180deg, #030711 0%, #060B1A 50%, #0A1128 100%)';

// Returns 0-99 clamped score — max theoretical is ~46 meteors in 30 s
function clampScore(n: number) {
  return Math.max(0, Math.min(99, Math.floor(n)));
}

export default function ShootingStarsPage() {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const { address } = useStellarUser();
  const t = useTranslations('games.shootingStars');

  const [phase, setPhase] = useState<Phase>('intro');
  const [timeLeft, setTimeLeft] = useState(SHOOTING_STARS_DURATION);
  const [score, setScore] = useState(0);
  const [meteors, setMeteors] = useState<Meteor[]>([]);
  const [popUps, setPopUps] = useState<PopUp[]>([]);
  const [result, setResult] = useState<{ stars: number; already: boolean } | null>(null);

  const scoreRef = useRef(0);
  const nextId = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Deterministic-ish bg stars (SSR-safe: no Math.random at render time)
  const bgStars = useMemo(() =>
    Array.from({ length: 90 }, (_, i) => {
      const seed = (i * 6364136223846793005 + 1442695040888963407) & 0x7fffffff;
      const seed2 = (seed * 6364136223846793005 + 1442695040888963407) & 0x7fffffff;
      const seed3 = (seed2 * 6364136223846793005 + 1442695040888963407) & 0x7fffffff;
      const seed4 = (seed3 * 6364136223846793005 + 1442695040888963407) & 0x7fffffff;
      return {
        id: i,
        cx: (seed % 10000) / 100,
        cy: (seed2 % 10000) / 100,
        r: 0.4 + (seed3 % 100) / 80,
        op: 0.12 + (seed4 % 100) / 240,
        delay: (i * 379) % 4000,
        dur: 2500 + (seed % 2000),
      };
    }),
  []);

  const spawnMeteor = useCallback(() => {
    const id = nextId.current++;
    // Use Math.random only during gameplay (client-only, safe)
    const top = 5 + Math.random() * 58;
    const left = 4 + Math.random() * 52;
    const angle = -18 + Math.random() * 40;
    const dist = 190 + Math.random() * 130;
    const dur = 1600 + Math.random() * 700;

    setMeteors((prev) => [...prev, { id, top, left, angle, dist, dur, caught: false }]);

    setTimeout(() => {
      setMeteors((prev) => prev.filter((m) => m.id !== id));
    }, dur + 300);
  }, []);

  const start = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (spawnRef.current) clearInterval(spawnRef.current);

    scoreRef.current = 0;
    setScore(0);
    setTimeLeft(SHOOTING_STARS_DURATION);
    setMeteors([]);
    setPopUps([]);
    setResult(null);
    setPhase('playing');

    spawnMeteor();
    spawnRef.current = setInterval(spawnMeteor, SHOOTING_STARS_SPAWN_MS);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          clearInterval(spawnRef.current!);
          timerRef.current = null;
          spawnRef.current = null;
          setMeteors([]);
          setPhase('done');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [spawnMeteor]);

  const catchMeteor = useCallback((id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setMeteors((prev) => {
      const m = prev.find((x) => x.id === id);
      if (!m || m.caught) return prev;
      return prev.map((x) => (x.id === id ? { ...x, caught: true } : x));
    });
    scoreRef.current += 1;
    setScore(scoreRef.current);

    const popId = nextId.current++;
    const pop: PopUp = { id: popId, x: e.clientX, y: e.clientY };
    setPopUps((prev) => [...prev, pop]);
    setTimeout(() => setPopUps((prev) => prev.filter((p) => p.id !== popId)), 700);
  }, []);

  // Submit once when game ends
  useEffect(() => {
    if (phase !== 'done' || result !== null) return;
    const s = clampScore(scoreRef.current);
    const starsLocal = scoreToStars(s);

    if (!address) {
      setResult({ stars: starsLocal, already: false });
      return;
    }

    (async () => {
      try {
        const token = await getAccessToken().catch(() => null);
        const res = await fetch('/api/games/shooting-stars/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ wallet: address, score: s }),
        });
        const d = res.ok ? await res.json() : null;
        setResult({ stars: d?.starsAwarded ?? starsLocal, already: d?.alreadyPlayed ?? false });
      } catch {
        setResult({ stars: starsLocal, already: false });
      }
    })();
  }, [phase, result, address, getAccessToken]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (spawnRef.current) clearInterval(spawnRef.current);
  }, []);

  const timerPct = (timeLeft / SHOOTING_STARS_DURATION) * 100;
  const timerColor = timeLeft > 10 ? 'var(--seafoam, #5EEAD4)' : '#F97316';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: BG,
        overflow: 'hidden',
        fontFamily: 'var(--font-body, system-ui, sans-serif)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Static starfield */}
      <svg
        aria-hidden
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        {bgStars.map((s) => (
          <circle
            key={s.id}
            cx={`${s.cx}%`}
            cy={`${s.cy}%`}
            r={s.r}
            fill="white"
            style={{
              opacity: s.op,
              animation: `twinkle ${s.dur}ms ease-in-out ${s.delay}ms infinite`,
              ['--op' as string]: s.op,
            } as React.CSSProperties}
          />
        ))}
      </svg>

      {/* Back button */}
      <button
        type="button"
        onClick={() => router.push('/missions')}
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 24,
          color: 'rgba(255,255,255,0.6)',
          fontSize: 13,
          fontWeight: 500,
          padding: '6px 14px 6px 10px',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
        }}
      >
        <ChevronLeft size={15} strokeWidth={2} />
        {t('back')}
      </button>

      {/* ─── Intro ─── */}
      {phase === 'intro' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 32px', animation: 'game-in 0.5s ease both' }}>
          <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 20 }} aria-hidden>✦</div>
          <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', textAlign: 'center', marginBottom: 10 }}>
            {t('title')}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, textAlign: 'center', lineHeight: 1.55, maxWidth: 300, marginBottom: 40 }}>
            {t('tagline')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 280, marginBottom: 36 }}>
            {[
              { stars: '1–4',  reward: '3 ★' },
              { stars: '5–9',  reward: '5 ★' },
              { stars: '10–14',reward: '8 ★' },
              { stars: '15+',  reward: '10 ★' },
            ].map((row) => (
              <div
                key={row.stars}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10,
                  padding: '9px 16px',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 14,
                }}
              >
                <span>{t('scoreLabel')} {row.stars}</span>
                <span style={{ color: '#FFD36B', fontWeight: 700 }}>{row.reward}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={start}
            style={{
              width: '100%',
              maxWidth: 280,
              padding: '16px 24px',
              background: 'linear-gradient(135deg, #5EEAD4 0%, #3BB8A0 100%)',
              border: 'none',
              borderRadius: 14,
              color: '#0A1128',
              fontSize: 17,
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '-0.01em',
              boxShadow: '0 8px 24px -4px rgba(94,234,212,0.35)',
            }}
          >
            {t('play')} — {SHOOTING_STARS_DURATION}s
          </button>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 16, textAlign: 'center' }}>
            {t('oncePerDay')}
          </p>
        </div>
      )}

      {/* ─── Game ─── */}
      {phase === 'playing' && (
        <>
          {/* HUD */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '52px 20px 0' }}>
            {/* Timer bar */}
            <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
              <div
                style={{
                  height: '100%',
                  width: `${timerPct}%`,
                  background: timerColor,
                  borderRadius: 4,
                  transition: 'width 1s linear, background 0.5s',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: timerColor, fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', transition: 'color 0.5s' }}>
                {timeLeft}s
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#FFD36B', fontSize: 20, fontWeight: 700 }}>
                <Star size={16} strokeWidth={2} fill="currentColor" />
                {score}
              </span>
            </div>
          </div>

          {/* Meteor field */}
          <div style={{ position: 'absolute', inset: 0 }} aria-hidden>
            {meteors.filter((m) => !m.caught).map((m) => (
              <div
                key={m.id}
                style={{
                  position: 'absolute',
                  top: `${m.top}%`,
                  left: `${m.left}%`,
                  transform: `rotate(${m.angle}deg)`,
                  transformOrigin: 'left center',
                  pointerEvents: 'none',
                }}
              >
                <button
                  type="button"
                  aria-label={t('catchLabel')}
                  style={{
                    display: 'block',
                    width: 96,
                    height: 28,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '6px 0',
                    pointerEvents: 'auto',
                    animation: `meteor-fly ${m.dur}ms linear forwards`,
                    ['--d' as string]: `${m.dist}px`,
                  } as React.CSSProperties}
                  onClick={(e) => catchMeteor(m.id, e)}
                >
                  {/* Streak */}
                  <div
                    style={{
                      width: '100%',
                      height: 3,
                      borderRadius: '0 2px 2px 0',
                      background: 'linear-gradient(to right, transparent 0%, rgba(255,220,130,0.4) 55%, rgba(255,235,160,0.85) 80%, #FFFFFF 100%)',
                    }}
                  />
                </button>
              </div>
            ))}
          </div>

          {/* Instruction overlay (first 5 seconds hint) */}
          {timeLeft > 25 && (
            <div style={{ position: 'absolute', bottom: 60, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none', animation: 'game-in 0.4s ease both' }}>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>
                {t('tapHint')}
              </span>
            </div>
          )}
        </>
      )}

      {/* ─── Done ─── */}
      {phase === 'done' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 32px', animation: 'game-in 0.5s ease both' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }} aria-hidden>
            {score >= 15 ? '🌟' : score >= 10 ? '✨' : score >= 5 ? '⭐' : '💫'}
          </div>

          <h2 style={{ color: '#fff', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
            {score} {t('caught')}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 32 }}>
            {t('outOf', { total: '~46' })}
          </p>

          {result ? (
            <div style={{
              background: 'rgba(255,211,107,0.08)',
              border: '1px solid rgba(255,211,107,0.2)',
              borderRadius: 16,
              padding: '20px 32px',
              textAlign: 'center',
              marginBottom: 32,
              minWidth: 200,
            }}>
              {result.already ? (
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>{t('alreadyPlayed')}</p>
              ) : result.stars > 0 ? (
                <>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#FFD36B', fontSize: 36, fontWeight: 800 }}>
                    +{result.stars}
                    <Star size={28} strokeWidth={2} fill="currentColor" />
                  </span>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 6 }}>{t('starsEarned')}</p>
                </>
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>{t('noCatch')}</p>
              )}
            </div>
          ) : (
            <div style={{ marginBottom: 32, color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
              <Zap size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              {t('saving')}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 280 }}>
            <button
              type="button"
              onClick={() => router.push('/missions')}
              style={{
                flex: 1,
                padding: '14px 0',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12,
                color: 'rgba(255,255,255,0.7)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('missions')}
            </button>
            {!result?.already && (
              <button
                type="button"
                onClick={start}
                style={{
                  flex: 1,
                  padding: '14px 0',
                  background: 'linear-gradient(135deg, #5EEAD4 0%, #3BB8A0 100%)',
                  border: 'none',
                  borderRadius: 12,
                  color: '#0A1128',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <RefreshCw size={14} strokeWidth={2.5} />
                {t('tryAgain')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Score pop-ups (fixed viewport coords) */}
      {popUps.map((p) => (
        <div
          key={p.id}
          aria-hidden
          style={{
            position: 'fixed',
            left: p.x,
            top: p.y,
            pointerEvents: 'none',
            zIndex: 99,
            color: '#FFD36B',
            fontSize: 20,
            fontWeight: 800,
            textShadow: '0 0 12px rgba(255,211,107,0.8)',
            animation: 'score-pop 0.7s ease-out forwards',
          }}
        >
          +1
        </div>
      ))}
    </div>
  );
}
