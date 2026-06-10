// AR overlay constants + small helpers. The actual pointing math (heading
// and altitude from DeviceOrientationEvent) lives in `use-device-heading.ts`,
// which uses a quaternion path that doesn't break near vertical.

// Effective on-screen FOV after a portrait phone's rear camera is rendered
// with `object-fit: cover`. We model the lens by a single nominal diagonal
// FOV (~73° on modern phones) and split it into horizontal/vertical
// components for the current viewport aspect ratio via pinhole geometry: the
// diagonal tangent is distributed across both axes, so a tall portrait
// viewport yields a narrow horizontal FOV and a wide vertical one, matching
// how `object-fit: cover` crops the sides to fill the screen. The derived
// values are used as-is; we only clamp to sanity bounds to guard against
// degenerate viewport sizes.
export const DEFAULT_DIAGONAL_FOV = 73;

/** Sanity bounds for a derived axis FOV (degrees). */
const MIN_FOV = 20;
const MAX_FOV = 120;

function clampFov(deg: number): number {
  return Math.min(MAX_FOV, Math.max(MIN_FOV, deg));
}

/** Signed shortest difference between two compass directions, in degrees. */
export function shortestAzDelta(targetAz: number, fromAz: number): number {
  return ((targetAz - fromAz + 540) % 360) - 180;
}

/** Compass heading → 8-point cardinal label. */
export function azimuthToCardinal(az: number): 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' {
  const n = ((az % 360) + 360) % 360;
  if (n >= 337.5 || n < 22.5) return 'N';
  if (n < 67.5) return 'NE';
  if (n < 112.5) return 'E';
  if (n < 157.5) return 'SE';
  if (n < 202.5) return 'S';
  if (n < 247.5) return 'SW';
  if (n < 292.5) return 'W';
  return 'NW';
}

/**
 * Approximate effective camera FOV for the current viewport using a nominal
 * wide-lens diagonal FOV. This keeps the AR projection closer to a real phone
 * camera than fixed constants, especially on very tall portrait screens.
 */
export function effectiveFov(
  viewportWidth: number,
  viewportHeight: number,
  diagonalFov = DEFAULT_DIAGONAL_FOV,
): { horizontal: number; vertical: number } {
  const safeW = Math.max(1, viewportWidth);
  const safeH = Math.max(1, viewportHeight);
  const aspect = safeW / safeH;
  const diagTan = Math.tan((diagonalFov * Math.PI) / 360);
  const verticalTan = diagTan / Math.sqrt(1 + aspect * aspect);
  const horizontalTan = aspect * verticalTan;
  return {
    horizontal: clampFov((Math.atan(horizontalTan) * 360) / Math.PI),
    vertical: clampFov((Math.atan(verticalTan) * 360) / Math.PI),
  };
}
