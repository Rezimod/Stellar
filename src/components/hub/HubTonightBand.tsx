'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { MapPin, ArrowRight } from 'lucide-react';
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
    nextEvent: 'Next event',
  },
  ka: {
    tonightFrom: 'ამაღამ —',
    defaultHint: 'ნაგულისხმევი',
    findIt: 'იპოვე',
    nothingUp: 'ახლა ნათელი არაფერია ცაზე — შეამოწმე დაბნელების შემდეგ.',
    bestWindow: 'საუკეთესო დრო',
    moon: 'მთვარე',
    nextEvent: 'შემდეგი მოვლენა',
  },
} as const;

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

function Fact({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35" style={{ fontFamily: 'var(--font-display)' }}>
        {label}
      </span>
      <span className="mt-1 block text-[13px] sm:text-[14px] font-medium leading-tight text-white/80 tabular-nums">{value}</span>
      {sub && <span className="mt-0.5 block truncate text-[12px] leading-tight text-white/40">{sub}</span>}
    </div>
  );
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

  const target = sky?.bestTarget ?? null;
  const nextEvent = sky?.events?.[0] ?? null;

  return (
    <section className="relative mb-6 sm:mb-8 overflow-hidden rounded-xl border border-white/[0.08] bg-[#071126]">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(circle at 14% 24%, rgba(248,244,236,0.55) 0 1px, transparent 1.5px), radial-gradient(circle at 82% 18%, rgba(248,244,236,0.40) 0 1px, transparent 1.5px), radial-gradient(circle at 68% 72%, rgba(94,234,212,0.30) 0 1px, transparent 1.5px), radial-gradient(circle at 32% 80%, rgba(248,244,236,0.32) 0 1px, transparent 1.5px)',
        }}
      />
      <div className="relative p-4 sm:p-5">
        <div className="mb-4 flex min-w-0 items-center gap-2">
          <MapPin size={13} strokeWidth={1.8} className="text-white/35 shrink-0" />
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/40 shrink-0" style={{ fontFamily: 'var(--font-display)' }}>
            {c.tonightFrom}
          </span>
          <LocationPicker compact ghost />
          {isFallback && (
            <span className="text-[10px] font-mono text-[#FFB347]/80 shrink-0">· {c.defaultHint}</span>
          )}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {loading || !sky ? (
              <div className="space-y-2">
                <div className="h-5 w-2/3 rounded bg-white/[0.06] animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-white/[0.04] animate-pulse" />
              </div>
            ) : target ? (
              <>
                <p className="text-[20px] sm:text-[24px] font-medium leading-tight text-white" style={{ fontFamily: 'var(--font-display)' }}>
                  {target.name}
                </p>
                <p className="mt-1 text-[13px] sm:text-[14px] leading-snug text-white/55">{target.placement}</p>
                <Link
                  href="/sky"
                  className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/[0.10] px-3 text-[13px] font-medium text-[#FFB347] no-underline transition-colors hover:border-[#FFB347]/35 hover:bg-[#FFB347]/[0.06]"
                >
                  {c.findIt}
                  <ArrowRight size={14} strokeWidth={2} />
                </Link>
              </>
            ) : (
              <p className="text-white/50 text-[14px] leading-snug">{c.nothingUp}</p>
            )}
          </div>

          <div className="flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.035] sm:h-[84px] sm:w-[84px]">
            {loading || !sky ? (
              <div className="h-10 w-10 rounded-full bg-white/[0.06] animate-pulse" />
            ) : (
              <>
                <span className="font-mono text-[26px] leading-none tabular-nums sm:text-[30px]" style={{ color: sky.score.color }}>
                  {sky.score.score}
                </span>
                <span className="mt-1 text-[9.5px] uppercase tracking-[0.16em]" style={{ color: sky.score.color }}>
                  {sky.score.grade}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 border-t border-white/[0.07] pt-4 sm:grid-cols-3">
          <Fact
            label={c.bestWindow}
            value={sky?.darkWindow ? `${fmtHm(sky.darkWindow.start)}–${fmtHm(sky.darkWindow.end)}` : '—'}
          />
          <Fact
            label={c.moon}
            value={sky?.moon ? `${sky.moon.illumination}%` : '—'}
            sub={sky?.moon?.phaseName}
          />
          <Fact
            label={c.nextEvent}
            value={nextEvent ? fmtEventDate(nextEvent.date, locale) : '—'}
            sub={nextEvent?.name}
          />
        </div>
      </div>
    </section>
  );
}
