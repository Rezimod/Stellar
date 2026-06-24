import type { CSSProperties } from 'react';

// Scoped visual tokens for the redesigned profile dashboard. Reads the global
// color tokens (globals.css is the source of truth) and adds the glassmorphism
// + soft blue/purple cosmic glow that is specific to this page.
export function profileTokens(isLight: boolean) {
  const hairline = isLight ? 'rgba(15,23,42,0.10)' : 'rgba(255,255,255,0.09)';
  const divider = isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.06)';

  const card: CSSProperties = {
    background: isLight
      ? '#FFFFFF'
      : 'linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.018))',
    border: `1px solid ${hairline}`,
    borderRadius: 22,
    backdropFilter: isLight ? undefined : 'blur(14px)',
    WebkitBackdropFilter: isLight ? undefined : 'blur(14px)',
  };

  const kicker: CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.16em',
    color: 'var(--text-muted)',
    margin: 0,
  };

  const iconButton: CSSProperties = {
    width: 38,
    height: 38,
    borderRadius: '50%',
    background: isLight ? 'rgba(15,23,42,0.05)' : 'rgba(255,255,255,0.06)',
    border: `1px solid ${hairline}`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--text-primary)',
  };

  return { hairline, divider, card, kicker, iconButton, isLight };
}

export type ProfileTokens = ReturnType<typeof profileTokens>;
