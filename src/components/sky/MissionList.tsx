'use client';

import { MISSIONS } from '@/lib/constants';
import { useAppState } from '@/hooks/useAppState';
import type { Mission } from '@/lib/types';
import { CheckCircle2 } from 'lucide-react';
import { getMissionImage } from '@/lib/mission-icons';
import { useState, useEffect } from 'react';
import { getStarlight, MAX_STARLIGHT_VALUE } from '@/lib/starlight';

interface MissionListProps {
  onStart: (mission: Mission) => void;
}

export default function MissionList({ onStart }: MissionListProps) {
  const { state } = useAppState();
  const completedIds = new Set(state.completedMissions.filter(m => m.status === 'completed').map(m => m.id));
  const DAY_MS = 24 * 60 * 60 * 1000;

  const [starlight, setStarlight] = useState(MAX_STARLIGHT_VALUE);
  useEffect(() => {
    setStarlight(getStarlight().remaining);
    const id = setInterval(() => setStarlight(getStarlight().remaining), 60000);
    return () => clearInterval(id);
  }, [state.completedMissions.length]);

  function completedTodayId(id: string): boolean {
    const cutoff = Date.now() - DAY_MS;
    return state.completedMissions.some(
      m => m.id === id && m.status === 'completed' && new Date(m.timestamp).getTime() > cutoff
    );
  }

  const outOfStarlight = starlight <= 0;

  return (
    <div className="flex flex-col gap-2">
      {MISSIONS.map(mission => {
        const isRepeatable = mission.repeatable === true;
        const done = completedIds.has(mission.id) && !isRepeatable;
        const doneToday = isRepeatable && completedTodayId(mission.id);
        const diffLabel = mission.difficulty === 'Beginner' ? 'Easy' : mission.difficulty === 'Intermediate' ? 'Medium' : mission.difficulty === 'Advanced' ? 'Hard' : mission.difficulty === 'Hard' ? 'Hard+' : 'Expert';

        const locked = !mission.demo && outOfStarlight;
        const disabled = done || locked;

        const handleClick = () => { if (!disabled) onStart(mission); };

        return (
          <button
            key={mission.id}
            onClick={handleClick}
            disabled={disabled}
            className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 w-full text-left transition-all active:scale-[0.99]"
            style={{
              background: done
                ? 'rgba(52,211,153,0.04)'
                : locked
                ? 'rgba(255,255,255,0.02)'
                : 'rgba(255,255,255,0.035)',
              border: done
                ? '1px solid rgba(52,211,153,0.2)'
                : '1px solid rgba(255,255,255,0.08)',
              opacity: locked ? 0.55 : 1,
              cursor: disabled ? 'default' : 'pointer',
            }}
            onMouseEnter={e => { if (!disabled) { e.currentTarget.style.borderColor = 'rgba(255,209,102,0.35)'; } }}
            onMouseLeave={e => { if (!done) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; } }}
          >
            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <img src={getMissionImage(mission.id)} alt={mission.name} className="w-full h-full object-cover" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-white font-semibold text-[13px] leading-tight truncate">{mission.name}</p>
                {mission.demo && (
                  <span className="text-[9px] px-1.5 py-0 rounded-full flex-shrink-0" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>
                    Demo
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-wide">{diffLabel}</span>
                {doneToday && <span className="text-[10px] text-slate-500">· ✓ today</span>}
                {isRepeatable && !mission.demo && !doneToday && (
                  <span className="text-[10px] text-[#34d399]">· Always available</span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
              <span className="text-[#FFD166] text-[12px] font-bold">+{mission.stars} ✦</span>
              {done ? (
                <span className="flex items-center gap-1 text-[10px] text-[#34d399]">
                  <CheckCircle2 size={11} /> Done
                </span>
              ) : locked ? (
                <span className="text-[9px] text-amber-400/70">No Starlight</span>
              ) : (
                <span className="text-[10px] text-[#FFD166]/70 font-semibold">Begin →</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
