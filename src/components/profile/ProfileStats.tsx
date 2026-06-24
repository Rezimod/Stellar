'use client';

import { Skeleton } from '@/components/ui/Skeleton';
import type { ProfileTokens } from './profileTheme';

interface Props {
  tokens: ProfileTokens;
  loaded: boolean;
  balance: number;
  earned: number;
  burned: number;
  labels: { total: string; earned: string; burned: string };
}

export function ProfileStats({ tokens, loaded, balance, earned, burned, labels }: Props) {
  const { kicker, divider } = tokens;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: 0,
        flexWrap: 'wrap',
      }}
    >
      {/* TOTAL STARS — primary */}
      <div style={{ minWidth: 150, paddingRight: 28 }}>
        <p style={{ ...kicker, marginBottom: 12 }}>{labels.total}</p>
        {loaded ? (
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 38,
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
              margin: 0,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ color: 'var(--stars)', fontSize: 24 }}>✦</span>
            {balance.toLocaleString()}
          </p>
        ) : (
          <Skeleton className="w-28 h-9" />
        )}
      </div>

      {/* EARNED / BURNED */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: 24,
          paddingLeft: 28,
          borderLeft: `1px solid ${divider}`,
        }}
      >
        {[
          { label: labels.earned, value: earned },
          { label: labels.burned, value: burned },
        ].map((s) => (
          <div key={s.label} style={{ minWidth: 64 }}>
            <p style={{ ...kicker, marginBottom: 12 }}>{s.label}</p>
            {loaded ? (
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 24,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  fontVariantNumeric: 'tabular-nums',
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                {s.value.toLocaleString()}
              </p>
            ) : (
              <Skeleton className="w-12 h-6" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
