'use client';

import Link from 'next/link';
import { useSkyData, type PlanetData } from '@/lib/use-sky-data';

const PLANET_DOT: Record<string, string> = {
  Mercury: '#C9C2B0',
  Venus:   '#F4D9A0',
  Mars:    '#E8836A',
  Jupiter: '#C8A96E',
  Saturn:  '#D4BE8A',
  Moon:    '#E2D5B0',
};

type Verdict = 'GO' | 'MAYBE' | 'SKIP';

function verdictFromScore(score: number): { v: Verdict; color: string; tint: string } {
  if (score >= 70) return { v: 'GO',    color: '#5EEAD4', tint: 'rgba(94,234,212,0.06)' };
  if (score >= 40) return { v: 'MAYBE', color: '#FFB347', tint: 'rgba(255,179,71,0.06)' };
  return { v: 'SKIP', color: 'rgba(255,255,255,0.55)', tint: 'transparent' };
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function pickTop3(planets: PlanetData[]): { p: PlanetData; mode: 'transit' | 'rises' | 'set' }[] {
  const visible = planets.filter((p) => p.altitude > 10).slice();
  visible.sort((a, b) => b.altitude - a.altitude);
  const top = visible.slice(0, 3);
  if (top.length >= 2) {
    return top.map((p) => ({ p, mode: p.transitTime ? 'transit' : 'rises' }));
  }
  // Fall back to upcoming risers if not enough are above the horizon now.
  const upcoming = planets
    .filter((p) => !visible.includes(p) && p.riseTime)
    .slice(0, 3 - top.length)
    .map((p) => ({ p, mode: 'rises' as const }));
  return [...top.map((p) => ({ p, mode: 'transit' as const })), ...upcoming];
}

function altQuality(alt: number): { label: string; color: string } {
  if (alt > 30) return { label: 'good', color: '#5EEAD4' };
  if (alt > 10) return { label: 'low',  color: '#FFB347' };
  return { label: 'below', color: 'rgba(255,255,255,0.35)' };
}

export default function TonightAtAGlance() {
  const sky = useSkyData();

  if (sky.loading) {
    return (
      <div className="rounded-[18px] border border-white/[0.07] bg-[#0F1A35]/55 p-6 md:p-8 animate-pulse">
        <div className="h-3 w-32 bg-white/[0.05] rounded mb-6" />
        <div className="h-10 w-24 bg-white/[0.05] rounded mb-3" />
        <div className="h-4 w-64 bg-white/[0.05] rounded mb-6" />
        <div className="h-px bg-white/[0.06] mb-5" />
        <div className="space-y-3">
          <div className="h-5 w-full bg-white/[0.04] rounded" />
          <div className="h-5 w-full bg-white/[0.04] rounded" />
          <div className="h-5 w-full bg-white/[0.04] rounded" />
        </div>
      </div>
    );
  }

  const score = sky.score?.score ?? 0;
  const { v, color, tint } = verdictFromScore(score);
  const headline = sky.score?.headline ?? '';
  const cloud = sky.conditions?.cloudCoverPct;
  const bortle = sky.location?.bortle;
  const visibleCount = sky.planets.filter((p) => p.visible && p.altitude > 10).length;
  const refreshed = sky.refreshedAt
    ? `${String(sky.refreshedAt.getHours()).padStart(2, '0')}:${String(sky.refreshedAt.getMinutes()).padStart(2, '0')}`
    : '—';
  const city = sky.location?.city ?? 'Your sky';
  const top = pickTop3(sky.planets);

  return (
    <div className="rounded-[18px] border border-white/[0.07] bg-[#0F1A35]/55 overflow-hidden">
      {/* header */}
      <div className="flex items-center justify-between px-5 md:px-7 py-3.5 border-b border-white/[0.06]">
        <span className="font-mono text-[10.5px] md:text-[11px] uppercase tracking-[0.22em] text-white/55">
          Tonight · {city}
        </span>
        <span className="font-mono text-[10px] md:text-[10.5px] tracking-[0.10em] text-white/30">
          ↻ {refreshed}
        </span>
      </div>

      {/* verdict */}
      <div className="px-5 md:px-7 py-7 md:py-9" style={{ backgroundColor: tint }}>
        <div className="flex items-baseline gap-3 md:gap-4">
          <span
            className="font-mono font-bold tracking-[0.04em] text-[44px] md:text-[64px] leading-none tabular-nums"
            style={{ color }}
          >
            {v}
          </span>
          <span className="font-mono text-[11px] md:text-[12px] tabular-nums tracking-[0.1em] text-white/35">
            {score}/100
          </span>
        </div>
        {headline && (
          <p className="mt-2 md:mt-3 text-[13.5px] md:text-[15px] text-white/70 leading-snug">
            {headline}.
          </p>
        )}

        {/* condition strip */}
        <div className="mt-5 md:mt-6 grid grid-cols-3 gap-3 md:gap-5">
          <Stat label="Cloud" value={cloud != null ? `${cloud}%` : '—'} />
          <Stat label="Bortle" value={bortle != null ? String(bortle) : '—'} />
          <Stat label="Planets up" value={String(visibleCount)} />
        </div>
      </div>

      {/* planets */}
      <div className="border-t border-white/[0.06]">
        <div className="px-5 md:px-7 py-2.5 md:py-3 flex items-center justify-between border-b border-white/[0.05]">
          <span className="font-mono text-[10px] md:text-[11px] uppercase tracking-[0.22em] text-white/40">
            Planets tonight
          </span>
          <span className="font-mono text-[9.5px] md:text-[10px] uppercase tracking-[0.14em] text-white/25">
            Time · Alt
          </span>
        </div>

        {top.length === 0 ? (
          <div className="px-5 md:px-7 py-6 text-center text-[13px] text-white/40">
            No planets above the horizon right now.
          </div>
        ) : (
          <ul>
            {top.map(({ p, mode }, i) => {
              const q = altQuality(p.altitude);
              const time = mode === 'transit'
                ? fmtTime(p.transitTime)
                : mode === 'rises'
                  ? fmtTime(p.riseTime)
                  : fmtTime(p.setTime);
              const timeLabel = mode === 'transit' ? 'transit' : mode === 'rises' ? 'rises' : 'set';
              const dotColor = PLANET_DOT[p.name] ?? 'rgba(255,255,255,0.35)';
              return (
                <li
                  key={p.name}
                  className={`px-5 md:px-7 py-3 md:py-3.5 grid grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-x-3 md:gap-x-4 ${
                    i < top.length - 1 ? 'border-b border-white/[0.05]' : ''
                  }`}
                >
                  <span
                    aria-hidden
                    className="w-[10px] h-[10px] rounded-full justify-self-center"
                    style={{ backgroundColor: dotColor, boxShadow: `inset 0 0 0 1px ${dotColor}` }}
                  />
                  <span className="text-[13.5px] md:text-[14.5px] text-white/80 leading-none">
                    {p.name}
                  </span>
                  <div className="flex items-baseline gap-3 md:gap-5 font-mono tabular-nums">
                    <span className="text-[11.5px] md:text-[12.5px] text-white/55 w-[88px] md:w-[110px] text-right">
                      <span className="text-white/30 mr-1">{timeLabel}</span>
                      {time}
                    </span>
                    <span
                      className="text-[12px] md:text-[13px] w-[44px] md:w-[52px] text-right"
                      style={{ color: q.color }}
                    >
                      {Math.round(p.altitude)}°
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* footer link */}
      <div className="px-5 md:px-7 py-3.5 md:py-4 border-t border-white/[0.06] flex justify-end">
        <Link
          href="/sky"
          className="inline-flex items-center gap-2 text-[#FFB347] font-mono text-[11.5px] md:text-[12.5px] hover:gap-3 transition-all no-underline"
        >
          Open the 7-day forecast →
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[9.5px] md:text-[10px] uppercase tracking-[0.18em] text-white/35">
        {label}
      </span>
      <span className="font-mono tabular-nums text-[18px] md:text-[22px] text-white/85 leading-none">
        {value}
      </span>
    </div>
  );
}
