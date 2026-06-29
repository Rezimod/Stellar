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
          // cool blue-hour horizon glow rising from the bottom (violet -> mint)
          'radial-gradient(ellipse 70% 55% at 50% 104%, rgba(46,107,255,0.34) 0%, rgba(91,140,248,0.12) 34%, transparent 64%)',
          // cool galactic light on the right
          'radial-gradient(ellipse 65% 70% at 82% 30%, rgba(46,107,255,0.18) 0%, transparent 58%)',
          'linear-gradient(180deg, #05071A 0%, #0A0A24 42%, #0b1838 72%, #0a1a44 100%)',
        ].join(', '),
      }}
    >
      {/* === Starfield (whole sky) === */}
      <div aria-hidden className="hero-stars-fine" data-paused={paused || undefined} />
      <div aria-hidden className="hero-starfield" data-paused={paused || undefined} />

      {/* === Background: real NASA / Webb "Cosmic Cliffs" (Carina Nebula) ===
           Blue starry sky fills the top (on-theme + room for content); the
           nebula cliffs sit at the bottom as a natural cosmic horizon. */}
      <div aria-hidden className="absolute inset-0 pointer-events-none z-0">
        <Image
          src="/hero/nasa-carina.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: '50% 62%' }}
        />
      </div>
      {/* Navy tint + darken for text legibility over the photo */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{ background: 'linear-gradient(180deg, rgba(4,6,22,0.58) 0%, rgba(6,10,32,0.30) 36%, rgba(5,8,26,0.62) 100%)' }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{ background: 'radial-gradient(ellipse 95% 65% at 50% 30%, rgba(11,26,78,0.28) 0%, transparent 72%)' }}
      />

      {/* === Top fade: hero starts black so it blends into the dark header === */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[26%] pointer-events-none z-[2]"
        style={{ background: 'linear-gradient(180deg, #03040E 0%, rgba(3,4,14,0.72) 22%, transparent 100%)' }}
      />

      {/* === Copy-side scrim for legibility (copy now on the right) === */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none z-[2]"
        style={{ background: 'linear-gradient(270deg, rgba(5,7,22,0.62) 0%, rgba(5,7,22,0.2) 34%, transparent 56%)' }}
      />

      {/* === Content grid ===
           Desktop: console (left) · copy (right).
           Mobile order: copy → console (widget) → three steps on one line. === */}
      <div className="relative z-10 w-full max-w-[1280px] mx-auto px-5 md:px-10 lg:px-12 min-h-[100dvh]
        grid grid-cols-1 lg:grid-cols-2 items-center gap-4 lg:gap-10 pt-[58px] pb-5 lg:py-0">
        {/* Mobile: compact headline + CTA first, then the card — all in one viewport */}
        <Copy t={t} />
        <HeroConsole paused={paused} />
      </div>
    </section>
  );
}

/* ─── Copy: headline · buttons · features ────────────────────────── */

function Copy({ t }: { t: (k: string) => string }) {
  return (
    <div className="order-1 lg:order-2 w-full max-w-[600px] mx-auto lg:mx-0 lg:pl-6 lg:justify-self-end text-center lg:text-left">
      <h1
        className="text-white leading-[1.02] tracking-[-0.015em]"
        style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(30px, 6.5vw, 60px)', fontWeight: 700 }}
      >
        {t('headline1')}
        <br />
        <span
          style={{
            background: 'linear-gradient(92deg, #FFFFFF 4%, #3B6FF6 48%, #5B8CFF 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {t('headline2')}
        </span>
      </h1>

      <p className="mt-2.5 md:mt-5 text-[14px] md:text-[19px] font-medium mx-auto lg:mx-0 max-w-[440px]" style={{ color: 'rgba(226,222,240,0.7)' }}>
        {t('subtitle')}
      </p>

      {/* Single primary pill + a quiet secondary link (reference hierarchy) */}
      <div className="mt-4 md:mt-9 flex flex-col items-center lg:items-start gap-3">
        <CTA href="/sky" tone="primary" icon={<TelescopeIcon />}>{t('ctaSecondary')}</CTA>
        <Link
          href="/missions"
          className="inline-flex items-center gap-2 text-[15px] font-semibold text-white/70 hover:text-white transition-colors no-underline"
        >
          {t('ctaPrimary')}
          <span className="text-[#3B6FF6]"><ArrowIcon /></span>
        </Link>
      </div>

      {/* Desktop: three steps under the copy. Mobile renders them under the widget instead. */}
      <HeroFeatures t={t} className="hidden lg:grid mt-10 md:mt-12 grid-cols-3 gap-4 max-w-[560px]" />
    </div>
  );
}

function HeroFeatures({ t, className, compact }: { t: (k: string) => string; className: string; compact?: boolean }) {
  return (
    <div className={className}>
      <Feature href="/sky" tint="#3B6FF6" title={t('features.track.title')} desc={t('features.track.desc')} icon={<TrackIcon />} compact={compact} />
      <Feature href="/sky" tint="#5B8CFF" title={t('features.find.title')} desc={t('features.find.desc')} icon={<FindIcon />} compact={compact} />
      <Feature href="/missions" tint="#3B6FF6" title={t('features.earn.title')} desc={t('features.earn.desc')} icon={<GiftIcon />} compact={compact} />
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
  // 3 rows keeps the whole hero inside one mobile viewport.
  const shownPlanets = rotate(visiblePlanets, idx).slice(0, 3);

  const dayLabel = (i: number): string => {
    if (i === 0) return t('cards.today');
    if (i === 1) return t('cards.tomorrow');
    if (!days[i]) return '';
    const d = new Date(`${days[i].date}T00:00:00`);
    return new Intl.DateTimeFormat(locale === 'ka' ? 'ka-GE' : 'en-US', { weekday: 'long' }).format(d);
  };

  const score = day ? dayScore(day) : 0;
  const scoreColor = score >= 70 ? '#4ADE80' : score >= 45 ? '#FFB347' : '#94A3B8';

  // Frosted glass (ref 2): translucent violet glass so the indigo page-glow
  // shows through, stronger blur, and a cool mint halo.
  const panelStyle: CSSProperties = {
    background: 'linear-gradient(180deg, rgba(16,32,74,0.55) 0%, rgba(10,20,52,0.66) 100%)',
    boxShadow:
      '0 44px 96px -34px rgba(0,0,0,0.85), 0 0 70px -22px rgba(59,111,246,0.32), inset 0 1px 0 rgba(255,255,255,0.10)',
    backdropFilter: 'blur(22px) saturate(125%)',
    WebkitBackdropFilter: 'blur(22px) saturate(125%)',
  };

  return (
    <div className="order-2 lg:order-1 w-full max-w-[420px] mx-auto lg:mx-0 lg:justify-self-start pointer-events-auto">
      <div className="relative overflow-hidden rounded-[28px] border border-white/[0.12]" style={panelStyle}>

        {/* ── Hero block: glowing planet object + big sky-score number ── */}
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-center gap-5">
            {/* glowing planet object */}
            <div className="relative shrink-0" style={{ width: 92, height: 92 }} aria-hidden>
              <div style={{ position: 'absolute', inset: '-16px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,111,246,0.30) 0%, rgba(46,107,255,0.10) 45%, transparent 70%)' }} />
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid rgba(130,170,255,0.45)', boxShadow: '0 0 20px rgba(59,111,246,0.45), inset 0 0 14px rgba(59,111,246,0.25)' }} />
              <div style={{ position: 'absolute', inset: '18px', borderRadius: '50%', background: 'radial-gradient(circle at 34% 28%, #a9c6ff 0%, #3b6ff6 40%, #1b3aa0 66%, #0a1a52 88%)', boxShadow: 'inset -8px -10px 26px rgba(2,6,28,0.55), inset 7px 9px 22px rgba(170,200,255,0.28)' }} />
            </div>
            {/* big real sky-score number */}
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">{t('cards.skyScore')}</div>
              <div key={`sc-${idx}`} className="hero-card-swap flex items-end gap-1.5 mt-1">
                <span className="text-[54px] font-bold leading-[0.9] tabular-nums text-white">{sky.loading || !day ? '—' : score}</span>
                <span className="text-white/35 text-[16px] font-mono mb-1.5">/100</span>
              </div>
              <div className="mt-2 inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: scoreColor }} />
                <span className="text-[13px] font-semibold" style={{ color: sky.loading || !day ? 'rgba(255,255,255,0.6)' : scoreColor }}>
                  {sky.loading || !day ? t('cards.consoleTitle') : t(`cards.verdict.${day.badge}`)}
                </span>
                <span className="font-mono text-[11px] text-white/35">· {dayLabel(idx)}</span>
              </div>
            </div>
          </div>
          <Scrubber count={daysCount} active={idx} onSelect={selectNight} label={dayLabel} />
        </div>

        {/* ── Clean list: tonight's visible planets ── */}
        <div className="border-t border-white/[0.08]">
          <div className="px-6 pt-3 pb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">{t('cards.visibleNow')}</div>
          {sky.loading ? (
            <div className="px-6 pb-3 space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-10 rounded-xl bg-white/[0.04] animate-pulse" />
              ))}
            </div>
          ) : shownPlanets.length ? (
            <div key={`pl-${idx}`} className="hero-card-swap px-3 pb-2">
              {shownPlanets.map((p) => (
                <Link key={p.name} href="/sky" className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-white/[0.05] transition-colors no-underline">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(59,111,246,0.14)', border: '1px solid rgba(59,111,246,0.30)' }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: p.alt > 35 ? '#4ADE80' : p.alt > 15 ? '#3B6FF6' : '#94A3B8' }} />
                  </span>
                  <span className="flex-1 text-white/90 text-[15px] font-medium">{p.name}</span>
                  <span className="font-mono text-[13px] tabular-nums text-white/45">{p.alt}°</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-6 pb-4 font-mono text-[12px] text-white/35">{t('cards.noneUp')}</div>
          )}
        </div>

        {/* ── Mission CTA row ── */}
        <Link href="/missions" className="group flex items-center gap-3.5 border-t border-white/[0.08] px-6 py-4 transition-colors hover:bg-white/[0.04] no-underline">
          {sky.loading || !mission ? (
            <CardSkeleton lines={1} thumb />
          ) : (
            <>
              <span className="relative w-12 h-12 shrink-0 rounded-[14px] overflow-hidden border border-white/10">
                <Image src={mission.img} alt="" fill sizes="48px" className="object-cover" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#3B6FF6]">{t('cards.missionsLabel')}</span>
                <span className="block text-white text-[16px] font-semibold leading-tight truncate mt-0.5">{mission.title}</span>
                <span className="font-mono text-[12px] tabular-nums text-white/45">+{mission.stars} ★</span>
              </span>
              <span className="text-white/30 group-hover:text-[#3B6FF6] transition-colors shrink-0" aria-hidden><ArrowIcon /></span>
            </>
          )}
        </Link>
      </div>
    </div>
  );
}

function dayScore(d: ForecastDay): number {
  const cloudScore = Math.max(0, 100 - d.cloudCoverPct) * 0.7; // up to 70
  const moonScore = (1 - d.moonIllumination) * 30; // up to 30
  return Math.round(cloudScore + moonScore);
}

// Glowing circular progress ring — the reference's signature stat element
// (replaces the old flat horizontal bar).
function ScoreRing({ score, loading }: { score: number; loading: boolean }) {
  const R = 31;
  const C = 2 * Math.PI * R;
  const pct = loading ? 0 : Math.max(0, Math.min(100, score));
  const offset = C * (1 - pct / 100);
  return (
    <div className="relative shrink-0" style={{ width: 76, height: 76 }}>
      <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden>
        <defs>
          <linearGradient id="hero-ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5B8CF8" />
            <stop offset="100%" stopColor="#2E6BFF" />
          </linearGradient>
        </defs>
        <circle cx="38" cy="38" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle
          cx="38"
          cy="38"
          r={R}
          fill="none"
          stroke="url(#hero-ring-grad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          transform="rotate(-90 38 38)"
          style={{ filter: 'drop-shadow(0 0 5px rgba(59,111,246,0.65))', transition: 'stroke-dashoffset 800ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[19px] font-bold tabular-nums leading-none text-white">{loading ? '—' : score}</span>
        <span className="text-[8px] uppercase tracking-[0.12em] text-white/40 mt-1">/100</span>
      </div>
    </div>
  );
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
              background: i === active ? '#3B6FF6' : 'rgba(255,255,255,0.22)',
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

/* ─── Foreground mountains ───────────────────────────────────────── */

function Landscape() {
  // Smooth premium horizon (replaces the jagged mountain ridge): a soft dark
  // gradient base that grounds the scene + a faint blue atmospheric glow line.
  return (
    <div aria-hidden className="absolute inset-x-0 bottom-0 h-[42%] pointer-events-none z-[1]">
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(5,8,24,0.5) 42%, #04060f 100%)' }}
      />
      <div
        className="absolute inset-x-0 bottom-[16%] h-[120px]"
        style={{ background: 'radial-gradient(ellipse 60% 100% at 50% 100%, rgba(59,111,246,0.18) 0%, transparent 70%)' }}
      />
    </div>
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
    borderRadius: 999,
    fontFamily: 'var(--font-body)',
    fontSize: 16,
    fontWeight: 700,
    textDecoration: 'none',
    transition: 'background 140ms ease, border-color 140ms ease, filter 140ms ease',
  };
  const skin: CSSProperties =
    tone === 'primary'
      ? {
          background: 'linear-gradient(150deg, #5B8CF8 0%, #3B6FF6 100%)',
          color: '#06231E',
          border: 'none',
          boxShadow: '0 10px 34px -10px rgba(59,111,246,0.55)',
        }
      : {
          background: 'rgba(255,255,255,0.06)',
          color: '#FFFFFF',
          border: '1px solid rgba(255,255,255,0.16)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        };
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
