// src/components/sky/SkyCompass.tsx
'use client';

import { useMemo } from 'react';
import type { PlanetData } from '@/lib/use-sky-data';
import { altAzToCompassSVG } from '@/lib/sky-utils';

interface DeepSkyTarget {
  name: string;
  altitude: number;
  azimuth: number;
}

interface SkyCompassProps {
  planets: PlanetData[];
  deepSky?: DeepSkyTarget[];
  featuredTarget?: string;  // name of the target to highlight (brass color, glow)
  refreshedAt?: Date | null;
}

const PLANET_COLORS: Record<string, { fill: string; ring?: string }> = {
  Jupiter: { fill: '#FFB347' },
  Venus: { fill: '#F0E5C0' },
  Mars: { fill: '#C84A2E' },
  Saturn: { fill: '#D4A954', ring: '#D4A954' },
  Mercury: { fill: '#A8A290' },
  Moon: { fill: '#D8D8DC' },
};

export function SkyCompass({ planets, deepSky = [], featuredTarget, refreshedAt }: SkyCompassProps) {
  const visiblePlanets = useMemo(() => {
    return planets
      .filter((p) => p.visible && p.altitude > 0)
      .map((p) => {
        const pos = altAzToCompassSVG(p.altitude, p.azimuth);
        return { ...p, ...pos };
      })
      .filter((p) => p.visible);
  }, [planets]);

  const visibleDeepSky = useMemo(() => {
    return deepSky
      .filter((d) => d.altitude > 0)
      .map((d) => ({ ...d, ...altAzToCompassSVG(d.altitude, d.azimuth) }))
      .filter((d) => d.visible);
  }, [deepSky]);

  const refreshedLabel = refreshedAt
    ? refreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : '—';

  return (
    <div className="panel compass-panel">
      <div className="compass-wrap">
        <svg className="compass-svg" viewBox="0 0 600 320" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="skyGrad" cx="50%" cy="100%" r="100%">
              <stop offset="0%" stopColor="#0B1830" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#070B14" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#070B14" stopOpacity="0" />
            </radialGradient>
            <filter id="planetGlow">
              <feGaussianBlur stdDeviation="3" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Horizon dome */}
          <path
            d="M 30 280 A 270 270 0 0 1 570 280 Z"
            fill="url(#skyGrad)"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />

          {/* Altitude grid arcs at 30°, 60°, and faint inner */}
          <path
            d="M 90 280 A 210 210 0 0 1 510 280"
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="0.5"
            strokeDasharray="2 4"
          />
          <path
            d="M 150 280 A 150 150 0 0 1 450 280"
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="0.5"
            strokeDasharray="2 4"
          />
          <path
            d="M 210 280 A 90 90 0 0 1 390 280"
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="0.5"
            strokeDasharray="2 4"
          />

          {/* Horizon line */}
          <line x1="30" y1="280" x2="570" y2="280" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />

          {/* Cardinal labels */}
          <text x="30" y="305" fill="#5A6275" fontFamily="JetBrains Mono" fontSize="11" fontWeight="500">W</text>
          <text x="293" y="305" fill="#8A93A6" fontFamily="JetBrains Mono" fontSize="11" fontWeight="500">S</text>
          <text x="558" y="305" fill="#5A6275" fontFamily="JetBrains Mono" fontSize="11" fontWeight="500">E</text>
          <text x="155" y="305" fill="#5A6275" fontFamily="JetBrains Mono" fontSize="10">SW</text>
          <text x="425" y="305" fill="#5A6275" fontFamily="JetBrains Mono" fontSize="10">SE</text>

          {/* Altitude tick labels at center */}
          <text x="295" y="80" fill="#5A6275" fontFamily="JetBrains Mono" fontSize="9">90°</text>
          <text x="295" y="140" fill="#5A6275" fontFamily="JetBrains Mono" fontSize="9">60°</text>
          <text x="295" y="200" fill="#5A6275" fontFamily="JetBrains Mono" fontSize="9">30°</text>

          {/* Decorative background stars */}
          <BackgroundStars />

          {/* Deep sky targets */}
          {visibleDeepSky.map((d) => {
            const isFeatured = featuredTarget === d.name;
            const color = isFeatured ? '#FFD166' : '#5EEAD4';
            return (
              <g key={d.name}>
                {isFeatured && (
                  <circle cx={d.x} cy={d.y} r={13} fill={color} opacity={0.25} filter="url(#planetGlow)" />
                )}
                <circle cx={d.x} cy={d.y} r="3" fill="none" stroke={color} strokeWidth="1" opacity="0.85" />
                <circle
                  cx={d.x}
                  cy={d.y}
                  r="6"
                  fill="none"
                  stroke={color}
                  strokeWidth="0.5"
                  strokeDasharray="1 2"
                  opacity="0.6"
                />
                <text
                  x={d.x}
                  y={d.y - 12}
                  fill={color}
                  fontFamily="Inter"
                  fontSize="10"
                  fontWeight="500"
                  textAnchor="middle"
                >
                  {d.name}
                </text>
                <text
                  x={d.x}
                  y={d.y + 18}
                  fill={isFeatured ? color : '#8A93A6'}
                  fontFamily="JetBrains Mono"
                  fontSize="9"
                  textAnchor="middle"
                >
                  {azimuthToShort(d.azimuth)} · {Math.round(d.altitude)}°
                </text>
              </g>
            );
          })}

          {/* Planets */}
          {visiblePlanets.map((p) => {
            const isFeatured = featuredTarget === p.name;
            const colors = PLANET_COLORS[p.name] ?? { fill: '#FFFFFF' };
            // Size: brighter = bigger. Magnitude -4 → r=8, magnitude 2 → r=3
            const radius = Math.max(3, Math.min(8, 7 - p.magnitude));

            return (
              <g key={p.name}>
                {isFeatured && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={radius + 6}
                    fill={colors.fill}
                    opacity={0.25}
                    filter="url(#planetGlow)"
                  />
                )}
                {colors.ring && (
                  <ellipse
                    cx={p.x}
                    cy={p.y}
                    rx={radius + 3}
                    ry={Math.max(1, radius * 0.35)}
                    fill="none"
                    stroke={colors.ring}
                    strokeWidth="0.8"
                  />
                )}
                <circle cx={p.x} cy={p.y} r={radius} fill={colors.fill} />
                {isFeatured && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={radius}
                    fill="none"
                    stroke="#FFD166"
                    strokeWidth="1.5"
                  />
                )}
                <text
                  x={p.x}
                  y={p.y - radius - 6}
                  fill={isFeatured ? '#FFD166' : '#E8ECF1'}
                  fontFamily="Inter"
                  fontSize={isFeatured ? '11' : '10'}
                  fontWeight="500"
                  textAnchor="middle"
                >
                  {p.name}
                </text>
                <text
                  x={p.x}
                  y={p.y + radius + 14}
                  fill={isFeatured ? '#FFD166' : '#8A93A6'}
                  fontFamily="JetBrains Mono"
                  fontSize="9"
                  textAnchor="middle"
                >
                  {azimuthToShort(p.azimuth)} · {Math.round(p.altitude)}°
                </text>
              </g>
            );
          })}

          {/* Empty state */}
          {visiblePlanets.length === 0 && visibleDeepSky.length === 0 && (
            <text
              x="300"
              y="160"
              fill="#5A6275"
              fontFamily="Inter"
              fontSize="13"
              textAnchor="middle"
            >
              No targets above the horizon right now
            </text>
          )}
        </svg>
      </div>

      <div className="compass-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#FFD166' }} />
          Featured target
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#F0E5C0' }} />
          Planets
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#5EEAD4' }} />
          Deep sky
        </div>
        <div className="legend-item" style={{ marginLeft: 'auto', color: 'var(--text-dim)' }}>
          Updated {refreshedLabel}
        </div>
      </div>
    </div>
  );
}

function BackgroundStars() {
  // Pseudo-random but stable star field for atmosphere
  const stars = [
    [120, 180, 0.8, 0.5], [200, 120, 1, 0.6], [250, 220, 0.6, 0.4],
    [380, 100, 1.2, 0.7], [450, 180, 0.8, 0.5], [490, 240, 0.7, 0.4],
    [160, 240, 0.6, 0.4], [350, 200, 0.9, 0.5], [90, 200, 0.7, 0.4],
    [520, 150, 0.8, 0.5], [280, 80, 1.1, 0.6], [410, 220, 0.6, 0.4],
  ];
  return (
    <>
      {stars.map(([cx, cy, r, op], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="#fff" opacity={op} />
      ))}
    </>
  );
}

// Compact azimuth label — N/NE/E/SE/S/SW/W/NW
function azimuthToShort(az: number): string {
  const normalized = ((az % 360) + 360) % 360;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(normalized / 45) % 8];
}
