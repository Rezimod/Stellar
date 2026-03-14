'use client';

import { useState } from 'react';
import { MISSIONS } from '@/lib/constants';
import { useAppState } from '@/hooks/useAppState';
import type { Mission } from '@/lib/types';
import Badge from '@/components/shared/Badge';
import Card from '@/components/shared/Card';
import Button from '@/components/shared/Button';
import MissionActive from './MissionActive';

export default function MissionList() {
  const { state } = useAppState();
  const [active, setActive] = useState<Mission | null>(null);
  const completedIds = new Set(state.completedMissions.map(m => m.id));

  return (
    <>
      {active && <MissionActive mission={active} onClose={() => setActive(null)} />}
      <div className="flex flex-col gap-3">
        {MISSIONS.map(mission => {
          const done = completedIds.has(mission.id);
          return (
            <Card key={mission.id} className={done ? 'opacity-60' : ''}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#0f1a2e] rounded-full flex items-center justify-center text-2xl flex-shrink-0">
                  {mission.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">{mission.name}</p>
                  <p className="text-slate-400 text-sm">{mission.desc}</p>
                  <p className="text-slate-500 text-xs italic mt-0.5">{mission.hint}</p>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <Badge color={mission.difficulty === 'Beginner' ? 'emerald' : 'brass'}>
                    {mission.difficulty}
                  </Badge>
                  <Badge color="dim">
                    {mission.type === 'telescope' ? '🔭' : '👁️'} {mission.type === 'telescope' ? 'Telescope' : 'Naked Eye'}
                  </Badge>
                  <p className="text-[#c9a84c] text-sm font-semibold">+{mission.points} pts</p>
                  {done ? (
                    <span className="text-[#34d399] text-sm">✅ Completed</span>
                  ) : (
                    <Button variant="ghost" onClick={() => setActive(mission)} className="text-sm px-3 py-1.5">
                      Start →
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
