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

const SIZE = 400;
const CX = 200;
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
    () => getChartStars(lat, lon, date, CX, CY, CHART_R, 3.2),
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
      className="relative w-full overflow-hidden mx-auto stl-chart-in"
      style={{
        maxWidth: 'min(100%, 520px)',
        aspectRatio: '1 / 1.05',
        background: 'var(--stl-bg-chart)',
        border: '1px solid var(--stl-border-regular)',
        borderRadius: 'var(--stl-r-xl)',
      }}
    >
      <svg viewBox={`0 0 ${SIZE} ${SIZE + 20}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="stl-milky" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#B5C5FF" stopOpacity="0.08" />
            <stop offset="1" stopColor="#B5C5FF" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx={CX} cy={CY} rx={360} ry={60} fill="url(#stl-milky)" transform={`rotate(-28 ${CX} ${CY})`} />

        <circle cx={CX} cy={CY} r={CHART_R}        fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        <circle cx={CX} cy={CY} r={CHART_R * 0.66} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" strokeDasharray="1 4" />
        <circle cx={CX} cy={CY} r={CHART_R * 0.33} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" strokeDasharray="1 4" />

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
          const r = Math.max(0.4, (3.5 - s.mag) * 0.55);
          const fill = s.tone === 'hot' ? 'var(--stl-star-hot)' : s.tone === 'warm' ? 'var(--stl-star-warm)' : 'var(--stl-star-cool)';
          const op = s.aboveHorizon ? Math.min(1, 0.35 + (2.5 - s.mag) * 0.2) : 0.15;
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

        <circle cx={CX} cy={CY} r={CHART_R} fill="none" stroke="rgba(56,240,255,0.22)" strokeWidth="0.8" strokeDasharray="3 3" />

        <text x={CX} y={CY - CHART_R - 6}  fill="rgba(255,255,255,0.45)" fontSize="10" fontFamily="var(--font-mono)" textAnchor="middle">N</text>
        <text x={CX + CHART_R + 10} y={CY + 4} fill="rgba(255,255,255,0.45)" fontSize="10" fontFamily="var(--font-mono)">E</text>
        <text x={CX - CHART_R - 10} y={CY + 4} fill="rgba(255,255,255,0.45)" fontSize="10" fontFamily="var(--font-mono)" textAnchor="end">W</text>
        <text x={CX} y={CY + CHART_R + 16} fill="rgba(56,240,255,0.45)" fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle" letterSpacing="2">S · HORIZON</text>
      </svg>

      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full stl-tw" style={{ background: 'var(--stl-gold)' }} />
        <span className="stl-mono-kicker" style={{ color: 'var(--stl-text-dim)' }}>
          {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · TONIGHT
        </span>
      </div>

      {plotted.map(({ mission, x, y, aboveHorizon, Node }, i) => {
        const isPrime = mission.id === primeId;
        const isDone = completedIds.has(mission.id);
        const leftPct = (x / SIZE) * 100;
        const topPct = (y / (SIZE + 20)) * 100;
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
                opacity: aboveHorizon ? (isDone ? 0.55 : 1) : 0.3,
                cursor: 'pointer',
                ['--stl-delay' as string]: `${700 + i * 90}ms`,
              }}
              aria-label={`Start ${mission.name} mission`}
            >
              <div className="relative">
                {isPrime && aboveHorizon && <span className="stl-prime-ring" />}
                <Node size={isPrime ? 32 : 24} />
              </div>
              <div className="mt-1 text-center whitespace-nowrap pointer-events-none">
                <div
                  className="stl-chart-label"
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontStyle: 'italic',
                    fontWeight: 400,
                    fontSize: 12,
                    lineHeight: 1.1,
                    color: aboveHorizon ? 'var(--stl-text-bright)' : 'var(--stl-text-dim)',
                  }}
                >
                  {mission.name}
                </div>
                <div
                  className="stl-chart-label mt-0.5"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    letterSpacing: '0.08em',
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
