// AR overlay constants + small helpers. The actual pointing math (heading
// and altitude from DeviceOrientationEvent) lives in `use-device-heading.ts`,
// which uses a quaternion path that doesn't break near vertical.

// Effective on-screen FOV after a portrait phone's rear camera is rendered
// with `object-fit: cover`. The lens is wide (~60°), but in portrait we crop
// the horizontal sides to fill a tall screen, so the visible horizontal FOV
// shrinks to roughly a third of the screen height. Vertical stays close to
// the lens's native vertical FOV. These are conservative defaults that work
// reasonably across iPhone and modern Android.
export const DEFAULT_HORIZONTAL_FOV = 38;
export const DEFAULT_VERTICAL_FOV = 60;

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
