'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSkyForecast, type PlanetData, type ForecastDay } from '@/lib/use-sky-data';
import { useLocation } from '@/lib/location';

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

type Verdict = 'go' | 'maybe' | 'skip';

const VERDICT_COLOR: Record<Verdict, string> = {
  go: 'var(--seafoam)',
  maybe: 'var(--terracotta)',
  skip: '#94A3B8',
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
      className="relative flex w-full flex-col overflow-hidden pt-14"
      style={{
        minHeight: '100svh',
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

      {/* === Content: one question, one live answer, one action === */}
      <div className="relative z-10 mx-auto flex w-full max-w-[680px] flex-1 flex-col items-center justify-center px-6 pb-16 pt-10 text-center md:pb-20">
        <h1
          className="m-0 text-[#f6f8ff]"
          style={{
            fontWeight: 700,
            fontSize: 'clamp(34px, 7vw, 72px)',
            lineHeight: 1.06,
            letterSpacing: '-0.025em',
            textWrap: 'balance',
            animation: 'heroCardSwap 0.7s ease both',
          }}
        >
          {t('headline1')}
          <br />
          <span style={{ color: 'var(--terracotta)' }}>{t('headline2')}</span>
        </h1>

        <p
          className="mt-4 max-w-[460px] text-[15px] md:text-[17px]"
          style={{ color: '#aab4d4', lineHeight: 1.6, animation: 'heroCardSwap 0.7s ease 0.06s both' }}
        >
          {t('subtitle')}
        </p>

        <div className="mt-8 w-full max-w-[440px]" style={{ animation: 'heroCardSwap 0.7s ease 0.12s both' }}>
          <TonightCard />
        </div>

        <Link
          href="/missions"
          className="hero-pill-primary mt-4 inline-flex w-full max-w-[440px] items-center justify-center gap-2.5 rounded-xl px-8 py-4 no-underline"
          style={{
            background: 'linear-gradient(180deg,#ffc866 0%,#f59e2e 55%,#df8214 100%)',
            color: '#241503',
            fontWeight: 600,
            fontSize: 15,
            fontFamily: 'var(--font-cta, var(--font-body))',
            boxShadow: 'inset 0 1px 0 rgba(255,235,200,0.7), inset 0 -2px 0 rgba(120,60,0,0.35), 0 8px 26px rgba(245,158,46,0.35)',
            animation: 'heroCardSwap 0.7s ease 0.18s both',
          }}
        >
          {t('ctaPrimary')}
          <ArrowIcon />
        </Link>
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

/* ─── Tonight card — the live answer ──────────────────────────────── */

function TonightCard() {
  const t = useTranslations('homepage.hero');
  const tp = useTranslations('planets');
  const { location } = useLocation();
  const sky = useSkyForecast();

  const day = sky.forecast[0];
  // Verdict comes from tonight's forecast badge — the same source every other
  // surface uses — and the score is clamped into that band so the hero can
  // never contradict the 7-night outlook.
  let score = day ? dayScore(day) : 0;
  const verdict: Verdict = day ? day.badge : score >= 70 ? 'go' : score >= 40 ? 'maybe' : 'skip';
  if (day) {
    if (verdict === 'go') score = Math.max(70, score);
    else if (verdict === 'maybe') score = Math.min(69, Math.max(40, score));
    else score = Math.min(39, score);
  }
  const color = VERDICT_COLOR[verdict];
  const planetsUp = sky.planets.filter((p) => p.visible && p.altitude > 10).length;
  const mission = useMemo(() => buildMissions(sky.planets, tp)[0], [sky.planets, tp]);
  const cityLabel = (location.city || 'Tbilisi').toUpperCase();
  const loading = sky.loading || !day;

  return (
    <div
      className="w-full overflow-hidden rounded-2xl text-left"
      style={{
        background: 'linear-gradient(170deg, rgba(15,22,46,0.82), rgba(6,9,20,0.9))',
        border: '1px solid rgba(140,165,235,0.16)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180,200,255,0.10)',
      }}
    >
      {/* header — live · city / score label */}
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <span className="flex min-w-0 items-center gap-2 font-mono text-[10.5px] tracking-[0.22em] text-[#8d99bd]">
          <span className="hero-live-dot shrink-0" />
          <span className="truncate">{t('cards.today').toUpperCase()} · {cityLabel}</span>
        </span>
        <span className="shrink-0 font-mono text-[10.5px] tracking-[0.22em] text-[#8d99bd]">
          {t('cards.skyScore').toUpperCase()}
        </span>
      </div>

      {/* verdict word + score */}
      <div className="flex items-center justify-between gap-4 px-5 pb-4 pt-2">
        {loading ? (
          <span className="h-10 w-32 animate-pulse rounded-lg bg-white/[0.06]" />
        ) : (
          <span
            className="leading-none"
            style={{ color, fontWeight: 700, fontSize: 'clamp(30px, 8vw, 40px)', letterSpacing: '-0.01em' }}
          >
            {t(`cards.verdict.${verdict}`).toUpperCase()}
          </span>
        )}
        {loading ? (
          <span className="h-9 w-20 animate-pulse rounded-lg bg-white/[0.06]" />
        ) : (
          <span className="font-mono leading-none text-[#f6f8ff] tabular-nums" style={{ fontSize: 32 }}>
            {score}
            <span className="text-[14px] text-[#7f8cad]">/100</span>
          </span>
        )}
      </div>

      {/* three live stats */}
      <div className="grid grid-cols-3 border-t" style={{ borderColor: 'rgba(140,165,235,0.12)' }}>
        <MiniStat label={t('cards.cloud')} value={loading ? null : `${day.cloudCoverPct}%`} />
        <MiniStat label={t('cards.moonLabel')} value={loading ? null : `${Math.round(day.moonIllumination * 100)}%`} divider />
        <MiniStat label={t('cards.planetsUp')} value={loading ? null : String(planetsUp)} divider />
      </div>

      {/* tonight's mission */}
      <Link
        href="/missions"
        className="flex items-center gap-3.5 border-t px-5 py-3.5 no-underline transition-colors hover:bg-white/[0.04]"
        style={{ borderColor: 'rgba(140,165,235,0.12)' }}
      >
        {loading || !mission ? (
          <>
            <span className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-white/[0.06]" />
            <span className="flex-1 space-y-1.5">
              <span className="block h-2.5 w-24 animate-pulse rounded bg-white/[0.06]" />
              <span className="block h-3.5 w-16 animate-pulse rounded bg-white/[0.05]" />
            </span>
          </>
        ) : (
          <>
            <span
              className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full"
              style={{ boxShadow: '0 0 0 1px rgba(245,168,61,0.35)' }}
            >
              <Image src={mission.img} alt="" fill sizes="40px" className="object-cover" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="mb-0.5 block font-mono text-[10px] tracking-[0.22em] text-[#f5a83d]">
                {t('cards.missionsLabel').toUpperCase()}
              </span>
              <span className="flex items-baseline gap-2">
                <span className="truncate text-[15px] font-semibold text-[#f4f7ff]">{mission.title}</span>
                <span className="shrink-0 font-mono text-[12.5px] text-[#ffc877] tabular-nums">+{mission.stars} ★</span>
              </span>
            </span>
            <span className="flex-none text-[#ffc877]" aria-hidden><ArrowIcon /></span>
          </>
        )}
      </Link>
    </div>
  );
}

function MiniStat({ label, value, divider }: { label: string; value: string | null; divider?: boolean }) {
  return (
    <div
      className="flex flex-col gap-1 px-4 py-3"
      style={divider ? { borderLeft: '1px solid rgba(140,165,235,0.12)' } : undefined}
    >
      <span className="truncate font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#7f8cad]">{label}</span>
      {value == null ? (
        <span className="h-4 w-9 animate-pulse rounded bg-white/[0.06]" />
      ) : (
        <span className="font-mono text-[16px] leading-none text-[#e7ecfb] tabular-nums">{value}</span>
      )}
    </div>
  );
}

/* ─── Data helpers ────────────────────────────────────────────────── */

function dayScore(d: ForecastDay): number {
  const cloudScore = Math.max(0, 100 - d.cloudCoverPct) * 0.7; // up to 70
  const moonScore = (1 - d.moonIllumination) * 30; // up to 30
  return Math.round(cloudScore + moonScore);
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
