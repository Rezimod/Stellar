'use client';

import type { ProfileTokens } from './profileTheme';

interface Milestone {
  name: string;
  reached: boolean;
  current: boolean;
}

interface Props {
  tokens: ProfileTokens;
  kicker: string;
  countLabel: string;
  milestones: Milestone[];
  nextLabel: string;
  hint: string;
}

export function ProgressCard({ tokens, kicker, countLabel, milestones, nextLabel, hint }: Props) {
  const { card, isLight } = tokens;
  const trackBg = isLight ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.12)';

  return (
    <div className="pf-card" style={{ ...card, padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 24 }}>
        <p style={tokens.kicker}>{kicker}</p>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
          {countLabel}
        </span>
      </div>

      {/* milestone track */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        {/* connecting line */}
        <div style={{ position: 'absolute', left: 7, right: 7, top: '50%', height: 2, transform: 'translateY(-50%)', background: trackBg, borderRadius: 999 }} />
        {milestones.map((m, i) => {
          const filled = m.reached;
          const dot = m.current
            ? { bg: 'var(--accent-purple)', ring: '0 0 0 5px rgba(139,92,246,0.22)', size: 16 }
            : filled
              ? { bg: 'var(--accent-purple)', ring: 'none', size: 14 }
              : { bg: isLight ? '#FFFFFF' : 'var(--canvas)', ring: 'none', size: 14 };
          return (
            <span
              key={i}
              title={m.name}
              style={{
                position: 'relative',
                width: dot.size,
                height: dot.size,
                borderRadius: '50%',
                background: dot.bg,
                border: filled || m.current ? 'none' : `2px solid ${trackBg}`,
                boxShadow: dot.ring,
                flexShrink: 0,
              }}
            />
          );
        })}
      </div>

      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--text-primary)',
          margin: '0 0 4px',
        }}
      >
        {nextLabel}
      </p>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
        {hint}
      </p>
    </div>
  );
}
