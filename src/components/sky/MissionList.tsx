'use client';

import { useState } from 'react';
import { MISSIONS } from '@/lib/constants';
import { useAppState } from '@/hooks/useAppState';
import type { Mission } from '@/lib/types';
import { CheckCircle2, Clock } from 'lucide-react';
import Badge from '@/components/shared/Badge';
import Card from '@/components/shared/Card';
import Button from '@/components/shared/Button';
import { MissionIcon } from '@/components/shared/PlanetIcons';
import MissionActive from './MissionActive';

function DifficultyStars({ level }: { level: string }) {
  const filled = level === 'Beginner' ? 1 : level === 'Intermediate' ? 3 : 5;
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={i < filled ? 'text-[#FFD166]' : 'text-[var(--text-dim)]'}>★</span>
        ))}
      </span>
      <span className="text-[var(--text-secondary)]">{level}</span>
    </span>
  );
}

function VisibilityDot({ difficulty }: { difficulty: string }) {
  const level = difficulty === 'Beginner' ? 'Excellent' : difficulty === 'Intermediate' ? 'Good' : 'Poor';
  const color = level === 'Excellent' ? 'bg-emerald-400' : level === 'Good' ? 'bg-yellow-400' : 'bg-red-400';
  const textColor = level === 'Excellent' ? 'text-emerald-400' : level === 'Good' ? 'text-yellow-400' : 'text-red-400';
  return (
    <span className={`flex items-center gap-1.5 text-xs ${textColor}`}>
      <span className={`w-2 h-2 rounded-full ${color}`} />
      Visibility: {level}
    </span>
  );
}

export default function MissionList() {
  const { state } = useAppState();
  const [active, setActive] = useState<Mission | null>(null);
  const completedIds = new Set(state.completedMissions.filter(m => m.status === 'completed').map(m => m.id));
  const pendingIds = new Set(state.completedMissions.filter(m => m.status === 'pending').map(m => m.id));

  return (
    <>
      {active && <MissionActive mission={active} onClose={() => setActive(null)} />}
      <div className="flex flex-col gap-2.5 mb-2">
        {MISSIONS.map(mission => {
          const done = completedIds.has(mission.id);
          const pending = pendingIds.has(mission.id);
          return (
            <Card key={mission.id} className={done ? 'opacity-60' : ''}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MissionIcon id={mission.id} size={38} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm mb-1.5">{mission.name}</p>
                  <div className="flex flex-col gap-1">
                    <DifficultyStars level={mission.difficulty} />
                    <span className="text-[#FFD166] text-xs font-semibold">Reward: +{mission.stars} stars ✦</span>
                    <VisibilityDot difficulty={mission.difficulty} />
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge color={mission.type === 'telescope' ? 'cyan' : 'dim'}>
                      {mission.type === 'telescope' ? '🔭 Telescope' : '👁️ Naked Eye'}
                    </Badge>
                  </div>
                </div>
                <div className="flex-shrink-0 mt-1">
                  {done ? (
                    <span className="flex items-center gap-1 text-[#34d399] text-xs font-medium"><CheckCircle2 size={13} /> Done</span>
                  ) : pending ? (
                    <span className="flex items-center gap-1 text-amber-400 text-xs"><Clock size={12} /> Pending</span>
                  ) : (
                    <Button variant="ghost" onClick={() => setActive(mission)} className="text-xs px-3 py-1.5 min-h-[36px] btn-glow-cyan">
                      Begin →
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
