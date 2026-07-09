'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useSkyForecast, type PlanetData, type ForecastDay } from '@/lib/use-sky-data';
import { useLocation } from '@/lib/location';
import { getTonightDarkWindow } from '@/lib/dark-window';

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

// 2026 sky-calendar highlights, in date order. The ticker only shows events
// that are still upcoming relative to today, so past ones drop off on their own.
const SKY_EVENTS: { name: string; date: string }[] = [
  { name: 'QUADRANTIDS', date: '2026-01-04' },
  { name: 'TOTAL LUNAR ECLIPSE', date: '2026-03-03' },
  { name: 'LYRIDS', date: '2026-04-22' },
  { name: 'ETA AQUARIIDS', date: '2026-05-06' },
  { name: 'SOLAR ECLIPSE', date: '2026-08-12' },
  { name: 'PERSEIDS', date: '2026-08-12' },
  { name: 'SATURN OPPOSITION', date: '2026-10-04' },
  { name: 'ORIONIDS', date: '2026-10-21' },
  { name: 'LEONIDS', date: '2026-11-17' },
  { name: 'GEMINIDS', date: '2026-12-13' },
  { name: 'URSIDS', date: '2026-12-22' },
];

const TICKER_MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function formatEvent(e: { name: string; date: string }): string {
  const [, m, d] = e.date.split('-').map(Number);
  return `${e.name} · ${TICKER_MONTHS[m - 1]} ${d}`;
}

// Events still to come from `now` (start of day). Falls back to the full list
// once the year's events are all past, so the ticker never empties.
function upcomingEvents(now: Date | null): string[] {
  if (!now) return SKY_EVENTS.map(formatEvent);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const up = SKY_EVENTS.filter((e) => {
    const [y, m, d] = e.date.split('-').map(Number);
    return new Date(y, m - 1, d).getTime() >= today;
  });
  return (up.length ? up : SKY_EVENTS).map(formatEvent);
}

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
      className="relative w-full overflow-hidden pt-14"
      style={{
        minHeight: '100dvh',
        fontFamily: 'var(--font-grotesk), system-ui, sans-serif',
        background: [
          'radial-gradient(120% 90% at 70% -10%, rgba(64,44,120,0.35), transparent 55%)',
          'radial-gradient(90% 70% at 12% 8%, rgba(28,60,130,0.28), transparent 60%)',
          '#04060f',
        ].join(', '),
      }}
    >
      {/* === Backdrop: starfield · earth limb · horizon glow === */}
      <div aria-hidden className="hero-stars-fine" data-paused={paused || undefined} />
      <div aria-hidden className="hero-starfield" data-paused={paused || undefined} />

      {/* Earth limb — bottom arc */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[46%] pointer-events-none z-[1]"
        style={{
          WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 45%)',
          maskImage: 'linear-gradient(180deg, transparent 0%, #000 45%)',
        }}
      >
        <Image src="/hero/earth-limb.jpg" alt="" fill priority sizes="100vw" className="object-cover" style={{ objectPosition: '50% top', opacity: 0.85 }} />
      </div>
      {/* Fade the limb into the dark canvas */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[44%] pointer-events-none z-[1]"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(4,6,15,0.55) 70%, rgba(4,6,15,0.92))' }}
      />
      {/* Breathing blue horizon glow */}
      <div
        aria-hidden
        className="hero-horizon-glow absolute bottom-[34%] left-[10%] right-[10%] h-[120px] pointer-events-none z-[1]"
        style={{ background: 'radial-gradient(60% 100% at 50% 100%, rgba(110,170,255,0.28), transparent 70%)', filter: 'blur(18px)' }}
      />

      {/* === Sky-calendar ticker === */}
      <SkyTicker />

      {/* === Content: headline (left) · sky-tonight card (right) === */}
      <div
        className="relative z-10 mx-auto grid max-w-[1460px] items-center gap-12 px-6 md:px-10 lg:px-12
          grid-cols-1 lg:grid-cols-[1fr_minmax(340px,420px)] pt-16 pb-28 lg:py-24"
      >
        <Copy t={t} />
        <SkyCard paused={paused} />
      </div>
    </section>
  );
}

/* ─── Sky-calendar ticker ─────────────────────────────────────────── */

function SkyTicker() {
  // Start from the full list on the server / first paint (deterministic, so
  // hydration matches), then narrow to upcoming events once mounted.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
  }, []);
  const events = useMemo(() => upcomingEvents(now), [now]);

  const row = (
    <div className="flex items-center gap-11 whitespace-nowrap px-6 py-2.5 font-mono text-[12px] tracking-[0.14em] text-[#9aa6c8]">
      <span className="text-[#f5a83d]">SKY CALENDAR 2026</span>
      {events.map((e) => (
        <span key={e} className="flex items-center gap-11">
          <span>{e}</span>
          <span className="text-[#3d476b]" aria-hidden>◦</span>
        </span>
      ))}
    </div>
  );
  return (
    <div
      className="relative z-20 border-y"
      style={{ borderColor: 'rgba(140,165,235,0.10)', background: 'rgba(6,9,20,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
    >
      <div className="hero-ticker-mask overflow-hidden">
        <div className="hero-ticker-track">
          {row}
          {row}
        </div>
      </div>
    </div>
  );
}

/* ─── Headline · CTAs ─────────────────────────────────────────────── */

function Copy({ t }: { t: (k: string) => string }) {
  return (
    <section className="flex max-w-[740px] flex-col" style={{ animation: 'heroCardSwap 0.7s ease both' }}>
      <h1
        className="m-0 text-[#f6f8ff]"
        style={{ fontWeight: 700, fontSize: 'clamp(48px, 6.2vw, 90px)', lineHeight: 1.04, letterSpacing: '-0.025em', textWrap: 'balance' }}
      >
        {t('headline1')}
        <br />
        <span
          style={{
            background: 'linear-gradient(92deg, #ffe9c4 0%, #ffbc57 45%, #a78bfa 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {t('headline2')}
        </span>
      </h1>

      <p className="mt-6 max-w-[520px] text-[18px] md:text-[20px]" style={{ color: '#aab4d4', lineHeight: 1.55, fontWeight: 400 }}>
        {t('subtitle')}
      </p>

      <div className="mt-9 flex flex-wrap items-center gap-4">
        <Link
          href="/missions"
          className="hero-pill-primary inline-flex items-center justify-center rounded-xl px-8 py-4 font-mono uppercase tracking-[0.14em] no-underline"
          style={{
            background: 'linear-gradient(180deg,#ffc866 0%,#f59e2e 55%,#df8214 100%)',
            color: '#241503',
            fontWeight: 600,
            fontSize: 13.5,
            boxShadow: 'inset 0 1px 0 rgba(255,235,200,0.7), inset 0 -2px 0 rgba(120,60,0,0.35), 0 8px 26px rgba(245,158,46,0.35)',
          }}
        >
          {t('ctaPrimary')}
        </Link>
        <Link
          href="/sky"
          className="hero-pill-ghost inline-flex items-center justify-center rounded-xl px-7 py-4 font-mono uppercase tracking-[0.14em] no-underline"
          style={{
            background: 'rgba(12,18,38,0.6)',
            color: '#ffc877',
            fontWeight: 600,
            fontSize: 13.5,
            border: '1px solid rgba(245,168,61,0.35)',
          }}
        >
          {t('ctaSecondary')}
        </Link>
      </div>
    </section>
  );
}

/* ─── Sky-tonight card ────────────────────────────────────────────── */

function SkyCard({ paused }: { paused: boolean }) {
  const t = useTranslations('homepage.hero');
  const tp = useTranslations('planets');
  const locale = useLocale() === 'ka' ? 'ka' : 'en';
  const { location } = useLocation();
  const sky = useSkyForecast();

  const day = sky.forecast[0];
  const score = day ? dayScore(day) : 0;
  const missions = useMemo(() => buildMissions(sky.planets, tp), [sky.planets, tp]);
  const mission = missions[0];

  const cityLabel = (location.city || 'Tbilisi').toUpperCase();
  const dayName = useMemo(
    () => new Intl.DateTimeFormat(locale === 'ka' ? 'ka-GE' : 'en-US', { weekday: 'long' }).format(new Date()).toUpperCase(),
    [locale],
  );

  const darkWindow = useMemo(() => {
    try {
      const { duskStart } = getTonightDarkWindow(location.lat, location.lon);
      return duskStart ? hhmm(duskStart) : null;
    } catch {
      return null;
    }
  }, [location.lat, location.lon]);

  const circ = 2 * Math.PI * 56;
  const gaugeDash = `${((score / 100) * circ).toFixed(1)} ${circ.toFixed(1)}`;

  const moonPct = day ? Math.round(day.moonIllumination * 100) : 0;
  const cloud = day ? cloudStatus(day.cloudCoverPct) : { label: 'Cloud cover —', color: '#8d99bd' };
  const loading = sky.loading || !day;

  return (
    <aside
      className="w-full max-w-[420px] justify-self-center rounded-3xl p-7 lg:justify-self-end"
      style={{
        animation: 'heroCardSwap 0.7s ease 0.12s both',
        background: 'linear-gradient(170deg, rgba(17,24,48,0.85), rgba(7,10,22,0.9))',
        border: '1px solid rgba(140,165,235,0.18)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        boxShadow: '0 30px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(180,200,255,0.12)',
      }}
    >
      {/* header */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2.5 font-mono text-[11px] tracking-[0.26em] text-[#8d99bd]">
          <span className="hero-live-dot shrink-0" />
          <span className="truncate">{dayName} · {cityLabel}</span>
        </span>
        <Link href="/sky" className="shrink-0 whitespace-nowrap font-mono text-[11px] tracking-[0.2em] text-[#9ec0ff] no-underline transition-colors hover:text-white">
          OPEN SKY →
        </Link>
      </div>

      {/* gauge + status rows */}
      <div className="mb-6 flex items-center gap-6">
        <div className="relative h-[132px] w-[132px] flex-none">
          <svg width="132" height="132" viewBox="0 0 132 132">
            <defs>
              <linearGradient id="heroGaugeGrad" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0" stopColor="#f59e2e" />
                <stop offset="1" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
            <circle cx="66" cy="66" r="56" fill="none" stroke="rgba(140,165,235,0.14)" strokeWidth="10" />
            <circle
              cx="66"
              cy="66"
              r="56"
              fill="none"
              stroke="url(#heroGaugeGrad)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={loading ? `0 ${circ.toFixed(1)}` : gaugeDash}
              transform="rotate(-90 66 66)"
              style={{ filter: 'drop-shadow(0 0 8px rgba(245,158,46,0.5))', transition: 'stroke-dasharray 0.8s ease' }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="text-[30px] font-bold leading-none text-[#f6f8ff] tabular-nums">{loading ? '—' : score}</div>
              <div className="mt-1 font-mono text-[10px] tracking-[0.2em] text-[#7f8cad]">SKY SCORE</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 font-mono text-[13px] text-[#8d99bd]">
          <StatusRow color={cloud.color} label={loading ? 'Cloud cover —' : cloud.label} />
          <StatusRow color="#f5a83d" label={`Dark window ${darkWindow ?? '—'}`} />
          <StatusRow color="#3ddc84" label={loading ? 'Moon —' : `Moon ${moonPct}% · ${phaseName(day.moonPhase)}`} />
        </div>
      </div>

      {/* tonight's mission */}
      <Link
        href="/missions"
        className="flex items-center gap-4 rounded-2xl px-4 py-3.5 no-underline transition-colors"
        style={{ border: '1px solid rgba(245,168,61,0.25)', background: 'rgba(245,168,61,0.06)' }}
      >
        {loading || !mission ? (
          <div className="flex w-full items-center gap-4">
            <span className="h-[50px] w-[50px] shrink-0 animate-pulse rounded-full bg-white/[0.06]" />
            <div className="flex-1 space-y-2">
              <span className="block h-3 w-24 animate-pulse rounded bg-white/[0.06]" />
              <span className="block h-4 w-16 animate-pulse rounded bg-white/[0.05]" />
            </div>
          </div>
        ) : (
          <>
            <span className="relative h-[50px] w-[50px] shrink-0 overflow-hidden rounded-full" style={{ boxShadow: '0 0 0 1px rgba(245,168,61,0.35), 0 6px 20px rgba(245,168,61,0.2)' }}>
              <Image src={mission.img} alt="" fill sizes="50px" className="object-cover" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="mb-1 block font-mono text-[10.5px] tracking-[0.22em] text-[#f5a83d]">{t('cards.missionsLabel').toUpperCase()}</span>
              <span className="flex items-baseline gap-2">
                <span className="text-[18px] font-semibold text-[#f4f7ff]">{mission.title}</span>
                <span className="font-mono text-[13px] text-[#ffc877] tabular-nums">+{mission.stars} ★</span>
              </span>
            </span>
            <span className="flex-none text-[#ffc877]" aria-hidden><ArrowIcon /></span>
          </>
        )}
      </Link>
    </aside>
  );
}

function StatusRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-[7px] w-[7px] rounded-full" style={{ background: color }} />
      {label}
    </div>
  );
}

/* ─── Data helpers ────────────────────────────────────────────────── */

function dayScore(d: ForecastDay): number {
  const cloudScore = Math.max(0, 100 - d.cloudCoverPct) * 0.7; // up to 70
  const moonScore = (1 - d.moonIllumination) * 30; // up to 30
  return Math.round(cloudScore + moonScore);
}

function cloudStatus(pct: number): { label: string; color: string } {
  if (pct >= 70) return { label: 'Cloud cover high', color: '#f0655a' };
  if (pct >= 30) return { label: 'Cloud cover moderate', color: '#f5a83d' };
  return { label: 'Cloud cover low', color: '#3ddc84' };
}

// phase: 0 (new) → 0.5 (full) → 1 (new again)
function phaseName(phase: number): string {
  const p = ((phase % 1) + 1) % 1;
  if (p < 0.03 || p > 0.97) return 'new';
  if (p < 0.22) return 'waxing crescent';
  if (p < 0.28) return 'first quarter';
  if (p < 0.47) return 'waxing gibbous';
  if (p < 0.53) return 'full';
  if (p < 0.72) return 'waning gibbous';
  if (p < 0.78) return 'last quarter';
  return 'waning crescent';
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

type Mission = { title: string; img: string; stars: number };

function buildMissions(planets: PlanetData[], tp: (k: string) => string): Mission[] {
  const planetName = (name: string) => {
    try {
      const v = tp(name.toLowerCase());
      return v && !v.startsWith('planets.') ? v : name;
    } catch {
      return name;
    }
  };

  const up = planets
    .filter((p) => p.visible && p.altitude > 8 && TARGET_META[p.name])
    .sort((a, b) => b.altitude - a.altitude)
    .slice(0, 5)
    .map((p) => ({ title: planetName(p.name), img: TARGET_META[p.name].img, stars: TARGET_META[p.name].stars }));

  if (up.length) return up;

  return (['Jupiter', 'Saturn', 'Moon'] as const).map((name) => ({
    title: planetName(name),
    img: TARGET_META[name].img,
    stars: TARGET_META[name].stars,
  }));
}

/* ─── Icons ───────────────────────────────────────────────────────── */

function ArrowIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}
