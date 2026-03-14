'use client';

import { useAppState } from '@/hooks/useAppState';
import Card from '@/components/shared/Card';

function getRank(count: number) {
  if (count === 0) return '—';
  if (count < 3) return '⭐';
  return '🏆';
}

export default function StatsBar() {
  const { state } = useAppState();
  const total = state.completedMissions.reduce((sum, m) => sum + m.points, 0);
  const count = state.completedMissions.length;

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <Card>
        <p className="text-slate-400 text-xs mb-1">Observations</p>
        <p className="text-[#c9a84c] text-2xl font-bold">{count}</p>
      </Card>
      <Card>
        <p className="text-slate-400 text-xs mb-1">Points</p>
        <p className="text-[#22d3ee] text-2xl font-bold">{total}</p>
      </Card>
      <Card>
        <p className="text-slate-400 text-xs mb-1">Rank</p>
        <p className="text-2xl">{getRank(count)}</p>
      </Card>
    </div>
  );
}
