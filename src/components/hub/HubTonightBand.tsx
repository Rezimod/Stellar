'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { MapPin, ArrowRight } from 'lucide-react';
import LocationPicker from '@/components/LocationPicker';
import { useLocation } from '@/lib/location';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useStarsBalance } from '@/hooks/useStarsBalance';
import type { TonightSky } from '@/lib/tonight-sky';

interface StreakData {
  streak: number;
  todayCompleted: boolean;
  bonusStars: number;
  totalObservations: number;
}

const COPY = {
  en: {
    tonightFrom: 'Tonight from',
    defaultHint: 'default',
    findIt: 'Find it',
    nothingUp: 'Nothing bright is up right now — check back after dark.',
    bestWindow: 'Best window',
    moon: 'Moon',
    nextEvent: 'Next event',
    score: 'Sky score',
    is: 'is',
  },
  ka: {
    tonightFrom: 'ამაღამ —',
    defaultHint: 'ნაგულისხმევი',
    findIt: 'იპოვე',
    nothingUp: 'ახლა ნათელი არაფერია ცაზე — შეამოწმე დაბნელების შემდეგ.',
    bestWindow: 'საუკეთესო დრო',
    moon: 'მთვარე',
    nextEvent: 'შემდეგი მოვლენა',
    score: 'ცის ქულა',
    is: '—',
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

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3.5">
      <span className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white/35" style={{ fontFamily: 'var(--font-display)' }}>
        {label}
      </span>
      <span className="text-white/90 text-[15px] font-medium leading-tight tabular-nums">{value}</span>
      {sub && <span className="text-white/40 text-[11px] leading-tight truncate">{sub}</span>}
    </div>
  );
}

export function HubTonightBand() {
  const locale = useLocale() === 'ka' ? 'ka' : 'en';
  const c = COPY[locale];
  const { location, isFallback } = useLocation();
  const { authenticated, address } = useStellarUser();
  const stars = useStarsBalance(address);
  const [sky, setSky] = useState<TonightSky | null>(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState<StreakData | null>(null);

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

  useEffect(() => {
    if (!address) {
      setStreak(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/streak?walletAddress=${encodeURIComponent(address)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: StreakData | null) => {
        if (!cancelled && d) setStreak(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [address]);

  const target = sky?.bestTarget ?? null;
  const nextEvent = sky?.events?.[0] ?? null;

  return (
    <section className="mb-6 sm:mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      {/* Location + STARS/streak */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-3.5 pb-1">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin size={13} strokeWidth={1.8} className="text-white/35 shrink-0" />
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/40 shrink-0" style={{ fontFamily: 'var(--font-display)' }}>
            {c.tonightFrom}
          </span>
          <LocationPicker compact ghost />
          {isFallback && (
            <span className="text-[10px] font-mono text-[#FFB347]/80 shrink-0">· {c.defaultHint}</span>
          )}
        </div>
        {authenticated && (
          <div className="flex items-center gap-3 shrink-0" style={{ fontFamily: 'var(--font-mono)' }}>
            <span className="text-[#FFD166] text-[13px] tabular-nums">★ {stars ?? '—'}</span>
            {streak && streak.streak > 0 && (
              <span className="text-[#FFB347] text-[13px] tabular-nums">🔥 {streak.streak}</span>
            )}
          </div>
        )}
      </div>

      {/* Verdict + best target */}
      <div className="flex items-center gap-4 px-4 sm:px-5 py-3.5">
        <div className="flex flex-col items-center justify-center shrink-0 w-[64px]">
          {loading || !sky ? (
            <div className="h-[40px] w-[44px] rounded-md bg-white/[0.05] animate-pulse" />
          ) : (
            <>
              <span className="font-mono text-[34px] leading-none tabular-nums" style={{ color: sky.score.color }}>
                {sky.score.score}
              </span>
              <span className="text-[9.5px] uppercase tracking-[0.16em] mt-1" style={{ color: sky.score.color }}>
                {sky.score.grade}
              </span>
            </>
          )}
        </div>

        <div className="w-px self-stretch bg-white/[0.06]" />

        <div className="flex-1 min-w-0">
          {loading || !sky ? (
            <div className="space-y-2">
              <div className="h-4 w-2/3 rounded bg-white/[0.05] animate-pulse" />
              <div className="h-3 w-1/3 rounded bg-white/[0.04] animate-pulse" />
            </div>
          ) : target ? (
            <>
              <p className="text-white text-[16px] sm:text-[17px] font-medium leading-snug">
                <span className="text-white">{target.name}</span> {c.is} {target.placement}
              </p>
              <Link
                href="/sky"
                className="inline-flex items-center gap-1.5 mt-1.5 text-[#FFB347] text-[13px] font-medium no-underline hover:gap-2.5 transition-all"
              >
                {c.findIt}
                <ArrowRight size={14} strokeWidth={2} />
              </Link>
            </>
          ) : (
            <p className="text-white/50 text-[14px] leading-snug">{c.nothingUp}</p>
          )}
        </div>
      </div>

      {/* Three live tiles */}
      <div className="grid grid-cols-3 border-t border-white/[0.06] divide-x divide-white/[0.06]">
        <Tile
          label={c.bestWindow}
          value={sky?.darkWindow ? `${fmtHm(sky.darkWindow.start)}–${fmtHm(sky.darkWindow.end)}` : '—'}
        />
        <Tile
          label={c.moon}
          value={sky?.moon ? `${sky.moon.illumination}%` : '—'}
          sub={sky?.moon?.phaseName}
        />
        <Tile
          label={c.nextEvent}
          value={nextEvent ? fmtEventDate(nextEvent.date, locale) : '—'}
          sub={nextEvent?.name}
        />
      </div>
    </section>
  );
}
