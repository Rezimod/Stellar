'use client';

import React from 'react';

// ---- Card ----------------------------------------------------------------

type CardVariant = 'default' | 'glass' | 'interactive' | 'reward' | 'mission';
type CardGlow    = 'none' | 'teal' | 'gold' | 'green' | 'accent' | 'stars' | false;
type CardAs      = 'div' | 'button' | 'a';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  hover?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  glow?: CardGlow;
  as?: CardAs;
  href?: string;
  className?: string;
}

const paddingMap = { none: 0, sm: 12, md: 16, lg: 24 };

const variantStyles: Record<CardVariant, React.CSSProperties> = {
  default: {
    background: 'var(--bg-card)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-card), inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  glass: {
    background: 'var(--glass-bg, rgba(15,29,50,0.65))',
    backdropFilter: 'blur(var(--glass-blur, 16px))',
    WebkitBackdropFilter: 'blur(var(--glass-blur, 16px))',
    border: '1px solid var(--glass-border, rgba(255,255,255,0.06))',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-card), inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  interactive: {
    background: 'var(--bg-card)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-card), inset 0 1px 0 rgba(255,255,255,0.04)',
    cursor: 'pointer',
    transition: 'transform 200ms ease-out, box-shadow 200ms ease-out, border-color 200ms ease-out, background 200ms ease-out',
  },
  reward: {
    background: 'var(--bg-card)',
    border: '1px solid rgba(255,209,102,0.2)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-glow-gold, 0 0 20px rgba(255,209,102,0.15)), inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  mission: {
    background: 'var(--bg-card)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderLeft: '3px solid var(--color-nebula-teal, #38F0FF)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-card), inset 0 1px 0 rgba(255,255,255,0.04)',
  },
};

const glowMap: Record<string, string> = {
  teal:   '0 0 20px rgba(56,240,255,0.15)',
  gold:   '0 0 20px rgba(255,209,102,0.15)',
  green:  '0 0 20px rgba(52,211,153,0.15)',
  accent: 'var(--shadow-glow-accent)',
  stars:  'var(--shadow-glow-stars)',
};

export function Card({
  children,
  variant = 'default',
  hover = true,
  onClick,
  padding = 'md',
  glow = false,
  as: Tag = 'div',
  href,
  className = '',
}: CardProps) {
  const baseStyle = variantStyles[variant];
  const glowStyle = glow && glow !== 'none' && glowMap[glow]
    ? { boxShadow: `${glowMap[glow]}, ${baseStyle.boxShadow || 'none'}` }
    : {};

  const isInteractive = variant === 'interactive' || !!onClick;

  const props: React.HTMLAttributes<HTMLElement> & { href?: string } = {
    className,
    onClick,
    style: {
      ...baseStyle,
      ...glowStyle,
      padding: paddingMap[padding],
    },
    onMouseEnter: isInteractive && hover
      ? (e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = 'scale(1.02)';
          el.style.boxShadow = 'var(--shadow-card-hover), inset 0 1px 0 rgba(255,255,255,0.04)';
          el.style.borderColor = 'rgba(56,240,255,0.1)';
          el.style.background = 'var(--bg-card-hover)';
        }
      : undefined,
    onMouseLeave: isInteractive && hover
      ? (e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = '';
          el.style.boxShadow = '';
          el.style.borderColor = '';
          el.style.background = '';
        }
      : undefined,
  };

  if (Tag === 'a' && href) props.href = href;

  return React.createElement(Tag, props, children);
}

// ---- CardBadge -----------------------------------------------------------

type BadgeVariant = 'default' | 'accent' | 'stars' | 'success' | 'warning' | 'error';

const badgeVariantClass: Record<BadgeVariant, string> = {
  default: 'badge-muted',
  accent: 'badge-accent',
  stars: 'badge-stars',
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
};

interface CardBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

export function CardBadge({ children, variant = 'default' }: CardBadgeProps) {
  return <span className={`badge-pill ${badgeVariantClass[variant]}`}>{children}</span>;
}

// ---- CardStat ------------------------------------------------------------

interface CardStatProps {
  label: string;
  value: string | number;
  suffix?: string;
  mono?: boolean;
}

export function CardStat({ label, value, suffix, mono = true }: CardStatProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-secondary)',
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
        <span
          style={{
            fontFamily: mono ? 'var(--font-mono)' : 'var(--font-display)',
            fontWeight: 700,
            fontSize: mono ? 18 : 20,
            color: 'var(--text-primary)',
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        {suffix && (
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'var(--text-secondary)',
              marginLeft: 2,
            }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// ---- CardImage -----------------------------------------------------------

type AspectRatio = 'square' | 'video' | 'wide';

const aspectMap: Record<AspectRatio, string> = {
  square: '1 / 1',
  video: '16 / 9',
  wide: '16 / 9',
};

interface CardImageProps {
  src?: string;
  alt?: string;
  fallbackIcon?: React.ReactNode;
  aspectRatio?: AspectRatio;
  overlay?: React.ReactNode;
  className?: string;
}

export function CardImage({
  src,
  alt = '',
  fallbackIcon,
  aspectRatio = 'square',
  overlay,
  className = '',
}: CardImageProps) {
  return (
    <div
      className={className}
      style={{
        aspectRatio: aspectMap[aspectRatio],
        overflow: 'hidden',
        borderRadius: '12px 12px 0 0',
        position: 'relative',
        background: 'var(--bg-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
      ) : (
        <span style={{ opacity: 0.2, fontSize: 36 }}>{fallbackIcon}</span>
      )}
      {overlay && (
        <div style={{ position: 'absolute', inset: 0 }}>{overlay}</div>
      )}
    </div>
  );
}
