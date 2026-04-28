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
          color: 'var(--stl-text3)',
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
                background: 'var(--stl-bg2)',
                border: `1px solid ${isYes ? 'var(--stl-green)' : 'var(--stl-red)'}`,
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
                    color: isYes ? 'var(--stl-green)' : 'var(--stl-red)',
                    background: isYes ? 'var(--stl-green-bg)' : 'var(--stl-red-bg)',
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
                    color: 'var(--stl-text1)',
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
                  color: 'var(--stl-text2)',
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
