'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { ProfileTokens } from './profileTheme';

interface Props {
  tokens: ProfileTokens;
  kicker: string;
  headerRight?: ReactNode;
  /** When provided, real content renders and the empty state is skipped. */
  children?: ReactNode;
  empty?: {
    icon: ReactNode;
    title: string;
    subtitle: string;
    cta?: { label: string; href?: string; onClick?: () => void };
  };
  /** Remove inner padding from the body (e.g. for edge-to-edge lists). */
  flushBody?: boolean;
}

export function EmptyStateCard({ tokens, kicker, headerRight, children, empty, flushBody }: Props) {
  const { card, hairline, isLight } = tokens;

  const ctaStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '9px 20px',
    borderRadius: 12,
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    color: 'var(--terracotta)',
    background: isLight ? 'rgba(255, 179, 71,0.06)' : 'rgba(255, 179, 71,0.10)',
    border: '1px solid rgba(255, 179, 71,0.32)',
  } as const;

  return (
    <div className="pf-card" style={{ ...card, padding: 22, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: children ? 18 : 0 }}>
        <p style={tokens.kicker}>{kicker}</p>
        {headerRight}
      </div>

      {children ? (
        <div style={flushBody ? { margin: '0 -22px -22px' } : undefined}>{children}</div>
      ) : empty ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '14px 8px 6px',
          }}
        >
          <span
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
              color: 'var(--terracotta)',
              border: `1px solid ${hairline}`,
              background: isLight ? 'rgba(255, 179, 71,0.05)' : 'rgba(255, 179, 71,0.07)',
            }}
          >
            {empty.icon}
          </span>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: '0 0 6px',
            }}
          >
            {empty.title}
          </p>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'var(--text-secondary)',
              margin: '0 0 18px',
              maxWidth: 240,
              lineHeight: 1.5,
            }}
          >
            {empty.subtitle}
          </p>
          {empty.cta &&
            (empty.cta.href ? (
              <Link href={empty.cta.href} style={ctaStyle}>
                {empty.cta.label}
              </Link>
            ) : (
              <button onClick={empty.cta.onClick} style={ctaStyle}>
                {empty.cta.label}
              </button>
            ))}
        </div>
      ) : null}
    </div>
  );
}
