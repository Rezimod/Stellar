'use client';

import { Flame, Snowflake } from 'lucide-react';

interface StreakBadgeProps {
  days: number;
  frozen?: boolean;
  className?: string;
}

export default function StreakBadge({ days, frozen = false, className = '' }: StreakBadgeProps) {
  const hasStreak = days > 0;

  return (
    <span
      className={`${hasStreak && days >= 7 ? 'animate-glow-pulse' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 'var(--radius-full)',
        background: hasStreak ? 'var(--stars-dim)' : 'transparent',
        border: hasStreak ? '1px solid var(--stars-border)' : '1px solid var(--border-subtle)',
      }}
    >
      {frozen && <Snowflake size={14} style={{ color: 'var(--teal-text)' }} aria-hidden="true" />}
      {!frozen && hasStreak && <Flame size={14} style={{ color: 'var(--accent-text)' }} aria-hidden="true" />}
      {hasStreak && (
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 14,
            color: 'var(--accent-text)',
          }}
        >
          {days}
        </span>
      )}
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          color: hasStreak ? 'var(--text-secondary)' : 'var(--text-muted)',
        }}
      >
        {hasStreak
          ? days === 1 ? 'day streak' : 'days streak'
          : 'No streak'}
      </span>
    </span>
  );
}
