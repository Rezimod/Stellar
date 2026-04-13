'use client';

import { useState, useEffect } from 'react';
import { Telescope } from 'lucide-react';
import { useAppState } from '@/hooks/useAppState';
import { usePrivy } from '@privy-io/react-auth';
import { useLocale } from 'next-intl';
import StatsBar from '@/components/sky/StatsBar';
import MissionList from '@/components/sky/MissionList';
import MissionActive from '@/components/sky/MissionActive';
import ObservationLog from '@/components/sky/ObservationLog';
import RewardsSection from '@/components/sky/RewardsSection';
import QuizActive from '@/components/sky/QuizActive';
import { QUIZZES } from '@/lib/quizzes';
import { MISSIONS } from '@/lib/constants';
import type { Mission } from '@/lib/types';
import type { QuizDef } from '@/lib/quizzes';
import PageTransition from '@/components/ui/PageTransition';
import { Badge } from '@/components/ui/Badge';
import { SkyBadge } from '@/components/ui/SkyBadge';
import { Button } from '@/components/ui/Button';
import BackButton from '@/components/shared/BackButton';

// Deterministic star field (avoids hydration mismatch)
const STARFIELD = Array.from({ length: 26 }, (_, i) => ({
  left: `${(i * 37 + 13) % 100}%`,
  top:  `${(i * 53 + 7)  % 100}%`,
  size: i % 3 === 0 ? 2 : 1.5,
  delay:    `${((i * 3) % 9) * 0.33}s`,
  duration: `${3 + (i % 3)}s`,
}));

export default function MissionsPage() {
  const { state } = useAppState();
  const { authenticated, login } = usePrivy();
  const locale = useLocale() === 'ka' ? 'ka' : 'en';
  const [activeQuiz, setActiveQuiz] = useState<QuizDef | null>(null);
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [skyConditions, setSkyConditions] = useState<{ cloudCover: number; visibility: string; verified: boolean } | null>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    fetch('/api/sky/verify?lat=41.6938&lon=44.8015')
      .then(r => r.json())
      .then(d => setSkyConditions({ cloudCover: d.cloudCover, visibility: d.visibility, verified: d.verified }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!authenticated || !state.walletAddress) return;
    fetch(`/api/streak?walletAddress=${encodeURIComponent(state.walletAddress)}`)
      .then(r => r.json())
      .then(d => setStreak(d.streak ?? 0))
      .catch(() => {});
  }, [authenticated, state.walletAddress]);

  // Derive condition from cloud cover + verified flag
  const skyCondition: 'go' | 'maybe' | 'skip' = skyConditions
    ? skyConditions.verified
      ? skyConditions.cloudCover < 30 ? 'go' : 'maybe'
      : 'skip'
    : 'maybe';

  // ── Unauthenticated: lock screen ──────────────────────────────────────────
  if (!authenticated) {
    return (
      <div
        className="min-h-[calc(100vh-56px)] flex items-center justify-center relative overflow-hidden"
        style={{ background: 'var(--color-space-black, #050A12)' }}
      >
        {/* Star field */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {STARFIELD.map((s, i) => (
            <span
              key={i}
              style={{
                position: 'absolute',
                left: s.left,
                top: s.top,
                width: s.size,
                height: s.size,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.35)',
                animation: `breathe ${s.duration} ease-in-out ${s.delay} infinite`,
                display: 'block',
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center gap-5 text-center px-6 max-w-xs animate-fade-in-scale">
          <Telescope
            size={48}
            strokeWidth={1.25}
            style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.25))' }}
          />
          <div className="flex flex-col gap-2">
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'var(--text-xl)',
                color: 'var(--color-text-primary)',
                lineHeight: 1.2,
              }}
            >
              Sign in to start observing
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              Complete sky missions, earn Stars, and collect discovery NFTs
            </p>
          </div>
          <Button variant="primary" size="lg" onClick={login}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  // ── Authenticated ─────────────────────────────────────────────────────────
  const conditionLabel = {
    go:    'Great night to observe!',
    maybe: 'Partly cloudy tonight',
    skip:  'Check back tomorrow',
  }[skyCondition];

  const conditionTextColor = {
    go:    'var(--color-aurora-green, #34D399)',
    maybe: 'var(--color-solar-amber, #F59E0B)',
    skip:  'var(--color-text-muted)',
  }[skyCondition];

  return (
    <PageTransition>
      <>
        {activeMission && <MissionActive mission={activeMission} onClose={() => setActiveMission(null)} />}
        {activeQuiz    && <QuizActive    quiz={activeQuiz}       onClose={() => setActiveQuiz(null)} />}

        {/* SECTION 1 — Stats Bar (sticky) */}
        <StatsBar streak={streak} />

        <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-6">
          <BackButton />

          {/* SECTION 2 — Tonight's Conditions */}
          <div
            className={skyCondition === 'go' ? 'animate-pulse-green' : ''}
            style={{
              background: 'var(--glass-bg, rgba(15,29,50,0.65))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: `1px solid ${skyCondition === 'go' ? 'rgba(52,211,153,0.28)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 16,
              padding: 14,
            }}
          >
            <div className="flex items-center justify-between gap-3 flex-wrap" style={{ rowGap: 6 }}>
              <div className="flex items-center gap-3 flex-wrap" style={{ rowGap: 4 }}>
                <SkyBadge condition={skyCondition} />
                {skyConditions && (
                  <>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.6875rem' }}>
                      {skyConditions.cloudCover}% cloud
                    </span>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.6875rem' }}>
                      {skyConditions.visibility}
                    </span>
                  </>
                )}
              </div>
              <span style={{ color: conditionTextColor, fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>
                {conditionLabel}
              </span>
            </div>
          </div>

          {/* SECTION 3 — Sky Missions */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)' }}>
                Sky Missions
              </h2>
              <Badge variant="teal" size="sm">{MISSIONS.length}</Badge>
            </div>
            <MissionList onStart={setActiveMission} />
          </section>

          {/* SECTION 4 — Knowledge Quizzes */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)' }}>
                Test Your Knowledge
              </h2>
              <Badge variant="gold" size="sm">{QUIZZES.length}</Badge>
            </div>
            <div
              className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
              style={{ marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16 }}
            >
              {QUIZZES.map(quiz => {
                const bestResult = [...(state.completedQuizzes ?? [])]
                  .filter(r => r.quizId === quiz.id)
                  .sort((a, b) => b.score - a.score)[0];
                const pct  = bestResult ? Math.round((bestResult.score / bestResult.total) * 100) : null;
                const done = pct === 100;

                return (
                  <div
                    key={quiz.id}
                    className="flex-shrink-0 flex flex-col gap-3"
                    style={{
                      width: 180,
                      background: 'var(--color-card-surface, #0F1D32)',
                      border: done
                        ? '1px solid rgba(255,209,102,0.25)'
                        : '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 16,
                      padding: 16,
                      boxShadow: done ? 'var(--shadow-glow-gold)' : 'var(--shadow-card)',
                      cursor: 'pointer',
                      transition: 'transform 200ms ease-out',
                    }}
                  >
                    <span style={{ fontSize: 28 }}>{quiz.emoji}</span>
                    <div>
                      <p style={{ color: 'var(--color-text-primary)', fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.3 }}>
                        {quiz.title[locale]}
                      </p>
                      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.6875rem', marginTop: 2 }}>
                        10 questions
                      </p>
                      <p style={{ color: 'var(--color-star-gold, #FFD166)', fontSize: '0.6875rem', fontWeight: 700, marginTop: 3 }}>
                        ✦ 100 Stars
                      </p>
                    </div>

                    {bestResult && (
                      <div>
                        <div style={{ height: 3, borderRadius: 9999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: done ? 'linear-gradient(to right, #CC9A33, #FFD166)' : '#38F0FF',
                            borderRadius: 9999,
                          }} />
                        </div>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.6875rem', marginTop: 4 }}>
                          {bestResult.score}/{bestResult.total}
                        </p>
                      </div>
                    )}

                    <Button
                      variant={done ? 'secondary' : 'primary'}
                      size="sm"
                      fullWidth
                      onClick={() => setActiveQuiz(quiz)}
                    >
                      {done ? 'Retry' : bestResult ? 'Continue' : 'Start Quiz'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SECTION 5 — Rewards */}
          <section>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'var(--text-lg)',
                color: 'var(--color-text-primary)',
                marginBottom: 12,
              }}
            >
              Rewards
            </h2>
            <RewardsSection />
          </section>

          {/* SECTION 6 — Recent Activity Log */}
          <ObservationLog />
        </div>
      </>
    </PageTransition>
  );
}
