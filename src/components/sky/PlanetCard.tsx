// src/components/sky/PlanetCard.tsx
'use client';

import type { PlanetData } from '@/lib/use-sky-data';
import {
  azimuthToCardinal,
  equipmentForMagnitude,
  equipmentLabel,
  formatLocalTime,
} from '@/lib/sky-utils';

interface PlanetCardProps {
  planet: PlanetData;
  orbStyle: string;  // CSS gradient string for the planet orb
}

const ARROW_COLORS = {
  active: { teal: '#5EEAD4', peak: '#FFB347' },
  inactive: '#5A6275',
};

export function PlanetCard({ planet, orbStyle }: PlanetCardProps) {
  const isActive = planet.visible && planet.altitude > 0;
  const equipment = equipmentForMagnitude(planet.magnitude);
  const cardinal = azimuthToCardinal(planet.azimuth);

  // Arrow color: --accent for peak/transit (>50°), --teal for visible, dim for below
  const arrowColor = !isActive
    ? ARROW_COLORS.inactive
    : planet.altitude > 50
    ? ARROW_COLORS.active.peak
    : ARROW_COLORS.active.teal;

  // Mini-compass: arrow rotates by azimuth (0° = N pointing up)
  // SVG default: 0deg points up, so we rotate by az directly
  const arrowRotation = planet.azimuth;

  // Status label
  const statusText = getStatusText(planet);

  // Rise/set display
  const riseSet = isActive
    ? planet.setTime
      ? { label: 'SETS', value: formatTimeLabel(planet.setTime) }
      : { label: 'TRANSIT', value: planet.transitTime ? formatTimeLabel(planet.transitTime) : '—' }
    : { label: 'RISES', value: planet.riseTime ? formatTimeLabel(planet.riseTime) : '—' };

  return (
    <div className={`planet-card ${isActive ? '' : 'below'}`}>
      <div className="mini-compass-wrap">
        <div className="mini-compass">
          <svg className="mini-compass-svg" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="21" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <text x="24" y="9" fill="#5A6275" fontFamily="JetBrains Mono" fontSize="6" textAnchor="middle">
              N
            </text>
            <text x="24" y="44" fill="#5A6275" fontFamily="JetBrains Mono" fontSize="6" textAnchor="middle">
              S
            </text>
            <text x="6" y="26" fill="#5A6275" fontFamily="JetBrains Mono" fontSize="6" textAnchor="middle">
              W
            </text>
            <text x="42" y="26" fill="#5A6275" fontFamily="JetBrains Mono" fontSize="6" textAnchor="middle">
              E
            </text>

            {/* Center dot */}
            <circle cx="24" cy="24" r="2" fill={arrowColor} />

            {/* Direction arrow — rotated by azimuth around the center.
                In SVG, 0° rotation points up (north), positive rotation is clockwise. */}
            <g
              transform={`rotate(${arrowRotation} 24 24)`}
              style={{ transition: 'transform 0.4s ease-out' }}
            >
              <line
                x1="24"
                y1="24"
                x2="24"
                y2="9"
                stroke={arrowColor}
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <polygon points="24,7 21.5,11 26.5,11" fill={arrowColor} />
            </g>
          </svg>
        </div>
        <span
          className="dir-label"
          style={{ color: !isActive ? 'var(--text-dim)' : planet.altitude > 50 ? 'var(--accent)' : 'var(--teal)' }}
        >
          {isActive ? `${cardinal} · ${Math.round(planet.altitude)}°` : 'below'}
        </span>
      </div>

      <div className="planet-card-head">
        <div className="planet-orb" style={{ background: orbStyle }} />
      </div>

      <div className="planet-name">{planet.name}</div>
      <div className="planet-rank">
        <span className={`planet-status ${isActive ? '' : 'below'}`}>
          <span className="dot" />
          {statusText}
        </span>
      </div>

      <div className="planet-stats">
        <div className="stat">
          ALTITUDE
          <span className="v">{planet.altitude > 0 ? `${Math.round(planet.altitude)}°` : `${Math.round(planet.altitude)}°`}</span>
        </div>
        <div className="stat">
          MAGNITUDE
          <span className="v">{planet.magnitude.toFixed(1)}</span>
        </div>
        <div className="stat">
          {riseSet.label}
          <span className="v">{riseSet.value}</span>
        </div>
        <div className="stat">
          EQUIPMENT
          <span
            className="v"
            style={{
              color:
                equipment === 'eye'
                  ? 'var(--green)'
                  : equipment === 'binoc'
                  ? 'var(--teal)'
                  : 'var(--accent)',
            }}
          >
            {equipmentLabel(equipment)}
          </span>
        </div>
      </div>
    </div>
  );
}

function getStatusText(p: PlanetData): string {
  if (!p.visible || p.altitude <= 0) {
    return p.setTime ? `set ${formatTimeLabel(p.setTime)}` : 'below horizon';
  }
  if (p.altitude > 60) return 'peak now';
  if (p.altitude > 30) return 'visible high';
  if (p.altitude > 10) return 'visible low';
  return 'rising';
}

function formatTimeLabel(time: string): string {
  if (/^\d{2}:\d{2}/.test(time)) return time.slice(0, 5);
  try {
    return formatLocalTime(new Date(time));
  } catch {
    return time;
  }
}
