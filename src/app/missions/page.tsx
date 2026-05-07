'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAppState } from '@/hooks/useAppState';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useVisibleInterval } from '@/hooks/useVisibleInterval';
import { AuthModal } from '@/components/auth/AuthModal';
import { useLocale } from 'next-intl';
import { useLocation } from '@/lib/location';
import { getVisiblePlanets, getWindowPlanets } from '@/lib/planets';
import { getTonightDarkWindow } from '@/lib/dark-window';
import { getChartDeepSky } from '@/lib/sky-chart';
import { QUIZZES } from '@/lib/quizzes';
import { PlanetViz } from '@/components/sky/PlanetViz';
import QuizActive from '@/components/sky/QuizActive';
import EventInfoSheet from '@/components/sky/EventInfoSheet';
import DifficultyExplainer from '@/components/sky/DifficultyExplainer';
import { getRareEvents, getUpcomingEvents, type AstroEvent } from '@/lib/astro-events';
import type { QuizDef } from '@/lib/quizzes';
import { Snowflake, Telescope as LcTelescope, Crosshair, Moon as LcMoon, Sun, Star, Globe, Rocket } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const HUB_GRADIENTS = {
  amber:   'linear-gradient(135deg, #FFB347 0%, #FF7E3F 100%)',
  violet:  'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
  fuchsia: 'linear-gradient(135deg, #D946EF 0%, #8B5CF6 100%)',
  teal:    'linear-gradient(135deg, #2DD4BF 0%, #06B6D4 100%)',
  rose:    'linear-gradient(135deg, #FB7185 0%, #E11D48 100%)',
} as const;

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
  { title: 'Let it cool',         body: 'Set it outside 30 min before viewing.',   Icon: Snowflake },
  { title: 'Start zoomed out',    body: 'Use the lowest power eyepiece first.',    Icon: LcTelescope },
  { title: 'Align finder by day', body: 'Aim at a distant tree or sign.',          Icon: Crosshair },
  { title: 'Let your eyes adjust', body: '20 min in the dark. No phone screens.',  Icon: LcMoon },
];

const LINEUP_KEYS = ['moon', 'jupiter', 'saturn', 'mars', 'venus', 'mercury'];

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

export default function MissionsPage() {
  const router = useRouter();
  const { state } = useAppState();
  const { authenticated } = useStellarUser();
  const [authOpen, setAuthOpen] = useState(false);
  const locale = useLocale() === 'ka' ? 'ka' : 'en';
  const { location } = useLocation();

  const [now, setNow] = useState<Date>(() => new Date());
  const [activeQuiz, setActiveQuiz] = useState<QuizDef | null>(null);
  const [activeEvent, setActiveEvent] = useState<AstroEvent | null>(null);
  const [activeEventAnchor, setActiveEventAnchor] = useState<DOMRect | null>(null);
  const [activeExplainer, setActiveExplainer] = useState<{ kind: 'mission' | 'event'; id: string; title: string; eventType?: string } | null>(null);
  const [activeExplainerAnchor, setActiveExplainerAnchor] = useState<DOMRect | null>(null);

  const upcomingEvents = useMemo(() => getUpcomingEvents(new Date(), 30), []);
  const rareEvents = useMemo(() => getRareEvents(new Date(), 5), []);

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

  const primeEntry = useMemo(() => {
    const visible = GRID
      .filter((g) => !completedIds.has(g.id))
      .filter((g) => (skyPositions[g.id]?.altitude ?? -90) > 10);
    if (visible.length === 0) return null;
    visible.sort((a, b) => (skyPositions[b.id]?.altitude ?? -90) - (skyPositions[a.id]?.altitude ?? -90));
    return visible[0];
  }, [completedIds, skyPositions]);

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
                  onExplain={(rect) => {
                    setActiveExplainerAnchor(rect);
                    setActiveExplainer({ kind: 'mission', id: g.id, title: g.name });
                  }}
                />
              );
            })}
          </div>
        </section>

        {upcomingEvents.length > 0 && (
          <section className="mis-section">
            <div className="mis-section-head">
              <h2 className="mis-section-title">Upcoming events this month</h2>
              <span className="mis-section-meta">{upcomingEvents.length} event{upcomingEvents.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="mis-events-deck">
              {upcomingEvents.map(ev => (
                <EventRow
                  key={`${ev.date}-${ev.name}`}
                  event={ev}
                  onOpen={(rect) => {
                    setActiveEventAnchor(rect);
                    setActiveEvent(ev);
                  }}
                  onExplain={(rect) => {
                    setActiveExplainerAnchor(rect);
                    setActiveExplainer({ kind: 'event', id: ev.name, title: ev.name, eventType: ev.type });
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {rareEvents.length > 0 && (
          <section className="mis-section">
            <div className="mis-section-head">
              <h2 className="mis-section-title">Rare events in {new Date().getFullYear()}</h2>
              <span className="mis-section-meta">{rareEvents.length} once-a-year</span>
            </div>
            <div className="mis-rare-deck">
              {rareEvents.map(ev => (
                <RareEventCard
                  key={`${ev.date}-${ev.name}`}
                  event={ev}
                  onOpen={(rect) => {
                    setActiveEventAnchor(rect);
                    setActiveEvent(ev);
                  }}
                />
              ))}
            </div>
          </section>
        )}

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
                  Icon={ui.Icon}
                  gradient={ui.gradient}
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
            <span className="mis-section-meta">4 quick rules</span>
          </div>
          <TelescopeGuide tips={TIPS} />
        </section>
      </div>

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

// ---- Telescope guide ----

function TelescopeGuide({ tips }: { tips: { title: string; body: string; Icon: LucideIcon }[] }) {
  return (
    <div className="mis-scope">
      <div className="mis-scope-photo">
        <Image
          src="/images/telescopes/refractor.jpg"
          alt="Celestron AstroMaster 70AZ refractor telescope"
          fill
          sizes="(max-width: 720px) 100vw, 360px"
          style={{ objectFit: 'cover' }}
          priority={false}
        />
        <span className="mis-scope-photo-label">Celestron AstroMaster 70AZ</span>
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

// ---- Rare event card ----

function RareEventCard({
  event,
  onOpen,
}: {
  event: AstroEvent;
  onOpen: (rect: DOMRect) => void;
}) {
  const days = daysFromToday(event.date);
  const dateLabel = new Date(event.date + 'T12:00:00').toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
  });
  const monthLabel = new Date(event.date + 'T12:00:00').toLocaleDateString(undefined, {
    month: 'short',
  }).toUpperCase();
  const dayNum = new Date(event.date + 'T12:00:00').getDate();
  const future = days >= 0;
  const countdown = !future
    ? 'past'
    : days === 0
      ? 'today'
      : days === 1
        ? 'tomorrow'
        : days < 30
          ? `in ${days}d`
          : `in ${Math.round(days / 30)}mo`;

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
        <span className="mis-rare-tag">{EVENT_TYPE_LABEL[event.type]}</span>
        <span className="mis-rare-name">{event.name}</span>
        <span className="mis-rare-meta">
          {dateLabel} · {countdown}
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
        <circle cx="38" cy="30" r="20" fill="#0B0E17" />
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
          <stop offset="0%" stopColor="#7DD3FC" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#7DD3FC" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M52 12 L20 44" stroke="url(#rareTail)" strokeWidth="6" strokeLinecap="round" />
      <circle cx="52" cy="12" r="6" fill="#FFFFFF" />
      <circle cx="52" cy="12" r="3" fill="#7DD3FC" />
    </svg>
  );
}

// ---- Upcoming event row ----

const EVENT_TYPE_LABEL: Record<AstroEvent['type'], string> = {
  'eclipse-lunar': 'Lunar eclipse',
  'eclipse-solar': 'Solar eclipse',
  'conjunction': 'Conjunction',
  'comet': 'Comet',
  'opposition': 'Opposition',
  'meteor-shower': 'Meteor shower',
};

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

function EventRow({ event, onOpen, onExplain }: {
  event: AstroEvent;
  onOpen: (rect: DOMRect) => void;
  onExplain?: (rect: DOMRect) => void;
}) {
  const days = daysFromToday(event.date);
  const dateLabel = new Date(event.date + 'T12:00:00').toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
  });
  return (
    <button
      type="button"
      onClick={(e) => onOpen((e.currentTarget as HTMLElement).getBoundingClientRect())}
      className="mis-event-row"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px',
        background: 'var(--stl-bg-surface)',
        border: '1px solid var(--stl-border-regular)',
        borderRadius: 'var(--stl-r-md)',
        textAlign: 'left',
        width: '100%',
        cursor: 'pointer',
      }}
    >
      <div style={{ minWidth: 64 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--stl-text-bright)', margin: 0, fontWeight: 600 }}>
          {dateLabel}
        </p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--stl-text-dim)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days}d`}
        </p>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: 'var(--stl-text-bright)', fontSize: 14, fontWeight: 500, margin: 0 }}>
          {event.name}
        </p>
        <p style={{ color: 'var(--stl-text-muted)', fontSize: 11, margin: '2px 0 0', fontFamily: 'var(--font-mono)' }}>
          {EVENT_TYPE_LABEL[event.type]} · {event.visibilityRegion}
        </p>
      </div>
      <span
        style={{
          flexShrink: 0,
          padding: '4px 8px',
          borderRadius: 999,
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: EVENT_DIFFICULTY_COLOR[event.difficulty],
          border: `1px solid ${EVENT_DIFFICULTY_COLOR[event.difficulty]}55`,
          background: `${EVENT_DIFFICULTY_COLOR[event.difficulty]}1A`,
        }}
      >
        {event.difficulty}
      </span>
      {onExplain ? (
        <span
          role="button"
          tabIndex={0}
          aria-label={`Why ${event.name} is hard`}
          onClick={(e) => { e.stopPropagation(); onExplain((e.currentTarget as HTMLElement).getBoundingClientRect()); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              onExplain((e.currentTarget as HTMLElement).getBoundingClientRect());
            }
          }}
          className="mis-info-dot"
          style={{ marginLeft: 4 }}
        >
          i
        </span>
      ) : null}
    </button>
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
  const emptyTitle =
    liveStatus === 'daytime'
      ? 'Daylight — sky too bright'
      : liveStatus === 'cloudy'
        ? 'Overcast — nothing observable'
        : 'Nothing above the horizon';

  if (items.length === 0) {
    return (
      <div
        className={`mis-status-chip mis-status-chip--${liveStatus}`}
        role="status"
        aria-label="Live sky status"
      >
        <span className="mis-status-chip-dot" aria-hidden />
        <span className="mis-status-chip-label">{emptyTitle}</span>
        <span className="mis-status-chip-sep" aria-hidden>·</span>
        <span className="mis-status-chip-meta">
          {headerTime} · {dateLabel} · {cityLabel}
        </span>
      </div>
    );
  }

  return (
    <div className="mis-lineup" role="region" aria-label="Live visible targets">
      <div className="mis-lineup-head">
        <div className={`mis-lineup-status mis-lineup-status--${liveStatus}`}>
          <span className="mis-lineup-dot" aria-hidden />
          <span>LIVE · {headerTime}</span>
        </div>
        <div className="mis-lineup-loc">{dateLabel} · {cityLabel}</div>
      </div>

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
  onExplain,
}: {
  entry: GridEntry;
  above: boolean;
  rise: Date | null;
  onStart: () => void;
  onExplain?: (rect: DOMRect) => void;
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
            {(entry.diff === 'hard' || entry.diff === 'expert') && onExplain && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onExplain((e.currentTarget as HTMLElement).getBoundingClientRect()); }}
                aria-label={`Why ${entry.name} is hard`}
                className="mis-info-dot"
                style={{ marginLeft: 4 }}
              >
                i
              </button>
            )}
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
  Icon,
  gradient,
  title,
  meta,
  reward,
  score,
  total,
  onClick,
}: {
  Icon: LucideIcon;
  gradient: string;
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
      <span
        className="mis-qtile-icon"
        style={{
          background: gradient,
          boxShadow: '0 6px 16px -4px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
        }}
      >
        <Icon size={22} strokeWidth={2.2} color="#FFFFFF" />
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

