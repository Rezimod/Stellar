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
    <div className="grid grid-cols-2 gap-2.5" style={{ gridAutoRows: '1fr' }}>
      {MISSIONS.map(mission => {
        const isRepeatable = mission.repeatable === true;
        const done = completedIds.has(mission.id) && !isRepeatable;
        const doneToday = isRepeatable && completedTodayId(mission.id);
        const diff = mission.difficulty === 'Beginner' ? 1 : mission.difficulty === 'Intermediate' ? 2 : mission.difficulty === 'Advanced' ? 3 : mission.difficulty === 'Hard' ? 4 : 5;
        const diffLabel = mission.difficulty === 'Beginner' ? 'Easy' : mission.difficulty === 'Intermediate' ? 'Medium' : mission.difficulty === 'Advanced' ? 'Hard' : mission.difficulty === 'Hard' ? 'Hard+' : 'Expert';

        // Starlight gating: non-demo missions disabled when Starlight = 0
        const locked = !mission.demo && outOfStarlight;

        return (
          <div
            key={mission.id}
            className="relative flex flex-col items-center text-center rounded-2xl px-3 pt-5 pb-4 transition-all duration-200 h-full justify-between"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              opacity: locked ? 0.55 : 1,
            }}
            onMouseEnter={e => { if (!locked) { e.currentTarget.style.borderColor = 'rgba(255,209,102,0.25)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(255,209,102,0.08)'; } }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            {/* Completion badge */}
            {done && !isRepeatable && (
              <div className="absolute top-2.5 right-2.5">
                <CheckCircle2 size={13} className="text-emerald-400" />
              </div>
            )}

            <div className="relative w-full overflow-hidden rounded-xl mb-3" style={{ aspectRatio: '1 / 1', maxHeight: '160px' }}>
              <img
                src={getMissionImage(mission.id)}
                alt={mission.name}
                className="w-full h-full object-cover"
                style={{ display: 'block' }}
              />
            </div>

            <p className="text-white font-semibold text-[13px] leading-snug mb-1.5">{mission.name}</p>

            <div className="flex flex-col items-center gap-1 mb-2">
              <div className="flex gap-1 justify-center">
                {[1,2,3,4,5].map(d => (
                  <span key={d} className="w-1 h-1 rounded-full" style={{
                    backgroundColor: d <= diff
                      ? diff >= 5 ? 'rgba(239,68,68,0.8)' : diff >= 4 ? 'rgba(251,113,133,0.7)' : 'rgba(255,209,102,0.55)'
                      : 'rgba(255,255,255,0.1)'
                  }} />
                ))}
              </div>
              <span className="text-[9px] text-slate-600 font-medium tracking-wide uppercase">{diffLabel}</span>
              {isRepeatable && !mission.demo && (
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>
                  Always Available
                </span>
              )}
            </div>

            {doneToday && (
              <p className="text-[10px] mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>✓ Completed today</p>
            )}

            {mission.demo && (
              <span className="text-[10px] px-2 py-0.5 rounded-full mb-1" style={{ background: 'rgba(99,102,241,0.08)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.15)' }}>
                Demo
              </span>
            )}

            <p className="text-[#FFD166] text-[11px] font-bold mb-3">+{mission.stars} ✦</p>

            {done ? (
              <div className="w-full py-2 rounded-lg text-[11px] text-slate-700 text-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
                Complete
              </div>
            ) : locked ? (
              <div
                className="w-full py-2 rounded-lg text-[10px] text-center flex flex-col items-center gap-0.5"
                style={{ background: 'rgba(255,209,102,0.04)', border: '1px solid rgba(255,209,102,0.1)', color: 'rgba(255,209,102,0.5)' }}
              >
                <span className="font-semibold">No Starlight</span>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>
                  {new Date().getHours() < 19 ? 'Resets at 19:00' : 'Resets tomorrow at 19:00'}
                </span>
              </div>
            ) : (
              <button
                onClick={() => onStart(mission)}
                className="w-full py-2.5 min-h-[44px] rounded-lg text-[12px] font-bold transition-all active:scale-95 hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #FFD166, #CC9A33)', color: '#0a0a0a' }}
              >
                Begin →
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
