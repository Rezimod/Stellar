'use client';

import React from 'react';

type PageHeaderProps = {
  label?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export function PageHeader({ label, title, subtitle, action }: PageHeaderProps) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 24,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {label && (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--teal-text)',
              marginBottom: 8,
            }}
          >
            {label}
          </div>
        )}
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(24px, 4vw, 30px)',
            fontWeight: 700,
            letterSpacing: '-0.025em',
            lineHeight: 1.18,
            color: 'var(--text-primary)',
            margin: 0,
            maxWidth: 520,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 400,
              color: 'var(--text-secondary)',
              lineHeight: 1.55,
              maxWidth: 420,
              margin: '8px 0 0',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </header>
  );
}
