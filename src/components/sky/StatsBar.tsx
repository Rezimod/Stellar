'use client';

import { Telescope, Star, Trophy } from 'lucide-react';
import { useAppState } from '@/hooks/useAppState';
import { getRank } from '@/lib/rewards';

export default function StatsBar() {
  const { state } = useAppState();
  const completed = state.completedMissions.filter(m => m.status === 'completed');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const total = completed.reduce((sum, m) => sum + (m.stars ?? (m as any).points ?? 0), 0);
  const count = completed.length;
  const rank = getRank(count);

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {[
        { icon: <Telescope size={15} strokeWidth={2} className="text-[#FFD166]" />, label: 'Observations', value: <span className="text-[#FFD166] text-xl sm:text-2xl font-bold">{count}</span> },
        { icon: <Star size={15} strokeWidth={0} fill="#38F0FF" className="text-[#38F0FF]" />, label: 'Stars', value: <span className="text-[#38F0FF] text-xl sm:text-2xl font-bold">{total} ✦</span> },
        { icon: <Trophy size={15} strokeWidth={2} className="text-[#a78bfa]" />, label: 'Rank', value: <div className="flex items-center justify-center gap-1.5"><span className="text-xs font-semibold text-[#a78bfa]">{rank.name}</span></div> },
      ].map(card => (
        <div key={card.label} className="glass-card p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            {card.icon}
            <p className="text-[var(--text-secondary)] text-xs">{card.label}</p>
          </div>
          {card.value}
        </div>
      ))}
    </div>
  );
}
