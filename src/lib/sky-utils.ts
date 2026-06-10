// src/lib/sky-utils.ts
// Shared utilities for the Sky page — coordinate conversions, equipment classification, time helpers.

/**
 * Convert horizontal coordinates (altitude/azimuth) to SVG x,y for the half-dome compass.
 *
 * Compass viewBox is 600x320 with the horizon line at y=280. The dome spans azimuth 90° (E)
 * on the right to 270° (W) on the left, with south (180°) at the center. Objects in the
 * north half of sky are not shown — they would require a separate north-facing dome.
 *
 * @param altitudeDeg  0–90, degrees above horizon
 * @param azimuthDeg   0–360, degrees clockwise from north
 * @returns { x, y, visible } — visible=false if object is below horizon or in the north half
 */
export function altAzToCompassSVG(
  altitudeDeg: number,
  azimuthDeg: number
): { x: number; y: number; visible: boolean } {
  if (altitudeDeg < 0) return { x: 0, y: 0, visible: false };

  // Normalize azimuth to 0–360
  const az = ((azimuthDeg % 360) + 360) % 360;

  // We render the southern half-dome: az from 90° (E, right) through 180° (S, center) to 270° (W, left).
  // Objects in the north half (az < 90 or az > 270) are not visible in this view.
  if (az < 90 || az > 270) return { x: 0, y: 0, visible: false };

  // Map azimuth 90→270 to x 570→30 (right to left along the horizon)
  // Distance from south (180°) on a -1..1 scale where -1 = E, 0 = S, +1 = W
  const azFromSouth = (180 - az) / 90; // E=+1, S=0, W=-1 — but we want E=right, W=left
  // Center x = 300, half-width = 270 (so x ranges 30–570)
  const horizonX = 300 - azFromSouth * 270;

  // Altitude maps to height above horizon. The dome top (alt=90°) is at y=10, horizon at y=280.
  // We use a slight curve so objects near zenith aren't crammed at the top.
  const altFraction = altitudeDeg / 90;
  const horizonY = 280;
  const zenithY = 10;
  // Apply gentle non-linear curve — objects at high altitude get more vertical space
  const eased = Math.sin((altFraction * Math.PI) / 2);
  const y = horizonY - (horizonY - zenithY) * eased;

  // Slight horizontal compression near zenith (perspective)
  const compressionFactor = 1 - eased * 0.15;
  const x = 300 + (horizonX - 300) * compressionFactor;

  return { x, y, visible: true };
}

/**
 * Convert azimuth to an arrow character pointing in that direction.
 */
export function azimuthToArrow(az: number): string {
  const normalized = ((az % 360) + 360) % 360;
  // 0=N, 45=NE, 90=E, 135=SE, 180=S, 225=SW, 270=W, 315=NW
  const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
  const idx = Math.round(normalized / 45) % 8;
  return arrows[idx];
}

/**
 * Equipment recommendation based on apparent magnitude.
 * Lower magnitude = brighter object.
 */
export type Equipment = 'eye' | 'binoc' | 'scope';

export function equipmentForMagnitude(mag: number): Equipment {
  if (mag < 4) return 'eye';
  if (mag < 8) return 'binoc';
  return 'scope';
}

export function equipmentLabel(e: Equipment): string {
  return e === 'eye' ? 'Naked eye' : e === 'binoc' ? 'Binocular' : 'Telescope';
}

/**
 * Visibility classification per timeline cell.
 * - peak: alt > 50° (best transit window)
 * - good: alt 25–50°
 * - ok: alt 5–25°
 * - below: alt <= 5° (effectively unobservable due to atmosphere/horizon obstruction)
 */
export type VisibilityLevel = 'peak' | 'good' | 'ok' | 'below';

export function altitudeToVisibility(alt: number): VisibilityLevel {
  if (alt > 50) return 'peak';
  if (alt > 25) return 'good';
  if (alt > 5) return 'ok';
  return 'below';
}

/**
 * Format a Date as HH:mm in the user's local timezone.
 */
export function formatLocalTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * Build the 12 hourly slots for the timeline, starting at the next whole hour
 * after sunset (or now, if already past sunset).
 */
export function buildTimelineHours(start: Date, count = 12): Date[] {
  const hours: Date[] = [];
  // Snap to the next whole hour
  const snapped = new Date(start);
  snapped.setMinutes(0, 0, 0);
  if (start.getMinutes() > 0 || start.getSeconds() > 0) {
    snapped.setHours(snapped.getHours() + 1);
  }
  for (let i = 0; i < count; i++) {
    const h = new Date(snapped);
    h.setHours(snapped.getHours() + i);
    hours.push(h);
  }
  return hours;
}

/**
 * Compute the NOW line position as a fraction (0..1) across the timeline grid.
 * Returns null if "now" falls outside the timeline window.
 */
export function nowLineFraction(now: Date, timelineHours: Date[]): number | null {
  if (timelineHours.length < 2) return null;
  const start = timelineHours[0].getTime();
  const end = timelineHours[timelineHours.length - 1].getTime() + 60 * 60 * 1000;
  const t = now.getTime();
  if (t < start || t > end) return null;
  return (t - start) / (end - start);
}
