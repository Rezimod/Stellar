'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useMemo } from 'react';
import { useSkyData, type PlanetData, type ForecastDay } from '@/lib/use-sky-data';
import { MoonGlyph } from '@/components/sky/forecast/visuals';

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

type Verdict = 'GO' | 'MAYBE' | 'SKIP';

function verdictFromScore(score: number): { v: Verdict; color: string } {
  if (score >= 70) return { v: 'GO',    color: '#5EEAD4' };
  if (score >= 40) return { v: 'MAYBE', color: '#FFB347' };
  return { v: 'SKIP', color: '#94A3B8' };
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function pickTop3(planets: PlanetData[]): PlanetData[] {
  const visible = planets.filter((p) => p.altitude > 10).slice();
  visible.sort((a, b) => b.altitude - a.altitude);
  return visible.slice(0, 3);
}

function badgeColor(b: 'go' | 'maybe' | 'skip'): string {
  if (b === 'go') return '#5EEAD4';
  if (b === 'maybe') return '#FFB347';
  return '#94A3B8';
}

const COPY = {
  en: {
    stats: {
      cloud: 'Cloud',
      bortle: 'Bortle',
      planetsUp: 'Planets up',
    },
    outlook: '7-night outlook',
    cloudCol: 'cloud',
    tempCol: 'low',
    openForecast: 'Open the 7-day forecast →',
    verdict: {
      GO: 'GO',
      MAYBE: 'MAYBE',
      SKIP: 'SKIP',
    },
    compass: { N: 'N', E: 'E', S: 'S', W: 'W' },
    planetNames: {
      Mercury: 'Mercury',
      Venus: 'Venus',
      Mars: 'Mars',
      Jupiter: 'Jupiter',
      Saturn: 'Saturn',
      Uranus: 'Uranus',
      Neptune: 'Neptune',
      Moon: 'Moon',
    } as Record<string, string>,
    planetShort: {
      Mercury: 'MER',
      Venus: 'VEN',
      Mars: 'MAR',
      Jupiter: 'JUP',
      Saturn: 'SAT',
      Uranus: 'URA',
      Neptune: 'NEP',
      Moon: 'MON',
    } as Record<string, string>,
  },
  ka: {
    stats: {
      cloud: 'ღრუბლები',
      bortle: 'ბორტლი',
      planetsUp: 'ხილული პლანეტები',
    },
    outlook: '7-ღამიანი პროგნოზი',
    cloudCol: 'ღრუბ.',
    tempCol: 'მინ.',
    openForecast: 'გახსენი 7-ღამიანი პროგნოზი →',
    verdict: {
      GO: 'გადი',
      MAYBE: 'შეიძლება',
      SKIP: 'გამოტოვე',
    },
    compass: { N: 'ჩ', E: 'ა', S: 'ს', W: 'დ' },
    planetNames: {
      Mercury: 'მერკური',
      Venus: 'ვენერა',
      Mars: 'მარსი',
      Jupiter: 'იუპიტერი',
      Saturn: 'სატურნი',
      Uranus: 'ურანი',
      Neptune: 'ნეპტუნი',
      Moon: 'მთვარე',
    } as Record<string, string>,
    planetShort: {
      Mercury: 'მერ',
      Venus: 'ვენ',
      Mars: 'მარ',
      Jupiter: 'იუპ',
      Saturn: 'სატ',
      Uranus: 'ურა',
      Neptune: 'ნეპ',
      Moon: 'მთვ',
    } as Record<string, string>,
  },
} as const;

export default function TonightAtAGlance() {
  const locale = useLocale() === 'ka' ? 'ka' : 'en';
  const copy = COPY[locale];
  const sky = useSkyData();

  if (sky.loading) {
    return (
      <div className="animate-pulse max-w-[1000px] mx-auto">
        <div className="grid items-center gap-7 md:gap-14 md:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <div className="flex flex-col items-center">
            <div className="aspect-square w-full max-w-[230px] md:max-w-[360px] mx-auto rounded-full bg-white/[0.04]" />
            <div className="mt-5 h-3 w-60 max-w-full bg-white/[0.05] rounded" />
            <div className="mt-5 grid grid-cols-3 gap-2 w-full max-w-[340px]">
              <div className="h-14 bg-white/[0.04] rounded" />
              <div className="h-14 bg-white/[0.04] rounded" />
              <div className="h-14 bg-white/[0.04] rounded" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-7 bg-white/[0.03] rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const score = sky.score?.score ?? 0;
  const { v, color } = verdictFromScore(score);
  const headline = sky.score?.headline ?? '';
  const cloud = sky.conditions?.cloudCoverPct;
  const bortle = sky.location?.bortle;
  const visiblePlanets = sky.planets.filter((p) => p.visible && p.altitude > 10);
  const visibleCount = visiblePlanets.length;
  const top = pickTop3(sky.planets);

  return (
    <div className="max-w-[1000px] mx-auto">
      {/* Two columns on desktop so the whole section fits one screen with no
          scroll; a tight single column on mobile. Left = sky dome + verdict +
          stats. Right = top planets + 7-night forecast + CTA. */}
      <div className="grid items-center gap-7 md:gap-14 md:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">

        {/* ── Left: dome + headline + 3 stats ───────────────────────── */}
        <div className="flex flex-col items-center">
          <SkyDome
            planets={sky.planets}
            verdict={v}
            verdictColor={color}
            score={score}
            locale={locale}
          />

          {headline && (
            <p className="mt-4 md:mt-5 text-center text-[12.5px] md:text-[14px] text-white/65 leading-snug max-w-[340px]">
              {headline}
            </p>
          )}

          <div className="mt-5 md:mt-6 grid grid-cols-3 gap-2 md:gap-5 w-full max-w-[340px]">
            <Stat
              label={copy.stats.cloud}
              value={cloud != null ? `${cloud}%` : '—'}
              visual={<CloudVisual pct={cloud} />}
            />
            <Stat
              label={copy.stats.bortle}
              value={bortle != null ? String(bortle) : '—'}
              visual={<BortleVisual value={bortle} />}
            />
            <Stat
              label={copy.stats.planetsUp}
              value={String(visibleCount)}
              visual={<PlanetsVisual planets={visiblePlanets.slice(0, 5)} />}
            />
          </div>
        </div>

        {/* ── Right: top planets + 7-night forecast + CTA ───────────── */}
        <div className="flex flex-col">

          {/* Top 3 planets — realistic thumbnails */}
          {top.length > 0 && (
            <ul className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
              {top.map((p) => {
                const time = fmtTime(p.transitTime ?? p.riseTime);
                const img = PLANET_IMG[p.name];
                const dot = PLANET_DOT[p.name] ?? 'rgba(255,255,255,0.35)';
                return (
                  <li
                    key={p.name}
                    className="py-2 md:py-2.5 grid grid-cols-[28px_minmax(0,1fr)_auto_auto] items-center gap-x-3 md:gap-x-5"
                  >
                    <div
                      className="relative w-7 h-7 rounded-full overflow-hidden"
                      style={{
                        background: dot,
                        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
                      }}
                    >
                      {img && (
                        <Image
                          src={img}
                          alt=""
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <span className="text-left text-[13.5px] md:text-[15px] text-white/85">
                      {copy.planetNames[p.name] ?? p.name}
                    </span>
                    <span className="font-mono tabular-nums text-[12px] md:text-[12.5px] text-white/45">
                      {time}
                    </span>
                    <span className="font-mono tabular-nums text-[12.5px] md:text-[13px] text-white/75 w-[40px] md:w-[48px] text-right">
                      {Math.round(p.altitude)}°
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {/* 7-night forecast — live weather, one row per night */}
          {sky.forecast.length > 0 && (
            <div className="mt-5 md:mt-7">
              <div className="flex items-baseline justify-between mb-1.5 md:mb-2">
                <span className="font-mono text-[10px] md:text-[10.5px] uppercase tracking-[0.22em] text-white/40">
                  {copy.outlook}
                </span>
                {sky.location?.city && (
                  <span className="font-mono text-[10px] md:text-[10.5px] tracking-[0.12em] text-white/30 truncate max-w-[180px]">
                    {sky.location.city}
                  </span>
                )}
              </div>

              <div className="flex flex-col divide-y divide-white/[0.05]">
                {sky.forecast.slice(0, 7).map((d, i) => (
                  <ForecastRow key={d.date} day={d} highlight={i === 0} locale={locale} />
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 md:mt-6 text-center md:text-left">
            <Link
              href="/sky"
              className="inline-flex items-center gap-2 text-[#FFB347] font-mono text-[12px] md:text-[13px] hover:gap-3 transition-all no-underline"
            >
              {copy.openForecast}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Sky Dome — circular visual centerpiece, mirrors the Sky page's
   SkyMapScreen language: dark cosmic gradient, compass anchors,
   altitude rings, stars + real planet positions tonight.

   Replaces the previous 96px "SKIP/GO" text block. The verdict
   becomes a small chip; the score sits inside the dome.
   ───────────────────────────────────────────────────────────────── */
function SkyDome({
  planets,
  verdict,
  verdictColor,
  score,
  locale,
}: {
  planets: PlanetData[];
  verdict: Verdict;
  verdictColor: string;
  score: number;
  locale: 'en' | 'ka';
}) {
  const copy = COPY[locale];
  // Stable star field — deterministic so SSR/CSR match. Anchored points
  // give the dome texture without competing with planets.
  const stars = useMemo(() => {
    const seed = 17;
    const out: Array<{ x: number; y: number; r: number; o: number }> = [];
    for (let i = 0; i < 36; i++) {
      const a = (i * seed * 13) % 360;
      const rad = ((i * 7 + 11) % 100) / 100;
      const x = 50 + Math.cos((a * Math.PI) / 180) * (rad * 44);
      const y = 50 + Math.sin((a * Math.PI) / 180) * (rad * 44);
      const r = i % 5 === 0 ? 0.55 : 0.32;
      const o = 0.32 + ((i * 3) % 5) * 0.1;
      out.push({ x, y, r, o });
    }
    return out;
  }, []);

  // Project (azimuth, altitude) onto the 100x100 dome.
  // Center = zenith (alt=90). Edge = horizon (alt=0).
  // Azimuth: 0=N (up), 90=E (right), 180=S (down), 270=W (left).
  function project(az: number, alt: number) {
    const a = Math.max(0, Math.min(90, alt));
    const dist = ((90 - a) / 90) * 44;
    const rad = (az * Math.PI) / 180;
    return {
      x: 50 + Math.sin(rad) * dist,
      y: 50 - Math.cos(rad) * dist,
    };
  }

  const visible = planets.filter((p) => p.visible && p.altitude > 0);

  return (
    <div className="relative w-full max-w-[230px] md:max-w-[360px] mx-auto aspect-square">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <radialGradient id="tonightDomeBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0a1430" />
            <stop offset="60%" stopColor="#070D22" />
            <stop offset="100%" stopColor="#04060F" />
          </radialGradient>
          <radialGradient id="tonightDomeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={verdictColor} stopOpacity="0.10" />
            <stop offset="55%" stopColor={verdictColor} stopOpacity="0.02" />
            <stop offset="100%" stopColor={verdictColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Dome */}
        <circle cx="50" cy="50" r="46" fill="url(#tonightDomeBg)" stroke="rgba(255,255,255,0.10)" strokeWidth="0.4" />
        <circle cx="50" cy="50" r="46" fill="url(#tonightDomeGlow)" />

        {/* Altitude rings */}
        <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.3" />
        <circle cx="50" cy="50" r="15" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.3" />

        {/* Cardinal cross */}
        <line x1="50" y1="6" x2="50" y2="94" stroke="rgba(255,255,255,0.04)" strokeWidth="0.3" />
        <line x1="6" y1="50" x2="94" y2="50" stroke="rgba(255,255,255,0.04)" strokeWidth="0.3" />

        {/* Compass labels */}
        <text x="50" y="3.6" fill="rgba(255,255,255,0.5)" fontSize="3.2" textAnchor="middle" fontFamily="monospace" letterSpacing="0.1em">{copy.compass.N}</text>
        <text x="96.6" y="51.6" fill="rgba(255,255,255,0.5)" fontSize="3.2" textAnchor="middle" fontFamily="monospace" letterSpacing="0.1em">{copy.compass.E}</text>
        <text x="50" y="98.5" fill="rgba(255,255,255,0.5)" fontSize="3.2" textAnchor="middle" fontFamily="monospace" letterSpacing="0.1em">{copy.compass.S}</text>
        <text x="3.6" y="51.6" fill="rgba(255,255,255,0.5)" fontSize="3.2" textAnchor="middle" fontFamily="monospace" letterSpacing="0.1em">{copy.compass.W}</text>

        {/* Background stars */}
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white" opacity={s.o} />
        ))}

        {/* Real planets */}
        {visible.map((p) => {
          const pos = project(p.azimuth, p.altitude);
          const dot = PLANET_DOT[p.name] ?? '#FFFFFF';
          const isBig = p.altitude > 30;
          return (
            <g key={p.name}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isBig ? 2.2 : 1.6}
                fill={dot}
                opacity={0.95}
              />
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isBig ? 4.4 : 3.2}
                fill="none"
                stroke={dot}
                strokeOpacity="0.18"
                strokeWidth="0.4"
              />
              <text
                x={pos.x}
                y={pos.y - 4.6}
                fill={dot}
                opacity="0.85"
                fontSize="2.6"
                textAnchor="middle"
                fontFamily="monospace"
                fontWeight="bold"
                letterSpacing="0.06em"
              >
                {(copy.planetShort[p.name] ?? p.name.slice(0, 3)).toUpperCase()}
              </text>
            </g>
          );
        })}

        {/* Center score puck */}
        <g>
          <circle cx="50" cy="50" r="9.5" fill="rgba(4,6,15,0.85)" stroke={verdictColor} strokeOpacity="0.55" strokeWidth="0.5" />
          <text
            x="50"
            y="50.2"
            fill={verdictColor}
            fontSize="6"
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="monospace"
            fontWeight="700"
            letterSpacing="0.04em"
          >
            {score}
          </text>
          <text
            x="50"
            y="56.6"
            fill="rgba(255,255,255,0.35)"
            fontSize="2"
            textAnchor="middle"
            fontFamily="monospace"
            letterSpacing="0.18em"
          >
            /100
          </text>
        </g>
      </svg>

      {/* Verdict chip — positioned above the dome */}
      <div
        className="absolute left-1/2 -translate-x-1/2 -top-1 md:-top-2 px-3.5 py-1.5 rounded-full font-mono text-[11px] md:text-[12px] font-bold tracking-[0.22em]"
        style={{
          color: verdictColor,
          background: 'rgba(7, 12, 28, 0.92)',
          border: `1px solid ${verdictColor}40`,
          boxShadow: `0 0 24px ${verdictColor}1a`,
        }}
      >
        {copy.verdict[verdict]}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Forecast row — day initial + colored bar + badge dot.
   Mirrors the SkyForecastScreen pattern in the homepage iPhone.
   ───────────────────────────────────────────────────────────────── */
function dayShort(iso: string, locale: 'en' | 'ka'): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'ka' ? 'ka-GE' : 'en-US', { weekday: 'short' })
    .format(d)
    .replace('.', '')
    .slice(0, 3)
    .toUpperCase();
}

function ForecastRow({
  day,
  highlight,
  locale,
}: {
  day: ForecastDay;
  highlight: boolean;
  locale: 'en' | 'ka';
}) {
  const color = badgeColor(day.badge);
  const short = dayShort(day.date, locale);
  const copy = COPY[locale];
  return (
    <div className="grid grid-cols-[34px_16px_minmax(0,1fr)_42px_38px_52px] items-center gap-x-2.5 md:gap-x-3 py-[7px] md:py-2">
      <span
        className={`font-mono text-[11px] tracking-[0.08em] ${
          highlight ? 'text-white/90' : 'text-white/45'
        }`}
      >
        {short}
      </span>
      <span className="flex items-center justify-center" aria-hidden>
        <MoonGlyph phase={day.moonPhase} size={14} />
      </span>
      <NightSkyBand cloudCover={day.cloudCoverPct ?? 0} seed={day.date} />
      <span className="font-mono text-[11px] tabular-nums text-right text-white/55">
        {day.cloudCoverPct != null ? `${day.cloudCoverPct}%` : '—'}
      </span>
      <span className="font-mono text-[11px] tabular-nums text-right text-white/55">
        {day.tempLow != null ? `${day.tempLow}°` : '—'}
      </span>
      <span
        className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-right tabular-nums"
        style={{ color }}
      >
        {copy.verdict[day.badge.toUpperCase() as Verdict]}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   NightSkyBand — a literal window into the night sky for one night.
   A cloud bank rolls in from the left covering a fraction of the band
   equal to the cloud %, dimming the stars it passes over. Clear sky
   on the right keeps its stars bright. Cosmic + cloud, read at a glance.
   ───────────────────────────────────────────────────────────────── */
function NightSkyBand({ cloudCover, seed }: { cloudCover: number; seed: string }) {
  const W = 120;
  const H = 24;
  const cover = Math.max(0, Math.min(100, cloudCover)) / 100;
  const coverX = cover * W;

  const seedNum = useMemo(() => {
    let s = 0;
    for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) % 9973;
    return s;
  }, [seed]);

  const stars = useMemo(() => {
    const out: Array<{ x: number; y: number; r: number; o: number }> = [];
    for (let i = 0; i < 11; i++) {
      const x = 5 + ((i * 53 + seedNum * 7) % (W - 10));
      const y = 4 + ((i * 29 + seedNum * 3) % (H - 8));
      const r = i % 4 === 0 ? 0.95 : 0.6;
      const o = 0.4 + ((i * 17) % 5) * 0.12;
      out.push({ x, y, r, o });
    }
    return out;
  }, [seedNum]);

  // Cloud bank — overlapping soft puffs from the left edge to coverX,
  // tapering on the right so the bank dissolves into clear sky.
  const puffs = useMemo(() => {
    if (coverX < 4) return [];
    const out: Array<{ x: number; y: number; r: number; o: number }> = [];
    for (let x = -4; x <= coverX; x += 9) {
      const taper = Math.max(0, Math.min(1, (coverX - x) / 14));
      out.push({
        x,
        y: 12 + (((x + seedNum) * 5) % 7) - 3,
        r: 7 + (((x + seedNum) * 3) % 4),
        o: 0.22 + cover * 0.4 * taper,
      });
    }
    return out;
  }, [coverX, cover, seedNum]);

  const fid = `cloudblur-${seedNum}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" aria-hidden>
      <defs>
        <filter id={fid} x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
        <radialGradient id={`${fid}-bg`} cx="50%" cy="120%" r="120%">
          <stop offset="0%" stopColor="#101a36" />
          <stop offset="100%" stopColor="#070c1d" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width={W} height={H} rx="4" fill={`url(#${fid}-bg)`} />

      {/* Stars — dimmed where the cloud bank covers them */}
      {stars.map((s, i) => {
        const covered = s.x < coverX;
        const opacity = covered ? s.o * 0.12 : s.o;
        return <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#dbe7ff" opacity={opacity} />;
      })}

      {/* Cloud bank */}
      <g filter={`url(#${fid})`}>
        {puffs.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#c4d2ee" opacity={p.o} />
        ))}
      </g>
    </svg>
  );
}

function Stat({
  label,
  value,
  visual,
}: {
  label: string;
  value: string;
  visual: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="font-mono text-[10px] md:text-[11px] uppercase tracking-[0.16em] md:tracking-[0.2em] text-white/40 text-center leading-tight">
        {label}
      </span>
      <span className="font-mono tabular-nums text-[22px] md:text-[28px] text-white/92 leading-none">
        {value}
      </span>
      <div className="mt-1 h-3 flex items-center justify-center">{visual}</div>
    </div>
  );
}

/* Cloud — a minimal horizontal fill (the % already gives the data,
   the visual gives instant "how covered is the sky" without numbers) */
function CloudVisual({ pct }: { pct: number | undefined }) {
  if (pct == null) return null;
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="w-[56px] h-[5px] rounded-full bg-white/[0.08] overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{ width: `${clamped}%`, background: 'rgba(255,255,255,0.55)' }}
      />
    </div>
  );
}

/* Bortle — a 9-step scale, current step highlighted in amber.
   1 = darkest sky (good), 9 = inner-city (bad). */
function BortleVisual({ value }: { value: number | undefined }) {
  if (value == null) return null;
  const v = Math.max(1, Math.min(9, value));
  return (
    <div className="flex items-center gap-[3px]">
      {Array.from({ length: 9 }).map((_, i) => {
        const num = i + 1;
        const active = num === v;
        const filled = num <= v;
        return (
          <span
            key={i}
            aria-hidden
            className={`block rounded-full ${active ? 'w-[7px] h-[7px]' : 'w-[5px] h-[5px]'}`}
            style={{
              background: active
                ? '#FFB347'
                : filled
                ? 'rgba(255,255,255,0.42)'
                : 'rgba(255,255,255,0.12)',
            }}
          />
        );
      })}
    </div>
  );
}

/* Planets up — small, colored dots per planet (uses the same dot
   palette as the row list so it reads as a preview). */
function PlanetsVisual({ planets }: { planets: PlanetData[] }) {
  if (planets.length === 0) {
    return (
      <span
        className="block w-[6px] h-[6px] rounded-full"
        style={{ background: 'rgba(255,255,255,0.18)' }}
      />
    );
  }
  return (
    <div className="flex items-center gap-[5px]">
      {planets.map((p) => (
        <span
          key={p.name}
          aria-hidden
          className="block w-[7px] h-[7px] rounded-full"
          style={{
            background: PLANET_DOT[p.name] ?? 'rgba(255,255,255,0.55)',
            boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.25)',
          }}
        />
      ))}
    </div>
  );
}
