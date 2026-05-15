import type { SolarBodyId } from '@/lib/solar-system/ephemeris';

const MS_DAY = 86_400_000;
const MS_HOUR = 3_600_000;

/**
 * Sidereal rotation periods (ms). Negative = retrograde (westward).
 * Used so spin phase tracks simulation time (`epochMs`) when playback is on.
 */
const SIDEREAL_ROTATION_MS: Record<SolarBodyId, number> = {
  sun: MS_DAY * 25.38,
  mercury: MS_DAY * 58.646,
  venus: -MS_DAY * 243.018,
  earth: MS_DAY * 0.99726968,
  mars: MS_DAY * 1.02595675,
  jupiter: 9.9258 * MS_HOUR,
  saturn: 10.656 * MS_HOUR,
  uranus: -17.24 * MS_HOUR,
  neptune: 16.11 * MS_HOUR,
  pluto: MS_DAY * 6.3872304,
};

/** Phase in radians for Y-axis rotation at `epochMs`. */
export function siderealSpinY(id: SolarBodyId, epochMs: number): number {
  const T = SIDEREAL_ROTATION_MS[id];
  if (!T || T === 0) return 0;
  const sign = T < 0 ? -1 : 1;
  const period = Math.abs(T);
  return sign * ((epochMs / period) * Math.PI * 2);
}
