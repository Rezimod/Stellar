'use client';

import { useMemo } from 'react';
import type { Mission } from '@/lib/types';
import {
  getChartStars,
  getChartPlanets,
  getChartDeepSky,
  type ChartStar,
  type ChartPlanet,
  type ChartDeepSky,
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

// Wider canvas than tall — the horizon circle stays centered; extra side area
// fills with stars just below horizon for visual depth.
const W = 600;
const H = 420;
const CX = 300;
const CY = 200;
const CHART_R = 180;

const CONSTELLATION_LINES: { ids: string[] }[] = [
  { ids: ['Betelgeuse','Bellatrix','Mintaka','Alnilam','Alnitak','Saiph','Rigel','Bellatrix'] },
  { ids: ['Caph','Schedar','Tsih','Ruchbah'] },
  { ids: ['Dubhe','Merak','Phecda','Megrez','Alioth','Mizar','Alkaid'] },
];

interface Props {
  lat: number;
  lon: number;
  date: Date;
  missions: Mission[];
  completedIds: Set<string>;
  primeId: string | null;
  onSelect: (mission: Mission) => void;
}

interface PlottedMission {
  mission: Mission;
  x: number;
  y: number;
  aboveHorizon: boolean;
  Node: React.ComponentType<{ size?: number }>;
}

const MISSION_NODE: Record<string, React.ComponentType<{ size?: number }>> = {
  moon:       MoonNode,
  jupiter:    JupiterNode,
  saturn:     SaturnNode,
  venus:      VenusNode,
  mars:       MarsNode,
  mercury:    MercuryNode,
  pleiades:   PleiadesNode,
  orion:      OrionNode,
  andromeda:  AndromedaNode,
  crab:       CrabNode,
};

export default function SkyChart({ lat, lon, date, missions, completedIds, primeId, onSelect }: Props) {
  const stars: ChartStar[] = useMemo(
    () => getChartStars(lat, lon, date, CX, CY, CHART_R, 3.6),
    [lat, lon, date]
  );
  const planets: ChartPlanet[] = useMemo(
    () => getChartPlanets(lat, lon, date, CX, CY, CHART_R),
    [lat, lon, date]
  );
  const deepSky: ChartDeepSky[] = useMemo(
    () => getChartDeepSky(lat, lon, date, CX, CY, CHART_R),
    [lat, lon, date]
  );

  const starByName = useMemo(() => {
    const m = new Map<string, ChartStar>();
    for (const s of stars) if (s.name) m.set(s.name, s);
    return m;
  }, [stars]);

  const plotted: PlottedMission[] = useMemo(() => {
    const planetByKey = new Map(planets.map(p => [p.key, p]));
    const deepSkyByKey = new Map(deepSky.map(d => [d.id, d]));
    const out: PlottedMission[] = [];
    for (const m of missions) {
      const Node = MISSION_NODE[m.id];
      if (!Node) continue;
      const planet = planetByKey.get(m.id);
      const ds = deepSkyByKey.get(m.id);
      const src = planet ?? ds;
      if (!src) continue;
      out.push({ mission: m, x: src.x, y: src.y, aboveHorizon: src.aboveHorizon, Node });
    }
    return out;
  }, [missions, planets, deepSky]);

  return (
    <div
      className="relative w-full overflow-hidden stl-chart-in stl-chart"
      style={{
        fontFamily: 'var(--font-display)',
        background: [
          'radial-gradient(ellipse 420px 320px at 75% 35%, rgba(132,101,203,0.18) 0%, transparent 55%)',
          'radial-gradient(ellipse 360px 260px at 25% 65%, rgba(56,155,240,0.12) 0%, transparent 60%)',
          'radial-gradient(ellipse 280px 220px at 50% 20%, rgba(255,143,184,0.08) 0%, transparent 60%)',
          'radial-gradient(ellipse 500px 400px at 50% 100%, rgba(255,209,102,0.05) 0%, transparent 70%)',
          'radial-gradient(ellipse at 50% 50%, #0A1428 0%, #050A1C 50%, #010206 100%)',
        ].join(', '),
        border: '1px solid var(--stl-border-regular)',
        borderRadius: 'var(--stl-r-xl)',
      }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="stl-mw-core" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FFE8C4" stopOpacity="0.12" />
            <stop offset="0.3" stopColor="#B8C5FF" stopOpacity="0.08" />
            <stop offset="1" stopColor="transparent" />
          </radialGradient>
          <linearGradient id="stl-dust-lane" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#030612" stopOpacity="0" />
            <stop offset="0.3" stopColor="#030612" stopOpacity="0.35" />
            <stop offset="0.7" stopColor="#030612" stopOpacity="0.35" />
            <stop offset="1" stopColor="#030612" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="stl-nebula-purple" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#A78BE8" stopOpacity="0.22" />
            <stop offset="0.5" stopColor="#5B4191" stopOpacity="0.08" />
            <stop offset="1" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="stl-nebula-rose" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FF8FB8" stopOpacity="0.12" />
            <stop offset="1" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Layered nebula clouds inside SVG (amplify the CSS layers) */}
        <ellipse cx={CX + 95} cy={CY - 70} rx="140" ry="100" fill="url(#stl-nebula-purple)" />
        <ellipse cx={CX - 80} cy={CY + 50} rx="130" ry="110" fill="url(#stl-nebula-purple)" opacity="0.6" />
        <ellipse cx={CX + 20} cy={CY - 130} rx="100" ry="70" fill="url(#stl-nebula-rose)" />

        {/* Milky Way diagonal band with dust lane */}
        <g transform={`rotate(-28 ${CX} ${CY})`}>
          <ellipse cx={CX} cy={CY} rx="420" ry="60" fill="url(#stl-mw-core)" />
          <ellipse cx={CX} cy={CY} rx="420" ry="14" fill="url(#stl-dust-lane)" opacity="0.8" />
        </g>

        {CONSTELLATION_LINES.map((c, i) => {
          const pts = c.ids.map(id => starByName.get(id)).filter(Boolean) as ChartStar[];
          if (pts.length < 2) return null;
          const d = pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
          return (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="rgba(184,212,255,0.55)"
              strokeWidth="0.6"
              strokeLinejoin="round"
              className="stl-stroke-draw"
              style={{ animationDelay: `${400 + i * 280}ms` }}
            />
          );
        })}

        {stars.map((s, i) => {
          const r = Math.max(0.4, (3.8 - s.mag) * 0.55);
          const fill = s.tone === 'hot' ? 'var(--stl-star-hot)' : s.tone === 'warm' ? 'var(--stl-star-warm)' : 'var(--stl-star-cool)';
          const op = s.aboveHorizon ? Math.min(1, 0.35 + (2.5 - s.mag) * 0.2) : 0.12;
          return (
            <circle
              key={i}
              cx={s.x}
              cy={s.y}
              r={r}
              fill={fill}
              className="stl-star-tw"
              style={{
                ['--stl-star-op' as string]: op,
                animationDelay: `${(i % 12) * 320}ms`,
              }}
            />
          );
        })}

        {/* Diffraction spikes — only for the brightest 6-8 stars */}
        <g stroke="#fff" strokeWidth="0.3" opacity="0.4">
          {stars
            .filter(s => s.mag < 1.0 && s.aboveHorizon)
            .slice(0, 8)
            .map((s, i) => (
              <g key={`spike-${i}`}>
                <line x1={s.x} y1={s.y - 4} x2={s.x} y2={s.y + 4} />
                <line x1={s.x - 4} y1={s.y} x2={s.x + 4} y2={s.y} />
              </g>
            ))}
        </g>

        {/* Amber galactic core stars — small accent for warmth */}
        <g fill="#FFDDB8">
          <circle cx={CX} cy={CY + 10} r="0.5" opacity="0.4" />
          <circle cx={CX + 50} cy={CY} r="0.4" opacity="0.35" />
          <circle cx={CX - 30} cy={CY + 30} r="0.5" opacity="0.4" />
          <circle cx={CX + 90} cy={CY - 30} r="0.4" opacity="0.35" />
        </g>

        <g fontFamily="var(--font-mono)" fill="rgba(255,255,255,0.2)" fontSize="9" fontWeight="500">
          <text x={CX} y={18} textAnchor="middle">N</text>
          <text x={CX} y={H - 10} textAnchor="middle">S</text>
          <text x={W - 8} y={CY + 4} textAnchor="end">E</text>
          <text x={8} y={CY + 4}>W</text>
        </g>
      </svg>

      {plotted.map(({ mission, x, y, aboveHorizon, Node }, i) => {
        const isPrime = mission.id === primeId;
        const isDone = completedIds.has(mission.id);
        const leftPct = (x / W) * 100;
        const topPct = (y / H) * 100;
        return (
          <div
            key={mission.id}
            className="absolute"
            style={{
              left: `${leftPct}%`,
              top: `${topPct}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: isPrime ? 3 : 2,
            }}
          >
            <button
              onClick={() => onSelect(mission)}
              className="stl-node-in flex flex-col items-center transition-transform duration-200 active:scale-95 hover:scale-110"
              style={{
                opacity: aboveHorizon ? (isDone ? 0.55 : 1) : 0.35,
                cursor: 'pointer',
                ['--stl-delay' as string]: `${700 + i * 90}ms`,
              }}
              aria-label={`Start ${mission.name} mission`}
            >
              <div className="relative">
                {isPrime && aboveHorizon && <span className="stl-prime-ring" />}
                <Node size={isPrime ? 38 : 30} />
              </div>
              <div className="mt-1 text-center whitespace-nowrap pointer-events-none">
                <div
                  className="stl-chart-label stl-node-name"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 500,
                    fontSize: 12,
                    lineHeight: 1.15,
                    letterSpacing: '-0.005em',
                    color: aboveHorizon ? 'var(--stl-text-bright)' : 'var(--stl-text-dim)',
                  }}
                >
                  {mission.name}
                </div>
                <div
                  className="stl-chart-label sm:mt-0.5"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    fontSize: 10,
                    letterSpacing: '0.05em',
                    color: aboveHorizon ? 'var(--stl-gold)' : 'rgba(255,209,102,0.4)',
                  }}
                >
                  +{mission.stars} ✦
                </div>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
