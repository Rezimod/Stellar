'use client';

import { useState, useEffect } from 'react';
import { getActiveChallenge, getChallengeProgress, claimChallengeReward } from '@/lib/celestial-challenges';
import { Satellite, Lock } from 'lucide-react';
import BackButton from '@/components/shared/BackButton';
import { useAppState } from '@/hooks/useAppState';
import { usePrivy } from '@privy-io/react-auth';
import { useLocale, useTranslations } from 'next-intl';
import { useLocation } from '@/lib/location';
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
import { MissionIcon } from '@/components/shared/PlanetIcons';
import { TelescopeIcon, StarTokenIcon, DifficultyDots } from '@/components/icons/CelestialIcons';
import DailyCheckIn from '@/components/dashboard/DailyCheckIn';
import LocationPicker from '@/components/LocationPicker';

export default function MissionsPage() {
  const { state } = useAppState();
  const { authenticated, login } = usePrivy();
  const locale = useLocale() === 'ka' ? 'ka' : 'en';
  const t = useTranslations('missions');
  const { location } = useLocation();
  const [activeQuiz, setActiveQuiz] = useState<QuizDef | null>(null);
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [skyConditions, setSkyConditions] = useState<{ cloudCover: number; visibility: string; verified: boolean } | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [isNight, setIsNight] = useState(false);
  const [skyTimeout, setSkyTimeout] = useState(false);
  const [activeChallenge] = useState(() => getActiveChallenge());
  const [chProgress, setChProgress] = useState(() => getChallengeProgress());
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
    const timer = setTimeout(() => setSkyTimeout(true), 10000);
    fetch(`/api/sky/verify?lat=${location.lat}&lon=${location.lon}`)
      .then(r => r.json())
      .then(d => {
        setSkyConditions({ cloudCover: d.cloudCover, visibility: d.visibility, verified: d.verified });
        // If verified, we know it's actually night — override the rough time check
        if (d.verified) setIsNight(true);
      })
      .catch(() => {})
      .finally(() => clearTimeout(timer));
    return () => clearTimeout(timer);
  }, [location.lat, location.lon]);

  if (!authenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-3 sm:py-6 animate-page-enter flex flex-col gap-4">
        {/* Sign-in card */}
        <div
          className="rounded-2xl p-5 sm:p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.05), rgba(15,31,61,0.5))',
            border: '1px solid rgba(99,102,241,0.1)',
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 relative"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}
            >
              <TelescopeIcon size={28} animate />
              <span
                className="absolute -top-1 -right-1 text-[10px] leading-none"
                style={{ color: '#FFD166', textShadow: '0 0 6px rgba(255,209,102,0.6)' }}
              >✦</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>{t('title')}</h2>
              <p className="text-slate-500 text-xs mt-0.5">{t('subtitle')}</p>
            </div>
            <button
              onClick={login}
              className="flex-shrink-0 px-4 py-2 rounded-xl font-bold text-xs transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #FFD166, #CC9A33)', color: '#0a0a0a' }}
            >
              {t('signIn')}
            </button>
          </div>
        </div>

        {/* Preview mission list */}
        <div>
          <p className="text-slate-600 text-[11px] uppercase tracking-widest mb-3">{t('availableMissions')}</p>
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
                <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <MissionIcon id={mission.id} size={28}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-400 text-sm font-semibold">{mission.name}</p>
                  <p className="text-slate-600 text-xs mt-0.5 line-clamp-1">{mission.desc}</p>
                  <div className="mt-1.5">
                    <DifficultyDots level={
                      mission.difficulty === 'Beginner' ? 1
                      : mission.difficulty === 'Intermediate' ? 2
                      : mission.difficulty === 'Expert' ? 4
                      : 3
                    }/>
                  </div>
                </div>
                <span className="text-[#FFD166]/40 text-xs font-bold flex-shrink-0 flex items-center gap-0.5"
                  style={{ fontVariantNumeric: 'tabular-nums' }}>
                  +{mission.stars}<StarTokenIcon size={11}/>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tonight's sky */}
        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-slate-600 text-[11px] uppercase tracking-widest mb-3">{t('tonightsSky')}</p>
          {skyConditions ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${skyConditions.verified ? 'bg-[#34d399] animate-pulse' : 'bg-amber-400'}`} />
                <span className="text-white text-sm font-medium">
                  {skyConditions.verified ? t('goodConditions') : t('cloudyTonight')}
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
    <PageTransition>
      <>
      {activeMission && <MissionActive mission={activeMission} onClose={() => { setActiveMission(null); setChProgress(getChallengeProgress()); }} />}
      {activeQuiz && <QuizActive quiz={activeQuiz} onClose={() => setActiveQuiz(null)} />}

      <div className="max-w-2xl mx-auto px-4 py-3 sm:py-6 flex flex-col gap-3">
        <BackButton />
        {location.source === 'default' && (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: 'var(--warning)' }}>
            <span>{t('approximateLocation')}</span>
            <LocationPicker compact />
          </div>
        )}
        <DailyCheckIn lat={location.lat ?? 41.6941} lon={location.lon ?? 44.8337} />
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Satellite size={16} strokeWidth={1.5} className="text-[#818cf8]" />
            <h1 className="text-xl sm:text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              {t('title')}
            </h1>
          </div>

          <div className="flex items-center gap-2 mb-3">
            {skyConditions ? (
              <>
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${skyConditions.verified ? 'bg-[#34d399] animate-pulse' : 'bg-amber-400'}`} />
                <span className="text-[11px] text-slate-500">
                  {skyConditions.verified
                    ? `Clear sky tonight · ${skyConditions.cloudCover}% cloud · ${skyConditions.visibility}`
                    : `Cloudy tonight · ${skyConditions.cloudCover}% cloud cover`}
                </span>
              </>
            ) : skyTimeout ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-slate-700" />
                <span className="text-[11px] text-slate-500">Sky conditions unavailable — showing all missions</span>
              </>
            ) : (
              <>
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isNight ? 'bg-[#34d399] animate-pulse' : 'bg-slate-700'}`} />
                <span className="text-[11px] text-slate-600">
                  {isNight ? 'Checking sky conditions…' : 'Daytime — come back after sunset'}
                </span>
              </>
            )}
          </div>

          <MissionList onStart={setActiveMission} />

          {/* Weekly challenge strip */}
          <button
            onClick={() => {
              if (chProgress.completed && !chProgress.claimed) {
                const bonus = claimChallengeReward();
                if (bonus > 0 && state.walletAddress) {
                  fetch('/api/award-stars', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ recipientAddress: state.walletAddress, amount: bonus, reason: 'weekly_challenge' }),
                  }).catch(() => {});
                }
                setChProgress(getChallengeProgress());
              }
            }}
            disabled={!(chProgress.completed && !chProgress.claimed)}
            className={`w-full text-left rounded-xl flex items-center gap-3 px-3.5 py-3 mb-3 ${chProgress.completed && !chProgress.claimed ? 'animate-challenge-pulse cursor-pointer' : ''}`}
            style={{
              background: chProgress.claimed
                ? 'rgba(52,211,153,0.04)'
                : 'linear-gradient(90deg, rgba(168,85,247,0.08) 0%, rgba(168,85,247,0.02) 100%)',
              border: chProgress.claimed
                ? '1px solid rgba(52,211,153,0.15)'
                : '1px solid rgba(168,85,247,0.2)',
              borderLeft: `3px solid ${chProgress.claimed ? '#34d399' : '#A855F7'}`,
            }}
          >
            <span style={{ fontSize: 18, color: chProgress.claimed ? '#34d399' : '#A855F7' }}>
              {chProgress.claimed ? '✓' : activeChallenge.glyph}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: chProgress.claimed ? '#34d399' : '#A855F7' }}>
                  This Week
                </span>
                <span className="text-xs font-semibold text-white truncate">{activeChallenge.name}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (chProgress.progress / activeChallenge.goal) * 100)}%`,
                      background: chProgress.completed ? '#34d399' : 'linear-gradient(90deg, #A855F7, #FFD166)',
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono flex-shrink-0" style={{ color: chProgress.completed ? '#34d399' : 'rgba(255,255,255,0.4)' }}>
                  {chProgress.progress}/{activeChallenge.goal}
                </span>
              </div>
            </div>
            <div className="flex-shrink-0 text-right">
              {chProgress.completed && !chProgress.claimed ? (
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'linear-gradient(135deg, #FFD166, #CC9A33)', color: '#0a0a0a' }}>
                  Claim +{activeChallenge.bonusStars}
                </span>
              ) : chProgress.claimed ? (
                <span className="text-[10px] text-[#34d399]">Claimed</span>
              ) : (
                <span className="text-[10px] text-slate-500">+{activeChallenge.bonusStars} ✦</span>
              )}
            </div>
          </button>
          <StatsBar />
        </section>

        {/* Quiz Missions */}
        <section>
          <h2 className="text-[11px] uppercase tracking-widest mb-3 mt-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-secondary)' }}>{t('knowledgeQuizzes')}</h2>
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
                      style={{ background: 'linear-gradient(135deg, #FFD166, #CC9A33)', color: '#0a0a0a' }}
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
    </PageTransition>
  );
}
