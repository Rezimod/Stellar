'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAppState } from '@/hooks/useAppState';
import { Clock, ChevronDown, ExternalLink } from 'lucide-react';

export default function ObservationLog() {
  const { state } = useAppState();
  const [collapsed, setCollapsed] = useState(true);

  const all = [...state.completedMissions].reverse();
  const recent = all.slice(0, 5);

  if (recent.length === 0) return null;

  return (
    <div>
      <button
        className="flex items-center justify-between w-full mb-3"
        onClick={() => setCollapsed(c => !c)}
      >
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
          Recent Observations
        </span>
        <ChevronDown
          size={14}
          style={{
            color: 'rgba(255,255,255,0.25)',
            transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
            transition: 'transform 200ms ease-out',
          }}
        />
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-1.5 animate-fade-in-up">
          {recent.map(m => {
            const isOnChain = m.txId && !m.txId.startsWith('sim');
            return (
              <div
                key={m.txId + m.timestamp}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                style={{
                  background: 'rgba(15,31,61,0.35)',
                  border: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                {m.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.photo}
                    alt={m.name}
                    className="w-12 h-9 object-cover rounded-lg flex-shrink-0"
                    style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                  />
                ) : (
                  <div
                    className="w-12 h-9 rounded-lg flex-shrink-0 flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontSize: 18 }}
                  >
                    {m.emoji}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p style={{ color: 'var(--color-text-primary)', fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.3 }}>
                    {m.name}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6875rem', marginTop: 2 }}>
                    {new Date(m.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <span style={{ color: 'var(--color-star-gold, #FFD166)', fontSize: '0.8125rem', fontWeight: 700 }}>
                    +{m.stars ?? (m as any).points ?? 0} ✦
                  </span>
                  {m.status === 'pending' ? (
                    <span style={{ color: '#F59E0B', fontSize: '0.6875rem', display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Clock size={9} /> Pending
                    </span>
                  ) : isOnChain ? (
                    <a
                      href={`https://explorer.solana.com/tx/${m.txId}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--color-aurora-green, #34D399)', fontSize: '0.6875rem', display: 'flex', alignItems: 'center', gap: 2 }}
                    >
                      On-chain <ExternalLink size={9} />
                    </a>
                  ) : (
                    <span style={{ color: 'var(--color-aurora-green, #34D399)', fontSize: '0.6875rem' }}>Verified</span>
                  )}
                </div>
              </div>
            );
          })}

          <Link
            href="/observations"
            className="flex items-center justify-center gap-1 mt-1 py-2.5 rounded-xl text-xs transition-colors hover:text-[#38F0FF]"
            style={{ color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
          >
            View all observations →
          </Link>
        </div>
      )}
    </div>
  );
}
