'use client';

import { MISSIONS } from '@/lib/constants';
import { useAppState } from '@/hooks/useAppState';
import type { Mission } from '@/lib/types';
import { CheckCircle2, Clock } from 'lucide-react';
import { MissionIcon } from '@/components/shared/PlanetIcons';

interface MissionListProps {
  onStart: (mission: Mission) => void;
}

export default function MissionList({ onStart }: MissionListProps) {
  const { state } = useAppState();
  const completedIds = new Set(state.completedMissions.filter(m => m.status === 'completed').map(m => m.id));
  const pendingIds   = new Set(state.completedMissions.filter(m => m.status === 'pending').map(m => m.id));

  function completedTodayId(id: string): boolean {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return state.completedMissions.some(
      m => m.id === id && m.status === 'completed' && new Date(m.timestamp).getTime() > cutoff
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5" style={{ gridAutoRows: '1fr' }}>
        {MISSIONS.map(mission => {
          const isRepeatable = mission.repeatable === true;
          const done    = completedIds.has(mission.id) && !isRepeatable;
          const doneToday = isRepeatable && completedTodayId(mission.id);
          const pending = pendingIds.has(mission.id);
          const diff    = mission.difficulty === 'Beginner' ? 1 : mission.difficulty === 'Intermediate' ? 2 : mission.difficulty === 'Advanced' ? 3 : mission.difficulty === 'Hard' ? 4 : 5;
          const diffLabel = mission.difficulty === 'Beginner' ? 'Easy' : mission.difficulty === 'Intermediate' ? 'Medium' : mission.difficulty === 'Advanced' ? 'Hard' : mission.difficulty === 'Hard' ? 'Hard+' : 'Expert';

          return (
            <div
              key={mission.id}
              className="relative flex flex-col items-center text-center rounded-2xl px-3 pt-5 pb-4 transition-all duration-200 h-full justify-between"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${done ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.08)'}`,
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,209,102,0.25)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(255,209,102,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              {/* Status badge */}
              {(done || pending) && !isRepeatable && (
                <div className="absolute top-2.5 right-2.5">
                  {done
                    ? <CheckCircle2 size={13} className="text-emerald-400" />
                    : <Clock size={13} className="text-amber-400/50" />
                  }
                </div>
              )}

              {/* Planet */}
              <div className="mb-3">
                <MissionIcon id={mission.id} size={44} />
              </div>

              {/* Name */}
              <p className="text-white font-semibold text-[13px] leading-snug mb-1.5">{mission.name}</p>

              {/* Difficulty dots + label + always-available badge */}
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
                {isRepeatable && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}
                  >
                    Always Available
                  </span>
                )}
              </div>

              {/* Completed today badge */}
              {doneToday && (
                <p className="text-[10px] mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>✓ Completed today</p>
              )}

              {/* Reward */}
              <p className="text-[#FFD166] text-[11px] font-bold mb-3">+{mission.stars} ✦</p>

              {/* CTA */}
              {done ? (
                <div className="w-full py-2 rounded-lg text-[11px] text-slate-700 text-center"
                  style={{ background: 'rgba(255,255,255,0.02)' }}>
                  Complete
                </div>
              ) : pending ? (
                <div className="w-full py-2 rounded-lg text-[11px] text-amber-400/50 text-center"
                  style={{ background: 'rgba(251,191,36,0.04)' }}>
                  Pending
                </div>
              ) : (
                <button
                  onClick={() => onStart(mission)}
                  className="w-full py-2.5 min-h-[44px] rounded-lg text-[12px] font-bold transition-all active:scale-95 hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #FFD166, #CC9A33)', color: '#070B14' }}
                >
                  Begin →
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
