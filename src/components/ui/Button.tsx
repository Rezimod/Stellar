'use client';

import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'reward';
type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { height: 32, padding: '0 12px', fontSize: 'var(--text-xs, 0.6875rem)' },
  md: { height: 40, padding: '0 16px', fontSize: 'var(--text-sm, 0.8125rem)' },
  lg: { height: 48, padding: '0 24px', fontSize: 'var(--text-base, 0.9375rem)' },
};

const variantBase: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, #818cf8 0%, #0EA5E9 100%)',
    color: '#050A12',
    border: 'none',
    fontWeight: 600,
  },
  secondary: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.9)',
    fontWeight: 500,
  },
  ghost: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.55)',
    fontWeight: 500,
  },
  danger: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.2)',
    color: '#EF4444',
    fontWeight: 500,
  },
  reward: {
    background: 'linear-gradient(135deg, #FFD166 0%, #F59E0B 100%)',
    color: '#050A12',
    border: 'none',
    fontWeight: 600,
  },
};

const variantHover: Record<ButtonVariant, React.CSSProperties> = {
  primary:   { filter: 'brightness(1.1)', boxShadow: '0 0 16px rgba(99,102,241,0.3)' },
  secondary: { borderColor: 'rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.04)', color: '#fff' },
  ghost:     { color: 'rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.04)' },
  danger:    { background: 'rgba(239,68,68,0.2)' },
  reward:    { filter: 'brightness(1.08)', boxShadow: '0 0 16px rgba(255,209,102,0.3)' },
};

const Spinner = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: 'spin-slow 0.8s linear infinite' }}>
    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20" strokeDashoffset="10" />
  </svg>
);

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  fullWidth = false,
  children,
  disabled,
  style,
  className = '',
  onMouseEnter,
  onMouseLeave,
  ...rest
}: ButtonProps) {
  const [hovered, setHovered] = React.useState(false);

  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 'var(--radius-md, 12px)',
    fontFamily: 'var(--font-display)',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.38 : 1,
    transition: 'filter 120ms ease-out, box-shadow 120ms ease-out, background 120ms ease-out, border-color 120ms ease-out, color 120ms ease-out, transform 120ms ease-out',
    width: fullWidth ? '100%' : undefined,
    whiteSpace: 'nowrap',
    ...sizeStyles[size],
    ...variantBase[variant],
    ...(hovered && !disabled && !loading ? variantHover[variant] : {}),
    ...style,
  };

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`btn-press ${className}`}
      style={base}
      onMouseEnter={(e) => { setHovered(true); onMouseEnter?.(e); }}
      onMouseLeave={(e) => { setHovered(false); onMouseLeave?.(e); }}
    >
      {loading ? (
        <Spinner />
      ) : (
        <>
          {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
          {children}
          {iconRight && <span style={{ display: 'flex', alignItems: 'center' }}>{iconRight}</span>}
        </>
      )}
    </button>
  );
}
