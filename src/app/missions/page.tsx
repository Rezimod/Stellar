'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAppState } from '@/hooks/useAppState';
import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';
import { DailyCheckInCard } from '@/components/missions/DailyCheckInCard';
import { useVisibleInterval } from '@/hooks/useVisibleInterval';
import { AuthModal } from '@/components/auth/AuthModal';
import { useLocale, useTranslations } from 'next-intl';
import { useLocation } from '@/lib/location';
import { DEFAULT_OBSERVER } from '@/lib/observer-location';
import { getVisiblePlanets, getWindowPlanets } from '@/lib/planets';
import { getTonightDarkWindow } from '@/lib/dark-window';
import { getChartDeepSky } from '@/lib/sky-chart';
import { QUIZZES } from '@/lib/quizzes';
import { SkyOrb } from '@/components/sky/SkyOrb';
import QuizActive from '@/components/sky/QuizActive';
import EventInfoSheet from '@/components/sky/EventInfoSheet';
import DifficultyExplainer from '@/components/sky/DifficultyExplainer';
import { getRareEvents, getUpcomingEvents, type AstroEvent } from '@/lib/astro-events';
import type { QuizDef } from '@/lib/quizzes';
import {
  Snowflake, Telescope as LcTelescope, Crosshair, Moon as LcMoon, Sun, Star, Globe,
  Rocket, Clock, Eye, Cloud, Gift, ChevronRight, Plus, Lightbulb, Satellite, Users,
} from 'lucide-react';
import { NIGHT_STAR_GOAL, MAIN_QUEST_ID, GLOBAL_MISSION, nextReward } from '@/lib/missions-tonight';
import type { LucideIcon } from 'lucide-react';
import { Body, Illumination, MoonPhase } from 'astronomy-engine';

const HUB_GRADIENTS = {
  amber:   'linear-gradient(135deg, #FFB347 0%, #FFB347 100%)',
  violet:  'linear-gradient(135deg, #8B5CF6 0%, #8B5CF6 100%)',
  fuchsia: 'linear-gradient(135deg, #8B5CF6 0%, #8B5CF6 100%)',
  teal:    'linear-gradient(135deg, #5EEAD4 0%, #5EEAD4 100%)',
  rose:    'linear-gradient(135deg, #FB7185 0%, #E11D48 100%)',
} as const;

type DiffClass = 'easy' | 'med' | 'hard' | 'expert';

type EquipKey = 'naked' | 'telescope' | 'binoculars';

interface GridEntry {
  id: string;
  stars: number;
  diff: DiffClass;
  equip: EquipKey;
  routeId: string;
  estMin: number;
}

// 9 tiles in display order. Every entry maps to a real MISSIONS row in
// src/lib/constants.ts so the briefing screen, AI verification, NFT name and
// Stars reward all match what the tile advertises. estMin = suggested time at
// the eyepiece — observing guidance, not a countdown.
const GRID: GridEntry[] = [
  { id: 'moon',      stars: 50,  diff: 'easy',   equip: 'naked',      routeId: 'moon',      estMin: 5  },
  { id: 'jupiter',   stars: 75,  diff: 'easy',   equip: 'telescope',  routeId: 'jupiter',   estMin: 8  },
  { id: 'pleiades',  stars: 60,  diff: 'easy',   equip: 'naked',      routeId: 'pleiades',  estMin: 6  },
  { id: 'venus',     stars: 40,  diff: 'easy',   equip: 'naked',      routeId: 'venus',     estMin: 5  },
  { id: 'saturn',    stars: 100, diff: 'med',    equip: 'telescope',  routeId: 'saturn',    estMin: 10 },
  { id: 'mars',      stars: 85,  diff: 'med',    equip: 'telescope',  routeId: 'mars',      estMin: 12 },
  { id: 'orion',     stars: 100, diff: 'med',    equip: 'telescope',  routeId: 'orion',     estMin: 10 },
  { id: 'andromeda', stars: 175, diff: 'hard',   equip: 'binoculars', routeId: 'andromeda', estMin: 12 },
  { id: 'crab',      stars: 250, diff: 'expert', equip: 'telescope',  routeId: 'crab',      estMin: 15 },
];

// Synodic phase (0 = new, 0.5 = full) → the moonPhase key under the `sky` i18n
// namespace. Same thresholds as lib/tonight-sky moonPhaseName.
function moonPhaseKey(phase: number): string {
  if (phase < 0.03 || phase > 0.97) return 'new';
  if (phase < 0.22) return 'thinCrescent';
  if (phase < 0.28) return 'firstQuarter';
  if (phase < 0.47) return 'waxingGibbous';
  if (phase < 0.53) return 'full';
  if (phase < 0.72) return 'waningGibbous';
  if (phase < 0.78) return 'lastQuarter';
  return 'thinWaning';
}

function fmtClock(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function clampDate(d: Date, min: Date, max: Date): Date {
  if (d.getTime() < min.getTime()) return min;
  if (d.getTime() > max.getTime()) return max;
  return d;
}

// 0–5 visibility rating from peak altitude tonight. Real measurement, not theatre.
function visibilityStars(alt: number): number {
  if (alt >= 60) return 5;
  if (alt >= 45) return 4;
  if (alt >= 30) return 3;
  if (alt >= 15) return 2;
  if (alt > 0) return 1;
  return 0;
}

// Confidence % derived from peak altitude — higher in the sky reads cleaner.
function visibilityPct(alt: number): number {
  if (alt <= 0) return 0;
  return Math.min(99, Math.max(60, Math.round(60 + alt * 0.45)));
}

type MissionFilter = 'all' | 'visible' | 'naked' | 'telescope' | 'binoculars' | 'rare';
const MISSION_FILTERS: MissionFilter[] = ['all', 'visible', 'naked', 'telescope', 'binoculars', 'rare'];
const DEEP_SKY = new Set(['pleiades', 'orion', 'andromeda', 'crab']);
const LIST_PREVIEW = 5;

// Live lineup keys -> their real mission ids. Mercury isn't in the GRID but
// has a real mission entry so tapping it from the nearby strip works.
const LINEUP_ROUTE_BY_KEY: Record<string, { routeId: string; stars: number }> = {
  moon:    { routeId: 'moon',    stars: 50 },
  jupiter: { routeId: 'jupiter', stars: 75 },
  saturn:  { routeId: 'saturn',  stars: 100 },
  mars:    { routeId: 'mars',    stars: 85 },
  venus:   { routeId: 'venus',   stars: 40 },
  mercury: { routeId: 'mercury', stars: 60 },
};
const LINEUP_KEYS = ['moon', 'jupiter', 'saturn', 'mars', 'venus', 'mercury'];

type TipKey = 'cool' | 'zoom' | 'align' | 'eyes';
const TIPS: { key: TipKey; Icon: LucideIcon }[] = [
  { key: 'cool',  Icon: Snowflake },
  { key: 'zoom',  Icon: LcTelescope },
  { key: 'align', Icon: Crosshair },
  { key: 'eyes',  Icon: LcMoon },
];

interface QuizUi {
  key: 'solar-system' | 'constellations' | 'telescopes' | 'universe' | 'space-exploration';
  Icon: LucideIcon;
  gradient: string;
  reward: number;
  descEn: string;
  descKa: string;
}

const QUIZ_UI: Record<string, QuizUi> = {
  'solar-system':      { key: 'solar-system',      Icon: Sun,         gradient: HUB_GRADIENTS.amber,   reward: 100, descEn: '10 questions · planets, moons, orbits',      descKa: '10 კითხვა · პლანეტები, მთვარეები, ორბიტები' },
  'constellations':    { key: 'constellations',    Icon: Star,        gradient: HUB_GRADIENTS.fuchsia, reward: 100, descEn: '10 questions · stars, myths, sky patterns',    descKa: '10 კითხვა · ვარსკვლავები, მითები, ცის ფიგურები' },
  'telescopes':        { key: 'telescopes',        Icon: LcTelescope, gradient: HUB_GRADIENTS.violet,  reward: 100, descEn: '10 questions · optics, mounts, magnification', descKa: '10 კითხვა · ოპტიკა, სადგარები, გადიდება' },
  'universe':          { key: 'universe',          Icon: Globe,       gradient: HUB_GRADIENTS.teal,    reward: 100, descEn: '10 questions · galaxies, cosmology, time',     descKa: '10 კითხვა · გალაქტიკები, კოსმოლოგია, დრო' },
  'space-exploration': { key: 'space-exploration', Icon: Rocket,      gradient: HUB_GRADIENTS.rose,    reward: 100, descEn: '10 questions · missions, probes, astronauts',  descKa: '10 კითხვა · მისიები, ზონდები, ასტრონავტები' },
};

interface SkyPos { altitude: number; azimuth: number; rise: Date | null; transit: Date | null; }

interface IssPass { startsAt: string; peakAt: string; peakElevation: number; peakAzimuth: number }
interface GlobalMissionData { target: string; current: number; goal: number; bonusStars: number }

type LocalizedGridEntry = GridEntry & { name: string; desc: string; diffLabel: string; equipLabel: string };

export default function MissionsPage() {
  const router = useRouter();
  const { state } = useAppState();
  const { authenticated, address } = useStellarUser();
  const { getAccessToken } = usePrivy();
  const [authOpen, setAuthOpen] = useState(false);
  const locale = useLocale() === 'ka' ? 'ka' : 'en';
  const { location, ensureLocation } = useLocation();
  const t = useTranslations('missionsPage');
  const tSky = useTranslations('sky');

  // Missions are location-aware (what's up tonight from here) — prompt for GPS
  // on open rather than on site entry.
  useEffect(() => { ensureLocation(); }, [ensureLocation]);

  const localize = useCallback(
    (entry: GridEntry): LocalizedGridEntry => ({
      ...entry,
      name: t(`grid.${entry.id}.name`),
      desc: t(`grid.${entry.id}.desc`),
      diffLabel: t(`difficulty.${entry.diff}`),
      equipLabel: t(`equip.${entry.equip}`),
    }),
    [t],
  );

  const [now, setNow] = useState<Date>(() => new Date());
  const [activeQuiz, setActiveQuiz] = useState<QuizDef | null>(null);
  const [activeEvent, setActiveEvent] = useState<AstroEvent | null>(null);
  const [activeEventAnchor, setActiveEventAnchor] = useState<DOMRect | null>(null);
  const [activeExplainer, setActiveExplainer] = useState<{ kind: 'mission' | 'event'; id: string; title: string; eventType?: string } | null>(null);
  const [activeExplainerAnchor, setActiveExplainerAnchor] = useState<DOMRect | null>(null);
  const [missionFilter, setMissionFilter] = useState<MissionFilter>('all');
  const [showAllMissions, setShowAllMissions] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [iss, setIss] = useState<IssPass | null>(null);
  const [issLoading, setIssLoading] = useState(true);
  const [globalMission, setGlobalMission] = useState<GlobalMissionData | null>(null);
  const [lifetimeStars, setLifetimeStars] = useState<number | null>(null);

  const upcomingEvents = useMemo(() => getUpcomingEvents(new Date(), 30), []);
  const rareEvents = useMemo(() => getRareEvents(new Date(), 5), []);

  useVisibleInterval(() => setNow(new Date()), 60_000);

  const lat = location.lat ?? DEFAULT_OBSERVER.lat;
  const lon = location.lon ?? DEFAULT_OBSERVER.lon;
  const cityLabel = location.city || DEFAULT_OBSERVER.city;

  const dark = useMemo(() => getTonightDarkWindow(lat, lon, now), [lat, lon, now]);
  const evalTime = dark.evalTime;

  const moonGlance = useMemo(() => {
    try {
      const illum = Math.round(Illumination(Body.Moon, evalTime).phase_fraction * 100);
      const phase = (MoonPhase(evalTime) % 360) / 360;
      return { illum, key: moonPhaseKey(phase) };
    } catch {
      return null;
    }
  }, [evalTime]);

  // Window-based visibility: best altitude any planet/object reaches during
  // tonight's astronomical-dark window. Drives the mission deck + visible count,
  // so it stays accurate during daylight or cloudy weather — a forecast of
  // *tonight*, not a live readout.
  const tonightWindowPlanets = useMemo(() => {
    if (dark.duskStart && dark.dawnEnd) {
      return getWindowPlanets(lat, lon, dark.duskStart, dark.dawnEnd);
    }
    return getVisiblePlanets(lat, lon, evalTime);
  }, [lat, lon, evalTime, dark.duskStart, dark.dawnEnd]);

  // Current cloud cover + temperature for the live conditions card. Pulled from
  // the cached sky-forecast route, snapped to the hour closest to now, refreshed
  // every 5 min so the readout tracks the actual sky as the night goes on.
  const [cloudCoverPct, setCloudCoverPct] = useState<number | null>(null);
  const [tempC, setTempC] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    const fetchConditions = async () => {
      try {
        const res = await fetch(`/api/sky/forecast?lat=${lat}&lon=${lon}`);
        if (!res.ok) return;
        const days: { hours: { time: string; cloudCover: number; temp: number }[] }[] = await res.json();
        if (cancelled) return;
        const flat = days.flatMap((d) => d.hours ?? []);
        if (!flat.length) return;
        const nowMs = Date.now();
        let best = flat[0];
        let bestDiff = Number.POSITIVE_INFINITY;
        for (const h of flat) {
          const diff = Math.abs(new Date(h.time).getTime() - nowMs);
          if (diff < bestDiff) { bestDiff = diff; best = h; }
        }
        setCloudCoverPct(typeof best.cloudCover === 'number' ? best.cloudCover : null);
        setTempC(typeof best.temp === 'number' ? Math.round(best.temp) : null);
      } catch { /* leave null — conditions card stays neutral */ }
    };
    fetchConditions();
    let id: number | null = null;
    const start = () => {
      if (id !== null) return;
      id = window.setInterval(fetchConditions, 5 * 60_000);
    };
    const stop = () => {
      if (id === null) return;
      window.clearInterval(id);
      id = null;
    };
    if (typeof document === 'undefined' || !document.hidden) start();
    const onVis = () => { if (document.hidden) stop(); else start(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      stop();
    };
  }, [lat, lon]);

  // Next ISS pass from live orbital elements (server computes from Celestrak TLE).
  // A real geometric prediction for this location — scheduled, not live tracking.
  useEffect(() => {
    let cancelled = false;
    setIssLoading(true);
    fetch(`/api/sky/iss?lat=${lat}&lon=${lon}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setIss(d?.pass ?? null); })
      .catch(() => { if (!cancelled) setIss(null); })
      .finally(() => { if (!cancelled) setIssLoading(false); });
    return () => { cancelled = true; };
  }, [lat, lon]);

  // Community mission progress — seed + real observations of the target today.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/missions/global')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d && typeof d.current === 'number') setGlobalMission(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Lifetime Stars — drives the coupon "next reward" tier in the summary bar.
  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    fetch(`/api/stars-balance?address=${address}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d && typeof d.lifetimeEarned === 'number') setLifetimeStars(d.lifetimeEarned); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [address]);

  const skyPositions = useMemo(() => {
    const out: Record<string, SkyPos> = {};
    for (const p of tonightWindowPlanets) {
      const rise = p.rise instanceof Date ? p.rise : null;
      const transit = p.transit instanceof Date ? p.transit : (p.transit ? new Date(p.transit) : null);
      out[p.key] = { altitude: p.altitude, azimuth: p.azimuth, rise, transit };
    }
    const ds = getChartDeepSky(lat, lon, evalTime, 200, 100, 180);
    for (const d of ds) {
      out[d.id] = { altitude: d.altitude, azimuth: d.azimuth, rise: null, transit: null };
    }
    return out;
  }, [lat, lon, evalTime, tonightWindowPlanets]);

  const completedIds = useMemo(
    () => new Set(state.completedMissions.filter((m) => m.status === 'completed').map((m) => m.id)),
    [state.completedMissions],
  );

  const completedQuizIds = useMemo(
    () => new Map((state.completedQuizzes ?? []).map((q) => [q.quizId, q] as const)),
    [state.completedQuizzes],
  );

  const visibleCount = useMemo(
    () => GRID.filter((g) => (skyPositions[g.id]?.altitude ?? -90) > 0).length,
    [skyPositions],
  );

  // Tonight's progress — earned / total Stars across the deck, completion %,
  // and a 0–5 star rating. All derived from real completed missions.
  const earnedStars = useMemo(
    () => GRID.filter((g) => completedIds.has(g.id)).reduce((s, g) => s + g.stars, 0),
    [completedIds],
  );

  // Summary-bar figures: completion = targets done / total; the 5-star row is
  // tonight's Stars against the session goal; reward = next coupon tier.
  const completedCount = useMemo(() => GRID.filter((g) => completedIds.has(g.id)).length, [completedIds]);
  const completionPct = Math.round((completedCount / GRID.length) * 100);
  const nightRating = earnedStars <= 0 ? 0 : Math.min(5, Math.max(1, Math.round((earnedStars / NIGHT_STAR_GOAL) * 5)));
  const reward = nextReward(lifetimeStars ?? earnedStars);

  // Main quest = best target to do next: an explicit MAIN_QUEST_ID wins; else
  // prefer a visible, incomplete, highest target; fall back to highest-value.
  const questEntry = useMemo(() => {
    if (MAIN_QUEST_ID) {
      const forced = GRID.find((g) => g.id === MAIN_QUEST_ID);
      if (forced) return forced;
    }
    const incomplete = GRID.filter((g) => !completedIds.has(g.id));
    const pool = incomplete.length ? incomplete : GRID;
    const visible = pool
      .filter((g) => (skyPositions[g.id]?.altitude ?? -90) > 10)
      .sort((a, b) => (skyPositions[b.id]?.altitude ?? -90) - (skyPositions[a.id]?.altitude ?? -90));
    if (visible.length) return visible[0];
    return [...pool].sort((a, b) => b.stars - a.stars)[0] ?? GRID[0];
  }, [completedIds, skyPositions]);

  const filteredGrid = useMemo(
    () =>
      GRID.filter((g) => {
        if (missionFilter === 'visible') return (skyPositions[g.id]?.altitude ?? -90) > 0;
        if (missionFilter === 'naked') return g.equip === 'naked';
        if (missionFilter === 'telescope') return g.equip === 'telescope';
        if (missionFilter === 'binoculars') return g.equip === 'binoculars';
        if (missionFilter === 'rare') return DEEP_SKY.has(g.id);
        return true;
      }),
    [missionFilter, skyPositions],
  );

  // Nearby planets to point at right now / soon — visible first, by altitude.
  const nearby = useMemo(() => {
    const items = LINEUP_KEYS.map((key) => {
      const pos = skyPositions[key];
      if (!pos) return null;
      const route = LINEUP_ROUTE_BY_KEY[key];
      return {
        key,
        name: t(`grid.${key}.name`),
        above: pos.altitude > 0,
        rise: pos.rise,
        altitude: pos.altitude,
        stars: route?.stars ?? 40,
        routeId: route?.routeId ?? key,
      };
    }).filter((x): x is NonNullable<typeof x> => x !== null);
    items.sort((a, b) => (b.above ? 1 : 0) - (a.above ? 1 : 0) || b.altitude - a.altitude);
    return items;
  }, [skyPositions, t]);

  const headerTime = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const dateLabel = now.toLocaleDateString([], { month: 'short', day: 'numeric' });

  // Conditions gate — same logic as before, used for the status chip label.
  const CLOUD_OVERCAST_PCT = 70;
  const isCloudy = cloudCoverPct != null && cloudCoverPct >= CLOUD_OVERCAST_PCT;
  const liveStatus: 'live' | 'daytime' | 'cloudy' = !dark.isCurrentlyDark
    ? 'daytime'
    : isCloudy
      ? 'cloudy'
      : 'live';
  const statusLabel = liveStatus === 'daytime'
    ? t('liveStatus.daytime')
    : liveStatus === 'cloudy'
      ? t('liveStatus.cloudy')
      : t('liveStatus.live');

  const startMission = useCallback((routeId: string) => {
    router.push(`/observe/${routeId}`);
  }, [router]);

  // Best-viewing window for a target: 90-minute span centred on its peak,
  // clamped to tonight's dark window. Falls back to "all night" / rise time.
  const viewingWindow = useCallback((id: string): { kind: 'window'; text: string } | { kind: 'anytime' } | { kind: 'later'; time: string } | null => {
    const pos = skyPositions[id];
    if (!pos) return null;
    const above = pos.altitude > 0;
    if (dark.duskStart && dark.dawnEnd && pos.transit) {
      const start = clampDate(new Date(pos.transit.getTime() - 45 * 60_000), dark.duskStart, dark.dawnEnd);
      const end = clampDate(new Date(pos.transit.getTime() + 45 * 60_000), dark.duskStart, dark.dawnEnd);
      if (end.getTime() > start.getTime()) return { kind: 'window', text: `${fmtClock(start)}–${fmtClock(end)}` };
    }
    if (above) return { kind: 'anytime' };
    if (pos.rise) return { kind: 'later', time: fmtClock(pos.rise) };
    return null;
  }, [skyPositions, dark.duskStart, dark.dawnEnd]);

  // ---- Auth gate ----
  if (!authenticated) {
    return (
      <div className="missions-page">
        <div className="mis-shell">
          <div className="mis-statusbar" role="status">
            <span className={`mis-statusbar-dot mis-statusbar-dot--${liveStatus}`} aria-hidden />
            <span className="mis-statusbar-label">{statusLabel}</span>
            <span className="mis-statusbar-meta">{headerTime} · {dateLabel} · {cityLabel}</span>
          </div>
          <div className="mis-auth-card">
            <h2 className="mis-auth-title">{t('auth.title')}</h2>
            <p className="mis-auth-body">{t('auth.body')}</p>
            <button type="button" className="mis-auth-btn" onClick={() => setAuthOpen(true)}>
              {t('auth.signIn')}
            </button>
            <p className="mis-auth-sub">{t('auth.sub')}</p>
          </div>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    );
  }

  const questLocal = localize(questEntry);
  const questPos = skyPositions[questEntry.id];
  const questWin = viewingWindow(questEntry.id);
  const questStars = visibilityStars(questPos?.altitude ?? -90);
  const visibleMissions = showAllMissions ? filteredGrid : filteredGrid.slice(0, LIST_PREVIEW);
  const tip = TIPS[tipIndex];

  return (
    <div className="missions-page">
      {activeQuiz && <QuizActive quiz={activeQuiz} onClose={() => setActiveQuiz(null)} />}

      <div className="mis-shell">
        {/* Status bar */}
        <div className="mis-statusbar" role="status">
          <span className={`mis-statusbar-dot mis-statusbar-dot--${liveStatus}`} aria-hidden />
          <span className="mis-statusbar-label">{statusLabel}</span>
          <span className="mis-statusbar-meta">{headerTime} · {dateLabel} · {cityLabel}</span>
        </div>

        {/* Progress summary bar */}
        <SummaryBar
          completionPct={completionPct}
          earned={earnedStars}
          nightGoal={NIGHT_STAR_GOAL}
          rating={nightRating}
          rewardPct={reward?.pct ?? null}
          allDone={completionPct >= 100}
          onContinue={() => startMission(questEntry.routeId)}
          labels={{
            title: t('progress.title'),
            complete: t('progress.complete'),
            starsEarned: t('progress.starsEarned'),
            nextReward: t('progress.nextReward'),
            coupon: t('progress.coupon'),
            maxReward: t('progress.maxReward'),
            continue: completionPct >= 100 ? t('progress.allDone') : t('progress.continue'),
          }}
        />

        {/* Main column + right rail */}
        <div className="mis-layout">
          <div className="mis-main">
            <MainQuestCard
              entry={questLocal}
              altitude={questPos?.altitude ?? null}
              window={questWin}
              visibilityStars={questStars}
              onObserve={() => startMission(questEntry.routeId)}
              labels={{
                badge: t('quest.badge'),
                bestViewing: t('quest.bestViewing'),
                reward: t('quest.reward'),
                visibility: t('quest.visibility'),
                observe: t('quest.observe'),
                anytime: t('quest.anytime'),
                later: (time: string) => t('quest.comingLater', { time }),
              }}
            />

            {/* Nearby sky events */}
            <section className="mis-block">
              <div className="mis-block-head">
                <h2 className="mis-block-title">{t('nearby.title')}</h2>
                <button type="button" className="mis-block-link" onClick={() => router.push('/sky')}>
                  {t('nearby.viewAll')}<ChevronRight size={13} strokeWidth={2} />
                </button>
              </div>
              <div className="mis-nearby-rail">
                {nearby.map((n) => (
                  <button key={n.key} type="button" className="mis-nearby-card" onClick={() => startMission(n.routeId)}>
                    <span className="mis-nearby-art"><SkyOrb name={n.key} /></span>
                    <span className="mis-nearby-name">{n.name}</span>
                    <span className={`mis-nearby-badge${n.above ? ' is-now' : ''}`}>
                      {n.above ? t('nearby.now') : n.rise ? t('nearby.after', { time: fmtClock(n.rise) }) : t('quest.anytime')}
                    </span>
                    <span className="mis-nearby-stars"><Star size={11} strokeWidth={2} className="mis-star-icn" />+{n.stars}</span>
                  </button>
                ))}
                <IssCard
                  iss={iss}
                  loading={issLoading}
                  onOpen={() => router.push('/sky')}
                  labels={{
                    name: t('iss.name'),
                    loading: t('iss.loading'),
                    none: t('iss.none'),
                    peak: (deg: number) => t('iss.peak', { deg }),
                  }}
                />
              </div>
            </section>

            {/* Missions tonight */}
            <section className="mis-block">
              <div className="mis-block-head">
                <h2 className="mis-block-title">{t('sections.tonight')}</h2>
                <span className="mis-block-meta">{t('sections.tonightCount', { total: GRID.length, visible: visibleCount })}</span>
              </div>
              <div className="mis-chips" role="tablist" aria-label={t('sections.tonight')}>
                {MISSION_FILTERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="tab"
                    aria-selected={missionFilter === f}
                    className={`mis-chip${missionFilter === f ? ' is-active' : ''}`}
                    onClick={() => { setMissionFilter(f); setShowAllMissions(false); }}
                  >
                    {t(`filters.${f}`)}
                  </button>
                ))}
              </div>
              <div className="mis-list">
                {visibleMissions.map((g) => {
                  const pos = skyPositions[g.id];
                  const above = (pos?.altitude ?? -90) > 0;
                  return (
                    <MissionRow
                      key={g.id}
                      entry={localize(g)}
                      above={above}
                      pct={visibilityPct(pos?.altitude ?? -90)}
                      rise={pos?.rise ?? null}
                      onStart={() => startMission(g.routeId)}
                      labels={{
                        visibleNow: t('list.visibleNow'),
                        after: (time: string) => t('list.after', { time }),
                        comingLater: t('list.comingLater'),
                        observe: t('list.observe'),
                        min: (n: number) => t('list.min', { n }),
                      }}
                    />
                  );
                })}
              </div>
              {filteredGrid.length > LIST_PREVIEW && (
                <button type="button" className="mis-viewall" onClick={() => setShowAllMissions((v) => !v)}>
                  {showAllMissions ? t('list.showLess') : t('list.viewAll')}
                  <ChevronRight size={14} strokeWidth={2} className={showAllMissions ? 'mis-viewall-up' : ''} />
                </button>
              )}
            </section>
          </div>

          {/* Right rail — streak, global mission, tip, weather */}
          <div className="mis-rail">
            <section className="mis-card mis-card--streak">
              <div className="mis-card-head">
                <span className="mis-card-eyebrow">{t('streakTitle')}</span>
              </div>
              <DailyCheckInCard lat={lat} lon={lon} address={address} getAccessToken={getAccessToken} />
              <span className="mis-card-foot">{t('resetsMidnight')}</span>
            </section>

            <GlobalMissionCard
              data={globalMission}
              labels={{
                title: t('global.title'),
                heading: (target: string) => t('global.heading', { target }),
                observers: t('global.observers'),
                reward: (n: number) => t('global.reward', { n }),
                loading: t('global.loading'),
              }}
            />

            <section className="mis-card mis-card--tip">
              <div className="mis-card-head">
                <span className="mis-card-eyebrow"><Lightbulb size={12} strokeWidth={1.9} /> {t('tipTitle')}</span>
              </div>
              <div className="mis-tip-body">
                <span className="mis-tip-icon" aria-hidden><tip.Icon size={16} strokeWidth={1.7} /></span>
                <div>
                  <p className="mis-tip-title">{t(`tips.${tip.key}.title`)}</p>
                  <p className="mis-tip-text">{t(`tips.${tip.key}.body`)}</p>
                </div>
              </div>
              <div className="mis-tip-dots" role="tablist" aria-label={t('tipTitle')}>
                {TIPS.map((tp, i) => (
                  <button
                    key={tp.key}
                    type="button"
                    role="tab"
                    aria-selected={i === tipIndex}
                    aria-label={t(`tips.${tp.key}.title`)}
                    className={`mis-tip-dot${i === tipIndex ? ' is-active' : ''}`}
                    onClick={() => setTipIndex(i)}
                  />
                ))}
              </div>
            </section>

            <WeatherCard
              cloudCoverPct={cloudCoverPct}
              tempC={tempC}
              labels={{
                title: t('weather.title'),
                clear: t('weather.clear'),
                partly: t('weather.partly'),
                cloudy: t('weather.cloudy'),
                cloudCover: t('weather.cloudCover'),
                good: t('weather.good'),
                poor: t('weather.poor'),
                unknown: t('weather.unknown'),
              }}
            />

            {/* Knowledge quizzes — moved into the right rail to fill the empty space */}
            <section className="mis-card mis-card--quizzes">
              <div className="mis-card-head">
                <span className="mis-card-eyebrow"><Star size={12} strokeWidth={1.9} /> {t('sections.quizzes')}</span>
              </div>
              <div className="mis-quiz-list">
                {QUIZZES.map((quiz) => {
                  const ui = QUIZ_UI[quiz.id];
                  if (!ui) return null;
                  const result = completedQuizIds.get(quiz.id);
                  const score = result?.score ?? 0;
                  const total = quiz.questions.length;
                  const title = quiz.title[locale] ?? quiz.title.en;
                  const desc = locale === 'ka' ? ui.descKa : ui.descEn;
                  return (
                    <QuizRow
                      key={quiz.id}
                      Icon={ui.Icon}
                      gradient={ui.gradient}
                      title={title}
                      meta={desc}
                      reward={ui.reward}
                      done={score > 0 && score >= total}
                      onClick={() => setActiveQuiz(quiz)}
                    />
                  );
                })}
              </div>
            </section>
          </div>
        </div>

        {/* Rare events */}
        {rareEvents.length > 0 && (
          <section className="mis-block">
            <div className="mis-block-head">
              <h2 className="mis-block-title">{t('sections.rare', { year: new Date().getFullYear() })}</h2>
              <span className="mis-block-meta">{t('sections.rareMeta', { count: rareEvents.length })}</span>
            </div>
            <div className="mis-rare-deck">
              {rareEvents.map((ev) => (
                <RareEventCard
                  key={`${ev.date}-${ev.name}`}
                  event={ev}
                  typeLabel={t(`eventType.${ev.type}`)}
                  countdown={{
                    today: t('countdown.today'),
                    tomorrow: t('countdown.tomorrow'),
                    past: t('countdown.past'),
                    inDays: (n) => t('countdown.inDays', { n }),
                    inMonths: (n) => t('countdown.inMonths', { n }),
                  }}
                  onOpen={(rect) => { setActiveEventAnchor(rect); setActiveEvent(ev); }}
                />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming events */}
        {upcomingEvents.length > 0 && (
          <section className="mis-block">
            <div className="mis-block-head">
              <h2 className="mis-block-title">{t('sections.upcoming')}</h2>
              <span className="mis-block-meta">{t('sections.eventsCount', { count: upcomingEvents.length })}</span>
            </div>
            <div className="mis-events-deck">
              {upcomingEvents.map((ev) => (
                <EventRow
                  key={`${ev.date}-${ev.name}`}
                  event={ev}
                  typeLabel={t(`eventType.${ev.type}`)}
                  difficultyLabel={t(`eventDiff.${ev.difficulty}`)}
                  countdown={{ today: t('countdown.today'), tomorrow: t('countdown.tomorrow'), inDays: (n) => t('countdown.inDays', { n }) }}
                  whyAria={t('whyHard', { name: ev.name })}
                  onOpen={(rect) => { setActiveEventAnchor(rect); setActiveEvent(ev); }}
                  onExplain={(rect) => {
                    setActiveExplainerAnchor(rect);
                    setActiveExplainer({ kind: 'event', id: ev.name, title: ev.name, eventType: ev.type });
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {/* Using your telescope */}
        <section className="mis-block">
          <div className="mis-block-head">
            <h2 className="mis-block-title">{t('sections.scope')}</h2>
            <span className="mis-block-meta">{t('sections.scopeMeta')}</span>
          </div>
          <TelescopeGuide
            tips={TIPS.map((tp) => ({ title: t(`tips.${tp.key}.title`), body: t(`tips.${tp.key}.body`), Icon: tp.Icon }))}
            scopeName={t('scopeName')}
          />
        </section>

        {/* Before you step out */}
        <section className="mis-block">
          <div className="mis-block-head">
            <h2 className="mis-block-title">{t('sections.observer')}</h2>
            <span className="mis-block-meta">{t('sections.observerMeta')}</span>
          </div>
          <ObserverAssist
            items={[
              { Icon: Clock, label: t('observer.dark.label'), value: dark.duskStart && dark.dawnEnd ? `${fmtClock(dark.duskStart)}–${fmtClock(dark.dawnEnd)}` : t('glance.unknown'), body: t('observer.dark.body') },
              { Icon: LcMoon, label: t('observer.moon.label'), value: moonGlance ? t('observer.moon.value', { pct: moonGlance.illum }) : t('glance.unknown'), body: t('observer.moon.body') },
              { Icon: Crosshair, label: t('observer.target.label'), value: questPos ? t('observer.target.value', { deg: Math.round(questPos.altitude) }) : t('glance.unknown'), body: t('observer.target.body') },
              { Icon: Cloud, label: t('observer.comfort.label'), value: cloudCoverPct == null ? t('glance.unknown') : t('observer.comfort.value', { pct: cloudCoverPct }), body: t('observer.comfort.body') },
              { Icon: Eye, label: t('observer.phone.label'), value: t('observer.phone.value'), body: t('observer.phone.body') },
            ]}
          />
        </section>
      </div>

      {/* Quick observe FAB */}
      <button type="button" className="mis-fab" onClick={() => router.push('/observe')} aria-label={t('quickObserve')}>
        <Plus size={22} strokeWidth={2.4} />
        <span className="mis-fab-label">{t('quickObserve')}</span>
      </button>

      <EventInfoSheet
        open={!!activeEvent}
        event={activeEvent}
        anchorRect={activeEventAnchor}
        onClose={() => { setActiveEvent(null); setActiveEventAnchor(null); }}
      />

      <DifficultyExplainer
        open={!!activeExplainer}
        anchorRect={activeExplainerAnchor}
        onClose={() => { setActiveExplainer(null); setActiveExplainerAnchor(null); }}
        target={activeExplainer?.kind === 'mission' ? activeExplainer.id : undefined}
        eventType={activeExplainer?.kind === 'event' ? activeExplainer.eventType : undefined}
        title={activeExplainer?.title ?? ''}
        location={{ lat: location.lat, lon: location.lon }}
      />
    </div>
  );
}

// ---- Progress summary bar (4 zones) ----

function SummaryBar({
  completionPct, earned, nightGoal, rating, rewardPct, allDone, onContinue, labels,
}: {
  completionPct: number;
  earned: number;
  nightGoal: number;
  rating: number;
  rewardPct: number | null;
  allDone: boolean;
  onContinue: () => void;
  labels: { title: string; complete: string; starsEarned: string; nextReward: string; coupon: string; maxReward: string; continue: string };
}) {
  const R = 26;
  const C = 2 * Math.PI * R;
  const dash = C * Math.min(1, Math.max(0, completionPct / 100));
  return (
    <section className="mis-summary">
      {/* Zone A — completion ring */}
      <div className="mis-summary-zone mis-summary-zone--ring">
        <div className="mis-ring" aria-hidden>
          <svg viewBox="0 0 64 64" width="64" height="64">
            <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
            <circle
              cx="32" cy="32" r={R} fill="none" stroke="var(--terracotta)" strokeWidth="5"
              strokeLinecap="round" strokeDasharray={`${dash} ${C}`} transform="rotate(-90 32 32)"
            />
          </svg>
          <span className="mis-ring-pct">{completionPct}%</span>
        </div>
        <div className="mis-summary-meta">
          <span className="mis-summary-eyebrow"><Sun size={12} strokeWidth={1.9} /> {labels.title}</span>
          <span className="mis-summary-sub">{labels.complete}</span>
        </div>
      </div>

      <span className="mis-summary-div" aria-hidden />

      {/* Zone B — Stars vs tonight's goal */}
      <div className="mis-summary-zone">
        <span className="mis-summary-num">{earned} <i>/ {nightGoal}</i></span>
        <span className="mis-summary-sub">{labels.starsEarned}</span>
        <span className="mis-summary-stars" aria-label={`${rating}/5`}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} size={11} strokeWidth={1.8} className={i < rating ? 'is-on' : ''} fill={i < rating ? 'currentColor' : 'none'} />
          ))}
        </span>
      </div>

      <span className="mis-summary-div" aria-hidden />

      {/* Zone C — next coupon reward */}
      <div className="mis-summary-zone">
        <span className="mis-summary-eyebrow"><Gift size={12} strokeWidth={1.8} /> {labels.nextReward}</span>
        <span className="mis-summary-reward">{rewardPct != null ? `${rewardPct}%` : <Star size={16} strokeWidth={2} fill="currentColor" />}</span>
        <span className="mis-summary-sub">{rewardPct != null ? labels.coupon : labels.maxReward}</span>
      </div>

      <span className="mis-summary-div" aria-hidden />

      {/* Zone D — continue */}
      <div className="mis-summary-zone mis-summary-zone--cta">
        <button type="button" className="mis-progress-cta" onClick={onContinue} disabled={allDone}>
          {labels.continue}
          {!allDone && <ChevronRight size={15} strokeWidth={2.2} />}
        </button>
      </div>
    </section>
  );
}

// ---- ISS pass card (line-art satellite, no emoji) ----

function IssIcon({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden fill="none">
      <line x1="2" y1="16" x2="13" y2="16" stroke="#6B7280" strokeWidth="1.4" />
      <line x1="19" y1="16" x2="30" y2="16" stroke="#6B7280" strokeWidth="1.4" />
      <rect x="2" y="11" width="9" height="4" rx="0.5" fill="#8465CB" opacity="0.85" />
      <rect x="2" y="17" width="9" height="4" rx="0.5" fill="#8465CB" opacity="0.85" />
      <rect x="21" y="11" width="9" height="4" rx="0.5" fill="#8465CB" opacity="0.85" />
      <rect x="21" y="17" width="9" height="4" rx="0.5" fill="#8465CB" opacity="0.85" />
      <rect x="13" y="13" width="6" height="6" rx="1" fill="#C9D4E8" stroke="#8465CB" strokeWidth="1" />
    </svg>
  );
}

function IssCard({
  iss, loading, onOpen, labels,
}: {
  iss: IssPass | null;
  loading: boolean;
  onOpen: () => void;
  labels: { name: string; loading: string; none: string; peak: (deg: number) => string };
}) {
  const time = iss ? fmtClock(new Date(iss.startsAt)) : null;
  return (
    <button type="button" className="mis-nearby-card mis-nearby-card--iss" onClick={onOpen}>
      <span className="mis-nearby-art mis-nearby-art--iss"><IssIcon size={42} /></span>
      <span className="mis-nearby-name">{labels.name}</span>
      <span className={`mis-nearby-badge${time ? ' is-iss' : ''}`}>
        {loading ? labels.loading : time ?? labels.none}
      </span>
      <span className="mis-nearby-stars mis-nearby-stars--muted">{iss ? labels.peak(iss.peakElevation) : '—'}</span>
    </button>
  );
}

// ---- Global community mission card ----

function GlobalMissionCard({
  data, labels,
}: {
  data: GlobalMissionData | null;
  labels: { title: string; heading: (target: string) => string; observers: string; reward: (n: number) => string; loading: string };
}) {
  const pct = data ? Math.min(100, Math.round((data.current / data.goal) * 100)) : 0;
  return (
    <section className="mis-card mis-card--global">
      <span className="mis-global-art" aria-hidden><SkyOrb name={data?.target ?? 'saturn'} /></span>
      <div className="mis-card-head">
        <span className="mis-card-eyebrow"><Globe size={12} strokeWidth={1.9} /> {labels.title}</span>
      </div>
      {data ? (
        <>
          <p className="mis-global-heading">{labels.heading(data.target)}</p>
          <div className="mis-global-bar" aria-hidden><span style={{ width: `${pct}%` }} /></div>
          <p className="mis-global-count">
            <Users size={12} strokeWidth={1.8} />
            <b>{data.current.toLocaleString()}</b> / {data.goal.toLocaleString()} {labels.observers}
          </p>
          <p className="mis-global-reward"><Star size={11} strokeWidth={2} className="mis-star-icn" /> {labels.reward(data.bonusStars)}</p>
        </>
      ) : (
        <p className="mis-global-heading">{labels.loading}</p>
      )}
    </section>
  );
}

// ---- Main quest card ----

function MainQuestCard({
  entry, altitude, window: win, visibilityStars: vis, onObserve, labels,
}: {
  entry: LocalizedGridEntry;
  altitude: number | null;
  window: { kind: 'window'; text: string } | { kind: 'anytime' } | { kind: 'later'; time: string } | null;
  visibilityStars: number;
  onObserve: () => void;
  labels: {
    badge: string; bestViewing: string; reward: string; visibility: string;
    observe: string; anytime: string; later: (time: string) => string;
  };
}) {
  const winText = !win ? '—'
    : win.kind === 'window' ? win.text
    : win.kind === 'anytime' ? labels.anytime
    : labels.later(win.time);
  return (
    <section className="mis-quest">
      <span className="mis-quest-art" aria-hidden>
        <SkyOrb name={entry.id} />
      </span>
      <div className="mis-quest-body">
        <span className="mis-quest-badge"><Star size={11} strokeWidth={2} fill="currentColor" /> {labels.badge}</span>
        <h2 className="mis-quest-name">{entry.name}</h2>
        <div className="mis-quest-meta">
          <span className="mis-quest-meta-item">
            <Clock size={12} strokeWidth={1.8} />
            <span className="mis-quest-meta-val"><i>{labels.bestViewing}</i><b>{winText}</b></span>
          </span>
          <span className="mis-quest-meta-item">
            <Star size={12} strokeWidth={2} fill="currentColor" className="mis-star-icn" />
            <span className="mis-quest-meta-val"><i>{labels.reward}</i><b className="mis-quest-reward-b">+{entry.stars}</b></span>
          </span>
        </div>
        <div className="mis-quest-foot">
          <span className="mis-quest-vis">
            <i>{labels.visibility}</i>
            <span className="mis-quest-vis-stars" aria-label={`${vis}/5`}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} size={12} strokeWidth={1.8} className={i < vis ? 'is-on' : ''} fill={i < vis ? 'currentColor' : 'none'} />
              ))}
            </span>
          </span>
          <button type="button" className="mis-quest-cta" onClick={onObserve}>
            {labels.observe}
            {altitude != null && altitude > 0 && <em>{Math.round(altitude)}°</em>}
          </button>
        </div>
      </div>
    </section>
  );
}

// ---- Mission list row ----

function MissionRow({
  entry, above, pct, rise, onStart, labels,
}: {
  entry: LocalizedGridEntry;
  above: boolean;
  pct: number;
  rise: Date | null;
  onStart: () => void;
  labels: {
    visibleNow: string;
    after: (time: string) => string;
    comingLater: string;
    observe: string;
    min: (n: number) => string;
  };
}) {
  const statusText = above ? labels.visibleNow : rise ? labels.after(fmtClock(rise)) : labels.comingLater;
  return (
    <div className="mis-row" role="button" tabIndex={0}
      onClick={() => { if (above) onStart(); }}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && above) { e.preventDefault(); onStart(); } }}
    >
      <span className="mis-row-art" aria-hidden><SkyOrb name={entry.id} /></span>
      <div className="mis-row-main">
        <span className="mis-row-top">
          <span className="mis-row-name">{entry.name}</span>
          <span className={`mis-row-diff ${entry.diff}`}>{entry.diffLabel}</span>
        </span>
        <span className="mis-row-sub">
          <span className={`mis-row-status${above ? ' is-up' : ''}`}>{statusText}</span>
        </span>
      </div>
      <div className="mis-row-stats">
        <span className="mis-row-stat"><Clock size={11} strokeWidth={1.8} />{labels.min(entry.estMin)}</span>
        <span className="mis-row-stat"><Eye size={11} strokeWidth={1.8} />{above ? `${pct}%` : '—'}</span>
      </div>
      <span className="mis-row-stars"><Star size={11} strokeWidth={2} className="mis-star-icn" />+{entry.stars}</span>
      {above ? (
        <button type="button" className="mis-row-btn" onClick={(e) => { e.stopPropagation(); onStart(); }}>
          {labels.observe}
        </button>
      ) : (
        <span className="mis-row-btn is-disabled">{labels.comingLater}</span>
      )}
    </div>
  );
}

// ---- Weather card ----

function WeatherCard({
  cloudCoverPct, tempC, labels,
}: {
  cloudCoverPct: number | null;
  tempC: number | null;
  labels: {
    title: string; clear: string; partly: string; cloudy: string;
    cloudCover: string; good: string; poor: string; unknown: string;
  };
}) {
  const cover = cloudCoverPct;
  const summary = cover == null ? labels.unknown : cover < 20 ? labels.clear : cover < 60 ? labels.partly : labels.cloudy;
  const good = cover != null && cover < 40;
  return (
    <section className="mis-card mis-card--weather">
      <div className="mis-card-head">
        <span className="mis-card-eyebrow"><Cloud size={12} strokeWidth={1.9} /> {labels.title}</span>
      </div>
      <p className="mis-weather-summary">{summary}</p>
      <div className="mis-weather-stats">
        <span className="mis-weather-stat">
          <b>{tempC == null ? '—' : `${tempC}°C`}</b>
        </span>
        <span className="mis-weather-stat">
          <b>{cover == null ? '—' : `${cover}%`}</b>
          <i>{labels.cloudCover}</i>
        </span>
      </div>
      {cover != null && (
        <span className={`mis-weather-verdict${good ? ' is-good' : ''}`}>{good ? labels.good : labels.poor}</span>
      )}
    </section>
  );
}

// ---- Telescope guide ----

function TelescopeGuide({
  tips, scopeName,
}: {
  tips: { title: string; body: string; Icon: LucideIcon }[];
  scopeName: string;
}) {
  return (
    <div className="mis-scope">
      <div className="mis-scope-photo">
        <Image
          src="/images/telescopes/refractor.jpg"
          alt={scopeName}
          fill
          sizes="(max-width: 720px) 100vw, 360px"
          style={{ objectFit: 'cover' }}
          priority={false}
        />
        <span className="mis-scope-photo-label">{scopeName}</span>
      </div>
      <ul className="mis-scope-steps">
        {tips.map((tip) => {
          const Icon = tip.Icon;
          return (
            <li key={tip.title} className="mis-scope-step">
              <span className="mis-scope-step-icon" aria-hidden>
                <Icon size={14} strokeWidth={1.7} />
              </span>
              <span className="mis-scope-step-text">
                <span className="mis-scope-step-title">{tip.title}</span>
                <span className="mis-scope-step-body">{tip.body}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ObserverAssist({
  items,
}: {
  items: { label: string; value: string; body: string; Icon: LucideIcon }[];
}) {
  return (
    <div className="mis-observer-grid">
      {items.map((item) => {
        const Icon = item.Icon;
        return (
          <div key={item.label} className="mis-observer-item">
            <span className="mis-observer-icon" aria-hidden>
              <Icon size={14} strokeWidth={1.8} />
            </span>
            <span className="mis-observer-copy">
              <span className="mis-observer-label">{item.label}</span>
              <span className="mis-observer-value">{item.value}</span>
              <span className="mis-observer-body">{item.body}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---- Rare event card ----

function RareEventCard({
  event, typeLabel, countdown, onOpen,
}: {
  event: AstroEvent;
  typeLabel: string;
  countdown: {
    today: string;
    tomorrow: string;
    past: string;
    inDays: (n: number) => string;
    inMonths: (n: number) => string;
  };
  onOpen: (rect: DOMRect) => void;
}) {
  const days = daysFromToday(event.date);
  const dateLabel = new Date(event.date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const monthLabel = new Date(event.date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
  const dayNum = new Date(event.date + 'T12:00:00').getDate();
  const future = days >= 0;
  const countdownText = !future
    ? countdown.past
    : days === 0
      ? countdown.today
      : days === 1
        ? countdown.tomorrow
        : days < 30
          ? countdown.inDays(days)
          : countdown.inMonths(Math.round(days / 30));

  return (
    <button
      type="button"
      onClick={(e) => onOpen((e.currentTarget as HTMLElement).getBoundingClientRect())}
      className="mis-rare-card"
      style={{ opacity: future ? 1 : 0.55 }}
    >
      <span className={`mis-rare-art mis-rare-art--${event.type}`} aria-hidden>
        <RareEventArt type={event.type} />
      </span>
      <span className="mis-rare-date">
        <span className="mis-rare-date-month">{monthLabel}</span>
        <span className="mis-rare-date-day">{dayNum}</span>
      </span>
      <span className="mis-rare-info">
        <span className="mis-rare-tag">{typeLabel}</span>
        <span className="mis-rare-name">{event.name}</span>
        <span className="mis-rare-meta">
          {dateLabel} · {countdownText}
        </span>
      </span>
    </button>
  );
}

function RareEventArt({ type }: { type: AstroEvent['type'] }) {
  if (type === 'eclipse-solar') {
    return (
      <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
        <defs>
          <radialGradient id="rareSun" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#FFB23A" />
            <stop offset="80%" stopColor="#F25A1A" />
            <stop offset="100%" stopColor="#9A2A0E" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="22" fill="url(#rareSun)" />
        <circle cx="38" cy="30" r="20" fill="#0A1735" />
      </svg>
    );
  }
  if (type === 'eclipse-lunar') {
    return (
      <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
        <defs>
          <radialGradient id="rareMoon" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#E54B3F" />
            <stop offset="80%" stopColor="#7A1F18" />
            <stop offset="100%" stopColor="#2B0A07" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="22" fill="url(#rareMoon)" />
        <circle cx="22" cy="26" r="2" fill="#000" opacity="0.35" />
        <circle cx="40" cy="34" r="2.5" fill="#000" opacity="0.3" />
        <circle cx="30" cy="40" r="1.8" fill="#000" opacity="0.4" />
      </svg>
    );
  }
  // comet
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
      <defs>
        <linearGradient id="rareTail" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5EEAD4" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#5EEAD4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M52 12 L20 44" stroke="url(#rareTail)" strokeWidth="6" strokeLinecap="round" />
      <circle cx="52" cy="12" r="6" fill="#FFFFFF" />
      <circle cx="52" cy="12" r="3" fill="#5EEAD4" />
    </svg>
  );
}

// ---- Upcoming event row ----

const EVENT_DIFFICULTY_COLOR: Record<AstroEvent['difficulty'], string> = {
  'naked-eye': 'var(--seafoam)',
  'binoculars': 'var(--terracotta)',
  'telescope': 'var(--terracotta)',
  'expert': 'var(--negative)',
};

function daysFromToday(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const event = new Date(dateStr + 'T12:00:00');
  event.setHours(0, 0, 0, 0);
  return Math.round((event.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function EventRow({ event, typeLabel, difficultyLabel, countdown, whyAria, onOpen, onExplain }: {
  event: AstroEvent;
  typeLabel: string;
  difficultyLabel: string;
  countdown: { today: string; tomorrow: string; inDays: (n: number) => string };
  whyAria: string;
  onOpen: (rect: DOMRect) => void;
  onExplain?: (rect: DOMRect) => void;
}) {
  const days = daysFromToday(event.date);
  const dateLabel = new Date(event.date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return (
    <button
      type="button"
      onClick={(e) => onOpen((e.currentTarget as HTMLElement).getBoundingClientRect())}
      className="mis-event-row"
    >
      <div className="mis-event-date">
        <p className="mis-event-date-main">{dateLabel}</p>
        <p className="mis-event-date-sub">
          {days === 0 ? countdown.today : days === 1 ? countdown.tomorrow : countdown.inDays(days)}
        </p>
      </div>
      <div className="mis-event-info">
        <p className="mis-event-name">{event.name}</p>
        <p className="mis-event-meta">{typeLabel} · {event.visibilityRegion}</p>
      </div>
      <span
        className="mis-event-diff"
        style={{
          color: EVENT_DIFFICULTY_COLOR[event.difficulty],
          border: `1px solid ${EVENT_DIFFICULTY_COLOR[event.difficulty]}55`,
          background: `${EVENT_DIFFICULTY_COLOR[event.difficulty]}1A`,
        }}
      >
        {difficultyLabel}
      </span>
      {onExplain ? (
        <span
          role="button"
          tabIndex={0}
          aria-label={whyAria}
          onClick={(e) => { e.stopPropagation(); onExplain((e.currentTarget as HTMLElement).getBoundingClientRect()); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              onExplain((e.currentTarget as HTMLElement).getBoundingClientRect());
            }
          }}
          className="mis-info-dot"
        >
          i
        </span>
      ) : null}
    </button>
  );
}

// ---- Quiz row ----

function QuizRow({
  Icon, gradient, title, meta, reward, done, onClick,
}: {
  Icon: LucideIcon;
  gradient: string;
  title: string;
  meta: string;
  reward: number;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className="mis-quiz-row" onClick={onClick}>
      <span
        className="mis-quiz-row-icon"
        style={{
          background: gradient,
          boxShadow: '0 6px 16px -4px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
        }}
      >
        <Icon size={18} strokeWidth={2.2} color="#FFFFFF" />
      </span>
      <span className="mis-quiz-row-body">
        <span className="mis-quiz-row-title">
          {title}
          {done && <span className="mis-quiz-row-done" aria-hidden>✓</span>}
        </span>
        <span className="mis-quiz-row-meta">{meta}</span>
      </span>
      <span className="mis-quiz-row-reward">+{reward} ✦</span>
    </button>
  );
}
