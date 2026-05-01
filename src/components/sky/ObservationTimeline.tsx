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

function fmtHHmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const PEAK_EDGE_TOLERANCE_MS = 10 * 60 * 1000;

function describePeak(
  peakAlt: number,
  azDir: string,
  fromStart: number,
  fromEnd: number,
): string {
  let position: 'start' | 'middle' | 'end';
  if (fromStart < PEAK_EDGE_TOLERANCE_MS && fromStart <= fromEnd) position = 'start';
  else if (fromEnd < PEAK_EDGE_TOLERANCE_MS) position = 'end';
  else position = 'middle';

  if (peakAlt > 60 && position === 'middle') return 'high overhead';
  if (peakAlt < 30) {
    if (position === 'start') return `low ${azDir}, going down`;
    if (position === 'end') return `low ${azDir}, going up`;
    return `low in ${azDir}`;
  }
  return `high in ${azDir}`;
}

export function ObservationTimeline({ data }: ObservationTimelineProps) {
  const view = useMemo(() => {
    if (!data.darkWindow) return null;
    const start = new Date(data.darkWindow.start);
    const end = new Date(data.darkWindow.end);
    const span = end.getTime() - start.getTime();
    if (span <= 0) return null;
    const objects = data.objects.map((o) => {
      const visibleStart = new Date(o.visibleStart);
      const visibleEnd = new Date(o.visibleEnd);
      const peakAt = new Date(o.peakAt);
      const fromStart = peakAt.getTime() - visibleStart.getTime();
      const fromEnd = visibleEnd.getTime() - peakAt.getTime();
      return {
        name: o.name,
        visibleLabel: `${fmtHHmm(visibleStart)} → ${fmtHHmm(visibleEnd)}`,
        peakLabel: `Peak ${fmtHHmm(peakAt)}  ·  ${describePeak(
          o.peakAlt,
          azimuthToCardinal(o.peakAzimuth),
          fromStart,
          fromEnd,
        )}`,
        leftPct: ((visibleStart.getTime() - start.getTime()) / span) * 100,
        widthPct: ((visibleEnd.getTime() - visibleStart.getTime()) / span) * 100,
        peakPct: ((peakAt.getTime() - start.getTime()) / span) * 100,
      };
    });
    return { objects, excludedCount: data.excludedCount };
  }, [data]);

  if (!view || view.objects.length === 0) {
    return (
      <div className="panel timeline-panel">
        <div className="timeline-empty">Nothing observable in tonight&apos;s dark window.</div>
      </div>
    );
  }

  return (
    <div className="panel timeline-panel">
      <ul className="timeline-list">
        {view.objects.map((o) => (
          <li key={o.name} className="timeline-item">
            <div className="timeline-item-name">{o.name}</div>
            <div className="timeline-item-info">
              <div className="timeline-item-visible">
                Visible {o.visibleLabel}
              </div>
              <div className="timeline-item-track" aria-hidden>
                <div
                  className="timeline-bar"
                  style={{ left: `${o.leftPct}%`, width: `${o.widthPct}%` }}
                />
                <div
                  className="timeline-peak-dot"
                  style={{ left: `${o.peakPct}%` }}
                />
              </div>
              <div className="timeline-item-peak">{o.peakLabel}</div>
            </div>
          </li>
        ))}
      </ul>

      {view.excludedCount > 0 && (
        <div className="timeline-footer">+ {view.excludedCount} not visible tonight</div>
      )}
    </div>
  );
}
