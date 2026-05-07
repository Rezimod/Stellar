'use client';

import { useMemo, useState } from 'react';
import type { Mission } from '@/lib/types';
import {
  getChartStars,
  getChartPlanets,
  getChartDeepSky,
} from '@/lib/sky-chart';
import JupiterNode from './chart-nodes/JupiterNode';
import SaturnNode from './chart-nodes/SaturnNode';
import MoonNode from './chart-nodes/MoonNode';
import VenusNode from './chart-nodes/VenusNode';
import MarsNode from './chart-nodes/MarsNode';
import MercuryNode from './chart-nodes/MercuryNode';
import PleiadesNode from './chart-nodes/PleiadesNode';
import OrionNode from './chart-nodes/OrionNode';
import AndromedaNode from './chart-nodes/AndromedaNode';
import CrabNode from './chart-nodes/CrabNode';

const W = 400;
const H = 200;
const CX = 200;
const CY = 100;
const CHART_RX = 190;
const CHART_RY = 90;

interface Props {
  lat: number;
  lon: number;
  date: Date;
  missions: Mission[];
  primeId: string | null;
  city?: string;
  onSelect: (mission: Mission) => void;
}

const NODE_MAP: Record<string, { comp: React.ComponentType<{ size?: number }>; size: number; primeSize: number }> = {
  moon:       { comp: MoonNode,       size: 26, primeSize: 34 },
  jupiter:    { comp: JupiterNode,    size: 32, primeSize: 40 },
  saturn:     { comp: SaturnNode,     size: 32, primeSize: 40 },
  venus:      { comp: VenusNode,      size: 22, primeSize: 28 },
  mars:       { comp: MarsNode,       size: 24, primeSize: 30 },
  mercury:    { comp: MercuryNode,    size: 20, primeSize: 26 },
  pleiades:   { comp: PleiadesNode,   size: 26, primeSize: 32 },
  orion:      { comp: OrionNode,      size: 26, primeSize: 32 },
  andromeda:  { comp: AndromedaNode,  size: 28, primeSize: 34 },
  crab:       { comp: CrabNode,       size: 22, primeSize: 26 },
};

function projectWide(altDeg: number, azDeg: number): { x: number; y: number; aboveHorizon: boolean } {
  const altClamped = Math.max(-10, Math.min(90, altDeg));
  const r = 1 - altClamped / 90;
  const azRad = (azDeg * Math.PI) / 180;
  return {
    x: CX + r * CHART_RX * Math.sin(azRad),
    y: CY - r * CHART_RY * Math.cos(azRad),
    aboveHorizon: altDeg > 0,
  };
}

export default function SkyChart({ lat, lon, date, missions, primeId, city, onSelect }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const stars = useMemo(
    () => getChartStars(lat, lon, date, CX, CY, 180, 3.8),
    [lat, lon, date]
  );

  const plottedPlanets = useMemo(() => {
    const raw = getChartPlanets(lat, lon, date, CX, CY, 180);
    return raw.map(p => ({ ...p, ...projectWide(p.altitude, p.azimuth) }));
  }, [lat, lon, date]);

  const plottedDeepSky = useMemo(() => {
    const raw = getChartDeepSky(lat, lon, date, CX, CY, 180);
    return raw.map(d => ({ ...d, ...projectWide(d.altitude, d.azimuth) }));
  }, [lat, lon, date]);

  const plottedMissions = useMemo(() => {
    const planetByKey = new Map(plottedPlanets.map(p => [p.key, p]));
    const deepByKey = new Map(plottedDeepSky.map(d => [d.id, d]));
    return missions
      .map(m => {
        const planet = planetByKey.get(m.id);
        const deep = deepByKey.get(m.id);
        const src = planet ?? deep;
        const nodeSpec = NODE_MAP[m.id];
        if (!src || !nodeSpec) return null;
        const magnitude = planet?.magnitude ?? deep?.magnitude ?? 99;
        return { mission: m, x: src.x, y: src.y, aboveHorizon: src.aboveHorizon, nodeSpec, magnitude };
      })
      .filter(Boolean) as Array<{
        mission: Mission;
        x: number;
        y: number;
        aboveHorizon: boolean;
        nodeSpec: typeof NODE_MAP[string];
        magnitude: number;
      }>;
  }, [missions, plottedPlanets, plottedDeepSky]);

  const liveTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const liveDate = date.toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase();
  const cityTag = (city ?? '').toUpperCase();

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        aspectRatio: '2 / 1',
        height: '100%',
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.08)',
        background: [
          // warm nebula patch — east
          'radial-gradient(ellipse 180px 90px at 82% 58%, rgba(255,150,110,0.1) 0%, transparent 70%)',
          // cool nebula patch — west
          'radial-gradient(ellipse 220px 120px at 18% 42%, rgba(90,140,255,0.11) 0%, transparent 72%)',
          // violet veil — center zenith
          'radial-gradient(ellipse 320px 170px at 50% 32%, rgba(155,120,220,0.12) 0%, transparent 70%)',
          // subtle city-light glow from the south horizon
          'linear-gradient(to top, rgba(140,80,46,0.18) 0%, rgba(70,42,24,0.05) 20%, transparent 42%)',
          // base cosmic dome — deeper
          'radial-gradient(ellipse at 50% 45%, #0b1026 0%, #04060f 58%, #010209 100%)',
        ].join(', '),
      }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="stl-mw-wide" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FFE8C4" stopOpacity="0.18" />
            <stop offset="0.45" stopColor="#B8C5FF" stopOpacity="0.09" />
            <stop offset="1" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="stl-neb-a" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#B18CFF" stopOpacity="0.18" />
            <stop offset="0.6" stopColor="#5A3DA0" stopOpacity="0.05" />
            <stop offset="1" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="stl-neb-b" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#3FB7F5" stopOpacity="0.14" />
            <stop offset="1" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Galactic ridge — single subtle band, no rainbow nebulas */}
        <g transform={`rotate(-12 ${CX} ${CY})`} opacity="0.85">
          <ellipse cx={CX} cy={CY} rx="300" ry="40" fill="url(#stl-mw-wide)" />
          {/* dark dust lane through the ridge */}
          <path d={`M 0 ${CY + 4} Q ${CX * 0.5} ${CY - 10} ${CX} ${CY - 4} T ${W} ${CY - 16}`}
                stroke="rgba(3,7,24,0.75)" strokeWidth="9" fill="none" opacity="0.55" />
        </g>

        {stars.map((s, i) => {
          const r = Math.max(0.35, (4.6 - s.mag) * 0.55);
          const fill = s.mag < 1.0 ? '#FFFFFF' : s.mag < 2.2 ? '#F0F5FF' : s.mag < 3.2 ? '#D8E4FF' : '#A8BEF0';
          const opacity = s.aboveHorizon
            ? Math.min(1, 0.55 + (4 - s.mag) * 0.18)
            : 0.12;
          const normX = (s.x - 200) / 180;
          const normY = (s.y - 100) / 180;
          const wideX = CX + normX * CHART_RX;
          const wideY = CY + normY * CHART_RY;
          if (wideX < 0 || wideX > W || wideY < 0 || wideY > H) return null;
          return (
            <circle key={i} cx={wideX} cy={wideY} r={r} fill={fill} opacity={opacity}>
              {s.mag < 2 && s.aboveHorizon && (
                <animate attributeName="opacity" values={`${opacity};${Math.min(1, opacity + 0.18)};${opacity}`} dur={`${3 + (i % 5) * 0.4}s`} repeatCount="indefinite" />
              )}
            </circle>
          );
        })}
      </svg>

      {/* Cardinal markers outside visible center band */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: 6,
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'var(--font-display)',
          fontSize: 9,
          color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.2em',
        }}
      >N</div>
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: 6,
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'var(--font-display)',
          fontSize: 9,
          color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.2em',
        }}
      >S</div>
      <div
        className="absolute pointer-events-none"
        style={{
          left: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          fontFamily: 'var(--font-display)',
          fontSize: 9,
          color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.2em',
        }}
      >W</div>
      <div
        className="absolute pointer-events-none"
        style={{
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          fontFamily: 'var(--font-display)',
          fontSize: 9,
          color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.2em',
        }}
      >E</div>

      <div className="absolute top-2.5 left-3 flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full stl-tw" style={{ background: 'var(--stl-gold)' }} />
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 9,
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: '0.22em',
          }}
        >
          LIVE · {liveTime}
        </span>
      </div>
      <div className="absolute top-2.5 right-3 flex items-center gap-1.5">
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 9,
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: '0.22em',
          }}
        >
          {liveDate}{cityTag ? ` · ${cityTag}` : ''}
        </span>
      </div>

      {plottedMissions.map(({ mission, x, y, aboveHorizon, nodeSpec, magnitude }) => {
        const isPrime = mission.id === primeId;
        const isHovered = hoveredId === mission.id;
        const leftPct = (x / W) * 100;
        const topPct = (y / H) * 100;
        const NodeComp = nodeSpec.comp;
        const baseSize = isPrime ? nodeSpec.primeSize : nodeSpec.size;
        const size = isHovered ? Math.round(baseSize * 1.35) : baseSize;
        const nearTop = topPct < 28;

        return (
          <button
            key={mission.id}
            onClick={() => onSelect(mission)}
            onMouseEnter={() => setHoveredId(mission.id)}
            onMouseLeave={() => setHoveredId(prev => (prev === mission.id ? null : prev))}
            className="absolute transition-all duration-200 ease-out active:scale-95"
            style={{
              left: `${leftPct}%`,
              top: `${topPct}%`,
              transform: 'translate(-50%, -50%)',
              opacity: aboveHorizon ? 1 : 0.35,
              cursor: 'pointer',
              zIndex: isHovered ? 10 : isPrime ? 4 : 2,
              filter: aboveHorizon ? 'drop-shadow(0 0 8px rgba(255,255,255,0.18))' : 'none',
            }}
            aria-label={`Jump to ${mission.name}`}
          >
            <div className="relative" style={{ width: size, height: size }}>
              {/* soft highlight halo so missions read against the starfield */}
              {aboveHorizon && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: -Math.round(size * 0.6),
                    borderRadius: '50%',
                    background: isPrime
                      ? 'radial-gradient(circle, rgba(255, 179, 71,0.28) 0%, rgba(255, 179, 71,0.06) 40%, transparent 70%)'
                      : 'radial-gradient(circle, rgba(184,212,255,0.14) 0%, rgba(184,212,255,0.04) 40%, transparent 70%)',
                    filter: 'blur(4px)',
                    pointerEvents: 'none',
                  }}
                />
              )}
              {isPrime && aboveHorizon && (
                <>
                  <span className="stl-prime-ring" style={{ inset: -6, borderWidth: 2 }} />
                  <span className="stl-prime-ring" style={{ inset: -6, borderWidth: 1.2, animationDelay: '1.8s' }} />
                </>
              )}
              <NodeComp size={size} />

              {isHovered && (
                <div
                  className="absolute left-1/2 pointer-events-none"
                  style={{
                    [nearTop ? 'top' : 'bottom']: `calc(100% + 6px)` as never,
                    transform: 'translateX(-50%)',
                    background: 'rgba(7,11,20,0.92)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    borderRadius: 6,
                    padding: '4px 8px',
                    whiteSpace: 'nowrap',
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--text)', fontWeight: 600, lineHeight: 1 }}>
                    {mission.name}
                  </div>
                  {magnitude < 50 && (
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', marginTop: 2 }}>
                      MAG {magnitude > 0 ? '+' : ''}{magnitude.toFixed(1)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
