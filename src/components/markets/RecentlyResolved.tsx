'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { Market } from '@/lib/markets';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function RecentlyResolved({ markets }: { markets: Market[] }) {
  const resolved = useMemo(() => {
    const now = Date.now();
    return markets
      .filter((m) => m.status === 'resolved' || m.status === 'cancelled')
      .filter((m) => now - m.metadata.resolutionTime.getTime() <= SEVEN_DAYS_MS)
      .sort(
        (a, b) =>
          b.metadata.resolutionTime.getTime() - a.metadata.resolutionTime.getTime(),
      )
      .slice(0, 3);
  }, [markets]);

  if (resolved.length === 0) return null;

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text)',
            margin: 0,
            letterSpacing: '-0.005em',
          }}
        >
          Recently Resolved
        </h2>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.14em',
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
          }}
        >
          last 7 days
        </span>
      </header>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {resolved.map((m) => {
          const isYes = m.onChain.outcome === 'yes';
          const isNo = m.onChain.outcome === 'no';
          const cancelled = m.status === 'cancelled';
          const badgeLabel = cancelled ? '⟳ Cancelled' : isYes ? '✓ YES' : '✗ NO';
          const badgeColor = cancelled
            ? 'var(--text-muted)'
            : isYes
              ? 'var(--success)'
              : 'var(--negative)';
          const badgeBg = cancelled
            ? 'rgba(148,163,184,0.10)'
            : isYes
              ? 'rgba(94, 234, 212,0.10)'
              : 'rgba(251, 113, 133, 0.10)';
          const badgeBorder = cancelled
            ? 'rgba(148,163,184,0.3)'
            : isYes
              ? 'rgba(94, 234, 212,0.3)'
              : 'rgba(251, 113, 133, 0.3)';

          return (
            <Link
              key={m.onChain.marketId}
              href={`/markets/${m.onChain.marketId}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                textDecoration: 'none',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: badgeColor,
                  background: badgeBg,
                  border: `1px solid ${badgeBorder}`,
                  borderRadius: 4,
                  padding: '2.5px 7px',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                {badgeLabel}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 13,
                  color: 'var(--text)',
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {m.metadata.title}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.5)',
                  letterSpacing: '0.04em',
                }}
              >
                {m.metadata.resolutionSource.split('(')[0].trim().slice(0, 40)}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.45)',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.04em',
                }}
              >
                {m.metadata.resolutionTime.toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
