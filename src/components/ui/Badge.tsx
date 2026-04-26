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
    background: 'rgba(99,102,241,0.1)',
    color: '#818cf8',
    border: '1px solid rgba(99,102,241,0.2)',
  },
  gold: {
    background: 'rgba(255,209,102,0.1)',
    color: 'var(--stars)',
    border: '1px solid rgba(255,209,102,0.2)',
  },
  green: {
    background: 'rgba(52,211,153,0.1)',
    color: 'var(--success)',
    border: '1px solid rgba(52,211,153,0.2)',
  },
  amber: {
    background: 'rgba(245,158,11,0.1)',
    color: '#F59E0B',
    border: '1px solid rgba(245,158,11,0.2)',
  },
  red: {
    background: 'rgba(239,68,68,0.1)',
    color: '#EF4444',
    border: '1px solid rgba(239,68,68,0.2)',
  },
  oracle: {
    background: 'rgba(129,140,248,0.1)',
    color: '#818CF8',
    border: '1px solid rgba(129,140,248,0.2)',
  },
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'rgba(255,255,255,0.4)',
  teal:    '#818cf8',
  gold:    'var(--stars)',
  green:   'var(--success)',
  amber:   '#F59E0B',
  red:     '#EF4444',
  oracle:  '#818CF8',
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
