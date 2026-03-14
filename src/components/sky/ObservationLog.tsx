'use client';

import Link from 'next/link';
import { useAppState } from '@/hooks/useAppState';
import Card from '@/components/shared/Card';

export default function ObservationLog() {
  const { state } = useAppState();
  const all = [...state.completedMissions].reverse();
  const missions = all.slice(0, 3);

  if (missions.length === 0) return null;

  return (
    <div className="mt-4 sm:mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-slate-300" style={{ fontFamily: 'Georgia, serif' }}>
          Observation Log
        </h2>
        {all.length > 3 && (
          <Link href="/proof" className="text-xs text-[#38F0FF] hover:underline">
            View all in Proof →
          </Link>
        )}
      </div>
      <div className="flex flex-col gap-2.5">
        {missions.map(m => (
          <Card key={m.txId}>
            <div className="flex items-center gap-3">
              <img src={m.photo} alt={m.name} className="w-14 h-10 object-cover rounded flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-sm">{m.name}</p>
                <p className="text-slate-400 text-xs">{new Date(m.timestamp).toLocaleString()}</p>
                {m.status === 'pending' && (
                  <p className="text-amber-400 text-xs mt-0.5">⏳ Pending</p>
                )}
              </div>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <p className="text-[#FFD166] font-bold text-sm flex-shrink-0">+{m.stars ?? (m as any).points ?? 0} ✦</p>
            </div>
          </Card>
        ))}
        {all.length > 0 && (
          <Link href="/proof" className="text-center text-xs text-[var(--text-dim)] hover:text-[#38F0FF] transition-colors py-1">
            View all in My Proof →
          </Link>
        )}
      </div>
    </div>
  );
}
