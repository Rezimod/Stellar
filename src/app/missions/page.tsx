'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppState } from '@/hooks/useAppState';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useVisibleInterval } from '@/hooks/useVisibleInterval';
import { AuthModal } from '@/components/auth/AuthModal';
import { useLocale, useTranslations } from 'next-intl';
import { useLocation } from '@/lib/location';
import { getVisiblePlanets, getWindowPlanets } from '@/lib/planets';
import { getTonightDarkWindow } from '@/lib/dark-window';
import { getChartDeepSky } from '@/lib/sky-chart';
import { getRank } from '@/lib/rewards';
import { MISSIONS } from '@/lib/constants';
import { QUIZZES } from '@/lib/quizzes';
import { PlanetViz } from '@/components/sky/PlanetViz';
import QuizActive from '@/components/sky/QuizActive';
import type { QuizDef } from '@/lib/quizzes';
import {
  Snowflake,
  Telescope as LcTelescope,
  Crosshair,
  Moon as LcMoon,
  CloudSun,
  TrendingUp,
  BookOpen,
  Users,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type DiffClass = 'easy' | 'med' | 'hard' | 'expert';

interface GridEntry {
  id: string;
  name: string;
  desc: string;
  stars: number;
  diff: DiffClass;
  diffLabel: string;
  equip: string;
  routeId: string; // which mission id to open on click
}

// Exactly 9 tiles in display order. Entries map to MISSIONS where possible;
// venus + mars are synthetic tiles that route to the free-observation fallback.
const GRID: GridEntry[] = [
  { id: 'moon',      name: 'The Moon',         desc: 'Craters, seas, and the terminator line',     stars: 50,  diff: 'easy',   diffLabel: 'Easy',   equip: 'Naked eye', routeId: 'moon' },
  { id: 'jupiter',   name: 'Jupiter',          desc: 'Spot the four Galilean moons',                stars: 75,  diff: 'easy',   diffLabel: 'Easy',   equip: 'Telescope', routeId: 'jupiter' },
  { id: 'pleiades',  name: 'Pleiades (M45)',   desc: 'Seven sisters — naked eye showpiece',         stars: 60,  diff: 'easy',   diffLabel: 'Easy',   equip: 'Naked eye', routeId: 'pleiades' },
  { id: 'venus',     name: 'Venus',            desc: 'Brightest planet — the evening star',         stars: 40,  diff: 'easy',   diffLabel: 'Easy',   equip: 'Naked eye', routeId: 'free-observation' },
  { id: 'saturn',    name: 'Saturn',           desc: 'The rings are unmistakable',                  stars: 100, diff: 'med',    diffLabel: 'Medium', equip: 'Telescope', routeId: 'saturn' },
  { id: 'mars',      name: 'Mars',             desc: 'Look for the polar ice cap',                  stars: 85,  diff: 'med',    diffLabel: 'Medium', equip: 'Telescope', routeId: 'free-observation' },
  { id: 'orion',     name: 'Orion Nebula (M42)', desc: 'A stellar nursery — glows in any scope',     stars: 100, diff: 'med',    diffLabel: 'Medium', equip: 'Telescope', routeId: 'orion' },
  { id: 'andromeda', name: 'Andromeda (M31)',  desc: '2.5 million light-years — nearest spiral',    stars: 175, diff: 'hard',   diffLabel: 'Hard',   equip: 'Binoculars', routeId: 'andromeda' },
  { id: 'crab',      name: 'Crab Nebula (M1)', desc: 'Supernova remnant from 1054 AD',              stars: 250, diff: 'expert', diffLabel: 'Expert', equip: 'Telescope', routeId: 'crab' },
];

const TIPS: { title: string; body: string; Icon: LucideIcon }[] = [
  {
    title: 'Cool the optics',
    body: 'Set up 30 min before observing. Warm glass blurs detail.',
    Icon: Snowflake,
  },
  {
    title: 'Start at low power',
    body: 'Find the target with your widest eyepiece, then zoom in.',
    Icon: LcTelescope,
  },
  {
    title: 'Align by day',
    body: 'Match finder to a distant tree. Saves 15 min at night.',
    Icon: Crosshair,
  },
  {
    title: 'Mind dark adaptation',
    body: 'Eyes need 20–30 min. Use red light only.',
    Icon: LcMoon,
  },
];

const EXPLORE: { href: string; name: string; meta: string; desc: string; Icon: LucideIcon }[] = [
  { href: '/sky',         name: 'Sky',      meta: 'Forecast',  desc: '7-day cloud, seeing, and transparency forecast for your location.', Icon: CloudSun },
  { href: '/markets',     name: 'Markets',  meta: 'Stake',     desc: 'Weekly prediction markets on celestial events. Optional bonus layer.',          Icon: TrendingUp },
  { href: '/learn',       name: 'Learning', meta: 'Articles',  desc: 'Field guides, equipment primers, and observing techniques.',        Icon: BookOpen },
  { href: '/network',     name: 'Network',  meta: 'Community', desc: 'See where other Stellar observers are reporting from tonight.',     Icon: Users },
  { href: '/marketplace', name: 'Shop',     meta: 'Gear',      desc: 'Telescopes, eyepieces, and accessories from verified dealers.',     Icon: LcTelescope },
  { href: '/chat',        name: 'ASTRA AI', meta: 'Assistant', desc: 'Ask anything about the night sky or your equipment.',                Icon: Sparkles },
];

const LINEUP_KEYS = ['moon', 'jupiter', 'saturn', 'mars', 'venus', 'mercury'];

interface QuizUi {
  key: 'solar-system' | 'constellations' | 'telescopes' | 'universe' | 'space-exploration';
  Icon: () => React.ReactElement;
  reward: number;
  descEn: string;
  descKa: string;
}

const QUIZ_UI: Record<string, QuizUi> = {
  'solar-system':      { key: 'solar-system',      Icon: SunIcon,       reward: 100, descEn: '10 questions · planets, moons, orbits',      descKa: '10 კითხვა · პლანეტები, მთვარეები, ორბიტები' },
  'constellations':    { key: 'constellations',    Icon: StarIcon,      reward: 100, descEn: '10 questions · stars, myths, sky patterns',    descKa: '10 კითხვა · ვარსკვლავები, მითები, ცის ფიგურები' },
  'telescopes':        { key: 'telescopes',        Icon: TelescopeIcon, reward: 100, descEn: '10 questions · optics, mounts, magnification', descKa: '10 კითხვა · ოპტიკა, სადგარები, გადიდება' },
  'universe':          { key: 'universe',          Icon: DeepSkyIcon,   reward: 100, descEn: '10 questions · galaxies, cosmology, time',     descKa: '10 კითხვა · გალაქტიკები, კოსმოლოგია, დრო' },
  'space-exploration': { key: 'space-exploration', Icon: RocketIcon,    reward: 100, descEn: '10 questions · missions, probes, astronauts',  descKa: '10 კითხვა · მისიები, ზონდები, ასტრონავტები' },
};

export default function MissionsPage() {
  const router = useRouter();
  const { state } = useAppState();
  const { authenticated } = useStellarUser();
  const [authOpen, setAuthOpen] = useState(false);
  const locale = useLocale() === 'ka' ? 'ka' : 'en';
  const t = useTranslations('missions');
  const { location } = useLocation();

  const [now, setNow] = useState<Date>(() => new Date());
  const [activeQuiz, setActiveQuiz] = useState<QuizDef | null>(null);

  useVisibleInterval(() => setNow(new Date()), 60_000);

  const lat = location.lat ?? 41.7151;
  const lon = location.lon ?? 44.8271;
  const cityLabel = location.city || 'Tbilisi';

  const dark = useMemo(() => getTonightDarkWindow(lat, lon, now), [lat, lon, now]);
  const evalTime = dark.evalTime;

  // Window-based visibility: best altitude any planet/object reaches during
  // tonight's astronomical-dark window. This drives the "Missions tonight"
  // grid + visible count, so it stays accurate during daylight or cloudy
  // weather — it's a forecast of *tonight*, not a live readout.
  const tonightWindowPlanets = useMemo(() => {
    if (dark.duskStart && dark.dawnEnd) {
      return getWindowPlanets(lat, lon, dark.duskStart, dark.dawnEnd);
    }
    return getVisiblePlanets(lat, lon, evalTime);
  }, [lat, lon, evalTime, dark.duskStart, dark.dawnEnd]);

  // Live positions: where planets actually are right now. Only used to fill
  // the LIVE strip when the sky is dark *and* clear.
  const livePlanets = useMemo(() => getVisiblePlanets(lat, lon, now), [lat, lon, now]);

  // Current cloud cover for the LIVE gate. Pulled from the cached sky-forecast
  // route; we just snap to the hour closest to now.
  const [cloudCoverPct, setCloudCoverPct] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/sky/forecast?lat=${lat}&lon=${lon}`);
        if (!res.ok) return;
        const days: { hours: { time: string; cloudCover: number }[] }[] = await res.json();
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
      } catch { /* leave null — LIVE gate stays optimistic */ }
    })();
    return () => { cancelled = true; };
  }, [lat, lon]);

  const skyPositions = useMemo(() => {
    const out: Record<string, { altitude: number; azimuth: number; rise: Date | null }> = {};
    for (const p of tonightWindowPlanets) {
      const rise = p.rise instanceof Date ? p.rise : null;
      out[p.key] = { altitude: p.altitude, azimuth: p.azimuth, rise };
    }
    const ds = getChartDeepSky(lat, lon, evalTime, 200, 100, 180);
    for (const d of ds) {
      out[d.id] = { altitude: d.altitude, azimuth: d.azimuth, rise: null };
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

  const completedCount = useMemo(
    () => GRID.filter((g) => completedIds.has(g.id)).length,
    [completedIds],
  );

  const primeEntry = useMemo(() => {
    const visible = GRID
      .filter((g) => !completedIds.has(g.id))
      .filter((g) => (skyPositions[g.id]?.altitude ?? -90) > 10);
    if (visible.length === 0) return null;
    visible.sort((a, b) => (skyPositions[b.id]?.altitude ?? -90) - (skyPositions[a.id]?.altitude ?? -90));
    return visible[0];
  }, [completedIds, skyPositions]);

  const totalStars = useMemo(() => {
    const missionStars = state.completedMissions
      .filter((m) => m.status === 'completed')
      .reduce((sum, m) => {
        const mission = MISSIONS.find((x) => x.id === m.id);
        return sum + (mission?.stars ?? 0);
      }, 0);
    const quizStars = (state.completedQuizzes ?? []).reduce((sum, r) => sum + (r.stars ?? 0), 0);
    return missionStars + quizStars;
  }, [state.completedMissions, state.completedQuizzes]);

  const rank = useMemo(
    () => getRank(state.completedMissions.filter((m) => m.status === 'completed').length),
    [state.completedMissions],
  );

  const headerTime = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const dateLabel = now.toLocaleDateString([], { month: 'short', day: 'numeric' });

  // LIVE gate: only show real-time planets when it is actually astronomical
  // dark *and* the sky isn't overcast. Anything else collapses the lineup to
  // an empty state so users aren't misled into pointing a scope at clouds.
  const CLOUD_OVERCAST_PCT = 70;
  const isCloudy = cloudCoverPct != null && cloudCoverPct >= CLOUD_OVERCAST_PCT;
  const liveStatus: 'live' | 'daytime' | 'cloudy' = !dark.isCurrentlyDark
    ? 'daytime'
    : isCloudy
      ? 'cloudy'
      : 'live';

  const startMission = useCallback((routeId: string) => {
    router.push(`/observe/${routeId}`);
  }, [router]);

  const lineup = useMemo(() => {
    if (liveStatus !== 'live') return [];
    const map = new Map(livePlanets.map((p) => [p.key, p] as const));
    const items: {
      key: string;
      name: string;
      altitude: number;
      azimuthDir: string;
      magnitude: number;
      routeId: string;
      stars: number;
    }[] = [];
    for (const key of LINEUP_KEYS) {
      const p = map.get(key);
      if (!p || p.altitude <= 0) continue;
      const entry = GRID.find((g) => g.id === key);
      items.push({
        key,
        name: entry?.name ?? key.charAt(0).toUpperCase() + key.slice(1),
        altitude: p.altitude,
        azimuthDir: p.azimuthDir,
        magnitude: p.magnitude,
        routeId: entry?.routeId ?? 'free-observation',
        stars: entry?.stars ?? 40,
      });
    }
    items.sort((a, b) => b.altitude - a.altitude);
    return items;
  }, [liveStatus, livePlanets]);

  // ---- Auth gate ----
  if (!authenticated) {
    return (
      <div className="missions-page">
        <div className="mis-hero">
          <div className="mis-hero-inner">
            <div className="mis-stats-bar">
              <div className="mis-stats-left">
                <h1 className="mis-stats-title">{t('title')}</h1>
                <span className="mis-stats-meta">Sign in to start observing</span>
              </div>
            </div>
            <TonightLineup
              items={lineup}
              liveStatus={liveStatus}
              headerTime={headerTime}
              dateLabel={dateLabel}
              cityLabel={cityLabel}
              onStart={() => undefined}
            />
          </div>
        </div>

        <div className="mis-content">
          <section className="mis-section">
            <div className="mis-auth-card">
              <h2 className="mis-auth-title">Sign in to start observing</h2>
              <p className="mis-auth-body">
                Complete sky missions, earn Stars, and mint discovery NFTs on Solana.
              </p>
              <button type="button" className="mis-auth-btn" onClick={() => setAuthOpen(true)}>
                Sign in
              </button>
              <p className="mis-auth-sub">Email or connect a Solana wallet</p>
            </div>
          </section>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    );
  }

  return (
    <div className="missions-page">
      {activeQuiz && <QuizActive quiz={activeQuiz} onClose={() => setActiveQuiz(null)} />}

      {/* Cosmic hero — always dark, full-width */}
      <div className="mis-hero">
        <div className="mis-hero-inner">
          <div className="mis-stats-bar">
            <div className="mis-stats-left">
              <h1 className="mis-stats-title">Missions</h1>
              <span className="mis-stats-meta">
                {completedCount}/{GRID.length} completed · {visibleCount} visible
              </span>
            </div>
            <div className="mis-stats-right">
              <span className="mis-rank-pill">{rank.name}</span>
              <span className="mis-stars-count">{totalStars} ✦</span>
            </div>
          </div>

          {primeEntry && (
            <PrimeCard
              entry={primeEntry}
              altitude={skyPositions[primeEntry.id]?.altitude ?? null}
              onStart={() => startMission(primeEntry.routeId)}
            />
          )}

          <TonightLineup
            items={lineup}
            liveStatus={liveStatus}
            headerTime={headerTime}
            dateLabel={dateLabel}
            cityLabel={cityLabel}
            onStart={(routeId) => startMission(routeId)}
          />
        </div>
      </div>

      <div className="mis-content">
        <section className="mis-section">
          <div className="mis-section-head">
            <h2 className="mis-section-title">Missions tonight</h2>
            <span className="mis-section-meta">{visibleCount} targets visible</span>
          </div>
          <div className="mis-deck">
            {GRID.map((g) => {
              const pos = skyPositions[g.id];
              const altitude = pos?.altitude ?? -90;
              return (
                <MissionTile
                  key={g.id}
                  entry={g}
                  above={altitude > 0}
                  rise={pos?.rise ?? null}
                  onStart={() => startMission(g.routeId)}
                />
              );
            })}
          </div>
        </section>

        <section className="mis-section">
          <div className="mis-section-head">
            <h2 className="mis-section-title">Knowledge quizzes</h2>
            <span className="mis-section-meta">{QUIZZES.length} quizzes · earn while you wait</span>
          </div>
          <div className="mis-quiz-deck">
            {QUIZZES.map((quiz) => {
              const ui = QUIZ_UI[quiz.id];
              if (!ui) return null;
              const result = completedQuizIds.get(quiz.id);
              const score = result?.score ?? 0;
              const total = quiz.questions.length;
              const title = quiz.title[locale] ?? quiz.title.en;
              const desc = locale === 'ka' ? ui.descKa : ui.descEn;
              return (
                <QuizTile
                  key={quiz.id}
                  variant={ui.key}
                  Icon={ui.Icon}
                  title={title}
                  meta={desc}
                  reward={ui.reward}
                  score={score}
                  total={total}
                  onClick={() => setActiveQuiz(quiz)}
                />
              );
            })}
          </div>
        </section>

        <section className="mis-section">
          <div className="mis-section-head">
            <h2 className="mis-section-title">Using your telescope</h2>
            <span className="mis-section-meta">Field-tested tips</span>
          </div>
          <div className="mis-tips-deck">
            {TIPS.map((tip, i) => {
              const Icon = tip.Icon;
              return (
                <article key={tip.title} className="mis-tip-card">
                  <span className="mis-tip-icon" aria-hidden>
                    <Icon size={16} strokeWidth={1.6} />
                  </span>
                  <span className="mis-tip-num">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="mis-tip-title">{tip.title}</h3>
                  <p className="mis-tip-body">{tip.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mis-section">
          <div className="mis-section-head">
            <h2 className="mis-section-title">Elsewhere in Stellar</h2>
            <span className="mis-section-meta">{EXPLORE.length} sections</span>
          </div>
          <div className="mis-explore-deck">
            {EXPLORE.map((p) => {
              const Icon = p.Icon;
              return (
                <Link key={p.href} href={p.href} className="mis-explore-card">
                  <span className="mis-explore-icon" aria-hidden>
                    <Icon size={22} strokeWidth={1.6} />
                  </span>
                  <span className="mis-explore-meta">{p.meta}</span>
                  <span className="mis-explore-name">{p.name}</span>
                  <span className="mis-explore-desc">{p.desc}</span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

// ---- Tonight's lineup ----

interface LineupItem {
  key: string;
  name: string;
  altitude: number;
  azimuthDir: string;
  magnitude: number;
  routeId: string;
  stars: number;
}

function TonightLineup({
  items,
  liveStatus,
  headerTime,
  dateLabel,
  cityLabel,
  onStart,
}: {
  items: LineupItem[];
  liveStatus: 'live' | 'daytime' | 'cloudy';
  headerTime: string;
  dateLabel: string;
  cityLabel: string;
  onStart: (routeId: string) => void;
}) {
  const empty =
    liveStatus === 'daytime'
      ? {
          title: 'Daylight — sky is too bright',
          sub: 'The LIVE feed wakes up after astronomical dusk. See "Missions tonight" below for what the sky will offer.',
        }
      : liveStatus === 'cloudy'
        ? {
            title: 'Overcast — nothing observable right now',
            sub: 'Cloud cover is blocking the sky. "Missions tonight" still shows what would be up if it cleared.',
          }
        : {
            title: 'Nothing above the horizon right now',
            sub: 'Check back later tonight — targets rise and set throughout the night.',
          };

  return (
    <div className="mis-lineup" role="region" aria-label="Live visible targets">
      <div className="mis-lineup-head">
        <div className={`mis-lineup-status mis-lineup-status--${liveStatus}`}>
          <span className="mis-lineup-dot" aria-hidden />
          <span>LIVE · {headerTime}</span>
        </div>
        <div className="mis-lineup-loc">{dateLabel} · {cityLabel}</div>
      </div>

      {items.length === 0 ? (
        <div className="mis-lineup-empty">
          <span className="mis-lineup-empty-title">{empty.title}</span>
          <span className="mis-lineup-empty-sub">{empty.sub}</span>
        </div>
      ) : (
        <div className="mis-lineup-list">
          {items.map((p) => (
            <button
              key={p.key}
              type="button"
              className="mis-lineup-item"
              onClick={() => onStart(p.routeId)}
            >
              <span className="mis-lineup-art">
                <PlanetViz name={p.key} size="medium" />
              </span>
              <span className="mis-lineup-info">
                <span className="mis-lineup-name">{p.name}</span>
                <span className="mis-lineup-row">
                  <span className="mis-lineup-stat"><b>{Math.round(p.altitude)}°</b> alt</span>
                  <span className="mis-lineup-sep">·</span>
                  <span className="mis-lineup-stat">{p.azimuthDir}</span>
                  <span className="mis-lineup-sep">·</span>
                  <span className="mis-lineup-stat">mag <b>{p.magnitude}</b></span>
                </span>
              </span>
              <span className="mis-lineup-stars">+{p.stars}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Prime target card ----

function PrimeCard({
  entry,
  altitude,
  onStart,
}: {
  entry: GridEntry;
  altitude: number | null;
  onStart: () => void;
}) {
  const altTxt = altitude != null ? ` · Alt ${Math.round(altitude)}°` : '';
  return (
    <button type="button" className="mis-prime" onClick={onStart}>
      <div className="mis-prime-icon">
        <PlanetViz name={entry.id} size="small" />
      </div>
      <div className="mis-prime-body">
        <span className="mis-prime-badge">Prime target tonight</span>
        <span className="mis-prime-name">{entry.name}</span>
        <span className="mis-prime-desc">{entry.desc}{altTxt}</span>
      </div>
      <span className="mis-prime-cta" aria-hidden>Observe +{entry.stars}</span>
    </button>
  );
}

// ---- Mission tile ----

function fmtRiseClock(d: Date | null): string | null {
  if (!d) return null;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function MissionTile({
  entry,
  above,
  rise,
  onStart,
}: {
  entry: GridEntry;
  above: boolean;
  rise: Date | null;
  onStart: () => void;
}) {
  const [showReminder, setShowReminder] = useState(false);
  const riseTxt = above ? null : fmtRiseClock(rise);
  const badgeTxt = above ? null : riseTxt ? `Rises ${riseTxt}` : 'Below horizon';

  const handleActivate = () => {
    if (above) {
      onStart();
      return;
    }
    setShowReminder((v) => !v);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleActivate();
    }
  };

  const onReminderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: wire up reminder/notification system
  };

  return (
    <div
      id={`mis-card-${entry.id}`}
      className="mis-tile"
      role="button"
      tabIndex={0}
      aria-pressed={!above && showReminder ? true : undefined}
      onClick={handleActivate}
      onKeyDown={onKeyDown}
    >
      <div className={`mis-tile-sky theme-${entry.id}`}>
        <span className={`mis-tile-glow theme-${entry.id}`} aria-hidden />
        <span className="mis-tile-art">
          <PlanetViz name={entry.id} size="large" />
        </span>
        {badgeTxt && (
          <span className="mis-tile-rise-badge" aria-hidden>
            {badgeTxt}
          </span>
        )}
      </div>
      <div className="mis-tile-info">
        <span className="mis-tile-name">{entry.name}</span>
        <span className="mis-tile-desc">{entry.desc}</span>
        <div className="mis-tile-foot">
          <span className="mis-tile-foot-left">
            <span className={`mis-diff ${entry.diff}`}>{entry.diffLabel}</span>
            <span className="mis-tile-equip">
              <EquipIcon kind={entry.equip} />
              <span>{entry.equip}</span>
            </span>
          </span>
          <span className="mis-tile-stars">+{entry.stars}</span>
        </div>
        {!above && showReminder && (
          <div className="mis-tile-reminder" onClick={(e) => e.stopPropagation()}>
            <span className="mis-tile-reminder-text">
              {riseTxt ? `Visible after ${riseTxt} — set a reminder?` : 'Not visible tonight — set a reminder?'}
            </span>
            <button
              type="button"
              className="mis-tile-reminder-btn"
              onClick={onReminderClick}
            >
              Remind me
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EquipIcon({ kind }: { kind: string }) {
  const k = kind.toLowerCase();
  if (k.includes('telescope')) {
    return (
      <svg className="mis-equip-icon" width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M2.5 6.5l8-3.5 1.5 3-8 3.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M5.5 9.2L8 14.5M9 8.6L11.5 14.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="13.2" cy="2.8" r="1.2" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }
  if (k.includes('binocular')) {
    return (
      <svg className="mis-equip-icon" width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="4" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M6.5 10h3M5 7.5l1-3.5h4l1 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  // Naked eye
  return (
    <svg className="mis-equip-icon" width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

// ---- Quiz tile ----

function QuizTile({
  variant,
  Icon,
  title,
  meta,
  reward,
  score,
  total,
  onClick,
}: {
  variant: string;
  Icon: () => React.ReactElement;
  title: string;
  meta: string;
  reward: number;
  score: number;
  total: number;
  onClick: () => void;
}) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const done = score > 0 && score >= total;
  return (
    <button type="button" className="mis-qtile" onClick={onClick}>
      <span className="mis-qtile-play" aria-hidden>
        <PlayIcon />
      </span>
      <span className={`mis-qtile-icon ${variant}`}>
        <Icon />
      </span>
      <span className="mis-qtile-name">{title}</span>
      <span className="mis-qtile-meta">{meta}</span>
      <span className="mis-qtile-reward">+{reward} ✦</span>
      <span className="mis-qtile-progress">
        <span className="mis-qtile-progress-bar">
          {score > 0 && (
            <span
              className={done ? 'done' : ''}
              style={{ width: `${pct}%` }}
            />
          )}
        </span>
        <span className="mis-qtile-progress-text">{score}/{total}</span>
      </span>
    </button>
  );
}

// ---- Inline SVG icons ----

function PlayIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
      <path d="M3 2L8 5L3 8V2Z" fill="currentColor" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2l2.4 5.2L20 8.4l-4 4.1 1 5.8L12 15.4l-5 2.9 1-5.8-4-4.1 5.6-1.2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function TelescopeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="9" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 16l5 4 5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 14v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function DeepSkyIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="0.8" opacity="0.35" strokeDasharray="2 2" />
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="0.5" opacity="0.15" strokeDasharray="1.5 2.5" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2c-2 4-3 8-3 12h6c0-4-1-8-3-12z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 14l-2 4h2M15 14l2 4h-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="1.5" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
