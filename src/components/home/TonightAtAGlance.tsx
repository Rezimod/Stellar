'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSkyData, type PlanetData } from '@/lib/use-sky-data';

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
        <div className="h-24 w-44 mx-auto bg-white/[0.05] rounded mb-6" />
        <div className="h-2 w-full max-w-[440px] mx-auto bg-white/[0.04] rounded mb-3" />
        <div className="h-4 w-64 mx-auto bg-white/[0.05] rounded mb-12" />
        <div className="h-20 w-full bg-white/[0.04] rounded" />
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
    <div>
      {/* ── Verdict + sky-score gauge ─────────────────────────────── */}
      <div className="flex flex-col items-center text-center">
        <span
          className="font-mono font-bold tracking-[0.04em] text-[64px] md:text-[96px] leading-none tabular-nums"
          style={{ color }}
        >
          {v}
        </span>

        <ScoreBar score={score} color={color} />

        {headline && (
          <p className="mt-6 md:mt-7 text-[15px] md:text-[17px] text-white/70 leading-snug">
            {headline}.
          </p>
        )}
      </div>

      {/* ── 3 stats with mini visuals ─────────────────────────────── */}
      <div className="mt-12 md:mt-16 grid grid-cols-3 gap-3 md:gap-10 max-w-[560px] mx-auto">
        <Stat
          label="Cloud"
          value={cloud != null ? `${cloud}%` : '—'}
          visual={<CloudVisual pct={cloud} />}
        />
        <Stat
          label="Bortle"
          value={bortle != null ? String(bortle) : '—'}
          visual={<BortleVisual value={bortle} />}
        />
        <Stat
          label="Planets up"
          value={String(visibleCount)}
          visual={<PlanetsVisual planets={visiblePlanets.slice(0, 5)} />}
        />
      </div>

      {/* ── Top 3 planets — realistic thumbnails ──────────────────── */}
      {top.length > 0 && (
        <ul className="mt-12 md:mt-16 max-w-[520px] mx-auto divide-y divide-white/[0.06] border-y border-white/[0.06]">
          {top.map((p) => {
            const time = fmtTime(p.transitTime ?? p.riseTime);
            const img = PLANET_IMG[p.name];
            const dot = PLANET_DOT[p.name] ?? 'rgba(255,255,255,0.35)';
            return (
              <li
                key={p.name}
                className="py-3 md:py-3.5 grid grid-cols-[32px_minmax(0,1fr)_auto_auto] items-center gap-x-3 md:gap-x-5"
              >
                <div
                  className="relative w-7 h-7 md:w-8 md:h-8 rounded-full overflow-hidden"
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
                <span className="text-left text-[14px] md:text-[15px] text-white/85">
                  {p.name}
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

      <div className="mt-10 md:mt-12 text-center">
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

/* ─────────────────────────────────────────────────────────────────
   Score bar — three-zone scale (skip/maybe/go) with marker dot.
   The dot earns its position; thresholds are visible, not implied.
   ───────────────────────────────────────────────────────────────── */
function ScoreBar({ score, color }: { score: number; color: string }) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className="mt-6 md:mt-8 w-full max-w-[440px]">
      <div className="relative h-[6px] rounded-full bg-white/[0.06] overflow-hidden">
        {/* Threshold dividers */}
        <span
          aria-hidden
          className="absolute inset-y-0 w-px bg-white/15"
          style={{ left: '40%' }}
        />
        <span
          aria-hidden
          className="absolute inset-y-0 w-px bg-white/15"
          style={{ left: '70%' }}
        />
        {/* Fill up to score */}
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${clamped}%`, background: color }}
        />
      </div>

      {/* Marker dot, sits on top of bar */}
      <div className="relative -mt-[10px] h-[14px] mb-1">
        <span
          aria-hidden
          className="absolute top-0 w-[14px] h-[14px] rounded-full"
          style={{
            left: `calc(${clamped}% - 7px)`,
            background: color,
            boxShadow: '0 0 0 3px #0A1735',
          }}
        />
      </div>

      <div className="mt-2 grid grid-cols-[40fr_30fr_30fr] font-mono text-[12px] uppercase tracking-[0.18em] text-white/30">
        <span className="text-left">Skip</span>
        <span className="text-center">Maybe</span>
        <span className="text-right">Go</span>
      </div>

      <div className="mt-3 font-mono tabular-nums text-[13px] md:text-[14px] text-white/65 text-center">
        {clamped}<span className="text-white/30"> / 100</span>
      </div>
    </div>
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
    <div className="flex flex-col items-center gap-2">
      <span className="font-mono text-[12px] uppercase tracking-[0.2em] text-white/40">
        {label}
      </span>
      <span className="font-mono tabular-nums text-[26px] md:text-[32px] text-white/92 leading-none">
        {value}
      </span>
      <div className="mt-1.5 h-3 flex items-center justify-center">{visual}</div>
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
