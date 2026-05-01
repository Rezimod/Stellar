// src/components/sky/ObservationTimeline.tsx
'use client';

import { useMemo } from 'react';
import type { TimelinePayload } from '@/lib/use-sky-data';

interface ObservationTimelineProps {
  data: TimelinePayload;
}

const AZ_DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

function azimuthToCardinal(az: number): (typeof AZ_DIRS)[number] {
  const n = ((az % 360) + 360) % 360;
  return AZ_DIRS[Math.floor(((n + 22.5) % 360) / 45)];
}

function altitudeBand(alt: number): 'low' | 'mid' | 'high' {
  if (alt < 30) return 'low';
  if (alt <= 60) return 'mid';
  return 'high';
}

function fmtHHmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function ObservationTimeline({ data }: ObservationTimelineProps) {
  const view = useMemo(() => {
    if (!data.darkWindow) return null;
    const start = new Date(data.darkWindow.start);
    const end = new Date(data.darkWindow.end);
    const span = end.getTime() - start.getTime();
    if (span <= 0) return null;
    const mid = new Date(start.getTime() + span / 2);
    const objects = data.objects.map((o) => {
      const visibleStart = new Date(o.visibleStart);
      const visibleEnd = new Date(o.visibleEnd);
      const peakAt = new Date(o.peakAt);
      return {
        name: o.name,
        color: o.color,
        peakTimeLabel: fmtHHmm(peakAt),
        peakDirection: azimuthToCardinal(o.peakAzimuth),
        peakHeight: altitudeBand(o.peakAlt),
        leftPct: ((visibleStart.getTime() - start.getTime()) / span) * 100,
        widthPct: ((visibleEnd.getTime() - visibleStart.getTime()) / span) * 100,
        peakPct: ((peakAt.getTime() - start.getTime()) / span) * 100,
      };
    });
    return { start, end, mid, objects, excludedCount: data.excludedCount };
  }, [data]);

  if (!view) {
    return (
      <div className="panel timeline-panel">
        <div className="timeline-empty">Nothing observable in tonight&apos;s dark window.</div>
      </div>
    );
  }

  if (view.objects.length === 0) {
    return (
      <div className="panel timeline-panel">
        <div className="timeline-empty">Nothing observable in tonight&apos;s dark window.</div>
      </div>
    );
  }

  return (
    <div className="panel timeline-panel">
      <div className="timeline-axis">
        <div className="timeline-axis-spacer-l" />
        <div className="timeline-axis-ticks">
          <span>{fmtHHmm(view.start)}</span>
          <span>{fmtHHmm(view.mid)}</span>
          <span>{fmtHHmm(view.end)}</span>
        </div>
        <div className="timeline-axis-spacer-r" />
      </div>

      <div className="timeline-rows">
        {view.objects.map((o) => (
          <div key={o.name} className="timeline-row">
            <div className="timeline-row-name">
              <span className="dot" style={{ background: o.color }} />
              <span className="label">{o.name}</span>
            </div>
            <div className="timeline-row-track" aria-hidden>
              <div
                className="timeline-bar-visible"
                style={{ left: `${o.leftPct}%`, width: `${o.widthPct}%` }}
              />
              <div
                className="timeline-bar-peak"
                style={{ left: `${o.peakPct}%` }}
              />
            </div>
            <div className="timeline-row-peak">
              <div className="peak-time">{o.peakTimeLabel}</div>
              <div className="peak-meta">
                {o.peakDirection} · {o.peakHeight}
              </div>
            </div>
          </div>
        ))}
      </div>

      {view.excludedCount > 0 && (
        <div className="timeline-footer">+ {view.excludedCount} not visible tonight</div>
      )}
    </div>
  );
}
