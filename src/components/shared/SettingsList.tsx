'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';

export function Section({ id, title, action, children }: {
  id?: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  return (
    <div id={id} style={{ marginBottom: 22, scrollMarginTop: 88 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 4px 10px' }}>
        <p style={{
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          margin: 0,
        }}>
          {title}
        </p>
        {action}
      </div>
      <div style={{
        borderRadius: 16,
        overflow: 'hidden',
        background: isLight
          ? '#FFFFFF'
          : 'radial-gradient(ellipse 60% 100% at 0% 0%, rgba(167,139,250,0.06) 0%, transparent 60%), ' +
            'linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.015) 100%)',
        border: isLight
          ? '1px solid rgba(15,23,42,0.10)'
          : '1px solid rgba(255,255,255,0.10)',
        boxShadow: isLight
          ? '0 1px 4px rgba(15,23,42,0.06), 0 10px 24px -18px rgba(15,23,42,0.18)'
          : 'inset 0 1px 0 rgba(255,255,255,0.06), 0 10px 28px -18px rgba(0,0,0,0.55)',
        backdropFilter: isLight ? 'none' : 'blur(8px)',
        WebkitBackdropFilter: isLight ? 'none' : 'blur(8px)',
      }}>
        {children}
      </div>
    </div>
  );
}

export function Row({
  icon, iconBg, iconColor, label, sublabel, right, onClick, href, danger, last, disabled,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  sublabel?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  last?: boolean;
  disabled?: boolean;
}) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const dividerColor = isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.06)';
  const hoverBg = isLight ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.03)';

  const inner = (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px',
        borderBottom: last ? 'none' : `1px solid ${dividerColor}`,
        cursor: !disabled && (onClick || href) ? 'pointer' : 'default',
        background: 'transparent',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!disabled && (onClick || href)) (e.currentTarget as HTMLElement).style.background = hoverBg; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: iconBg,
        border: `1px solid ${iconColor}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
      }}>
        <span style={{ color: iconColor }}>{icon}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          color: danger ? 'var(--error)' : 'var(--text-primary)',
          fontFamily: 'var(--font-display)',
          fontSize: 14, fontWeight: 500, margin: 0,
          letterSpacing: '-0.005em',
        }}>{label}</p>
        {sublabel && <p style={{
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11, margin: '2px 0 0',
        }}>{sublabel}</p>}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
      {(onClick || href) && !right && !disabled && <ChevronRight size={15} color="var(--text-muted)" />}
    </div>
  );

  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link> : inner;
}

export function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const offBg = isLight ? 'rgba(15,23,42,0.18)' : 'var(--border-default)';
  return (
    <button
      onClick={disabled ? undefined : onToggle}
      disabled={disabled}
      style={{
        width: 46, height: 26, borderRadius: 13, padding: 2,
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: 'none',
        background: on ? 'var(--accent)' : offBg,
        opacity: disabled ? 0.4 : 1,
        transition: 'background 0.2s',
        display: 'flex', alignItems: 'center',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 22, height: 22, borderRadius: '50%',
        background: '#FFFFFF',
        transform: on ? 'translateX(20px)' : 'translateX(0)',
        transition: 'transform 0.2s',
        boxShadow: isLight
          ? '0 1px 3px rgba(15,23,42,0.25)'
          : '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  );
}
