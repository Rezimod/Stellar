// src/components/sky/ObservationTimeline.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import type { TimelineTarget } from '@/lib/use-sky-data';
import { altitudeToVisibility } from '@/lib/sky-utils';

interface ObservationTimelineProps {
  targets: TimelineTarget[];
  windowStart?: string;  // ISO timestamp of first hour cell
}

const NAME_COL_WIDTH = 116;

export function ObservationTimeline({ targets, windowStart }: ObservationTimelineProps) {
  const [now, setNow] = useState(() => new Date());

  // Update NOW line every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Use the first target's hourly array for the time axis
  const hourLabels = useMemo(
    () => (targets[0]?.hourly ?? []).map((h) => new Date(h.hour)),
    [targets],
  );
  const hourCount = hourLabels.length;

  // Compute NOW line position as percentage across the grid
  const nowPosition = useMemo(() => {
    if (hourCount < 2) return null;
    const start = hourLabels[0].getTime();
    const end = hourLabels[hourCount - 1].getTime() + 60 * 60 * 1000; // +1 hour for last cell width
    const t = now.getTime();
    if (t < start || t > end) return null;
    return ((t - start) / (end - start)) * 100; // percent
  }, [now, hourLabels, hourCount]);

  if (targets.length === 0) {
    return (
      <div className="panel timeline-panel">
        <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '40px 0' }}>
          No targets to display
        </div>
      </div>
    );
  }

  return (
    <div className="panel timeline-panel" style={{ position: 'relative' }}>
      <div
        className="timeline-grid"
        style={{
          gridTemplateColumns: `${NAME_COL_WIDTH}px repeat(${hourCount}, 1fr)`,
          position: 'relative',
        }}
      >
        {/* Hour labels header row */}
        <div />
        {hourLabels.map((h, i) => {
          const hourNum = h.getHours();
          const isNow = hourNum === now.getHours();
          const isPostMidnight = hourNum < 12;
          return (
            <div
              key={i}
              className={`timeline-hour-label ${isNow ? 'now' : ''}`}
              style={{ color: isPostMidnight ? 'var(--text-dim)' : undefined }}
            >
              {hourNum.toString().padStart(2, '0')}
            </div>
          );
        })}

        {/* NOW indicator line — absolutely positioned over the grid */}
        {nowPosition !== null && (
          <div
            className="now-line"
            style={{
              left: `calc(${NAME_COL_WIDTH}px + (100% - ${NAME_COL_WIDTH}px) * ${nowPosition / 100})`,
            }}
          />
        )}

        {/* Target rows */}
        {targets.map((target) => (
          <TimelineRow key={target.name} target={target} />
        ))}
      </div>

      <div className="timeline-legend">
        <div className="legend-item">
          <span className="legend-pip" style={{ background: 'var(--teal)' }} />
          Best viewing
        </div>
        <div className="legend-item">
          <span className="legend-pip" style={{ background: 'rgba(56,240,255,0.30)' }} />
          Visible
        </div>
        <div className="legend-item">
          <span className="legend-pip peak" />
          Peak
        </div>
      </div>
    </div>
  );
}

function TimelineRow({ target }: { target: TimelineTarget }) {
  // Peak cell = the hour with the highest altitude (only when actually visible)
  const peakIdx = target.hourly.reduce(
    (best, p, i, arr) => (p.altitude > arr[best].altitude ? i : best),
    0,
  );
  const peakAltitude = target.hourly[peakIdx]?.altitude ?? 0;
  return (
    <>
      <div className="timeline-name">
        <span className="dot" style={{ background: target.color }} />
        <span className="name-text">{target.name}</span>
      </div>
      {target.hourly.map((point, i) => {
        const level = altitudeToVisibility(point.altitude);
        const isPeak = i === peakIdx && peakAltitude > 5;
        return (
          <div
            key={i}
            className={`timeline-cell ${level}${isPeak ? ' peak-ring' : ''}`}
            title={`${new Date(point.hour).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })} — ${Math.round(point.altitude)}°`}
          />
        );
      })}
    </>
  );
}
