'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import {
  useSkyData,
  type PlanetData,
  type ForecastDay,
  type ObservableObject,
} from '@/lib/use-sky-data';
import { MoonGlyph, NightCloudStrip } from '@/components/sky/forecast/visuals';

const PLANET_IMG: Record<string, string> = {
  Mercury: '/images/planets/mercury.jpg',
  Venus:   '/images/planets/venus.jpg',
  Mars:    '/images/planets/mars.jpg',
  Jupiter: '/images/planets/jupiter.jpg',
  Saturn:  '/images/planets/saturn.jpg',
  Uranus:  '/images/planets/uranus.jpg',
  Neptune: '/images/planets/neptune.jpg',
  Moon:    '/images/planets/moon.jpg',
};

const PLANET_DOT: Record<string, string> = {
  Mercury: '#C9C2B0',
  Venus:   '#F4D9A0',
  Mars:    '#E8836A',
  Jupiter: '#C8A96E',
  Saturn:  '#D4BE8A',
  Uranus:  '#9FD8E5',
  Neptune: '#6F8FE2',
  Moon:    '#E2D5B0',
};

type Verdict = 'go' | 'maybe' | 'skip';

const VERDICT_COLOR: Record<Verdict, string> = {
  go: '#5EEAD4',
  maybe: '#FFB347',
  skip: '#94A3B8',
};

const COPY = {
  en: {
    scoreLabel: 'Sky score',
    tonight: 'Tonight',
    cloudRow: 'Cloud',
    visibleTonight: 'Visible tonight',
    nothingUp: 'Nothing is above the horizon right now.',
    outlook: '7-night outlook',
    colCloud: 'Cloud',
    colLow: 'Low',
    openForecast: 'Open the 7-day forecast →',
    alt: 'alt',
    mag: 'mag',
    peakLabel: 'Peaks',
    verdict: { go: 'GO', maybe: 'MAYBE', skip: 'SKIP' } as Record<Verdict, string>,
    dirs: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
    unavailable: 'Sky data is unavailable right now.',
    moon: 'Moon',
    lit: 'lit',
    cloudNote: 'cloud over the night window',
    bortle: 'Bortle',
    best: 'Best',
    planetNames: {
      Mercury: 'Mercury', Venus: 'Venus', Mars: 'Mars', Jupiter: 'Jupiter',
      Saturn: 'Saturn', Uranus: 'Uranus', Neptune: 'Neptune', Moon: 'Moon',
    } as Record<string, string>,
  },
  ka: {
    scoreLabel: 'ცის ქულა',
    tonight: 'ამაღამ',
    cloudRow: 'ღრუბ.',
    visibleTonight: 'ხილული ამაღამ',
    nothingUp: 'ჰორიზონტზე ამჟამად არაფერი ჩანს.',
    outlook: '7-ღამიანი პროგნოზი',
    colCloud: 'ღრუბ.',
    colLow: 'მინ.',
    openForecast: 'გახსენი 7-ღამიანი პროგნოზი →',
    alt: 'სიმ.',
    mag: 'ვარსკ.',
    peakLabel: 'პიკი',
    verdict: { go: 'გადი', maybe: 'შეიძლება', skip: 'გამოტოვე' } as Record<Verdict, string>,
    dirs: ['ჩ', 'ჩა', 'ა', 'სა', 'ს', 'სდ', 'დ', 'ჩდ'],
    unavailable: 'ცის მონაცემები ამჟამად მიუწვდომელია.',
    moon: 'მთვარე',
    lit: 'განათებული',
    cloudNote: 'ღრუბლიანობა ღამის ფანჯარაში',
    bortle: 'ბორტლი',
    best: 'საუკეთესო',
    planetNames: {
      Mercury: 'მერკური', Venus: 'ვენერა', Mars: 'მარსი', Jupiter: 'იუპიტერი',
      Saturn: 'სატურნი', Uranus: 'ურანი', Neptune: 'ნეპტუნი', Moon: 'მთვარე',
    } as Record<string, string>,
  },
} as const;

type Copy = (typeof COPY)['en' | 'ka'];

function fmtHHmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/* Map a clock time onto the 20:00 → 05:00 night axis as a 0..1 fraction.
   Hours past midnight fold onto 24..29 so the axis is monotonic. */
function nightFrac(iso: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  let h = d.getHours() + d.getMinutes() / 60;
  if (h < 12) h += 24;
  return Math.max(0, Math.min(1, (h - 20) / 9));
}

function compassDir(azimuth: number, dirs: readonly string[]): string {
  return dirs[Math.round(((azimuth % 360) + 360) % 360 / 45) % 8];
}

/* In tonight mode the planets API reports each body at its best moment of the
   night window: `transitTime` is the peak time and altitude/azimuth are taken
   at that peak. Label the column accordingly. */
function peakTime(p: PlanetData): string {
  const iso = p.transitTime;
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : fmtHHmm(d);
}

export default function TonightAtAGlance() {
  const locale = useLocale() === 'ka' ? 'ka' : 'en';
  const copy = COPY[locale];
  const sky = useSkyData();

  if (sky.loading) return <Skeleton />;

  if (sky.error && sky.forecast.length === 0 && sky.planets.length === 0) {
    return (
      <div className="max-w-[1000px] mx-auto rounded-xl border border-white/[0.08] p-6 text-center">
        <p className="text-[13px] text-white/60">{copy.unavailable}</p>
        <Link
          href="/sky"
          className="inline-block mt-3 font-mono text-[12px] text-[#FFB347] no-underline"
        >
          {copy.openForecast}
        </Link>
      </div>
    );
  }

  const tonight: ForecastDay | undefined = sky.forecast[0];
  const planetsUp = sky.planets
    .filter((p) => p.visible && p.altitude > 5)
    .sort((a, b) => b.altitude - a.altitude)
    .slice(0, 6);

  // Verdict and score both derive from tonight's *evening* window (the same
  // numbers the outlook rows use), so the banner can never say GO while the
  // first forecast row says SKIP. Instantaneous conditions only fill the gap
  // when the forecast is missing.
  let score = sky.score?.score ?? 0;
  let verdict: Verdict = score >= 70 ? 'go' : score >= 40 ? 'maybe' : 'skip';
  if (tonight) {
    verdict = tonight.badge;
    const brightCount = sky.planets.filter(
      (p) => p.visible && p.altitude > 15 && p.magnitude < 2,
    ).length;
    score = Math.round(
      (100 - tonight.cloudCoverPct) * 0.6 +
        (1 - tonight.moonIllumination) * 20 +
        Math.min(20, brightCount * 7),
    );
    if (verdict === 'go') score = Math.max(70, score);
    else if (verdict === 'maybe') score = Math.min(69, Math.max(40, score));
    else score = Math.min(39, score);
  }
  const color = VERDICT_COLOR[verdict];

  const cloud = tonight?.cloudCoverPct ?? sky.conditions?.cloudCoverPct;
  const moonPct = tonight ? Math.round(tonight.moonIllumination * 100) : null;
  const bortle = sky.location?.bortle;
  const bestNames = (sky.score?.bestTargets ?? [])
    .slice(0, 2)
    .map((n) => copy.planetNames[n] ?? n);

  const summaryParts: string[] = [];
  if (cloud != null) summaryParts.push(`${cloud}% ${copy.cloudNote}`);
  if (moonPct != null) summaryParts.push(`${copy.moon} ${moonPct}% ${copy.lit}`);
  if (bortle != null) summaryParts.push(`${copy.bortle} ${bortle}`);
  if (verdict !== 'skip' && bestNames.length > 0)
    summaryParts.push(`${copy.best}: ${bestNames.join(', ')}`);

  // Label the banner with the night being judged (forecast[0]'s date), so it
  // always matches the first outlook row even across midnight.
  const bannerDate = tonight ? new Date(`${tonight.date}T12:00:00`) : sky.evalTime ?? new Date();
  const dateLabel = new Intl.DateTimeFormat(locale === 'ka' ? 'ka-GE' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
    .format(bannerDate)
    .toUpperCase();

  return (
    <div className="max-w-[1000px] mx-auto flex flex-col gap-4">

      {/* ── Verdict banner + tonight timeline ─────────────────────── */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.015] overflow-hidden">
        <div className="p-4 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="font-mono text-[12px] uppercase tracking-[0.18em] text-white/40 truncate">
                {dateLabel}
                {sky.location?.city ? ` · ${sky.location.city}` : ''}
              </div>
              <div
                className="font-display mt-1.5 text-[30px] md:text-[40px] leading-none tracking-[0.04em]"
                style={{ color }}
              >
                {copy.verdict[verdict]}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono text-[12px] uppercase tracking-[0.18em] text-white/40">
                {copy.scoreLabel}
              </div>
              <div className="font-mono tabular-nums mt-1 text-[24px] md:text-[28px] leading-none text-white/90">
                {score}
                <span className="text-[13px] text-white/35">/100</span>
              </div>
              <div className="mt-2 ml-auto w-[84px] h-[3px] rounded-full bg-white/[0.08] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${score}%`, background: color }}
                />
              </div>
            </div>
          </div>

          {summaryParts.length > 0 && (
            <p className="mt-3 text-[13px] md:text-[14px] leading-relaxed text-white/60">
              {summaryParts.join(' · ')}
            </p>
          )}
        </div>

        <TonightTimeline
          tonight={tonight}
          objects={sky.timeline.objects}
          isCurrentlyDark={sky.isCurrentlyDark}
          copy={copy}
        />
      </div>

      {/* ── Planets + 7-night outlook ──────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <PlanetPanel planets={planetsUp} copy={copy} />
        <OutlookPanel forecast={sky.forecast} city={sky.location?.city} copy={copy} locale={locale} />
      </div>

      <div className="text-center">
        <Link
          href="/sky"
          className="inline-flex items-center gap-2 text-[#FFB347] font-mono text-[12px] md:text-[13px] hover:gap-3 transition-all no-underline"
        >
          {copy.openForecast}
        </Link>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Tonight timeline — a 20:00 → 05:00 axis. Top row is the hourly
   cloud forecast for the night window; below it, one bar per object
   showing when it is actually observable (above the horizon during
   astronomical darkness), with a tick at its peak altitude.
   ───────────────────────────────────────────────────────────────── */
const AXIS_TICKS = [
  { frac: 0, label: '20' },
  { frac: 2 / 9, label: '22' },
  { frac: 4 / 9, label: '00' },
  { frac: 6 / 9, label: '02' },
  { frac: 8 / 9, label: '04' },
];

function TonightTimeline({
  tonight,
  objects,
  isCurrentlyDark,
  copy,
}: {
  tonight: ForecastDay | undefined;
  objects: ObservableObject[];
  isCurrentlyDark: boolean;
  copy: Copy;
}) {
  const bars = objects
    .filter((o) => o.peakAlt >= 5)
    .sort((a, b) => b.peakAlt - a.peakAlt)
    .slice(0, 4)
    .map((o) => {
      const start = nightFrac(o.visibleStart);
      const end = nightFrac(o.visibleEnd);
      const peak = nightFrac(o.peakAt);
      const peakDate = new Date(o.peakAt);
      return {
        ...o,
        start,
        end: Math.max(end, start + 0.02),
        peak,
        peakLabel: Number.isNaN(peakDate.getTime()) ? '—' : fmtHHmm(peakDate),
      };
    })
    .filter((b) => b.end > b.start);

  if (!tonight && bars.length === 0) return null;

  const nowFrac = isCurrentlyDark ? nightFrac(new Date().toISOString()) : null;
  const rowGrid =
    'grid grid-cols-[68px_minmax(0,1fr)_84px] md:grid-cols-[92px_minmax(0,1fr)_104px] items-center gap-x-2 md:gap-x-3';

  return (
    <div className="border-t border-white/[0.08] px-4 md:px-6 py-4 md:py-5">
      <div className="font-mono text-[12px] uppercase tracking-[0.18em] text-white/40 mb-3">
        {copy.tonight} · 20:00 → 05:00
      </div>

      {tonight && (
        <div className={`${rowGrid} h-7`}>
          <span className="font-mono text-[12px] text-white/45 truncate">{copy.cloudRow}</span>
          <NightCloudStrip hours={tonight.nightHours} height={14} cellGap={2} />
          <span className="font-mono tabular-nums text-[12px] text-white/45 text-right">
            {tonight.cloudCoverPct}%
          </span>
        </div>
      )}

      {bars.map((b) => (
        <div key={b.name} className={`${rowGrid} h-7`}>
          <span className="font-mono text-[12px] text-white/70 truncate" title={b.name}>
            {copy.planetNames[b.name] ?? b.name}
          </span>
          <div className="relative h-[14px]">
            <div
              className="absolute inset-y-[2px] rounded-[3px]"
              style={{
                left: `${b.start * 100}%`,
                width: `${(b.end - b.start) * 100}%`,
                background: `${b.color}26`,
                boxShadow: `inset 0 0 0 1px ${b.color}59`,
              }}
            />
            <div
              className="absolute inset-y-0 w-[2px] rounded-full"
              style={{ left: `calc(${b.peak * 100}% - 1px)`, background: b.color }}
            />
            {nowFrac != null && (
              <div
                className="absolute inset-y-[-2px] w-px bg-white/40 motion-safe:animate-pulse"
                style={{ left: `${nowFrac * 100}%` }}
              />
            )}
          </div>
          <span className="font-mono tabular-nums text-[12px] text-white/45 text-right">
            {b.peakLabel} · {Math.round(b.peakAlt)}°
          </span>
        </div>
      ))}

      <div className={rowGrid}>
        <span />
        <div className="relative h-4">
          {AXIS_TICKS.map((t) => (
            <span
              key={t.label}
              className="absolute top-0.5 -translate-x-1/2 font-mono tabular-nums text-[12px] text-white/30"
              style={{ left: `${t.frac * 100}%` }}
            >
              {t.label}
            </span>
          ))}
        </div>
        <span />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Visible tonight — every listed planet is counted in the header,
   with direction, magnitude, altitude, and a labeled next event.
   ───────────────────────────────────────────────────────────────── */
function PlanetPanel({ planets, copy }: { planets: PlanetData[]; copy: Copy }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.015] p-4 md:p-5">
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-white/40">
          {copy.visibleTonight}
        </span>
        <span className="font-mono tabular-nums text-[12px] text-white/45">{planets.length}</span>
      </div>

      {planets.length === 0 ? (
        <p className="py-4 text-[13px] text-white/50">{copy.nothingUp}</p>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {planets.map((p) => {
            return (
              <li
                key={p.name}
                className="py-2.5 grid grid-cols-[32px_minmax(0,1fr)_auto_auto] items-center gap-x-3"
              >
                <div
                  className="relative w-8 h-8 rounded-full overflow-hidden"
                  style={{
                    background: PLANET_DOT[p.name] ?? 'rgba(255,255,255,0.2)',
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
                  }}
                >
                  {PLANET_IMG[p.name] && (
                    <Image src={PLANET_IMG[p.name]} alt="" fill sizes="32px" className="object-cover" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[14px] text-white/90 truncate">
                    {copy.planetNames[p.name] ?? p.name}
                  </div>
                  <div className="font-mono text-[12px] text-white/40 truncate">
                    {compassDir(p.azimuth, copy.dirs)} · {copy.mag} {p.magnitude.toFixed(1)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[12px] text-white/35 leading-tight">
                    {copy.peakLabel}
                  </div>
                  <div className="font-mono tabular-nums text-[13px] text-white/70 leading-tight">
                    {peakTime(p)}
                  </div>
                </div>
                <div className="text-right w-[44px]">
                  <div className="font-mono text-[12px] text-white/35 leading-tight">{copy.alt}</div>
                  <div className="font-mono tabular-nums text-[13px] text-white/85 leading-tight">
                    {Math.round(p.altitude)}°
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   7-night outlook — hourly cloud cells per night (real Open-Meteo
   data), moon phase, labeled columns, verdict word per night.
   ───────────────────────────────────────────────────────────────── */
function dayShort(iso: string, locale: 'en' | 'ka'): string {
  const d = new Date(iso + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'ka' ? 'ka-GE' : 'en-US', { weekday: 'short' })
    .format(d)
    .replace('.', '')
    .slice(0, 3)
    .toUpperCase();
}

function OutlookPanel({
  forecast,
  city,
  copy,
  locale,
}: {
  forecast: ForecastDay[];
  city: string | undefined;
  copy: Copy;
  locale: 'en' | 'ka';
}) {
  if (forecast.length === 0) return null;

  const rowGrid = 'grid items-center gap-x-2 md:gap-x-2.5';
  const rowCols = {
    gridTemplateColumns: `36px 18px minmax(0,1fr) 40px 36px ${locale === 'ka' ? '76px' : '52px'}`,
  };

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.015] p-4 md:p-5">
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-white/40">
          {copy.outlook}
        </span>
        {city && (
          <span className="font-mono text-[12px] text-white/30 truncate max-w-[140px]">{city}</span>
        )}
      </div>

      <div className={`${rowGrid} pb-1.5 border-b border-white/[0.06]`} style={rowCols}>
        <span />
        <span />
        <span className="font-mono text-[12px] text-white/30">20h → 05h</span>
        <span className="font-mono text-[12px] text-white/30 text-right">{copy.colCloud}</span>
        <span className="font-mono text-[12px] text-white/30 text-right">{copy.colLow}</span>
        <span />
      </div>

      <div className="divide-y divide-white/[0.05]">
        {forecast.slice(0, 7).map((d, i) => (
          <div key={d.date} className={`${rowGrid} py-[7px]`} style={rowCols}>
            <span
              className={`font-mono text-[12px] tracking-[0.06em] ${
                i === 0 ? 'text-white/90' : 'text-white/45'
              }`}
            >
              {dayShort(d.date, locale)}
            </span>
            <span className="flex items-center" aria-hidden>
              <MoonGlyph phase={d.moonPhase} size={13} />
            </span>
            <NightCloudStrip hours={d.nightHours} height={12} cellGap={2} />
            <span className="font-mono tabular-nums text-[12px] text-white/55 text-right">
              {d.cloudCoverPct}%
            </span>
            <span className="font-mono tabular-nums text-[12px] text-white/55 text-right">
              {d.tempLow != null ? `${d.tempLow}°` : '—'}
            </span>
            <span
              className="font-mono text-[12px] uppercase tracking-[0.1em] text-right"
              style={{ color: VERDICT_COLOR[d.badge] }}
            >
              {copy.verdict[d.badge]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="max-w-[1000px] mx-auto flex flex-col gap-4 animate-pulse">
      <div className="rounded-xl border border-white/[0.06] p-4 md:p-6">
        <div className="flex justify-between">
          <div>
            <div className="h-3 w-32 bg-white/[0.05] rounded" />
            <div className="mt-3 h-9 w-28 bg-white/[0.06] rounded" />
          </div>
          <div className="h-9 w-20 bg-white/[0.05] rounded" />
        </div>
        <div className="mt-6 flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 bg-white/[0.03] rounded" />
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/[0.06] p-4 md:p-5">
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} className="h-7 my-2 bg-white/[0.03] rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
