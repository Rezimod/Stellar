'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Telescope, ChevronRight } from 'lucide-react';
import type { NodeWithReadiness } from '@/lib/observatory/types';

/**
 * The observatory, on the surface people actually open.
 *
 * One line of live state and two ways in: the instrument's timetable, and the
 * simulator that is open to everyone. Copy sits inline in both languages the
 * way its neighbour HubTonightBand does, rather than in the message catalogue.
 */
const COPY = {
  en: {
    label: 'Observatory',
    building: 'In development',
    lead: 'Book time on a telescope where the sky is clear.',
    book: 'See the timetable',
    simulator: 'Drive the simulator',
    quiet: 'The network is quiet right now.',
    states: {
      online: 'observable now',
      busy: 'in session',
      weather: 'clouded out',
      daylight: 'daylight at the site',
      offline: 'offline',
    } as Record<string, string>,
  },
  ka: {
    label: 'ობსერვატორია',
    building: 'მუშავდება',
    lead: 'დაჯავშნე დრო ტელესკოპზე იქ, სადაც ცა ღიაა.',
    book: 'იხილე განრიგი',
    simulator: 'გაუშვი სიმულატორი',
    quiet: 'ქსელი ამჟამად მშვიდადაა.',
    states: {
      online: 'ახლა შესაძლებელია დაკვირვება',
      busy: 'სესია მიმდინარეობს',
      weather: 'ღრუბლიანია',
      daylight: 'ადგილზე დღეა',
      offline: 'ხაზგარეშეა',
    } as Record<string, string>,
  },
} as const;

export function HubObservatoryBand() {
  const locale = useLocale();
  const c = COPY[locale === 'ka' ? 'ka' : 'en'];

  const [node, setNode] = useState<NodeWithReadiness | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    fetch('/api/observatory/nodes')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (live && data?.nodes?.length) setNode(data.nodes[0] as NodeWithReadiness);
      })
      .catch(() => {})
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <section className="mb-5 rounded-xl border border-white/[0.08] bg-[#071126] p-3.5 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Telescope size={13} strokeWidth={1.8} className="shrink-0 text-[var(--teal-text)]" />
          <span
            className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {c.label}
          </span>
          <span className="shrink-0 font-mono text-[9.5px] text-[#E3DAC9]/80">· {c.building}</span>
        </div>

        <Link
          href="/observatory"
          className="flex shrink-0 items-center gap-1 font-mono text-[11px] text-white/45 hover:text-white/70"
          aria-label={c.book}
        >
          {c.book}
          <ChevronRight size={12} strokeWidth={1.8} />
        </Link>
      </div>

      <p className="mt-2 text-[12.5px] leading-snug text-white/70">{c.lead}</p>

      {loading ? (
        <div className="mt-2.5 h-3 w-52 animate-pulse rounded bg-white/[0.06]" />
      ) : (
        <p className="mt-2 truncate font-mono text-[11.5px] leading-none text-white/45">
          {node
            ? `${node.name} · ${node.site} · ${c.states[node.readiness.state] ?? node.readiness.state}`
            : c.quiet}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2 border-t border-white/[0.07] pt-3">
        {node && (
          <Link
            href={`/observatory/${node.id}`}
            className="rounded-md border border-white/[0.10] bg-white/[0.035] px-2.5 py-1.5 font-mono text-[11px] text-white/70 hover:border-white/[0.18]"
          >
            {node.name}
          </Link>
        )}
        <Link
          href="/observatory/simulator"
          className="rounded-md border px-2.5 py-1.5 font-mono text-[11px]"
          style={{
            borderColor: 'var(--accent-border)',
            background: 'var(--accent-dim)',
            color: 'var(--accent-text)',
          }}
        >
          {c.simulator}
        </Link>
      </div>
    </section>
  );
}
