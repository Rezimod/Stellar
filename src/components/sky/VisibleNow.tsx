// src/components/sky/VisibleNow.tsx
'use client';

import type { PlanetData } from '@/lib/use-sky-data';
import {
  azimuthToCardinal,
  azimuthToArrow,
  equipmentForMagnitude,
  formatLocalTime,
} from '@/lib/sky-utils';

interface VisibleNowProps {
  planets: PlanetData[];
  featuredTarget?: string;
  isCurrentlyDark?: boolean;
}

const PLANET_ICONS: Record<string, { emoji: string; bg: string }> = {
  Jupiter: { emoji: '🪐', bg: 'rgba(255,179,71,0.12)' },
  Venus: { emoji: '☀', bg: 'rgba(240,229,192,0.12)' },
  Mars: { emoji: '●', bg: 'rgba(200,74,46,0.12)' },
  Saturn: { emoji: '🪐', bg: 'rgba(212,169,84,0.12)' },
  Mercury: { emoji: '○', bg: 'rgba(168,162,144,0.12)' },
  Moon: { emoji: '○', bg: 'rgba(255,255,255,0.06)' },
};

export function VisibleNow({ planets, featuredTarget, isCurrentlyDark = true }: VisibleNowProps) {
  // Sort: visible-with-altitude first (descending), then below-horizon
  const ranked = [...planets].sort((a, b) => {
    if (a.visible && !b.visible) return -1;
    if (!a.visible && b.visible) return 1;
    if (!a.visible && !b.visible) return 0;
    return b.altitude - a.altitude;
  });

  const visibleCount = ranked.filter((p) => p.visible).length;

  return (
    <div className="panel" style={{ padding: '20px 20px 16px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <div style={{ fontFamily: 'var(--serif)', fontSize: 17 }}>
          {isCurrentlyDark ? 'Visible now' : 'Visible tonight'}
        </div>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: 'var(--text-dim)',
            letterSpacing: '0.05em',
          }}
        >
          {visibleCount} OF {ranked.length}
        </div>
      </div>
      <div className="objects-list">
        {ranked.map((p) => {
          const icon = PLANET_ICONS[p.name] ?? { emoji: '✦', bg: 'rgba(255,255,255,0.04)' };
          const equipment = equipmentForMagnitude(p.magnitude);
          const isFeatured = featuredTarget === p.name;
          const arrow = azimuthToArrow(p.azimuth);
          const cardinal = azimuthToCardinal(p.azimuth);

          return (
            <div
              key={p.name}
              className={`object-row ${isFeatured ? 'featured' : ''}`}
              role="button"
              tabIndex={0}
            >
              <div
                className="object-icon"
                style={{ background: icon.bg, opacity: p.visible ? 1 : 0.5 }}
              >
                {icon.emoji}
              </div>
              <div className="object-info">
                <div className="name" style={{ color: p.visible ? undefined : 'var(--text-muted)' }}>
                  {p.name}
                  <span className={`equipment-tag ${equipment}`}>
                    {equipment === 'eye' ? 'EYE' : equipment === 'binoc' ? 'BINOC' : 'SCOPE'}
                  </span>
                </div>
                <div className="meta">
                  {formatMeta(p)}
                </div>
              </div>
              <span className={`dir-badge ${p.visible ? '' : 'below'}`}>
                {p.visible ? `${arrow} ${cardinal}` : 'BELOW'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatMeta(p: PlanetData): string {
  if (!p.visible) {
    if (p.riseTime) return `RISES ${formatTimeLabel(p.riseTime)}`;
    return 'BELOW HORIZON';
  }

  const altLabel = `ALT ${Math.round(p.altitude)}°`;
  const magLabel = `MAG ${p.magnitude.toFixed(1)}`;
  const setLabel = p.setTime ? `SETS ${formatTimeLabel(p.setTime)}` : null;

  if (setLabel) return `${setLabel} · ${magLabel} · ${altLabel}`;
  return `${magLabel} · ${altLabel}`;
}

function formatTimeLabel(time: string): string {
  // Accept either ISO timestamp or 'HH:mm' format
  if (/^\d{2}:\d{2}/.test(time)) return time.slice(0, 5);
  try {
    return formatLocalTime(new Date(time));
  } catch {
    return time;
  }
}
