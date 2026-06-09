'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { MapPin, ArrowRight, Moon, Clock, CalendarDays } from 'lucide-react';
import LocationPicker from '@/components/LocationPicker';
import { useLocation } from '@/lib/location';
import type { TonightSky } from '@/lib/tonight-sky';

const COPY = {
  en: {
    tonightFrom: 'Tonight from',
    defaultHint: 'default',
    findIt: 'Find it',
    nothingUp: 'Nothing bright is up right now — check back after dark.',
    bestWindow: 'Best window',
    moon: 'Moon',
    planetsUp: 'Up now',
    nextEvent: 'Next event',
    tabs: { tonight: 'Tonight', planets: 'Planets', events: 'Events' },
    noPlanets: 'No planets above the horizon right now.',
    noEvents: 'No notable events in the next month.',
    nowDark: 'Dark now',
    altShort: 'alt',
  },
  ka: {
    tonightFrom: 'ამაღამ —',
    defaultHint: 'ნაგულისხმევი',
    findIt: 'იპოვე',
    nothingUp: 'ახლა ნათელი არაფერია ცაზე — შეამოწმე დაბნელების შემდეგ.',
    bestWindow: 'საუკეთესო დრო',
    moon: 'მთვარე',
    planetsUp: 'ახლა ჩანს',
    nextEvent: 'შემდეგი მოვლენა',
    tabs: { tonight: 'ამაღამ', planets: 'პლანეტები', events: 'მოვლენები' },
    noPlanets: 'ჰორიზონტს ზემოთ პლანეტა არ ჩანს.',
    noEvents: 'უახლოეს თვეში მნიშვნელოვანი მოვლენა არ არის.',
    nowDark: 'ბნელა ახლა',
    altShort: 'სიმ.',
  },
} as const;

type TabKey = 'tonight' | 'planets' | 'events';

function fmtHm(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtEventDate(date: string, locale: string): string {
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale === 'ka' ? 'ka-GE' : 'en-US', { month: 'short', day: 'numeric' });
}

function daysUntil(date: string): number {
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.round((d.getTime() - Date.now()) / 86_400_000);
}

/** A small filled-disc moon glyph; the lit fraction is hinted by the inner glow. */
function MoonGlyph({ illumination }: { illumination: number }) {
  const lit = Math.max(0, Math.min(100, illumination)) / 100;
  return (
    <span
      className="inline-block h-3.5 w-3.5 shrink-0 rounded-full"
      style={{
        background: `radial-gradient(circle at ${30 + lit * 40}% 50%, #F8F4EC ${lit * 70}%, #2A3344 ${lit * 70 + 8}%)`,
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)',
      }}
    />
  );
}

/** Compact gadget chip: icon · label · value. Always visible under the tabs. */
function Gadget({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
      <span className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/35" style={{ fontFamily: 'var(--font-display)' }}>
        <span className="text-white/45">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <span className="block truncate text-[13px] font-medium leading-none text-white/85 tabular-nums">{value}</span>
    </div>
  );
}

export function HubTonightBand() {
  const locale = useLocale() === 'ka' ? 'ka' : 'en';
  const c = COPY[locale];
  const { location, isFallback } = useLocation();
  const [sky, setSky] = useState<TonightSky | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('tonight');

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

  const target = sky?.bestTarget ?? null;
  const planets = useMemo(() => sky?.planets ?? [], [sky]);
  const events = useMemo(() => sky?.events ?? [], [sky]);
  const nextEvent = events[0] ?? null;

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'tonight', label: c.tabs.tonight },
    { key: 'planets', label: c.tabs.planets, count: planets.length },
    { key: 'events', label: c.tabs.events, count: events.length },
  ];

  return (
    <section className="relative mb-5 overflow-hidden rounded-xl border border-white/[0.08] bg-[#071126]">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(circle at 14% 24%, rgba(248,244,236,0.55) 0 1px, transparent 1.5px), radial-gradient(circle at 82% 18%, rgba(248,244,236,0.40) 0 1px, transparent 1.5px), radial-gradient(circle at 68% 72%, rgba(94,234,212,0.30) 0 1px, transparent 1.5px), radial-gradient(circle at 32% 80%, rgba(248,244,236,0.32) 0 1px, transparent 1.5px)',
        }}
      />
      <div className="relative p-4 sm:p-5">
        {/* Header: location + live score */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <MapPin size={13} strokeWidth={1.8} className="text-white/35 shrink-0" />
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/40 shrink-0" style={{ fontFamily: 'var(--font-display)' }}>
              {c.tonightFrom}
            </span>
            <LocationPicker compact ghost />
            {isFallback && (
              <span className="text-[10px] font-mono text-[#FFB347]/80 shrink-0">· {c.defaultHint}</span>
            )}
          </div>

          <div className="flex h-[58px] w-[58px] shrink-0 flex-col items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.035]">
            {loading || !sky ? (
              <div className="h-8 w-8 rounded-full bg-white/[0.06] animate-pulse" />
            ) : (
              <>
                <span className="font-mono text-[22px] leading-none tabular-nums" style={{ color: sky.score.color }}>
                  {sky.score.score}
                </span>
                <span className="mt-0.5 text-[8.5px] uppercase tracking-[0.16em]" style={{ color: sky.score.color }}>
                  {sky.score.grade}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div role="tablist" className="mt-4 flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-1">
          {tabs.map((tb) => {
            const active = tab === tb.key;
            return (
              <button
                key={tb.key}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(tb.key)}
                className={`flex-1 rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors ${
                  active ? 'bg-white/[0.08] text-white' : 'text-white/45 hover:text-white/70'
                }`}
              >
                {tb.label}
                {typeof tb.count === 'number' && tb.count > 0 && (
                  <span className="ml-1.5 font-mono text-[10px] text-white/35 tabular-nums">{tb.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab body — fixed min height so switching doesn't jump the layout */}
        <div className="mt-4 min-h-[80px]">
          {loading || !sky ? (
            <div className="space-y-2">
              <div className="h-5 w-2/3 rounded bg-white/[0.06] animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-white/[0.04] animate-pulse" />
            </div>
          ) : tab === 'tonight' ? (
            target ? (
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[20px] sm:text-[22px] font-medium leading-tight text-white" style={{ fontFamily: 'var(--font-display)' }}>
                    {target.name}
                  </p>
                  <p className="mt-1 text-[13px] leading-snug text-white/55">{target.placement}</p>
                </div>
                <Link
                  href="/sky"
                  className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-white/[0.10] px-3 text-[13px] font-medium text-[#FFB347] no-underline transition-colors hover:border-[#FFB347]/35 hover:bg-[#FFB347]/[0.06]"
                >
                  {c.findIt}
                  <ArrowRight size={14} strokeWidth={2} />
                </Link>
              </div>
            ) : (
              <p className="text-[14px] leading-snug text-white/50">{c.nothingUp}</p>
            )
          ) : tab === 'planets' ? (
            planets.length ? (
              <ul className="flex flex-col gap-1.5">
                {planets.slice(0, 4).map((p) => (
                  <li key={p.key} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="truncate font-medium text-white/85">{p.name}</span>
                    <span className="shrink-0 font-mono text-[12px] text-white/45 tabular-nums">
                      {c.altShort} {Math.round(p.altitude)}° · {p.azimuthDir}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] leading-snug text-white/50">{c.noPlanets}</p>
            )
          ) : events.length ? (
            <ul className="flex flex-col gap-2">
              {events.slice(0, 3).map((e) => {
                const d = daysUntil(e.date);
                return (
                  <li key={`${e.name}-${e.date}`} className="flex items-center justify-between gap-3">
                    <span className="truncate text-[13px] font-medium text-white/85">{e.name}</span>
                    <span className="shrink-0 font-mono text-[12px] text-white/45 tabular-nums">
                      {fmtEventDate(e.date, locale)}
                      {d >= 0 && <span className="text-white/30"> · {d}d</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[14px] leading-snug text-white/50">{c.noEvents}</p>
          )}
        </div>

        {/* Gadget strip — always-on quick stats */}
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.07] pt-4">
          <Gadget
            icon={<Clock size={11} strokeWidth={2} />}
            label={c.bestWindow}
            value={
              sky?.darkWindow?.isCurrentlyDark
                ? c.nowDark
                : sky?.darkWindow
                  ? `${fmtHm(sky.darkWindow.start)}–${fmtHm(sky.darkWindow.end)}`
                  : '—'
            }
          />
          <Gadget
            icon={<Moon size={11} strokeWidth={2} />}
            label={c.moon}
            value={
              sky?.moon ? (
                <span className="inline-flex items-center gap-1.5">
                  <MoonGlyph illumination={sky.moon.illumination} />
                  {sky.moon.illumination}%
                </span>
              ) : (
                '—'
              )
            }
          />
          <Gadget
            icon={<CalendarDays size={11} strokeWidth={2} />}
            label={c.nextEvent}
            value={nextEvent ? fmtEventDate(nextEvent.date, locale) : '—'}
          />
        </div>
      </div>
    </section>
  );
}
