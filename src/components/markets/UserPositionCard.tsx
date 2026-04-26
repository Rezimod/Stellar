'use client';

import type { Position } from '@/lib/markets';

interface UserPositionCardProps {
  positions: Position[];
}

function fmtInt(n: number): string {
  return n.toLocaleString('en-US');
}

export default function UserPositionCard({ positions }: UserPositionCardProps) {
  if (positions.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h3
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.45)',
          margin: 0,
        }}
      >
        Your positions
      </h3>
      <div className="flex flex-col gap-1.5">
        {positions.map((p) => {
          const isYes = p.side === 'yes';
          return (
            <div
              key={`${p.marketId}-${p.side}`}
              className="rounded-lg flex items-center justify-between"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${
                  isYes ? 'rgba(52,211,153,0.25)' : 'rgba(244,114,182,0.25)'
                }`,
                padding: '10px 12px',
              }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    color: isYes ? 'var(--success)' : '#F472B6',
                    background: isYes
                      ? 'rgba(52,211,153,0.10)'
                      : 'rgba(244,114,182,0.10)',
                    borderRadius: 4,
                    padding: '2.5px 6px',
                  }}
                >
                  {p.side.toUpperCase()}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    color: '#F2F0EA',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {fmtInt(p.amount)} ✦
                </span>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.55)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {p.claimed
                  ? 'Claimed'
                  : p.projectedPayout > 0
                  ? `Projected ${fmtInt(p.projectedPayout)} ✦`
                  : '—'}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
