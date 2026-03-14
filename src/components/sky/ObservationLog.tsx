'use client';

import { useAppState } from '@/hooks/useAppState';
import Card from '@/components/shared/Card';

export default function ObservationLog() {
  const { state } = useAppState();
  const missions = [...state.completedMissions].reverse();

  if (missions.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="text-xl font-semibold text-slate-300 mb-4" style={{ fontFamily: 'Georgia, serif' }}>
        Observation Log
      </h2>
      <div className="flex flex-col gap-3">
        {missions.map(m => (
          <Card key={m.txId}>
            <div className="flex items-center gap-4">
              <img src={m.photo} alt={m.name} className="w-16 h-12 object-cover rounded" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white">{m.name}</p>
                <p className="text-slate-400 text-xs">{new Date(m.timestamp).toLocaleString()}</p>
                <p className="font-mono text-xs text-slate-600 truncate mt-0.5">
                  {m.txId.slice(0, 12)}...{m.txId.slice(-8)}
                </p>
              </div>
              <p className="text-[#c9a84c] font-bold text-sm flex-shrink-0">+{m.points} pts</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
