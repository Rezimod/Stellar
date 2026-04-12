'use client';

import { useState, useEffect } from 'react';
import { Satellite, Lock } from 'lucide-react';
import BackButton from '@/components/shared/BackButton';
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

export default function MissionsPage() {
  const { state } = useAppState();
  const { authenticated, login } = usePrivy();
  const locale = useLocale() === 'ka' ? 'ka' : 'en';
  const [activeQuiz, setActiveQuiz] = useState<QuizDef | null>(null);
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [skyConditions, setSkyConditions] = useState<{ cloudCover: number; visibility: string; verified: boolean } | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [isNight, setIsNight] = useState(false);

  useEffect(() => {
    const h = new Date().getHours();
    setIsNight(h >= 18 || h < 5);
  }, []);

  useEffect(() => {
    if (!authenticated || !state.walletAddress) return;
    fetch(`/api/streak?walletAddress=${encodeURIComponent(state.walletAddress)}`)
      .then(r => r.json())
      .then(d => setStreak(d.streak ?? 0))
      .catch(() => {});
  }, [authenticated, state.walletAddress]);

  useEffect(() => {
    if (authenticated) return;
    fetch('/api/sky/verify?lat=41.6938&lon=44.8015')
      .then(r => r.json())
      .then(d => setSkyConditions({ cloudCover: d.cloudCover, visibility: d.visibility, verified: d.verified }))
      .catch(() => {});
  }, [authenticated]);

  if (!authenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-3 sm:py-6 animate-page-enter flex flex-col gap-4">
        {/* Sign-in card */}
        <div
          className="rounded-2xl p-5 sm:p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(56,240,255,0.05), rgba(15,31,61,0.5))',
            border: '1px solid rgba(56,240,255,0.1)',
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(56,240,255,0.08)', border: '1px solid rgba(56,240,255,0.15)' }}
            >
              <Satellite size={22} className="text-[#38F0FF]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>Sky Missions</h2>
              <p className="text-slate-500 text-xs mt-0.5">Observe the Moon, Jupiter, Saturn and more. Earn Stars, mint NFTs.</p>
            </div>
            <button
              onClick={login}
              className="flex-shrink-0 px-4 py-2 rounded-xl font-bold text-xs transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #FFD166, #CC9A33)', color: '#070B14' }}
            >
              Sign In →
            </button>
          </div>
        </div>

        {/* Preview mission list */}
        <div>
          <p className="text-slate-600 text-[11px] uppercase tracking-widest mb-3">Available Missions</p>
          <div className="flex flex-col gap-2.5">
            {MISSIONS.map(mission => (
              <div
                key={mission.id}
                className="relative flex items-center gap-4 rounded-2xl px-4 py-3.5 overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="absolute inset-0 bg-[#070B14]/40 backdrop-blur-[1px] z-10 flex items-center justify-end pr-4">
                  <Lock size={13} className="text-slate-600" />
                </div>
                <span className="text-2xl flex-shrink-0">{mission.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-400 text-sm font-semibold">{mission.name}</p>
                  <p className="text-slate-600 text-xs mt-0.5 line-clamp-1">{mission.desc}</p>
                </div>
                <span className="text-[#FFD166]/40 text-xs font-bold flex-shrink-0">+{mission.stars} ✦</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tonight's sky */}
        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-slate-600 text-[11px] uppercase tracking-widest mb-3">Tonight's Sky</p>
          {skyConditions ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${skyConditions.verified ? 'bg-[#34d399] animate-pulse' : 'bg-amber-400'}`} />
                <span className="text-white text-sm font-medium">
                  {skyConditions.verified ? 'Good for observing tonight' : 'Cloudy tonight'}
                </span>
              </div>
              <div className="flex gap-3 text-xs text-slate-500 flex-shrink-0">
                <span>{skyConditions.cloudCover}% cloud</span>
                <span>{skyConditions.visibility}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isNight ? 'bg-[#34d399] animate-pulse' : 'bg-slate-700'}`} />
              {isNight ? (
                <span className="loading-dots"><span></span><span></span><span></span></span>
              ) : (
                <span className="text-slate-500 text-sm">Come back after sunset to observe</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {activeMission && <MissionActive mission={activeMission} onClose={() => setActiveMission(null)} />}
      {activeQuiz && <QuizActive quiz={activeQuiz} onClose={() => setActiveQuiz(null)} />}

      <div className="max-w-2xl mx-auto px-4 py-3 sm:py-6 animate-page-enter flex flex-col gap-3">
        <BackButton />
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Satellite size={16} strokeWidth={1.5} className="text-[#38F0FF]" />
            <h1 className="text-xl sm:text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
              Missions
            </h1>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />
            <span className="text-[11px] text-slate-600">
              {isNight
                ? '🟢 Sky conditions: Good for observing tonight'
                : '☀️ Daytime — come back after sunset'}
            </span>
          </div>

          {streak > 0 && (
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-3"
              style={{
                background: 'rgba(245,158,11,0.12)',
                border: '1px solid rgba(245,158,11,0.25)',
                color: '#F59E0B',
              }}
            >
              <span className="text-xs">🔥</span>
              <span className="text-xs font-medium">{streak} day streak</span>
            </div>
          )}
          <StatsBar />
        </section>

        <MissionList onStart={setActiveMission} />

        {/* Quiz Missions */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">Knowledge Quizzes</h2>
          <div className="flex flex-col gap-2.5">
            {QUIZZES.map(quiz => {
              const bestResult = [...(state.completedQuizzes ?? [])]
                .filter(r => r.quizId === quiz.id)
                .sort((a, b) => b.score - a.score)[0];
              const pct = bestResult ? Math.round((bestResult.score / bestResult.total) * 100) : null;

              return (
                <div
                  key={quiz.id}
                  className="flex items-center gap-4 rounded-2xl px-4 py-3.5"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <span className="text-2xl flex-shrink-0">{quiz.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold leading-snug">{quiz.title[locale]}</p>
                    <p className="text-slate-500 text-xs mt-0.5 leading-snug line-clamp-1">{quiz.description[locale]}</p>
                    {bestResult && (
                      <p className="text-[#FFD166] text-[11px] font-bold mt-1">
                        Best: {bestResult.score}/{bestResult.total} · +{bestResult.stars} ✦
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {pct !== null && (
                      <span className="text-[10px] text-slate-500">{pct}%</span>
                    )}
                    <button
                      onClick={() => setActiveQuiz(quiz)}
                      className="px-3.5 py-2 min-h-[44px] rounded-xl text-[12px] font-bold transition-all active:scale-95 hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #FFD166, #CC9A33)', color: '#070B14' }}
                    >
                      {bestResult ? 'Retry' : 'Start'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <RewardsSection />
        <ObservationLog />
      </div>
    </>
  );
}
