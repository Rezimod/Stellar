'use client';

import { useId } from 'react';

interface MoonGlyphProps {
  /** Phase 0..1 — 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter. */
  phase: number;
  size?: number;
}

/**
 * Tiny inline moon-phase glyph. Bright side in brass, dark side in faint white.
 * Implementation: a brass disc + a dark disc clipped to the moon, offset
 * horizontally by phase amount. Same idea as the larger PlanetIcon moon, but
 * small and self-contained (own clipPath id per instance).
 */
export function MoonGlyph({ phase, size = 24 }: MoonGlyphProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const clipId = `moon-clip-${uid}`;
  const r = size / 2;
  const p = ((phase % 1) + 1) % 1;

  let body: React.ReactElement;
  if (p < 0.03 || p > 0.97) {
    body = <circle cx={r} cy={r} r={r} fill="rgba(255,255,255,0.10)" />;
  } else if (p > 0.47 && p < 0.53) {
    body = <circle cx={r} cy={r} r={r} fill="var(--terracotta, #FFB347)" />;
  } else {
    const waxing = p < 0.5;
    // 0 at new/full edge, 1 fully illuminated/dark
    const k = waxing ? p / 0.5 : (1 - p) / 0.5;
    const offset = k * size;
    body = (
      <g clipPath={`url(#${clipId})`}>
        <circle cx={r} cy={r} r={r} fill="var(--terracotta, #FFB347)" />
        <circle
          cx={waxing ? r - offset : r + offset}
          cy={r}
          r={r}
          fill="rgba(255,255,255,0.10)"
        />
      </g>
    );
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <circle cx={r} cy={r} r={r} />
        </clipPath>
      </defs>
      {/* Faint outer rim so the glyph reads even at full moon on dark bg */}
      <circle cx={r} cy={r} r={r} fill="rgba(255,255,255,0.04)" />
      {body}
      <circle
        cx={r}
        cy={r}
        r={r - 0.5}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={0.75}
      />
    </svg>
  );
}
