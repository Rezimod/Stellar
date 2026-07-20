'use client';

import type { NightHour } from '@/lib/use-sky-data';

/**
 * Small SVG moon glyph showing the lit fraction. `phase` is 0..1
 * (0=new, 0.5=full). The glyph implies waxing/waning by which limb
 * the terminator curves into.
 */
export function MoonGlyph({
  phase,
  size = 14,
  litColor = 'rgba(244, 217, 160, 0.85)',
  shadowColor = 'rgba(var(--ink), 0.06)',
  rim = 'rgba(var(--ink), 0.22)',
}: {
  phase: number;
  size?: number;
  litColor?: string;
  shadowColor?: string;
  rim?: string;
}) {
  const r = size / 2 - 0.5;
  const cx = size / 2;
  const cy = size / 2;
  const norm = ((phase % 1) + 1) % 1;
  const illum = (1 - Math.cos(norm * 2 * Math.PI)) / 2;
  const waxing = norm < 0.5;
  // Terminator ellipse semi-x. Crescent (illum < 0.5) → ellipse cuts inward;
  // gibbous (illum > 0.5) → ellipse extends outward.
  const k = (1 - 2 * illum) * r;
  // SVG arc sweep flag for the terminator. Selected so the ellipse curves
  // away from the lit limb for crescents and toward it for gibbous.
  const innerSweep = waxing ? (k > 0 ? 0 : 1) : (k > 0 ? 1 : 0);
  const outerSweep = waxing ? 1 : 0;
  const d = `M ${cx} ${cy - r} A ${r} ${r} 0 1 ${outerSweep} ${cx} ${cy + r} A ${Math.abs(k) || 0.001} ${r} 0 1 ${innerSweep} ${cx} ${cy - r} Z`;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={cx} cy={cy} r={r} fill={shadowColor} stroke={rim} strokeWidth="0.5" />
      <path d={d} fill={litColor} />
    </svg>
  );
}

/**
 * 9-cell heat strip showing cloud cover from sunset (~20:00) through
 * sunrise (~04:00). Teal = clear, amber = partly cloudy, dim = overcast.
 */
export function NightCloudStrip({
  hours,
  height = 12,
  cellGap = 1,
}: {
  hours: NightHour[];
  height?: number;
  cellGap?: number;
}) {
  if (hours.length === 0) {
    return (
      <div
        aria-hidden
        style={{
          height,
          width: '100%',
          background: 'rgba(var(--ink),0.05)',
          borderRadius: 3,
        }}
      />
    );
  }
  return (
    <div
      role="img"
      aria-label={`Hourly cloud cover from ${hours[0].hour}:00 to ${hours[hours.length - 1].hour}:00`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${hours.length}, 1fr)`,
        gap: cellGap,
        height,
        width: '100%',
      }}
    >
      {hours.map((h, i) => {
        // Same thresholds as the go/maybe/skip badge (30/70), so an hour's
        // color always agrees with the night's verdict word.
        const background =
          h.cloudCover < 30
            ? 'rgba(94, 234, 212, 0.75)'
            : h.cloudCover < 70
            ? 'rgba(255, 179, 71, 0.6)'
            : 'rgba(148, 163, 184, 0.16)';
        return (
          <span
            key={`${h.hour}-${i}`}
            style={{
              background,
              borderRadius: 2,
              display: 'block',
            }}
          />
        );
      })}
    </div>
  );
}
