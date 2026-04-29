'use client';

import React from 'react';

type BadgeVariant = 'default' | 'teal' | 'gold' | 'green' | 'amber' | 'red' | 'oracle';
type BadgeSize    = 'sm' | 'md';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.55)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  teal: {
    background: 'rgba(232, 130, 107,0.1)',
    color: 'var(--terracotta)',
    border: '1px solid rgba(232, 130, 107,0.2)',
  },
  gold: {
    background: 'rgba(232, 130, 107,0.1)',
    color: 'var(--stars)',
    border: '1px solid rgba(232, 130, 107,0.2)',
  },
  green: {
    background: 'rgba(94, 234, 212,0.1)',
    color: 'var(--success)',
    border: '1px solid rgba(94, 234, 212,0.2)',
  },
  amber: {
    background: 'rgba(232, 130, 107,0.1)',
    color: 'var(--terracotta)',
    border: '1px solid rgba(232, 130, 107,0.2)',
  },
  red: {
    background: 'rgba(251, 113, 133,0.1)',
    color: 'var(--negative)',
    border: '1px solid rgba(251, 113, 133,0.2)',
  },
  oracle: {
    background: 'rgba(232, 130, 107,0.1)',
    color: 'var(--terracotta)',
    border: '1px solid rgba(232, 130, 107,0.2)',
  },
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'rgba(255,255,255,0.4)',
  teal:    'var(--terracotta)',
  gold:    'var(--stars)',
  green:   'var(--success)',
  amber:   'var(--terracotta)',
  red:     'var(--negative)',
  oracle:  'var(--terracotta)',
};

const sizeStyles: Record<BadgeSize, React.CSSProperties> = {
  sm: { fontSize: '0.6875rem', padding: '2px 8px', gap: 4 },
  md: { fontSize: '0.75rem',   padding: '3px 10px', gap: 5 },
};

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
  pulse = false,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`${pulse ? 'animate-pulse-glow' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 9999,
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        letterSpacing: '0.01em',
        lineHeight: 1,
        ...sizeStyles[size],
        ...variantStyles[variant],
      }}
    >
      {dot && (
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: dotColors[variant],
            flexShrink: 0,
            animation: pulse ? 'breathe 2s ease-in-out infinite' : undefined,
          }}
        />
      )}
      {children}
    </span>
  );
}
