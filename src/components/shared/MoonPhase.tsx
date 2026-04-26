import React, { useId } from 'react';
import type { StreakTier } from '@/lib/constellation-streak';

interface Props {
  phase: StreakTier['phase'];
  size?: number;
  glow?: boolean;
}

// Renders a crescent/half/gibbous/full moon as pure SVG.
// The "illuminated" portion is filled with the tier gradient; the shadow is transparent.
export default function MoonPhase({ phase, size = 18, glow = false }: Props) {
  const uid = useId();
  const colorByPhase: Record<StreakTier['phase'], string> = {
    new:      '#64748B',
    crescent: '#94a3b8',
    half:     'var(--stars)',
    gibbous:  'var(--stars)',
    full:     'var(--stars)',
  };
  const fill = colorByPhase[phase];
  const filter = glow ? `drop-shadow(0 0 4px ${fill}66)` : 'none';

  // Use a circle + overlapping darker circle to carve the shadow side
  const shadowOffset: Record<StreakTier['phase'], number> = {
    new:      0,
    crescent: 11,
    half:     8,
    gibbous:  4,
    full:     0,
  };
  const offset = shadowOffset[phase];

  return (
    <svg width={size} height={size} viewBox="0 0 20 20" style={{ filter, flexShrink: 0 }}>
      <defs>
        <clipPath id={`moon-clip-${uid}`}>
          <circle cx="10" cy="10" r="9" />
        </clipPath>
      </defs>
      {phase === 'new' ? (
        <circle cx="10" cy="10" r="9" fill="none" stroke={fill} strokeWidth="1.2" strokeDasharray="2 2" opacity="0.6" />
      ) : phase === 'full' ? (
        <circle cx="10" cy="10" r="9" fill={fill} />
      ) : (
        <g clipPath={`url(#moon-clip-${uid})`}>
          <circle cx="10" cy="10" r="9" fill={fill} />
          <circle cx={10 + offset} cy="10" r="9" fill="#0a0a0a" />
        </g>
      )}
    </svg>
  );
}
