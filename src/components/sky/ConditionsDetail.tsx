// src/components/sky/ConditionsDetail.tsx
'use client';

import type { SkyConditions } from '@/lib/use-sky-data';

interface ConditionsDetailProps {
  conditions: SkyConditions | null;
}

export function ConditionsDetail({ conditions }: ConditionsDetailProps) {
  if (!conditions) {
    return (
      <div className="detail-row">
        <div
          className="detail-stat"
          style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-dim)' }}
        >
          Loading conditions…
        </div>
      </div>
    );
  }

  const darkDuration = computeDuration(conditions.astronomicalDarkStart, conditions.astronomicalDarkEnd);

  const cloudColor =
    conditions.cloudCoverPct < 20
      ? 'var(--green)'
      : conditions.cloudCoverPct < 60
      ? 'var(--accent)'
      : 'var(--rose)';

  const windColor =
    conditions.windKmh < 15 ? undefined : conditions.windKmh < 30 ? 'var(--accent)' : 'var(--rose)';

  return (
    <div className="detail-row">
      <div className="detail-stat">
        <div className="label">Cloud cover</div>
        <div className="value" style={{ color: cloudColor }}>
          {Math.round(conditions.cloudCoverPct)}
          <span className="unit">%</span>
        </div>
        <div className="sub">{getCloudCoverLabel(conditions.cloudCoverPct)}</div>
      </div>

      <div className="detail-stat">
        <div className="label">Visibility</div>
        <div className="value">
          {conditions.visibilityKm}
          <span className="unit">km</span>
        </div>
        <div className="sub">{getVisibilityLabel(conditions.visibilityKm)}</div>
      </div>

      <div className="detail-stat">
        <div className="label">Astronomical dark</div>
        <div className="value">{conditions.astronomicalDarkStart}</div>
        <div className="sub">
          Until {conditions.astronomicalDarkEnd} · {darkDuration}
        </div>
      </div>

      <div className="detail-stat">
        <div className="label">Wind</div>
        <div className="value" style={{ color: windColor }}>
          {conditions.windKmh}
          <span className="unit">km/h</span>
        </div>
        <div className="sub">From {conditions.windDirection}</div>
      </div>
    </div>
  );
}

function computeDuration(startHHMM: string, endHHMM: string): string {
  const parse = (s: string) => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  };
  const start = parse(startHHMM);
  let end = parse(endHHMM);
  if (end < start) end += 24 * 60;
  const minutes = end - start;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function getCloudCoverLabel(pct: number): string {
  if (pct < 10) return 'Clear skies';
  if (pct < 30) return 'Mostly clear';
  if (pct < 60) return 'Partly cloudy';
  if (pct < 90) return 'Mostly cloudy';
  return 'Overcast';
}

function getVisibilityLabel(km: number): string {
  if (km > 30) return 'Excellent transparency';
  if (km > 15) return 'Good transparency';
  if (km > 5) return 'Fair transparency';
  return 'Poor transparency';
}
