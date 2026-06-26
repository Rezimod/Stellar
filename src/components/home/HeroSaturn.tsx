'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useSkyForecast, type PlanetData, type ForecastDay } from '@/lib/use-sky-data';

const CYCLE_MS = 5200;
const CYCLE_DAYS = 4;

const VERDICT_COLOR: Record<'go' | 'maybe' | 'skip', string> = {
  go: '#4ADE80',
  maybe: '#FFB347',
  skip: '#94A3B8',
};

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

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    let inView = true;
    let docVisible = !document.hidden;
    const sync = () => setPaused(!(inView && docVisible));
    const io = new IntersectionObserver((entries) => {
      inView = entries[0]?.isIntersecting ?? true;
      sync();
    }, { threshold: 0 });
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
      className="relative w-full overflow-hidden"
      style={{
        minHeight: '100dvh',
        background: [
          // warm dusk horizon glow rising from the bottom
          'radial-gradient(ellipse 70% 55% at 50% 104%, rgba(255,150,70,0.26) 0%, rgba(190,90,120,0.12) 32%, transparent 62%)',
          // cool galactic light on the right
          'radial-gradient(ellipse 65% 70% at 82% 30%, rgba(120,90,200,0.16) 0%, transparent 58%)',
          'linear-gradient(180deg, #05071A 0%, #0A0A24 42%, #160F2C 72%, #241634 100%)',
        ].join(', '),
      }}
    >
      {/* === Starfield (whole sky) === */}
      <div aria-hidden className="hero-stars-fine" data-paused={paused || undefined} />
      <div aria-hidden className="hero-starfield" data-paused={paused || undefined} />

      {/* === Galaxy + constellations ===
           Mobile: big faint background spanning ~75% of the screen.
           Desktop: anchored to the right, behind the copy. === */}
      <div aria-hidden className="absolute inset-y-0 right-0 w-[140%] sm:w-[100%] md:w-[80%] lg:w-[76%] opacity-[0.6] md:opacity-100 pointer-events-none">
        <div
          className="absolute right-[-18%] sm:right-[-10%] top-[46%] md:top-[40%] -translate-y-1/2 w-[170%] sm:w-[160%] aspect-[400/265]"
          style={{
            WebkitMaskImage:
              'radial-gradient(ellipse 66% 66% at 52% 44%, #000 42%, rgba(0,0,0,0.5) 66%, transparent 88%)',
            maskImage:
              'radial-gradient(ellipse 66% 66% at 52% 44%, #000 42%, rgba(0,0,0,0.5) 66%, transparent 88%)',
          }}
        >
          <Image src="/hero/andromeda.jpg" alt="" fill priority sizes="(max-width: 768px) 70vw, 52vw" className="object-cover" />
        </div>
        <Constellations />
      </div>

      {/* === Dusk landscape: mountains + city lights === */}
      <Landscape />

      {/* === Copy-side scrim for legibility (copy now on the right) === */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none z-[2]"
        style={{ background: 'linear-gradient(270deg, rgba(5,7,22,0.62) 0%, rgba(5,7,22,0.2) 34%, transparent 56%)' }}
      />

      {/* === Content grid ===
           Desktop: console (left) · copy (right).
           Mobile order: copy → console (widget) → three steps on one line. === */}
      <div className="relative z-10 w-full max-w-[1280px] mx-auto px-6 md:px-10 lg:px-12 min-h-[100dvh]
        grid grid-cols-1 lg:grid-cols-2 items-start lg:items-center gap-6 lg:gap-10 pt-[60px] pb-28 lg:py-0">
        <HeroConsole paused={paused} />
        <Copy t={t} />
        {/* Mobile-only: the three steps in one row, under the widget */}
        <HeroFeatures t={t} compact className="order-3 lg:hidden grid grid-cols-3 gap-3 w-full max-w-[440px] mx-auto" />
      </div>
    </section>
  );
}

/* ─── Copy: headline · buttons · features ────────────────────────── */

function Copy({ t }: { t: (k: string) => string }) {
  return (
    <div className="order-1 lg:order-2 max-w-[600px] lg:pl-6 lg:justify-self-end">
      <h1
        className="text-white leading-[1.02] tracking-[-0.015em]"
        style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(36px, 4.8vw, 62px)', fontWeight: 700 }}
      >
        {t('headline1')}
        <br />
        <span
          style={{
            background: 'linear-gradient(92deg, #FFFFFF 4%, #B06EF0 48%, #5B8CFF 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {t('headline2')}
        </span>
      </h1>

      <p className="mt-4 md:mt-6 text-[16px] md:text-[19px] font-medium" style={{ color: 'rgba(226,222,240,0.7)' }}>
        {t('subtitle')}
      </p>

      <div className="mt-6 md:mt-10 flex flex-col sm:flex-row gap-3.5">
        <CTA href="/missions" tone="primary" icon={<SparkleIcon />}>{t('ctaPrimary')}</CTA>
        <CTA href="/sky" tone="secondary" icon={<TelescopeIcon />}>{t('ctaSecondary')}</CTA>
      </div>

      {/* Desktop: three steps under the copy. Mobile renders them under the widget instead. */}
      <HeroFeatures t={t} className="hidden lg:grid mt-10 md:mt-12 grid-cols-3 gap-4 max-w-[560px]" />
    </div>
  );
}

function HeroFeatures({ t, className, compact }: { t: (k: string) => string; className: string; compact?: boolean }) {
  return (
    <div className={className}>
      <Feature href="/sky" tint="#B06EF0" title={t('features.track.title')} desc={t('features.track.desc')} icon={<TrackIcon />} compact={compact} />
      <Feature href="/sky" tint="#5B8CFF" title={t('features.find.title')} desc={t('features.find.desc')} icon={<FindIcon />} compact={compact} />
      <Feature href="/missions" tint="#FFB347" title={t('features.earn.title')} desc={t('features.earn.desc')} icon={<GiftIcon />} compact={compact} />
    </div>
  );
}

function Feature({
  href,
  tint,
  title,
  desc,
  icon,
  compact,
}: {
  href: string;
  tint: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group no-underline ${compact ? 'flex flex-col items-center text-center gap-1.5' : 'flex items-start gap-3'}`}
    >
      <span
        className="flex items-center justify-center w-10 h-10 rounded-full shrink-0 transition-colors"
        style={{ background: `${tint}1f`, border: `1px solid ${tint}40`, color: tint }}
      >
        {icon}
      </span>
      <span className={compact ? 'min-w-0' : 'min-w-0'}>
        <span className="block text-white text-[14px] sm:text-[14.5px] font-semibold leading-tight">{title}</span>
        <span className={`mt-1 block leading-snug text-white/45 ${compact ? 'text-[11px]' : 'text-[12.5px]'}`}>{desc}</span>
      </span>
    </Link>
  );
}

/* ─── Live cards ─────────────────────────────────────────────────── */

function HeroConsole({ paused }: { paused: boolean }) {
  const t = useTranslations('homepage.hero');
  const tp = useTranslations('planets');
  const locale = useLocale() === 'ka' ? 'ka' : 'en';
  const sky = useSkyForecast();
  const [tick, setTick] = useState(0);
  const manualRef = useRef(0);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      // Hold on the user's pick for ~2 cycles after they tap the scrubber.
      if (Date.now() - manualRef.current < CYCLE_MS * 2) return;
      setTick((n) => n + 1);
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  const selectNight = (i: number) => {
    manualRef.current = Date.now();
    setTick(i);
  };

  const days = sky.forecast.slice(0, CYCLE_DAYS);
  const daysCount = days.length || 1;
  const idx = days.length ? tick % days.length : 0;
  const day = days[idx];

  const missions = useMemo(() => buildMissions(sky.planets, tp), [sky.planets, tp]);
  const mission = missions.length ? missions[idx % missions.length] : undefined;

  const visiblePlanets = useMemo(() => {
    const named = (name: string) => {
      try {
        const v = tp(name.toLowerCase());
        return v && !v.startsWith('planets.') ? v : name;
      } catch {
        return name;
      }
    };
    return sky.planets
      .filter((p) => p.visible && p.altitude > 5)
      .sort((a, b) => b.altitude - a.altitude)
      .map((p) => ({ name: named(p.name), alt: Math.round(p.altitude) }));
  }, [sky.planets, tp]);

  // Rotate the live visible set each cycle so the row changes smoothly.
  const shownPlanets = rotate(visiblePlanets, idx).slice(0, 4);

  const dayLabel = (i: number): string => {
    if (i === 0) return t('cards.today');
    if (i === 1) return t('cards.tomorrow');
    if (!days[i]) return '';
    const d = new Date(`${days[i].date}T00:00:00`);
    return new Intl.DateTimeFormat(locale === 'ka' ? 'ka-GE' : 'en-US', { weekday: 'long' }).format(d);
  };

  const score = day ? dayScore(day) : 0;
  const scoreColor = score >= 70 ? '#4ADE80' : score >= 45 ? '#FFB347' : '#94A3B8';

  const panelStyle: CSSProperties = {
    background: 'linear-gradient(180deg, rgba(15,17,36,0.94) 0%, rgba(9,10,24,0.96) 100%)',
    boxShadow: '0 44px 96px -34px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.08)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  };

  return (
    <div className="order-2 lg:order-1 w-full max-w-[400px] mx-auto lg:mx-0 lg:justify-self-start pointer-events-auto">
      <div className="relative overflow-hidden rounded-[26px] border border-white/[0.12]" style={panelStyle}>
        {/* Header: cycling night + verdict */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.07]">
          <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-white/55">
            <span className="hero-live-dot" />
            {sky.loading || !day ? t('cards.consoleTitle') : dayLabel(idx)}
          </span>
          {sky.loading || !day ? (
            <span className="h-[22px] w-[58px] rounded-full bg-white/[0.06] animate-pulse" />
          ) : (
            <VerdictPill badge={day.badge} label={t(`cards.verdict.${day.badge}`)} />
          )}
        </div>

        {/* Visible planets — primary */}
        <Link href="/sky" className="group block px-5 pt-5 pb-4 transition-colors hover:bg-white/[0.03]">
          <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">{t('cards.visibleNow')}</div>
          {sky.loading ? (
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className="h-8 w-24 rounded-full bg-white/[0.05] animate-pulse" />
              ))}
            </div>
          ) : shownPlanets.length ? (
            <div key={`pl-${idx}`} className="hero-card-swap flex flex-wrap gap-2">
              {shownPlanets.map((p) => (
                <span
                  key={p.name}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.09] bg-white/[0.04] px-3 py-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.alt > 35 ? '#4ADE80' : p.alt > 15 ? '#FFB347' : '#94A3B8' }} />
                  <span className="text-white/90 text-[13.5px] font-medium leading-none">{p.name}</span>
                  <span className="font-mono text-[11px] tabular-nums text-white/40 leading-none">{p.alt}°</span>
                </span>
              ))}
            </div>
          ) : (
            <span className="font-mono text-[12px] text-white/35">{t('cards.noneUp')}</span>
          )}
        </Link>

        <div className="mx-5 h-px bg-white/[0.07]" />

        {/* Tonight's mission — primary */}
        <Link href="/missions" className="group block px-5 py-4 transition-colors hover:bg-white/[0.03]">
          <div className="flex items-center justify-between pb-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#FFB347]">{t('cards.missionsLabel')}</span>
            <span className="text-white/30 transition-colors group-hover:text-[#FFB347]" aria-hidden>
              <ArrowIcon />
            </span>
          </div>
          {sky.loading || !mission ? (
            <CardSkeleton lines={1} thumb />
          ) : (
            <div key={`mis-${idx}`} className="hero-card-swap d1 flex items-center gap-3.5">
              <span className="relative w-14 h-14 shrink-0 rounded-[14px] overflow-hidden border border-white/10">
                <Image src={mission.img} alt="" fill sizes="56px" className="object-cover" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-white text-[18px] font-semibold leading-tight truncate">{mission.title}</span>
                <span className="mt-1 flex items-center gap-2.5">
                  <span className="font-mono text-[13px] tabular-nums text-[#FFB347]">+{mission.stars} ★</span>
                  <span className="font-mono text-[12px] tabular-nums text-white/45 truncate">{mission.fact}</span>
                </span>
              </span>
            </div>
          )}
        </Link>

        <div className="mx-5 h-px bg-white/[0.07]" />

        {/* Sky score — secondary, under the primary content */}
        <div className="px-5 py-4">
          <Link href="/sky" className="group block transition-opacity hover:opacity-80">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">{t('cards.skyScore')}</span>
              {sky.loading || !day ? (
                <span className="h-4 w-12 rounded bg-white/[0.06] animate-pulse" />
              ) : (
                <span key={`sc-${idx}`} className="hero-card-swap font-mono text-[15px] font-semibold tabular-nums" style={{ color: scoreColor }}>
                  {score}<span className="text-white/35 text-[12px]">/100</span>
                </span>
              )}
            </div>
            <div className="mt-2.5 h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: sky.loading || !day ? '0%' : `${score}%`, background: scoreColor }}
              />
            </div>
          </Link>
          <Scrubber count={daysCount} active={idx} onSelect={selectNight} label={dayLabel} />
        </div>
      </div>
    </div>
  );
}

function dayScore(d: ForecastDay): number {
  const cloudScore = Math.max(0, 100 - d.cloudCoverPct) * 0.7; // up to 70
  const moonScore = (1 - d.moonIllumination) * 30; // up to 30
  return Math.round(cloudScore + moonScore);
}

function rotate<T>(arr: T[], n: number): T[] {
  if (arr.length <= 1) return arr;
  const k = ((n % arr.length) + arr.length) % arr.length;
  return arr.slice(k).concat(arr.slice(0, k));
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
    .map((p) => ({
      title: planetName(p.name),
      img: TARGET_META[p.name].img,
      stars: TARGET_META[p.name].stars,
      fact: `${tp('altitudeLabel')} ${Math.round(p.altitude)}°`,
    }));

  if (up.length) return up;

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
    <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: `${color}1f`, border: `1px solid ${color}55` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color }}>{label}</span>
    </span>
  );
}

function Scrubber({
  count,
  active,
  onSelect,
  label,
}: {
  count: number;
  active: number;
  onSelect: (i: number) => void;
  label: (i: number) => string;
}) {
  if (count <= 1) return null;
  return (
    <div className="mt-4 flex items-center gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          type="button"
          aria-label={label(i)}
          aria-current={i === active || undefined}
          onClick={() => onSelect(i)}
          className="group/dot relative -my-2 py-2 min-h-0 outline-none"
        >
          <span
            className="block h-[3px] rounded-full transition-all duration-300 group-active/dot:scale-y-150"
            style={{
              width: i === active ? 20 : 8,
              background: i === active ? '#FFB347' : 'rgba(255,255,255,0.22)',
              boxShadow: i === active ? '0 0 8px rgba(255,179,71,0.6)' : 'none',
            }}
          />
        </button>
      ))}
    </div>
  );
}

function CardSkeleton({ lines, thumb }: { lines: number; thumb?: boolean }) {
  return (
    <div className="animate-pulse flex items-center gap-3.5">
      {thumb && <span className="w-14 h-14 rounded-[14px] bg-white/[0.06] shrink-0" />}
      <div className="flex-1 space-y-2.5">
        <div className="h-4 w-3/4 rounded bg-white/[0.07]" />
        {lines > 1 && <div className="h-3 w-1/2 rounded bg-white/[0.05]" />}
      </div>
    </div>
  );
}

/* ─── Dusk landscape ─────────────────────────────────────────────── */

function Landscape() {
  // Deterministic city-light cluster in the valley (no Math.random in render).
  const lights = useMemo(() => {
    const out: Array<{ x: number; y: number; r: number; o: number }> = [];
    for (let i = 0; i < 70; i++) {
      const t = (i * 9301 + 49297) % 233280;
      const rnd = t / 233280;
      const t2 = (i * 4021 + 1031) % 100;
      const x = 250 + (rnd - 0.5) * 760 + Math.sin(i) * 40;
      const y = 312 + (t2 / 100) * 34;
      out.push({ x, y, r: i % 6 === 0 ? 1.6 : 1, o: 0.4 + (t2 % 5) * 0.12 });
    }
    return out;
  }, []);

  return (
    <div aria-hidden className="absolute inset-x-0 bottom-0 h-[44%] pointer-events-none z-[1]">
      <svg viewBox="0 0 1440 360" preserveAspectRatio="xMidYMax slice" className="absolute bottom-0 w-full h-full">
        {/* back ridge */}
        <path
          d="M0,206 L150,150 L320,196 L520,120 L720,180 L940,108 L1160,172 L1360,128 L1440,150 L1440,360 L0,360 Z"
          fill="#1B1330"
          opacity="0.92"
        />
        {/* city lights between ridges */}
        {lights.map((l, i) => (
          <circle key={i} cx={l.x} cy={l.y} r={l.r} fill="#FFC76B" opacity={l.o} />
        ))}
        {/* front ridge */}
        <path
          d="M0,304 L210,232 L430,300 L660,216 L900,288 L1170,224 L1440,278 L1440,360 L0,360 Z"
          fill="#08060F"
        />
      </svg>
    </div>
  );
}

/* ─── Constellation line-art ─────────────────────────────────────── */

type Star = [number, number, number?];

function Constellation({ stars, edges, opacity = 1 }: { stars: Star[]; edges: [number, number][]; opacity?: number }) {
  return (
    <g opacity={opacity}>
      {edges.map(([a, b], i) => (
        <line key={i} x1={stars[a][0]} y1={stars[a][1]} x2={stars[b][0]} y2={stars[b][1]} stroke="rgba(220,232,255,0.18)" strokeWidth="0.18" />
      ))}
      {stars.map(([x, y, big], i) => (
        <circle key={i} cx={x} cy={y} r={big ? 0.7 : 0.42} fill="#EAF1FF" opacity={big ? 0.95 : 0.6} />
      ))}
    </g>
  );
}

function Constellations() {
  const orion: Star[] = [
    [20, 22, 1], [30, 20, 1], [23, 31], [26, 32], [29, 33], [19, 43, 1], [31, 42],
  ];
  const orionEdges: [number, number][] = [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [0, 1]];
  const dipper: Star[] = [[60, 24], [66, 21], [72, 20], [78, 23], [78, 30], [71, 31], [69, 25, 1]];
  const dipperEdges: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]];
  const cas: Star[] = [[50, 72], [56, 65], [62, 71], [68, 64], [74, 70]];
  const casEdges: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4]];

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="hidden md:block absolute inset-0 w-full h-full">
      <Constellation stars={orion} edges={orionEdges} opacity={0.85} />
      <Constellation stars={dipper} edges={dipperEdges} opacity={0.7} />
      <Constellation stars={cas} edges={casEdges} opacity={0.6} />
    </svg>
  );
}

/* ─── Buttons + icons ────────────────────────────────────────────── */

function CTA({
  href,
  tone,
  icon,
  children,
}: {
  href: string;
  tone: 'primary' | 'secondary';
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 12,
    fontFamily: 'var(--font-body)',
    fontSize: 16,
    fontWeight: 700,
    textDecoration: 'none',
    transition: 'background 140ms ease, border-color 140ms ease, filter 140ms ease',
  };
  const skin: CSSProperties =
    tone === 'primary'
      ? { background: '#FFB347', color: '#1A1206', border: 'none' }
      : { background: 'rgba(14,16,32,0.5)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.16)' };
  return (
    <Link
      href={href}
      style={{ ...base, ...skin }}
      className={`w-full sm:w-auto px-7 py-3.5 ${tone === 'primary' ? 'hero-cta-primary' : 'hero-cta-secondary'}`}
    >
      {children}
      {icon}
    </Link>
  );
}

function SparkleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6z" />
      <path d="M18.5 14l.8 2.4 2.4.8-2.4.8-.8 2.4-.8-2.4-2.4-.8 2.4-.8z" opacity="0.7" />
    </svg>
  );
}

function TelescopeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 13l11-4 1.5 4L4.5 17z" />
      <path d="M14 9l3-1 1.5 4-3 1z" />
      <path d="M11 16v4" />
      <path d="M9 21h4" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </svg>
  );
}

function TrackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="6" cy="7" r="1.8" />
      <circle cx="18" cy="6" r="1.8" />
      <circle cx="15" cy="17" r="1.8" />
      <path d="M7.6 7.8 13.4 16M7.5 8l9-1.4" />
    </svg>
  );
}

function FindIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="6.5" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3.5" y="9.5" width="17" height="11" rx="1.5" />
      <path d="M3.5 13h17M12 9.5v11" />
      <path d="M12 9.5C10 9.5 7.5 8.5 7.5 6.3 7.5 5 8.4 4 9.6 4c1.8 0 2.4 2.4 2.4 5.5zM12 9.5c2 0 4.5-1 4.5-3.2C16.5 5 15.6 4 14.4 4 12.6 4 12 6.4 12 9.5z" />
    </svg>
  );
}
