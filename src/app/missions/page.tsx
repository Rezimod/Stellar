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
import PageContainer from '@/components/layout/PageContainer';
import { MissionIcon } from '@/components/shared/PlanetIcons';
import { TelescopeIcon, StarTokenIcon, DifficultyDots } from '@/components/icons/CelestialIcons';
import QuizCard, { type QuizTheme } from '@/components/sky/QuizCard';
import SolarSystemIcon from '@/components/sky/quiz-icons/SolarSystemIcon';
import ConstellationsIcon from '@/components/sky/quiz-icons/ConstellationsIcon';
import TelescopeIconArt from '@/components/sky/quiz-icons/TelescopeIcon';
import CosmologyIcon from '@/components/sky/quiz-icons/CosmologyIcon';
import ExplorationIcon from '@/components/sky/quiz-icons/ExplorationIcon';

interface QuizSpec {
  theme: QuizTheme;
  Icon: React.ComponentType<{ size?: number }>;
  reward: number;
  badge?: 'new' | 'hard';
}

const QUIZ_SPECS: Record<string, QuizSpec> = {
  'solar-system':     { theme: 'solar',       Icon: SolarSystemIcon,   reward: 100 },
  'constellations':   { theme: 'stars',       Icon: ConstellationsIcon, reward: 100 },
  'telescopes':       { theme: 'telescope',   Icon: TelescopeIconArt,   reward: 100, badge: 'new' },
  'universe':         { theme: 'cosmos',      Icon: CosmologyIcon,      reward: 100, badge: 'hard' },
  'space-exploration':{ theme: 'exploration', Icon: ExplorationIcon,    reward: 100 },
};

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
  const quizStarsEarned = useMemo(
    () => (state.completedQuizzes ?? []).reduce((sum, r) => sum + (r.stars ?? 0), 0),
    [state.completedQuizzes]
  );
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
      <PageContainer variant="wide" className="py-3 sm:py-6 animate-page-enter flex flex-col gap-4">
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
      </PageContainer>
    );
  }

  return (
    <PageTransition>
      <>
      {activeQuiz && <QuizActive quiz={activeQuiz} onClose={() => setActiveQuiz(null)} />}

      <PageContainer variant="wide" className="py-2 flex flex-col gap-3" style={{ fontFamily: 'var(--font-display)' }}>
        <BackButton />

        <ChartSection onStart={(m) => router.push(`/observe/${m.id}`)} />

        <StatsBar />

        {/* Quiz Missions */}
        <section className="mt-4">
          <div className="flex items-baseline justify-between mb-4 px-0.5">
            <div>
              <div className="flex items-baseline gap-2.5">
                <h2
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 24,
                    color: '#F2F0EA',
                    fontWeight: 600,
                    margin: 0,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {t('knowledgeQuizzes')}
                </h2>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.35)',
                    letterSpacing: '0.14em',
                  }}
                >
                  {String(QUIZZES.length).padStart(2, '0')} QUIZZES
                </span>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.55)',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  marginTop: 2,
                }}
              >
                Earn stars while you wait for clear skies
              </div>
            </div>
            <div
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full"
              style={{ background: 'rgba(255,209,102,0.08)', border: '1px solid rgba(255,209,102,0.2)' }}
            >
              <span style={{ fontSize: 11, color: '#FFD166', fontWeight: 600 }}>
                ✦ {quizStarsEarned}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {QUIZZES.map(quiz => {
              const spec = QUIZ_SPECS[quiz.id];
              if (!spec) return null;
              const bestResult = [...(state.completedQuizzes ?? [])]
                .filter(r => r.quizId === quiz.id)
                .sort((a, b) => b.score - a.score)[0];
              const bestPct = bestResult ? Math.round((bestResult.score / bestResult.total) * 100) : null;
              const badges: Array<{ label: string; variant: 'new' | 'hard' | 'done' }> = [];
              if (bestPct !== null && bestPct >= 90) badges.push({ label: `✓ ${bestPct}%`, variant: 'done' });
              if (spec.badge === 'new' && bestPct === null) badges.push({ label: 'NEW', variant: 'new' });
              if (spec.badge === 'hard') badges.push({ label: 'HARD', variant: 'hard' });

              return (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  theme={spec.theme}
                  Icon={spec.Icon}
                  titleEn={quiz.title[locale] ?? quiz.title.en}
                  descEn={quiz.description[locale] ?? quiz.description.en}
                  totalQuestions={quiz.questions?.length ?? 10}
                  bestPct={bestPct}
                  starsEarned={bestResult?.stars}
                  badges={badges}
                  reward={spec.reward}
                  onStart={() => setActiveQuiz(quiz)}
                />
              );
            })}
          </div>
        </section>

        <RewardsSection />
        <ObservationLog />
      </PageContainer>
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
  jupiter:   'Gas giant · Naked eye',
  saturn:    'Rings wide open · Telescope',
  moon:      'Easy — look up',
  venus:     'Evening star · Naked eye',
  mars:      'Red planet · Naked eye',
  mercury:   'Tricky — twilight only',
  pleiades:  'Naked eye',
  orion:     'Naked eye',
  andromeda: 'Binoculars help',
  crab:      'Telescope needed',
};

const DIR_NAMES: Record<string, string> = {
  N: 'north', NE: 'northeast', E: 'east', SE: 'southeast',
  S: 'south', SW: 'southwest', W: 'west', NW: 'northwest',
};
const AZ_DIR_LIST = ['N','NE','E','SE','S','SW','W','NW'] as const;
function azToDirName(az: number): string {
  return DIR_NAMES[AZ_DIR_LIST[Math.round(az / 45) % 8]] ?? '';
}

function friendlyMeta({
  aboveHorizon, altitude, dirName, peakDate, riseDate, now, hint, cloudCover,
}: {
  aboveHorizon: boolean;
  altitude: number;
  dirName: string;
  peakDate: Date | null;
  riseDate: Date | null;
  now: Date;
  hint?: string;
  cloudCover?: number | null;
}): string {
  if (!aboveHorizon) {
    if (riseDate) {
      const diffH = (riseDate.getTime() - now.getTime()) / 3_600_000;
      const riseStr = riseDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      if (diffH > 0 && diffH < 8) return `Rises at ${riseStr}`;
      return 'Back tomorrow night';
    }
    return 'Below horizon';
  }
  let where: string;
  if (altitude >= 60) where = 'High overhead';
  else if (altitude >= 30) where = dirName ? `High in the ${dirName}` : 'Well placed';
  else if (altitude >= 10) where = dirName ? `Low in the ${dirName}` : 'Low on horizon';
  else where = dirName ? `Skimming the ${dirName} horizon` : 'Barely up';

  const tail: string[] = [];
  if (cloudCover != null && cloudCover >= 60) tail.push(`Cloudy ${Math.round(cloudCover)}%`);
  else if (cloudCover != null && cloudCover >= 40) tail.push(`Hazy ${Math.round(cloudCover)}%`);
  else if (peakDate && peakDate.getTime() > now.getTime()) {
    const peakStr = peakDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    tail.push(`Best at ${peakStr}`);
  } else if (hint) {
    tail.push(hint);
  }
  return [where, ...tail].join(' · ');
}

function ChartSection({ onStart }: { onStart: (m: Mission) => void }) {
  const { state } = useAppState();
  const { location } = useLocation();
  const [now, setNow] = useState<Date>(() => new Date());
  const [cloudCover, setCloudCover] = useState<number | null>(null);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const lat = location.lat ?? 41.7151;
  const lon = location.lon ?? 44.8271;
  useEffect(() => {
    fetch(`/api/sky/verify?lat=${lat}&lon=${lon}`)
      .then(r => r.json())
      .then(d => setCloudCover(typeof d.cloudCover === 'number' ? d.cloudCover : null))
      .catch(() => {});
  }, [lat, lon]);
  const cityLabel = location.city || (location.country === 'GE' ? 'Tbilisi' : location.country);
  const liveTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const liveDateStr = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();

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
      const peakDate = p.transit ? (p.transit instanceof Date ? p.transit : new Date(p.transit)) : null;
      const riseDate = p.rise    ? (p.rise    instanceof Date ? p.rise    : new Date(p.rise))    : null;
      const dirName = DIR_NAMES[p.azimuthDir] ?? '';
      const metaLine = friendlyMeta({
        aboveHorizon,
        altitude: p.altitude,
        dirName,
        peakDate,
        riseDate,
        now,
        hint: LIST_META[p.key],
        cloudCover,
      });
      out[p.key] = {
        aboveHorizon,
        altitude: p.altitude,
        azDir: p.azimuthDir,
        peakTime: peakDate ? peakDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : null,
        metaLine,
      };
    }
    const ds = getChartDeepSky(lat, lon, now, 200, 100, 180);
    for (const d of ds) {
      const dirName = azToDirName(d.azimuth);
      const metaLine = friendlyMeta({
        aboveHorizon: d.aboveHorizon,
        altitude: d.altitude,
        dirName,
        peakDate: null,
        riseDate: null,
        now,
        hint: LIST_META[d.id],
        cloudCover,
      });
      out[d.id] = {
        aboveHorizon: d.aboveHorizon,
        altitude: d.altitude,
        azDir: '',
        peakTime: null,
        metaLine,
      };
    }
    return out;
  }, [lat, lon, now, cloudCover]);

  const primeMission = useMemo(() => {
    const candidates = chartableMissions
      .filter(m => !completedIds.has(m.id) || m.repeatable)
      .filter(m => statusById[m.id]?.aboveHorizon);
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => PRIME_ORDER.indexOf(a.id) - PRIME_ORDER.indexOf(b.id));
    return candidates[0];
  }, [chartableMissions, completedIds, statusById]);

  const [filter, setFilter] = useState<'visible' | 'all'>('visible');
  const visibleCount = useMemo(
    () => chartableMissions.filter(m => statusById[m.id]?.aboveHorizon).length,
    [chartableMissions, statusById]
  );
  const sortedMissions = useMemo(() => {
    let pool = chartableMissions.filter(m => m.id !== primeMission?.id);
    if (filter === 'visible') {
      pool = pool.filter(m => statusById[m.id]?.aboveHorizon);
    }
    pool.sort((a, b) => (statusById[b.id]?.altitude ?? -100) - (statusById[a.id]?.altitude ?? -100));
    return primeMission ? [primeMission, ...pool] : pool;
  }, [chartableMissions, primeMission, filter, statusById]);

  const railMissions = useMemo(() => {
    const visible = chartableMissions
      .filter(m => m.id !== primeMission?.id && statusById[m.id]?.aboveHorizon);
    visible.sort((a, b) => (statusById[b.id]?.altitude ?? -100) - (statusById[a.id]?.altitude ?? -100));
    return visible.slice(0, 6);
  }, [chartableMissions, primeMission, statusById]);

  return (
    <div className="flex flex-col gap-0">
      {/* Top area: prime card + missions mini-rail (desktop) */}
      <div className="mb-4 grid grid-cols-1 lg:grid-cols-2 lg:gap-4">
        {primeMission && (
          <PrimeHeroCard
            mission={primeMission}
            altitude={statusById[primeMission.id]?.altitude ?? null}
            tagline={TAGLINES[primeMission.id] ?? primeMission.desc}
            onStart={() => onStart(primeMission)}
          />
        )}
        <div className="hidden lg:block">
          <MissionMiniRail
            missions={railMissions}
            statusById={statusById}
            onSelect={onStart}
          />
        </div>
      </div>

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
            LIVE · {liveTimeStr} · {liveDateStr} · {cityLabel.toUpperCase()}
          </span>
        </div>
        <SkyChart
          lat={lat}
          lon={lon}
          date={now}
          missions={chartableMissions.filter(m => statusById[m.id]?.aboveHorizon)}
          primeId={primeMission?.id ?? null}
          city={cityLabel}
          onSelect={onStart}
        />
      </div>

      {/* Missions list — mobile only; desktop uses mini-rail above */}
      <div className="lg:hidden">
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
            {(['visible','all'] as const).map(f => {
              const count = f === 'visible' ? visibleCount : chartableMissions.length;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-2.5 py-1 rounded transition-colors flex items-center gap-1"
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    background: filter === f ? '#F2F0EA' : 'transparent',
                    color: filter === f ? '#0a0a0a' : 'rgba(255,255,255,0.55)',
                  }}
                >
                  <span>{f === 'visible' ? 'Up now' : 'All'}</span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      opacity: 0.6,
                      fontWeight: 500,
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
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

function MissionMiniRail({
  missions,
  statusById,
  onSelect,
}: {
  missions: Mission[];
  statusById: Record<string, { aboveHorizon: boolean; altitude: number; azDir: string; peakTime: string | null; metaLine: string }>;
  onSelect: (m: Mission) => void;
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-baseline justify-between mb-2">
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 18,
            color: '#F2F0EA',
            fontWeight: 600,
            margin: 0,
          }}
        >
          Missions tonight
        </h2>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.15em',
          }}
        >
          {String(missions.length).padStart(2, '0')} VISIBLE
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 flex-1">
        {missions.map(m => {
          const Art = NODE_MAP_FOR_LIST[m.id];
          if (!Art) return null;
          const meta = statusById[m.id];
          return <MiniCard key={m.id} mission={m} Art={Art} meta={meta} onClick={() => onSelect(m)} />;
        })}
      </div>
    </div>
  );
}

function MiniCard({
  mission,
  Art,
  meta,
  onClick,
}: {
  mission: Mission;
  Art: ComponentType<{ size?: number }>;
  meta?: { aboveHorizon: boolean; altitude: number; azDir: string; peakTime: string | null; metaLine: string };
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative overflow-hidden rounded-xl transition-all duration-200 ease-out"
      style={{
        background: hover ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${hover ? 'rgba(255,209,102,0.35)' : 'rgba(255,255,255,0.08)'}`,
        transform: hover ? 'translateY(-2px) scale(1.04)' : 'none',
        boxShadow: hover ? '0 8px 24px rgba(0,0,0,0.35)' : 'none',
        padding: '10px 8px',
        cursor: 'pointer',
        minHeight: 86,
      }}
    >
      <div className="flex items-center justify-center" style={{ height: 40 }}>
        <Art size={hover ? 44 : 38} />
      </div>
      <div
        className="mt-1 text-center"
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 12,
          color: '#F2F0EA',
          fontWeight: 600,
          lineHeight: 1.1,
          opacity: hover ? 1 : 0,
          transform: hover ? 'translateY(0)' : 'translateY(3px)',
          transition: 'opacity 180ms ease-out, transform 180ms ease-out',
        }}
      >
        {mission.name}
      </div>
      <div
        className="text-center"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 8.5,
          color: 'rgba(255,255,255,0.45)',
          letterSpacing: '0.1em',
          marginTop: 2,
          opacity: hover ? 1 : 0,
          transition: 'opacity 180ms ease-out',
        }}
      >
        {meta?.aboveHorizon ? `ALT ${Math.round(meta.altitude)}°` : 'HIDDEN'}
      </div>
    </button>
  );
}
