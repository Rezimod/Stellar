'use client';

import type { Mission } from '@/lib/types';
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

const NODE: Record<string, React.ComponentType<{ size?: number }>> = {
  moon: MoonNode, jupiter: JupiterNode, saturn: SaturnNode,
  venus: VenusNode, mars: MarsNode, mercury: MercuryNode,
  pleiades: PleiadesNode, orion: OrionNode, andromeda: AndromedaNode, crab: CrabNode,
};

interface Props {
  mission: Mission;
  altitude: number | null;
  tagline: string;
  onStart: () => void;
  magnitude?: number | null;
  azimuth?: number | null;
  riseSetLabel?: string | null;
}

export default function PrimeHeroCard({ mission, altitude, tagline, onStart, magnitude, azimuth, riseSetLabel }: Props) {
  const Node = NODE[mission.id] ?? JupiterNode;

  return (
    <div
      className="relative flex items-center gap-2.5 p-2.5 lg:p-3 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(232, 130, 107,0.06), rgba(232, 130, 107,0.01) 60%, transparent)',
        border: '1px solid rgba(232, 130, 107,0.22)',
        borderRadius: 12,
      }}
    >
      {/* Shimmer sheen */}
      <div className="stl-sheen" />

      {/* Art — static, no pulse */}
      <div
        className="relative flex-shrink-0 flex items-center justify-center"
        style={{ width: 44, height: 44 }}
      >
        <Node size={40} />
      </div>

      {/* Text block */}
      <div className="flex-1 min-w-0 relative">
        <div className="flex items-center justify-between gap-1.5 mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <div style={{ width: 3.5, height: 3.5, borderRadius: '50%', background: 'var(--stl-gold)' }} />
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 8,
                color: 'var(--stl-gold)',
                letterSpacing: '0.22em',
                fontWeight: 500,
              }}
            >
              PRIME · TONIGHT
            </span>
            {altitude != null && (
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 8,
                  color: 'rgba(255,255,255,0.3)',
                  letterSpacing: '0.1em',
                }}
              >
                · ALT <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{Math.round(altitude)}°</span>
              </span>
            )}
          </div>
          {riseSetLabel && (
            <span
              className="hidden lg:inline"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 8,
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: '0.14em',
                whiteSpace: 'nowrap',
              }}
            >
              {riseSetLabel}
            </span>
          )}
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            color: 'var(--text)',
            fontWeight: 600,
            margin: 0,
            lineHeight: 1.05,
            letterSpacing: '-0.01em',
          }}
        >
          {mission.name}
        </h2>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 11.5,
            color: 'rgba(255,255,255,0.5)',
            fontStyle: 'italic',
            fontWeight: 400,
            marginTop: 1,
            lineHeight: 1.2,
          }}
        >
          {tagline}
        </div>
        {/* Desktop-only compact stats row */}
        {(magnitude != null || azimuth != null) && (
          <div
            className="hidden lg:flex items-center gap-3 mt-1.5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 9,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.55)',
            }}
          >
            {magnitude != null && (
              <span>
                <span style={{ color: 'rgba(255,255,255,0.35)', marginRight: 4 }}>MAG</span>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                  {magnitude > 0 ? '+' : ''}{magnitude.toFixed(1)}
                </span>
              </span>
            )}
            {azimuth != null && (
              <span>
                <span style={{ color: 'rgba(255,255,255,0.35)', marginRight: 4 }}>AZ</span>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                  {Math.round(azimuth)}°
                </span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Observe button */}
      <button
        onClick={onStart}
        className="flex-shrink-0 transition-all active:scale-[0.97] hover:brightness-110"
        style={{
          padding: '7px 11px',
          background: 'linear-gradient(135deg, var(--terracotta), var(--terracotta))',
          color: 'var(--canvas)',
          border: 'none',
          borderRadius: 9,
          fontSize: 11,
          fontWeight: 600,
          fontFamily: 'var(--font-display)',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
        }}
      >
        Observe · <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>+{mission.stars}</span>
      </button>
    </div>
  );
}
