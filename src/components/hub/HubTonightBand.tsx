'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import {
  MapPin, ChevronRight, Moon, Sparkles, Telescope, CalendarDays, Compass,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import LocationPicker from '@/components/LocationPicker';
import { useLocation } from '@/lib/location';
import type { TonightSky } from '@/lib/tonight-sky';

const COPY = {
  en: {
    tonightFrom: 'Tonight from',
    defaultHint: 'default',
    missions: "Tonight's missions",
    dark: 'Dark',
    moon: 'Moon',
    up: 'up',
    nowDark: 'dark now',
    altShort: 'alt',
    // mission templates
    observe: (n: string) => `Observe ${n}`,
    find: (n: string) => `Find ${n}`,
    catchMoon: (p: string) => `Catch the ${p}`,
    watchShower: (n: string) => `Watch the ${n}`,
    markEvent: (n: string) => n,
    learnSky: 'Learn a constellation',
    learnSub: 'Spot tonight’s patterns',
    logObs: 'Log an observation',
    logSub: 'Earn Stars for what you see',
    weekAhead: 'See the week ahead',
    weekSub: '7-day sky forecast',
    moonSub: (i: number) => `${i}% lit · naked eye`,
    showerSub: (z: number, peak: string) => `~${z}/hr · ${peak}`,
    eventIn: (d: number) => (d <= 0 ? 'tonight' : `in ${d}d`),
  },
  ka: {
    tonightFrom: 'ამაღამ —',
    defaultHint: 'ნაგულისხმევი',
    missions: 'ამაღამის მისიები',
    dark: 'სიბნელე',
    moon: 'მთვარე',
    up: 'ჩანს',
    nowDark: 'ახლა ბნელა',
    altShort: 'სიმ.',
    observe: (n: string) => `დააკვირდი — ${n}`,
    find: (n: string) => `იპოვე ${n}`,
    catchMoon: (p: string) => `დაიჭირე ${p}`,
    watchShower: (n: string) => `უყურე — ${n}`,
    markEvent: (n: string) => n,
    learnSky: 'ისწავლე თანავარსკვლავედი',
    learnSub: 'იპოვე ამაღამის ფიგურები',
    logObs: 'დააფიქსირე დაკვირვება',
    logSub: 'მიიღე ვარსკვლავები ნანახზე',
    weekAhead: 'იხილე კვირის პროგნოზი',
    weekSub: '7-დღიანი ცის პროგნოზი',
    moonSub: (i: number) => `${i}% განათებული`,
    showerSub: (z: number, peak: string) => `~${z}/სთ · ${peak}`,
    eventIn: (d: number) => (d <= 0 ? 'ამაღამ' : `${d} დღეში`),
  },
} as const;

type Mission = {
  id: string;
  title: string;
  sub: string;
  href: string;
  icon: LucideIcon;
  accent: string;
};

/* Icon strokes read as text — flip them to the day-readable accent tokens
   while the `${accent}1A` chip backgrounds keep the raw hex. */
const ACCENT_ICON: Record<string, string> = {
  '#5EEAD4': 'var(--teal-text)',
  '#FFB347': 'var(--accent-text)',
  '#34D399': 'var(--yes)',
  '#A8B4C8': 'var(--text-muted)',
};

function fmtHm(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function daysUntil(date: string): number {
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.round((d.getTime() - Date.now()) / 86_400_000);
}

/** Derive a few actionable observing missions from the live, located sky. */
function buildMissions(sky: TonightSky | null, c: (typeof COPY)[keyof typeof COPY]): Mission[] {
  if (!sky) return [];
  const out: Mission[] = [];

  // 1) Active meteor shower — time-sensitive, goes first when present.
  if (sky.meteorShower) {
    const s = sky.meteorShower;
    out.push({
      id: `shower-${s.name}`,
      title: c.watchShower(s.name),
      sub: c.showerSub(s.zhr, s.peakLabel),
      href: '/sky',
      icon: Sparkles,
      accent: '#5EEAD4',
    });
  }

  // 2) Best planet up right now, then the next ones above the horizon.
  const planets = sky.planets ?? [];
  planets.slice(0, 3).forEach((p, i) => {
    out.push({
      id: `planet-${p.key}`,
      title: i === 0 ? c.observe(p.name) : c.find(p.name),
      sub: `${c.altShort} ${Math.round(p.altitude)}° · ${p.azimuthDir}`,
      href: '/sky',
      icon: i === 0 ? Telescope : Compass,
      accent: '#FFB347',
    });
  });

  // 3) The Moon, when it's a worthwhile naked-eye target.
  if (sky.moon && sky.moon.visible && sky.moon.illumination >= 8) {
    out.push({
      id: 'moon',
      title: c.catchMoon(sky.moon.phaseName),
      sub: c.moonSub(sky.moon.illumination),
      href: '/sky',
      icon: Moon,
      accent: '#A8B4C8',
    });
  }

  // 4) Next dated event, as a forward-looking mission.
  const ev = sky.events?.[0];
  if (ev) {
    out.push({
      id: `event-${ev.date}`,
      title: c.markEvent(ev.name),
      sub: c.eventIn(daysUntil(ev.date)),
      href: '/sky',
      icon: CalendarDays,
      accent: '#FB923C',
    });
  }

  // Evergreen fills so the list always offers several missions, even when the
  // live sky is quiet (e.g. daytime or a moonless, planet-free window).
  const evergreen: Mission[] = [
    { id: 'observe', title: c.logObs, sub: c.logSub, href: '/observe', icon: Telescope, accent: '#34D399' },
    { id: 'learn', title: c.learnSky, sub: c.learnSub, href: '/learn', icon: Compass, accent: '#FFB347' },
    { id: 'forecast', title: c.weekAhead, sub: c.weekSub, href: '/sky', icon: CalendarDays, accent: '#FB923C' },
  ];
  for (const e of evergreen) {
    if (out.length >= 3) break;
    if (!out.some((m) => m.id === e.id)) out.push(e);
  }

  return out.slice(0, 3);
}

export function HubTonightBand() {
  const locale = useLocale() === 'ka' ? 'ka' : 'en';
  const c = COPY[locale];
  const { location, isFallback } = useLocation();
  const [sky, setSky] = useState<TonightSky | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/sky/overview?lat=${location.lat}&lon=${location.lon}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: TonightSky | null) => {
        if (!cancelled) {
          setSky(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [location.lat, location.lon]);

  const missions = useMemo(() => buildMissions(sky, c), [sky, c]);
  const planetsUp = sky?.planets?.length ?? 0;

  const facts = sky
    ? [
        sky.darkWindow?.isCurrentlyDark
          ? `${c.dark} ${c.nowDark}`
          : sky.darkWindow
            ? `${c.dark} ${fmtHm(sky.darkWindow.start)}–${fmtHm(sky.darkWindow.end)}`
            : null,
        sky.moon ? `${c.moon} ${sky.moon.illumination}%` : null,
        `${planetsUp} ${c.up}`,
      ].filter(Boolean)
    : [];

  return (
    <section className="relative mb-5 overflow-hidden rounded-xl border border-white/[0.08] bg-[#071126]">
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            'radial-gradient(circle at 14% 22%, rgba(248,244,236,0.5) 0 1px, transparent 1.5px), radial-gradient(circle at 84% 30%, rgba(94,234,212,0.35) 0 1px, transparent 1.5px), radial-gradient(circle at 70% 70%, rgba(248,244,236,0.3) 0 1px, transparent 1.5px)',
        }}
      />
      <div className="relative p-3.5 sm:p-4">
        {/* Header: location + facts on the left, live score on the right */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
              <MapPin size={12} strokeWidth={1.8} className="text-white/35 shrink-0" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40 shrink-0" style={{ fontFamily: 'var(--font-display)' }}>
                {c.tonightFrom}
              </span>
              <LocationPicker compact ghost />
              {isFallback && (
                <span className="text-[9.5px] font-mono text-[#FFB347]/80 shrink-0">· {c.defaultHint}</span>
              )}
            </div>
            {loading ? (
              <div className="mt-2 h-3 w-40 rounded bg-white/[0.06] animate-pulse" />
            ) : (
              <p className="mt-1.5 truncate font-mono text-[11.5px] leading-none text-white/45 tabular-nums">
                {facts.join('  ·  ')}
              </p>
            )}
          </div>

          <div className="flex h-[50px] w-[50px] shrink-0 flex-col items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.035]">
            {loading || !sky ? (
              <div className="h-7 w-7 rounded-full bg-white/[0.06] animate-pulse" />
            ) : (
              <>
                <span className="font-mono text-[19px] leading-none tabular-nums" style={{ color: sky.score.color }}>
                  {sky.score.score}
                </span>
                <span className="mt-0.5 text-[8px] uppercase tracking-[0.14em]" style={{ color: sky.score.color }}>
                  {sky.score.grade}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Missions */}
        <div className="mt-3 border-t border-white/[0.07] pt-3">
          <h3 className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-white/35" style={{ fontFamily: 'var(--font-display)' }}>
            {c.missions}
          </h3>

          {loading ? (
            <div className="space-y-1.5">
              <div className="h-9 rounded-lg bg-white/[0.04] animate-pulse" />
              <div className="h-9 rounded-lg bg-white/[0.03] animate-pulse" />
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {missions.map((m) => {
                const Icon = m.icon;
                return (
                  <li key={m.id}>
                    <Link
                      href={m.href}
                      className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 no-underline transition-colors hover:bg-white/[0.04]"
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                        style={{ background: `${m.accent}1A`, border: `1px solid ${m.accent}33` }}
                      >
                        <Icon size={14} strokeWidth={2} color={ACCENT_ICON[m.accent] ?? m.accent} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium leading-tight text-white/90">{m.title}</span>
                        <span className="block truncate font-mono text-[11px] leading-tight text-white/40">{m.sub}</span>
                      </span>
                      <ChevronRight size={15} strokeWidth={2} className="shrink-0 text-white/25 transition-colors group-hover:text-white/50" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
