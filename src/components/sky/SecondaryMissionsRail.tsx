'use client';

import { useMemo, useState, useEffect } from 'react';
import { MISSIONS } from '@/lib/constants';
import { useAppState } from '@/hooks/useAppState';
import { useVisibleInterval } from '@/hooks/useVisibleInterval';
import type { Mission } from '@/lib/types';
import { getStarlight, MAX_STARLIGHT_VALUE } from '@/lib/starlight';
import { CheckCircle2, Lock } from 'lucide-react';
import JupiterArt from '@/components/sky/art/JupiterArt';
import SaturnArt from '@/components/sky/art/SaturnArt';
import MoonArt from '@/components/sky/art/MoonArt';
import NebulaArt from '@/components/sky/art/NebulaArt';
import GalaxyArt from '@/components/sky/art/GalaxyArt';
import StarCatalogArt from '@/components/sky/art/StarCatalogArt';

interface Props {
  heroId: string;
  onStart: (mission: Mission) => void;
}

const ART_BY_ID: Record<string, React.ComponentType<{ className?: string }>> = {
  'jupiter': JupiterArt,
  'quick-jupiter': JupiterArt,
  'saturn': SaturnArt,
  'quick-saturn': SaturnArt,
  'moon': MoonArt,
  'orion': NebulaArt,
  'andromeda': GalaxyArt,
  'crab': NebulaArt,
  'pleiades': StarCatalogArt,
  'demo': JupiterArt,
  'free-observation': StarCatalogArt,
};

export default function SecondaryMissionsRail({ heroId, onStart }: Props) {
  const { state } = useAppState();
  const DAY_MS = 24 * 60 * 60 * 1000;

  const [starlight, setStarlight] = useState(MAX_STARLIGHT_VALUE);
  useEffect(() => {
    setStarlight(getStarlight().remaining);
  }, [state.completedMissions.length]);
  useVisibleInterval(() => setStarlight(getStarlight().remaining), 60_000);

  const completedIds = new Set(state.completedMissions.filter(m => m.status === 'completed').map(m => m.id));
  function completedTodayId(id: string) {
    const cutoff = Date.now() - DAY_MS;
    return state.completedMissions.some(m => m.id === id && m.status === 'completed' && new Date(m.timestamp).getTime() > cutoff);
  }

  const outOfStarlight = starlight <= 0;
  const list = useMemo(() => MISSIONS.filter(m => m.id !== heroId), [heroId]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {list.map(mission => {
        const Art = ART_BY_ID[mission.id] ?? StarCatalogArt;
        const isRepeatable = mission.repeatable === true;
        const done = completedIds.has(mission.id) && !isRepeatable;
        const doneToday = isRepeatable && completedTodayId(mission.id);
        const locked = !mission.demo && outOfStarlight;
        const disabled = done || locked;

        let chipText = 'VISIBLE';
        let chipColor = 'rgba(134,239,172,0.8)';
        if (locked) { chipText = 'NO STARLIGHT'; chipColor = 'rgba(232, 130, 107,0.7)'; }
        else if (done) { chipText = 'SEALED'; chipColor = 'rgba(94, 234, 212,0.9)'; }
        else if (mission.difficulty === 'Expert') { chipText = 'CIRCUMPOLAR · 24H'; chipColor = 'rgba(255,255,255,0.4)'; }
        else if (mission.difficulty === 'Hard') { chipText = 'RISES LATE'; chipColor = 'rgba(255,255,255,0.4)'; }

        return (
          <button
            key={mission.id}
            onClick={() => { if (!disabled) onStart(mission); }}
            disabled={disabled}
            className="relative p-5 rounded-[14px] text-left overflow-hidden transition-transform active:scale-[0.98] hover:-translate-y-0.5"
            style={{
              background: done ? 'rgba(94, 234, 212,0.04)' : 'rgba(255,255,255,0.02)',
              border: done ? '1px solid rgba(94, 234, 212,0.2)' : '1px solid rgba(255,255,255,0.08)',
              opacity: locked ? 0.6 : 1,
              cursor: disabled ? 'default' : 'pointer',
              minHeight: 180,
            }}
            onMouseEnter={e => { if (!disabled && !done) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; }}
            onMouseLeave={e => { if (!done) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          >
            <div className="absolute -right-8 -top-6 pointer-events-none" style={{ opacity: done ? 0.5 : 0.85 }}>
              <Art className="w-[140px] h-[140px]" />
            </div>

            {done && <CheckCircle2 size={14} className="absolute top-3 right-3 text-seafoam z-[2]" />}
            {locked && <Lock size={12} className="absolute top-3 right-3 text-terracotta/60 z-[2]" />}

            <div className="relative" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', color: chipColor }}>
              {chipText}
            </div>

            <div style={{ height: 76 }} />

            <h4
              className="text-text-primary m-0"
              style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, lineHeight: 1.1 }}
            >
              {mission.name}
            </h4>
            <div
              className="mt-0.5"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)' }}
            >
              {mission.difficulty.toUpperCase()}{mission.demo ? ' · DEMO' : ''}
            </div>

            <div
              className="flex items-center justify-between mt-3.5 pt-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--stars)' }}>
                +{mission.stars}
              </span>
              {!disabled && (
                <span className="text-[11px] text-text-muted">Begin →</span>
              )}
              {doneToday && (
                <span className="text-[9px] text-text-muted">✓ today</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
