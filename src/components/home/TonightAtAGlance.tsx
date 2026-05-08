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

function verdictFromScore(score: number): { v: Verdict; color: string } {
  if (score >= 70) return { v: 'GO',    color: '#5EEAD4' };
  if (score >= 40) return { v: 'MAYBE', color: '#FFB347' };
  return { v: 'SKIP', color: 'rgba(255,255,255,0.55)' };
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

export default function TonightAtAGlance() {
  const sky = useSkyData();

  if (sky.loading) {
    return (
      <div className="animate-pulse text-center">
        <div className="h-12 w-32 mx-auto bg-white/[0.05] rounded mb-4" />
        <div className="h-4 w-64 mx-auto bg-white/[0.05] rounded mb-10" />
        <div className="h-12 w-full bg-white/[0.04] rounded" />
      </div>
    );
  }

  const score = sky.score?.score ?? 0;
  const { v, color } = verdictFromScore(score);
  const headline = sky.score?.headline ?? '';
  const cloud = sky.conditions?.cloudCoverPct;
  const bortle = sky.location?.bortle;
  const visibleCount = sky.planets.filter((p) => p.visible && p.altitude > 10).length;
  const top = pickTop3(sky.planets);

  return (
    <div className="text-center">
      {/* verdict */}
      <div className="flex items-baseline justify-center gap-3 md:gap-4">
        <span
          className="font-mono font-bold tracking-[0.04em] text-[56px] md:text-[80px] leading-none tabular-nums"
          style={{ color }}
        >
          {v}
        </span>
        <span className="font-mono text-[12px] md:text-[14px] tabular-nums tracking-[0.1em] text-white/35">
          {score}/100
        </span>
      </div>

      {headline && (
        <p className="mt-3 md:mt-4 text-[14px] md:text-[16px] text-white/65 leading-snug">
          {headline}.
        </p>
      )}

      {/* 3 simple conditions */}
      <div className="mt-10 md:mt-14 grid grid-cols-3 gap-4 md:gap-8 max-w-[520px] mx-auto">
        <Stat label="Cloud" value={cloud != null ? `${cloud}%` : '—'} />
        <Stat label="Bortle" value={bortle != null ? String(bortle) : '—'} />
        <Stat label="Planets up" value={String(visibleCount)} />
      </div>

      {/* planets — minimal rows, no card */}
      {top.length > 0 && (
        <ul className="mt-10 md:mt-14 max-w-[480px] mx-auto divide-y divide-white/[0.06] border-y border-white/[0.06]">
          {top.map((p) => {
            const time = fmtTime(p.transitTime ?? p.riseTime);
            const dotColor = PLANET_DOT[p.name] ?? 'rgba(255,255,255,0.35)';
            return (
              <li
                key={p.name}
                className="py-3 md:py-3.5 grid grid-cols-[10px_minmax(0,1fr)_auto_auto] items-center gap-x-3 md:gap-x-5"
              >
                <span
                  aria-hidden
                  className="w-[8px] h-[8px] rounded-full"
                  style={{ backgroundColor: dotColor }}
                />
                <span className="text-left text-[14px] md:text-[15px] text-white/85">
                  {p.name}
                </span>
                <span className="font-mono tabular-nums text-[12px] md:text-[12.5px] text-white/45">
                  {time}
                </span>
                <span className="font-mono tabular-nums text-[12.5px] md:text-[13px] text-white/70 w-[36px] md:w-[44px] text-right">
                  {Math.round(p.altitude)}°
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {/* footer link */}
      <div className="mt-8 md:mt-10">
        <Link
          href="/sky"
          className="inline-flex items-center gap-2 text-[#FFB347] font-mono text-[12px] md:text-[13px] hover:gap-3 transition-all no-underline"
        >
          Open the 7-day forecast →
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="font-mono text-[10px] md:text-[10.5px] uppercase tracking-[0.2em] text-white/35">
        {label}
      </span>
      <span className="font-mono tabular-nums text-[24px] md:text-[30px] text-white/90 leading-none">
        {value}
      </span>
    </div>
  );
}
