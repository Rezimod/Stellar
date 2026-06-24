'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight, Orbit } from 'lucide-react';
import type { ProfileTokens } from './profileTheme';

export interface SidebarItem {
  key: string;
  label: string;
  icon: ReactNode;
  count?: number;
  href?: string;
  active?: boolean;
}

interface Props {
  tokens: ProfileTokens;
  items: SidebarItem[];
  status: {
    kicker: string;
    rankName: string;
    nextRankText: string;
    progressPct: number;
    missionsText: string;
  };
}

export function ProfileSidebar({ tokens, items, status }: Props) {
  const { card, hairline, kicker, isLight } = tokens;

  const rowInner = (item: SidebarItem) => (
    <>
      <span
        aria-hidden
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: item.active ? 'var(--accent-purple)' : 'var(--text-secondary)',
          background: item.active
            ? isLight ? 'rgba(139,92,246,0.10)' : 'rgba(139,92,246,0.16)'
            : 'transparent',
        }}
      >
        {item.icon}
      </span>
      <span
        style={{
          flex: 1,
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          fontWeight: item.active ? 600 : 500,
          color: item.active ? 'var(--text-primary)' : 'var(--text-secondary)',
        }}
      >
        {item.label}
      </span>
      {typeof item.count === 'number' ? (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--text-muted)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {item.count}
        </span>
      ) : item.active ? null : (
        <ChevronRight size={14} color="var(--text-muted)" />
      )}
    </>
  );

  const rowStyle = (active?: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '11px 12px',
    borderRadius: 12,
    textDecoration: 'none',
    border: '1px solid transparent',
    background: active ? (isLight ? 'rgba(139,92,246,0.06)' : 'rgba(139,92,246,0.10)') : 'transparent',
    borderColor: active ? 'rgba(139,92,246,0.28)' : 'transparent',
    cursor: 'pointer',
  } as const);

  return (
    <div className="pf-card" style={{ ...card, padding: 14, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((item) =>
          item.href && !item.active ? (
            <Link key={item.key} href={item.href} className="profile-nav-row" style={rowStyle(false)}>
              {rowInner(item)}
            </Link>
          ) : (
            <div key={item.key} className="profile-nav-row" style={rowStyle(item.active)} aria-current={item.active ? 'page' : undefined}>
              {rowInner(item)}
            </div>
          ),
        )}
      </nav>

      {/* STARGAZER STATUS */}
      <div
        style={{
          padding: 16,
          borderRadius: 16,
          border: `1px solid ${hairline}`,
          background: isLight ? 'rgba(15,23,42,0.02)' : 'rgba(255,255,255,0.025)',
        }}
      >
        <p style={{ ...kicker, marginBottom: 12 }}>{status.kicker}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: 'radial-gradient(circle at 40% 35%, rgba(139,92,246,0.3), rgba(59,130,246,0.18) 60%, transparent)',
              border: '1px solid rgba(139,92,246,0.3)',
            }}
          >
            <Orbit size={20} color="var(--accent-purple)" />
          </span>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: '0 0 2px',
              }}
            >
              {status.rankName}
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              {status.nextRankText}
            </p>
          </div>
        </div>
        <div
          style={{
            height: 4,
            borderRadius: 999,
            overflow: 'hidden',
            background: isLight ? 'rgba(15,23,42,0.10)' : 'rgba(0,0,0,0.35)',
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: `${status.progressPct}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--accent-purple), #3B82F6)',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
          {status.missionsText}
        </p>
      </div>
    </div>
  );
}
