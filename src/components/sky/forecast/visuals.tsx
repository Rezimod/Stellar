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
  shadowColor = 'rgba(255, 255, 255, 0.06)',
  rim = 'rgba(255, 255, 255, 0.22)',
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
 * sunrise (~04:00). Brighter cell = clearer sky.
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
          background: 'rgba(255,255,255,0.05)',
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
        const clarity = Math.max(0, Math.min(100, 100 - h.cloudCover)) / 100;
        // Tinted near-black at fully cloudy → near-white at clear.
        // Mix two colors so the strip reads as "stars peeking through" rather
        // than a generic data bar.
        const opacity = 0.12 + clarity * 0.78;
        return (
          <span
            key={`${h.hour}-${i}`}
            style={{
              background: `rgba(214, 232, 255, ${opacity})`,
              borderRadius: 2,
              display: 'block',
            }}
          />
        );
      })}
    </div>
  );
}
