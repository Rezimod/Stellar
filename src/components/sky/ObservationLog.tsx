'use client';

import Link from 'next/link';
import { useAppState } from '@/hooks/useAppState';
import { Clock } from 'lucide-react';

export default function ObservationLog() {
  const { state } = useAppState();
  const all = [...state.completedMissions].reverse();
  const missions = all.slice(0, 3);

  if (missions.length === 0) return null;

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="ornament-line flex-1" />
        <span className="text-[10px] text-slate-600 uppercase tracking-widest font-medium whitespace-nowrap">Recent Observations</span>
        <div className="ornament-line flex-1" />
      </div>

      <div className="flex flex-col gap-1.5">
        {missions.map((m, i) => (
          <div
            key={m.txId}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all"
            style={{
              background: 'rgba(15,31,61,0.35)',
              border: '1px solid rgba(255,255,255,0.04)',
              animationDelay: `${i * 60}ms`,
            }}
          >
            <img
              src={m.photo}
              alt={m.name}
              className="w-12 h-9 object-cover rounded-lg flex-shrink-0"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium leading-tight">{m.emoji} {m.name}</p>
              <p className="text-slate-600 text-[11px] mt-0.5">
                {new Date(m.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <span className="text-sm font-bold text-[#FFD166]">+{m.stars ?? (m as any).points ?? 0} ✦</span>
              {m.status === 'pending'
                ? <span className="text-[10px] text-amber-400 flex items-center gap-0.5"><Clock size={9} /> Pending</span>
                : <span className="text-[10px] text-[#34d399]">Verified</span>
              }
            </div>
          </div>
        ))}
      </div>

      {all.length > 0 && (
        <Link
          href="/nfts"
          className="flex items-center justify-center gap-1 mt-3 text-[11px] text-slate-600 hover:text-[#38F0FF] transition-colors"
        >
          View all observations →
        </Link>
      )}
    </div>
  );
}
