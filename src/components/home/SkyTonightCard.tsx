'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useSkyData, type PlanetData } from '@/lib/use-sky-data';

/* "Sky tonight" card — the Spacefox glass widget, built to the mockup.
   Values are live from useSkyData: score, cloud, dark window, moon, and the
   top observable target tonight. */

const HERO_FONT = 'var(--font-hero), system-ui, sans-serif';
const MONO = 'var(--font-mono), ui-monospace, monospace';

const STATUS = { good: '#3ddc84', warn: '#f5a83d', bad: '#f0655a' } as const;
type Status = keyof typeof STATUS;

const TARGET_IMG = new Set([
  'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'sun',
]);

const COPY = {
  en: {
    openSky: 'OPEN SKY',
    skyScore: 'SKY SCORE',
    mission: "TONIGHT'S MISSION",
    cloud: 'Cloud cover',
    dark: 'Dark window',
    moon: 'Moon',
    phase: { new: 'new', waxing: 'waxing', waning: 'waning', full: 'full' },
    yourSky: 'YOUR SKY',
    noTarget: 'Nothing up — check back',
  },
  ka: {
    openSky: 'გახსენი ცა',
    skyScore: 'ცის ქულა',
    mission: 'ამაღამის მისია',
    cloud: 'ღრუბლიანობა',
    dark: 'ბნელი ფანჯარა',
    moon: 'მთვარე',
    phase: { new: 'ახალი', waxing: 'მზარდი', waning: 'კლებადი', full: 'სავსე' },
    yourSky: 'შენი ცა',
    noTarget: 'ცა ცარიელია — შემოიარე მოგვიანებით',
  },
} as const;

const DAYS = {
  en: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
  ka: ['კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი'],
} as const;

function cloudStatus(pct: number): Status {
  if (pct > 60) return 'bad';
  if (pct > 30) return 'warn';
  return 'good';
}
function moonStatus(illum: number): Status {
  if (illum < 0.25) return 'good';
  if (illum < 0.6) return 'warn';
  return 'bad';
}
function moonWord(phase: number, illum: number, locale: 'en' | 'ka'): string {
  const p = COPY[locale].phase;
  if (illum < 0.03) return p.new;
  if (illum > 0.97) return p.full;
  return phase < 0.5 ? p.waxing : p.waning;
}
function pickTarget(planets: PlanetData[]): PlanetData | null {
  const up = planets
    .filter((p) => p.name !== 'Sun' && p.visible && p.altitude > 10)
    .sort((a, b) => b.altitude - a.altitude);
  if (up.length === 0) return null;
  const planet = up.find((p) => p.name !== 'Moon');
  return planet ?? up[0];
}

const GAUGE_CIRC = 2 * Math.PI * 56; // 351.86

export default function SkyTonightCard() {
  const locale = useLocale() === 'ka' ? 'ka' : 'en';
  const copy = COPY[locale];
  const sky = useSkyData();
  const [dayName, setDayName] = useState<string | null>(null);

  useEffect(() => {
    setDayName(DAYS[locale][new Date().getDay()]);
  }, [locale]);

  const loading = sky.loading;
  const score = sky.score?.score ?? 0;
  const dash = `${((score / 100) * GAUGE_CIRC).toFixed(1)} ${GAUGE_CIRC.toFixed(1)}`;

  const city = sky.location?.city;
  const cloud = sky.conditions?.cloudCoverPct;
  const darkWindow = sky.conditions?.bestWindow;
  const moon = sky.forecast?.[0];

  const conditions: { label: string; status: Status }[] = [];
  if (cloud != null) conditions.push({ label: `${copy.cloud} ${cloud}%`, status: cloudStatus(cloud) });
  if (darkWindow) conditions.push({ label: `${copy.dark} ${darkWindow}`, status: 'warn' });
  if (moon) {
    const illum = Math.round((moon.moonIllumination ?? 0) * 100);
    conditions.push({
      label: `${copy.moon} ${illum}% · ${moonWord(moon.moonPhase ?? 0, moon.moonIllumination ?? 0, locale)}`,
      status: moonStatus(moon.moonIllumination ?? 0),
    });
  }

  const target = pickTarget(sky.planets);
  const targetSlug = target ? target.name.toLowerCase() : null;
  const targetImg =
    targetSlug && TARGET_IMG.has(targetSlug)
      ? `/sky/targets/${targetSlug}.jpg`
      : '/sky/targets/jupiter.jpg';
  const targetReward = !target ? 0 : target.name === 'Moon' ? 10 : 30;

  return (
    <aside
      className="heroV2-rise-delay w-full"
      style={{
        borderRadius: 24,
        background: 'linear-gradient(170deg, rgba(17,24,48,0.85), rgba(7,10,22,0.9))',
        border: '1px solid rgba(140,165,235,0.18)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        boxShadow: '0 30px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(180,200,255,0.12)',
        padding: '28px 28px 24px',
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between" style={{ marginBottom: 22 }}>
        <div
          className="flex items-center"
          style={{ gap: 9, fontFamily: MONO, fontWeight: 500, fontSize: 11, letterSpacing: '0.26em', color: '#8d99bd' }}
        >
          <span
            style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#3ddc84', boxShadow: '0 0 8px rgba(61,220,132,0.9)',
            }}
          />
          {dayName ?? copy.yourSky} · {city?.toUpperCase() ?? '—'}
        </div>
        <Link
          href="/sky"
          className="transition-colors hover:text-white"
          style={{ fontFamily: MONO, fontWeight: 500, fontSize: 11, letterSpacing: '0.2em', color: '#9ec0ff', textDecoration: 'none' }}
        >
          {copy.openSky} →
        </Link>
      </div>

      {/* Gauge + conditions */}
      <div className="flex items-center" style={{ gap: 24, marginBottom: 24 }}>
        <div className="relative" style={{ width: 132, height: 132, flex: 'none' }}>
          <svg width="132" height="132" viewBox="0 0 132 132">
            <defs>
              <linearGradient id="skyGaugeGrad" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0" stopColor="#f59e2e" />
                <stop offset="1" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
            <circle cx="66" cy="66" r="56" fill="none" stroke="rgba(140,165,235,0.14)" strokeWidth="10" />
            <circle
              cx="66" cy="66" r="56" fill="none"
              stroke="url(#skyGaugeGrad)" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={dash} transform="rotate(-90 66 66)"
              style={{ filter: 'drop-shadow(0 0 8px rgba(245,158,46,0.5))', transition: 'stroke-dasharray 0.8s ease' }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div style={{ fontFamily: HERO_FONT, fontWeight: 700, fontSize: 30, lineHeight: 1, color: '#f6f8ff' }}>
                {loading ? '··' : score}
              </div>
              <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: 10, letterSpacing: '0.2em', color: '#7f8cad', marginTop: 4 }}>
                {copy.skyScore}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col" style={{ gap: 12, fontFamily: MONO, fontWeight: 400, fontSize: 13, color: '#8d99bd' }}>
          {loading
            ? [0, 1, 2].map((i) => <div key={i} className="h-3.5 w-40 max-w-full rounded bg-white/[0.06]" />)
            : conditions.map((c) => (
                <div key={c.label} className="flex items-center" style={{ gap: 9 }}>
                  <span style={{ width: 7, height: 7, flex: 'none', borderRadius: '50%', background: STATUS[c.status] }} />
                  {c.label}
                </div>
              ))}
        </div>
      </div>

      {/* Tonight's mission */}
      <Link
        href="/missions"
        className="heroV2-mission flex items-center"
        style={{
          gap: 15, padding: '15px 16px', borderRadius: 16,
          border: '1px solid rgba(245,168,61,0.25)', background: 'rgba(245,168,61,0.06)',
          textDecoration: 'none', transition: 'border-color 0.2s, background 0.2s',
        }}
      >
        <span
          className="relative overflow-hidden"
          style={{
            width: 50, height: 50, flex: 'none', borderRadius: '50%',
            boxShadow: target
              ? '0 0 0 1px rgba(245,168,61,0.35), 0 6px 20px rgba(245,168,61,0.2)'
              : '0 0 0 1px rgba(245,168,61,0.35)',
            background: target ? undefined : 'rgba(245,168,61,0.08)',
          }}
        >
          {target && <Image src={targetImg} alt="" fill sizes="50px" className="object-cover" />}
        </span>
        <div className="min-w-0 flex-1">
          <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: 10.5, letterSpacing: '0.22em', color: '#f5a83d', marginBottom: 4 }}>
            {copy.mission}
          </div>
          <div className="flex items-center" style={{ gap: 8, fontFamily: HERO_FONT, fontWeight: 600, fontSize: 18, color: '#f4f7ff' }}>
            {target ? target.name : copy.noTarget}
            {target && (
              <span style={{ fontFamily: MONO, fontWeight: 500, fontSize: 13, color: '#ffc877' }}>
                +{targetReward} ★
              </span>
            )}
          </div>
        </div>
        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffc877"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ flex: 'none' }} aria-hidden
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </Link>
    </aside>
  );
}
