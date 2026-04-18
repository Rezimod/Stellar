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
  peakTime: string | null;
  tagline: string;
  onStart: () => void;
}

export default function PrimeHeroCard({ mission, altitude, peakTime, tagline, onStart }: Props) {
  const Node = NODE[mission.id] ?? JupiterNode;

  return (
    <div
      className="stl-prime-card relative flex items-center gap-2.5 p-2.5 sm:gap-3 sm:p-3 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(255,209,102,0.08), rgba(255,209,102,0.01) 60%, transparent)',
        border: '1px solid rgba(255,209,102,0.28)',
        borderRadius: 16,
      }}
    >
      <div className="relative flex-shrink-0 w-[48px] h-[48px] sm:w-[64px] sm:h-[64px] flex items-center justify-center">
        <div className="sm:hidden"><Node size={48} /></div>
        <div className="hidden sm:block"><Node size={56} /></div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-1 sm:gap-1.5 justify-center">
        <div className="flex items-center gap-1.5">
          <div
            className="stl-tw"
            style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--stl-gold)' }}
          />
          <span
            className="text-[8px] sm:text-[8.5px]"
            style={{
              fontFamily: 'var(--font-mono)',
              color: 'var(--stl-gold)',
              letterSpacing: '0.22em',
              fontWeight: 500,
            }}
          >
            PRIME · TONIGHT
          </span>
        </div>
        <h1
          className="text-[19px] sm:text-[26px]"
          style={{
            fontFamily: 'var(--font-serif)',
            color: '#F2F0EA',
            fontWeight: 600,
            margin: 0,
            lineHeight: 1.05,
            letterSpacing: '-0.015em',
          }}
        >
          {mission.name}
        </h1>
        <div
          className="text-[11px] sm:text-[12px] line-clamp-1"
          style={{
            fontFamily: 'var(--font-serif)',
            color: 'rgba(255,255,255,0.6)',
            fontStyle: 'italic',
            fontWeight: 400,
            lineHeight: 1.25,
          }}
        >
          {tagline}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span
            className="text-[9px] sm:text-[9.5px] truncate"
            style={{
              fontFamily: 'var(--font-mono)',
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '0.1em',
            }}
          >
            {altitude != null ? `ALT ${Math.round(altitude)}°` : ''}
            {peakTime ? ` · ${peakTime}` : ''}
          </span>
          <button
            onClick={onStart}
            className="transition-all active:scale-[0.97] hover:opacity-90 flex-shrink-0"
            style={{
              padding: '5px 10px',
              background: 'linear-gradient(135deg, #FFD166, #CC9A33)',
              color: '#0a0a0a',
              border: 'none',
              borderRadius: 8,
              fontSize: 10.5,
              fontWeight: 600,
              fontFamily: 'var(--font-display)',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            Observe · +{mission.stars} ✦
          </button>
        </div>
      </div>
    </div>
  );
}
