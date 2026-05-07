'use client';

import React from 'react';

type SkyCondition = 'go' | 'maybe' | 'skip';

interface SkyBadgeProps {
  condition: SkyCondition;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

const config: Record<SkyCondition, { color: string; bg: string; border: string; defaultLabel: string }> = {
  go: {
    color: 'var(--success)',
    bg: 'rgba(94, 234, 212,0.1)',
    border: 'rgba(94, 234, 212,0.25)',
    defaultLabel: 'Clear Sky',
  },
  maybe: {
    color: 'var(--terracotta)',
    bg: 'rgba(255, 179, 71,0.1)',
    border: 'rgba(255, 179, 71,0.25)',
    defaultLabel: 'Partly Cloudy',
  },
  skip: {
    color: 'var(--negative)',
    bg: 'rgba(251, 113, 133,0.1)',
    border: 'rgba(251, 113, 133,0.25)',
    defaultLabel: 'Overcast',
  },
};

export function SkyBadge({ condition, label, size = 'md', className = '' }: SkyBadgeProps) {
  const c = config[condition];
  const isGo = condition === 'go';

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size === 'sm' ? 5 : 6,
        padding: size === 'sm' ? '3px 10px' : '4px 12px',
        borderRadius: 9999,
        background: c.bg,
        border: `1px solid ${c.border}`,
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: size === 'sm' ? '0.6875rem' : '0.75rem',
        color: c.color,
        lineHeight: 1,
      }}
    >
      <span
        style={{
          width: size === 'sm' ? 5 : 6,
          height: size === 'sm' ? 5 : 6,
          borderRadius: '50%',
          background: c.color,
          flexShrink: 0,
          animation: isGo ? 'breathe 2s ease-in-out infinite' : undefined,
          boxShadow: isGo ? `0 0 6px ${c.color}` : undefined,
        }}
      />
      {label ?? c.defaultLabel}
    </span>
  );
}
