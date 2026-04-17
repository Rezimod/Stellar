'use client';

import { useState, useEffect, useMemo, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import BackButton from '@/components/shared/BackButton';
import { useAppState } from '@/hooks/useAppState';
import { usePrivy } from '@privy-io/react-auth';
import { useLocale, useTranslations } from 'next-intl';
import { useLocation } from '@/lib/location';
import StatsBar from '@/components/sky/StatsBar';
import SkyChart from '@/components/sky/SkyChart';
import PrimeHeroCard from '@/components/sky/PrimeHeroCard';
import MissionListRow from '@/components/sky/MissionListRow';
import JupiterNode from '@/components/sky/chart-nodes/JupiterNode';
import SaturnNode from '@/components/sky/chart-nodes/SaturnNode';
import MoonNode from '@/components/sky/chart-nodes/MoonNode';
import VenusNode from '@/components/sky/chart-nodes/VenusNode';
import MarsNode from '@/components/sky/chart-nodes/MarsNode';
import MercuryNode from '@/components/sky/chart-nodes/MercuryNode';
import PleiadesNode from '@/components/sky/chart-nodes/PleiadesNode';
import OrionNode from '@/components/sky/chart-nodes/OrionNode';
import AndromedaNode from '@/components/sky/chart-nodes/AndromedaNode';
import CrabNode from '@/components/sky/chart-nodes/CrabNode';
import ObservationLog from '@/components/sky/ObservationLog';
import RewardsSection from '@/components/sky/RewardsSection';
import QuizActive from '@/components/sky/QuizActive';
import { getChartDeepSky } from '@/lib/sky-chart';
import { getVisiblePlanets } from '@/lib/planets';
import { QUIZZES } from '@/lib/quizzes';
import { MISSIONS } from '@/lib/constants';
import type { Mission } from '@/lib/types';
import type { QuizDef } from '@/lib/quizzes';
import PageTransition from '@/components/ui/PageTransition';
import { MissionIcon } from '@/components/shared/PlanetIcons';
import { TelescopeIcon, StarTokenIcon, DifficultyDots } from '@/components/icons/CelestialIcons';

export default function MissionsPage() {
  const router = useRouter();
  const { state } = useAppState();
  const { authenticated, login } = usePrivy();
  const locale = useLocale() === 'ka' ? 'ka' : 'en';
  const t = useTranslations('missions');
  const { location } = useLocation();
  const [activeQuiz, setActiveQuiz] = useState<QuizDef | null>(null);
  const [skyConditions, setSkyConditions] = useState<{ cloudCover: number; visibility: string; verified: boolean } | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [isNight, setIsNight] = useState(false);
  const [skyTimeout, setSkyTimeout] = useState(false);
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
      {activeQuiz && <QuizActive quiz={activeQuiz} onClose={() => setActiveQuiz(null)} />}

      <div className="max-w-2xl mx-auto px-4 py-2 flex flex-col gap-3" style={{ fontFamily: 'var(--font-display)' }}>
        <BackButton />

        <ChartSection onStart={(m) => router.push(`/observe/${m.id}`)} />

        <StatsBar />

        {/* Quiz Missions */}
        <section>
          <h2 className="text-[11px] uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--stl-text-muted)' }}>{t('knowledgeQuizzes')}</h2>
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
                    background: 'linear-gradient(135deg, rgba(255,209,102,0.04), rgba(15,20,31,0.5) 60%, rgba(15,20,31,0.2))',
                    border: '1px solid rgba(255,209,102,0.12)',
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: 'radial-gradient(circle at 30% 30%, rgba(255,209,102,0.18), rgba(255,209,102,0.04) 60%, transparent)',
                      border: '1px solid rgba(255,209,102,0.22)',
                    }}
                  >
                    <span className="text-xl">{quiz.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: '#F2F0EA', fontWeight: 600, lineHeight: 1.15 }}>{quiz.title[locale]}</p>
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

const CHARTABLE_IDS = ['moon','jupiter','saturn','venus','mars','mercury','pleiades','orion','andromeda','crab'];
const PRIME_ORDER = ['jupiter','saturn','moon','venus','mars','andromeda','pleiades','orion','crab','mercury'];

const NODE_MAP_FOR_LIST: Record<string, ComponentType<{ size?: number }>> = {
  moon: MoonNode, jupiter: JupiterNode, saturn: SaturnNode,
  venus: VenusNode, mars: MarsNode, mercury: MercuryNode,
  pleiades: PleiadesNode, orion: OrionNode, andromeda: AndromedaNode, crab: CrabNode,
};

const TAGLINES: Record<string, string> = {
  jupiter:   'Four Galilean moons visible',
  saturn:    'Rings at their widest tilt',
  moon:      'Terminator cuts sharp craters',
  venus:     'Brightest object in the sky',
  mars:      'Rust-red and unmistakable',
  mercury:   'Low and fleeting — catch it fast',
  pleiades:  'Seven sisters, one glance',
  orion:     'Stellar nursery, 1,344 ly out',
  andromeda: 'Trillion suns, 2.5M ly away',
  crab:      'Ghost of a 1054 AD supernova',
};

const LIST_META: Record<string, string> = {
  jupiter:   'SE · GAS GIANT · MAG −2.4',
  saturn:    'SE · RINGS WIDE OPEN',
  moon:      'WANING GIBBOUS · 73%',
  venus:     'SW · EVENING STAR',
  mars:      'E · RED PLANET',
  mercury:   'LOW · MAG +0.4',
  pleiades:  'M45 · SEVEN SISTERS',
  orion:     'M42 · NEBULA',
  andromeda: 'M31 · 2.5M LY AWAY',
  crab:      'M1 · SUPERNOVA REMNANT',
};

function ChartSection({ onStart }: { onStart: (m: Mission) => void }) {
  const { state } = useAppState();
  const { location } = useLocation();
  const now = useMemo(() => new Date(), []);
  const lat = location.lat ?? 41.7151;
  const lon = location.lon ?? 44.8271;

  const completedIds = useMemo(
    () => new Set(state.completedMissions.filter(m => m.status === 'completed').map(m => m.id)),
    [state.completedMissions]
  );

  const chartableMissions = useMemo(
    () => MISSIONS.filter(m => CHARTABLE_IDS.includes(m.id)),
    []
  );

  const statusById = useMemo(() => {
    const out: Record<string, {
      aboveHorizon: boolean;
      altitude: number;
      azDir: string;
      peakTime: string | null;
      metaLine: string;
    }> = {};
    const planets = getVisiblePlanets(lat, lon, now);
    for (const p of planets) {
      const aboveHorizon = p.altitude > 0;
      const peakTime = p.transit
        ? (p.transit instanceof Date ? p.transit : new Date(p.transit))
            .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null;
      const riseStr = p.rise
        ? (p.rise instanceof Date ? p.rise : new Date(p.rise))
            .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';
      const metaLine = aboveHorizon
        ? `ALT ${Math.round(p.altitude)}° · ${p.azimuthDir}${peakTime ? ` · PEAKS ${peakTime}` : ''}`
        : riseStr ? `RISES ${riseStr}` : 'BELOW HORIZON';
      out[p.key] = { aboveHorizon, altitude: p.altitude, azDir: p.azimuthDir, peakTime, metaLine };
    }
    const ds = getChartDeepSky(lat, lon, now, 200, 100, 180);
    for (const d of ds) {
      const metaLine = d.aboveHorizon
        ? `ALT ${Math.round(d.altitude)}° · DEEP SKY`
        : 'BELOW HORIZON';
      out[d.id] = {
        aboveHorizon: d.aboveHorizon,
        altitude: d.altitude,
        azDir: '',
        peakTime: null,
        metaLine,
      };
    }
    return out;
  }, [lat, lon, now]);

  const primeMission = useMemo(() => {
    const candidates = chartableMissions
      .filter(m => !completedIds.has(m.id) || m.repeatable)
      .filter(m => statusById[m.id]?.aboveHorizon);
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => PRIME_ORDER.indexOf(a.id) - PRIME_ORDER.indexOf(b.id));
    return candidates[0];
  }, [chartableMissions, completedIds, statusById]);

  const [filter, setFilter] = useState<'visible' | 'all'>('visible');
  const sortedMissions = useMemo(() => {
    let pool = chartableMissions.filter(m => m.id !== primeMission?.id);
    if (filter === 'visible') {
      pool = pool.filter(m => statusById[m.id]?.aboveHorizon);
    }
    pool.sort((a, b) => (statusById[b.id]?.altitude ?? -100) - (statusById[a.id]?.altitude ?? -100));
    return primeMission ? [primeMission, ...pool] : pool;
  }, [chartableMissions, primeMission, filter, statusById]);

  return (
    <div className="flex flex-col gap-0">
      {primeMission && (
        <div className="mb-4">
          <PrimeHeroCard
            mission={primeMission}
            altitude={statusById[primeMission.id]?.altitude ?? null}
            peakTime={statusById[primeMission.id]?.peakTime ?? null}
            tagline={TAGLINES[primeMission.id] ?? primeMission.desc}
            onStart={() => onStart(primeMission)}
          />
        </div>
      )}

      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 20,
              color: '#F2F0EA',
              fontWeight: 600,
              margin: 0,
            }}
          >
            Sky tonight
          </h2>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '0.15em',
            }}
          >
            LIVE · TBILISI
          </span>
        </div>
        <SkyChart
          lat={lat}
          lon={lon}
          date={now}
          missions={chartableMissions.filter(m => statusById[m.id]?.aboveHorizon)}
          primeId={primeMission?.id ?? null}
          onSelect={onStart}
        />
      </div>

      <div
        style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
          margin: '4px 0 16px',
        }}
      />

      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 20,
              color: '#F2F0EA',
              fontWeight: 600,
              margin: 0,
            }}
          >
            Missions tonight
          </h2>
          <div
            className="flex gap-0.5 p-0.5 rounded-md"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {(['visible','all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-2.5 py-1 rounded transition-colors"
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  background: filter === f ? '#F2F0EA' : 'transparent',
                  color: filter === f ? '#0a0a0a' : 'rgba(255,255,255,0.55)',
                }}
              >
                {f === 'visible' ? 'Visible' : 'All'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col">
          {sortedMissions.map(m => {
            const Art = NODE_MAP_FOR_LIST[m.id];
            if (!Art) return null;
            const status = statusById[m.id];
            const isPrime = m.id === primeMission?.id;
            const isDone = completedIds.has(m.id) && !m.repeatable;
            const disabled = isDone || !status?.aboveHorizon;

            const badge = isPrime
              ? { label: 'PRIME', color: '#FFD166', bg: 'rgba(255,209,102,0.15)' }
              : status && !status.aboveHorizon
              ? { label: 'HIDDEN', color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.06)' }
              : status && status.altitude < 20
              ? { label: 'LOW', color: '#38F0FF', bg: 'rgba(56,240,255,0.12)' }
              : undefined;

            return (
              <MissionListRow
                key={m.id}
                mission={m}
                Art={Art}
                metaLine={statusById[m.id]?.metaLine ?? LIST_META[m.id] ?? ''}
                badge={badge}
                isPrime={isPrime}
                disabled={disabled}
                onClick={() => onStart(m)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
