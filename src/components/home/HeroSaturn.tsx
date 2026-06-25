'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useSkyForecast, type PlanetData } from '@/lib/use-sky-data';
import { MoonGlyph } from '@/components/sky/forecast/visuals';

const CYCLE_MS = 4500;

const VERDICT_COLOR: Record<'go' | 'maybe' | 'skip', string> = {
  go: '#5EEAD4',
  maybe: '#FFB347',
  skip: '#94A3B8',
};

// Naked-eye / small-scope targets → thumbnail + Stars reward.
const TARGET_META: Record<string, { img: string; stars: number }> = {
  Moon: { img: '/sky/targets/moon.jpg', stars: 50 },
  Mercury: { img: '/sky/targets/mercury.jpg', stars: 90 },
  Venus: { img: '/sky/targets/venus.jpg', stars: 60 },
  Mars: { img: '/sky/targets/mars.jpg', stars: 80 },
  Jupiter: { img: '/sky/targets/jupiter.jpg', stars: 75 },
  Saturn: { img: '/sky/targets/saturn.jpg', stars: 100 },
  Uranus: { img: '/sky/targets/uranus.jpg', stars: 150 },
  Neptune: { img: '/sky/targets/neptune.jpg', stars: 175 },
};

export default function HeroSaturn() {
  const t = useTranslations('homepage.hero');
  const sectionRef = useRef<HTMLElement | null>(null);
  const [paused, setPaused] = useState(false);

  // Pause the starfield + card cycling when the hero scrolls off-screen
  // or the tab is backgrounded — keeps idle CPU at zero.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    let inView = true;
    let docVisible = !document.hidden;
    const sync = () => setPaused(!(inView && docVisible));

    const io = new IntersectionObserver(
      (entries) => {
        inView = entries[0]?.isIntersecting ?? true;
        sync();
      },
      { threshold: 0 },
    );
    io.observe(el);

    const onVis = () => {
      docVisible = !document.hidden;
      sync();
    };
    document.addEventListener('visibilitychange', onVis);
    sync();

    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden flex items-center"
      style={{
        // min-height (not fixed height) so the in-flow mobile cards can extend
        // the hero on short screens without clipping; desktop cards are absolute.
        minHeight: '100dvh',
        background: [
          'radial-gradient(ellipse 78% 95% at 80% 50%, rgba(255, 168, 85, 0.14) 0%, rgba(255, 122, 58, 0.06) 28%, transparent 58%)',
          'radial-gradient(ellipse 60% 70% at 16% 32%, rgba(70, 110, 210, 0.08) 0%, transparent 60%)',
          'linear-gradient(180deg, #04081A 0%, #08122A 48%, #050A1C 100%)',
        ].join(', '),
      }}
    >
      {/* === Static CSS starfield === */}
      <div aria-hidden className="hero-starfield" data-paused={paused || undefined} />

      {/* === Right cosmic backdrop: galaxy + constellations === */}
      <div aria-hidden className="absolute inset-y-0 right-0 w-[62%] md:w-[58%] lg:w-[55%] pointer-events-none">
        {/* Andromeda — soft, edge-faded so it melts into the canvas */}
        <div
          className="absolute right-[-12%] top-1/2 -translate-y-1/2 w-[120%] aspect-[400/265]"
          style={{
            WebkitMaskImage:
              'radial-gradient(ellipse 55% 55% at 50% 47%, #000 28%, rgba(0,0,0,0.4) 56%, transparent 76%)',
            maskImage:
              'radial-gradient(ellipse 55% 55% at 50% 47%, #000 28%, rgba(0,0,0,0.4) 56%, transparent 76%)',
            opacity: 0.85,
          }}
        >
          <Image
            src="/hero/andromeda.jpg"
            alt=""
            fill
            sizes="(max-width: 768px) 80vw, 55vw"
            className="object-cover"
          />
        </div>

        {/* Constellation line-art — static, faint, layered over the starfield */}
        <Constellations />
      </div>

      {/* === Left-side vignette keeps the copy readable === */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          background:
            'linear-gradient(90deg, rgba(4,8,26,0.94) 0%, rgba(6,12,32,0.55) 28%, transparent 54%)',
        }}
      />

      {/* === Copy === */}
      <div className="relative z-10 w-full max-w-[1280px] mx-auto px-6 md:px-10 lg:px-12 pointer-events-none">
        <div className="max-w-[640px]">
          <h1
            className="text-white leading-[1.02] tracking-[-0.01em]"
            style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(34px, 5.4vw, 68px)', fontWeight: 600 }}
          >
            {t('headline1')}
            <br />
            {t('headline2')}
          </h1>

          <p className="mt-6 md:mt-7 text-[15px] md:text-[18px] leading-[1.5]" style={{ color: 'rgba(255, 220, 230, 0.72)', maxWidth: 520 }}>
            {t('subtitle')}
          </p>

          <div className="mt-9 md:mt-12 flex flex-col items-start sm:flex-row sm:flex-wrap gap-3 pointer-events-auto">
            <CTA href="/missions" tone="primary">{t('ctaPrimary')}</CTA>
            <CTA href="/sky" tone="secondary">{t('ctaSecondary')}</CTA>
          </div>

          {/* === Live cards — sky conditions + mission, auto-cycling.
              In-flow under the CTAs on mobile; pinned to the right on desktop. */}
          <HeroCards paused={paused} />
        </div>
      </div>
    </section>
  );
}

/* ─── Live cards ─────────────────────────────────────────────────── */

function HeroCards({ paused }: { paused: boolean }) {
  const t = useTranslations('homepage.hero');
  const tp = useTranslations('planets');
  const locale = useLocale() === 'ka' ? 'ka' : 'en';
  const sky = useSkyForecast();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setTick((n) => n + 1), CYCLE_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  // Sky conditions — next 3 nights from the live forecast.
  const days = sky.forecast.slice(0, 3);
  const dayIdx = days.length ? tick % days.length : 0;
  const day = days[dayIdx];

  // Missions — derived from the planets actually up tonight.
  const missions = useMemo(() => buildMissions(sky.planets, tp), [sky.planets, tp]);
  const misIdx = missions.length ? tick % missions.length : 0;
  const mission = missions[misIdx];

  const dayLabel = (i: number): string => {
    if (i === 0) return t('cards.today');
    if (i === 1) return t('cards.tomorrow');
    if (!days[i]) return '';
    const d = new Date(`${days[i].date}T00:00:00`);
    return new Intl.DateTimeFormat(locale === 'ka' ? 'ka-GE' : 'en-US', { weekday: 'long' }).format(d);
  };

  return (
    <div className="relative z-20 mt-7 flex flex-col gap-2.5 w-full max-w-[330px] pointer-events-auto
      lg:mt-0 lg:gap-4 lg:absolute lg:right-[3%] xl:right-[6%] lg:top-1/2 lg:-translate-y-1/2 lg:w-[300px] lg:max-w-none">
      {/* Sky-conditions card */}
      <Link
        href="/sky"
        className="group block rounded-[18px] border border-white/[0.10] bg-[#0A1430]/82 backdrop-blur-md px-4 py-4 no-underline transition-colors hover:border-white/[0.20] hover:bg-[#0C1838]/88"
        style={{ boxShadow: '0 24px 60px -24px rgba(0,0,0,0.75)' }}
      >
        {sky.loading || !day ? (
          <CardSkeleton lines={2} />
        ) : (
          <div key={`sky-${dayIdx}`} className="hero-card-swap">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/55">
                {dayLabel(dayIdx)}
              </span>
              <VerdictPill badge={day.badge} label={t(`cards.verdict.${day.badge}`)} />
            </div>

            <div className="mt-2.5 flex items-center gap-3">
              <MoonGlyph phase={day.moonPhase} size={34} />
              <div className="min-w-0">
                <div className="text-white text-[19px] font-semibold leading-tight tracking-[-0.01em] truncate">
                  {day.recommendation}
                </div>
                <div className="mt-0.5 font-mono text-[11.5px] tabular-nums text-white/50">
                  {day.cloudCoverPct}% {t('cards.cloud')}
                  {day.tempLow != null ? ` · ${day.tempLow}°` : ''}
                  {` · ☾ ${Math.round(day.moonIllumination * 100)}%`}
                </div>
              </div>
            </div>

            <Dots count={days.length} active={dayIdx} />
          </div>
        )}
      </Link>

      {/* Mission card */}
      <Link
        href="/missions"
        className="group block rounded-[18px] border border-white/[0.10] bg-[#0A1430]/82 backdrop-blur-md px-3.5 py-3.5 no-underline transition-colors hover:border-white/[0.20] hover:bg-[#0C1838]/88"
        style={{ boxShadow: '0 24px 60px -24px rgba(0,0,0,0.75)' }}
      >
        <div className="px-0.5 pb-2.5 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#FFB347]">
            {t('cards.missionsLabel')}
          </span>
          <span className="text-white/25 group-hover:text-[#FFB347] transition-colors font-mono text-[13px]">↗</span>
        </div>

        {sky.loading || !mission ? (
          <CardSkeleton lines={1} thumb />
        ) : (
          <div key={`mis-${misIdx}`} className="hero-card-swap d1 flex items-center gap-3">
            <span className="relative w-12 h-12 shrink-0 rounded-[12px] overflow-hidden border border-white/10">
              <Image src={mission.img} alt="" fill sizes="48px" className="object-cover" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-white text-[14.5px] font-semibold leading-tight truncate">
                {mission.title}
              </span>
              <span className="mt-1 flex items-center gap-2">
                <span className="font-mono text-[11.5px] tabular-nums text-[#FFB347]">+{mission.stars} ★</span>
                <span className="font-mono text-[10.5px] tabular-nums text-white/40 truncate">{mission.fact}</span>
              </span>
            </span>
          </div>
        )}

        <Dots count={Math.min(missions.length, 5)} active={misIdx % Math.max(1, Math.min(missions.length, 5))} />
      </Link>
    </div>
  );
}

type Mission = { title: string; img: string; stars: number; fact: string };

function buildMissions(planets: PlanetData[], tp: (k: string) => string): Mission[] {
  const planetName = (name: string) => {
    const key = name.toLowerCase();
    try {
      const v = tp(key);
      return v && !v.startsWith('planets.') ? v : name;
    } catch {
      return name;
    }
  };

  const up = planets
    .filter((p) => p.visible && p.altitude > 8 && TARGET_META[p.name])
    .sort((a, b) => b.altitude - a.altitude)
    .slice(0, 5)
    .map((p) => {
      const meta = TARGET_META[p.name];
      return {
        title: planetName(p.name),
        img: meta.img,
        stars: meta.stars,
        fact: `${tp('altitudeLabel')} ${Math.round(p.altitude)}°`,
      };
    });

  if (up.length) return up;

  // Fallback when nothing is up (daytime / no data): evergreen targets.
  return (['Jupiter', 'Saturn', 'Moon'] as const).map((name) => ({
    title: planetName(name),
    img: TARGET_META[name].img,
    stars: TARGET_META[name].stars,
    fact: tp('visibleNow'),
  }));
}

function VerdictPill({ badge, label }: { badge: 'go' | 'maybe' | 'skip'; label: string }) {
  const color = VERDICT_COLOR[badge];
  return (
    <span
      className="flex items-center gap-1.5 rounded-full px-2 py-0.5"
      style={{ background: `${color}1f`, border: `1px solid ${color}4d` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color }}>
        {label}
      </span>
    </span>
  );
}

function Dots({ count, active }: { count: number; active: number }) {
  if (count <= 1) return null;
  return (
    <div className="mt-3 flex items-center gap-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="h-[3px] rounded-full transition-all duration-300"
          style={{
            width: i === active ? 16 : 6,
            background: i === active ? '#FFB347' : 'rgba(255,255,255,0.22)',
          }}
        />
      ))}
    </div>
  );
}

function CardSkeleton({ lines, thumb }: { lines: number; thumb?: boolean }) {
  return (
    <div className="animate-pulse flex items-center gap-3">
      {thumb && <span className="w-12 h-12 rounded-[12px] bg-white/[0.06] shrink-0" />}
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-3/4 rounded bg-white/[0.06]" />
        {lines > 1 && <div className="h-3 w-1/2 rounded bg-white/[0.05]" />}
      </div>
    </div>
  );
}

/* ─── Constellation line-art (static, decorative) ────────────────── */

type Star = [number, number, number?]; // x, y, brighter?

function Constellation({
  stars,
  edges,
  opacity = 1,
}: {
  stars: Star[];
  edges: [number, number][];
  opacity?: number;
}) {
  return (
    <g opacity={opacity}>
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={stars[a][0]}
          y1={stars[a][1]}
          x2={stars[b][0]}
          y2={stars[b][1]}
          stroke="rgba(220,232,255,0.16)"
          strokeWidth="0.18"
        />
      ))}
      {stars.map(([x, y, big], i) => (
        <circle key={i} cx={x} cy={y} r={big ? 0.7 : 0.42} fill="#EAF1FF" opacity={big ? 0.95 : 0.6} />
      ))}
    </g>
  );
}

function Constellations() {
  // Orion — belt + shoulders + feet
  const orion: Star[] = [
    [20, 22, 1], [30, 20, 1], // Betelgeuse, Bellatrix (shoulders)
    [23, 31], [26, 32], [29, 33], // belt
    [19, 43, 1], [31, 42], // Rigel, Saiph (feet)
  ];
  const orionEdges: [number, number][] = [
    [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [0, 1],
  ];

  // Big Dipper (Ursa Major asterism)
  const dipper: Star[] = [
    [60, 24], [66, 21], [72, 20], [78, 23], // handle
    [78, 30], [71, 31], [69, 25, 1], // bowl
  ];
  const dipperEdges: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3],
  ];

  // Cassiopeia (W)
  const cas: Star[] = [
    [50, 70], [56, 63], [62, 69], [68, 62], [74, 68],
  ];
  const casEdges: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 4],
  ];

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className="hidden md:block absolute inset-0 w-full h-full"
    >
      <Constellation stars={orion} edges={orionEdges} opacity={0.85} />
      <Constellation stars={dipper} edges={dipperEdges} opacity={0.7} />
      <Constellation stars={cas} edges={casEdges} opacity={0.6} />
    </svg>
  );
}

function CTA({ href, tone, children }: { href: string; tone: 'primary' | 'secondary'; children: React.ReactNode }) {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    fontFamily: 'var(--font-body)',
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: '0.005em',
    textDecoration: 'none',
    transition: 'background 140ms ease, filter 140ms ease',
    cursor: 'pointer',
  };
  const skin: CSSProperties =
    tone === 'primary'
      ? { background: '#FFB347', color: '#0A1735', border: 'none' }
      : { background: '#1A2540', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.06)' };

  return (
    <Link
      href={href}
      style={{ ...base, ...skin }}
      className={`w-[210px] sm:w-[210px] py-2.5 px-5 sm:py-4 sm:px-7 ${tone === 'primary' ? 'hero-cta-primary' : 'hero-cta-secondary'}`}
    >
      {children}
    </Link>
  );
}
