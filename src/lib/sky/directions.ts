// Pure helpers that turn raw alt/az into the natural-language direction
// the horizon finder uses. The i18n message files own the actual strings —
// these helpers map the inputs onto the i18n key shape used in en.json.

export type CompassDir = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

const COMPASS_KEYS: CompassDir[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

const FIST_KEYS = [
  'half',          // 0.5
  'one',           // 1
  'oneAndHalf',    // 1.5
  'two',           // 2
  'twoAndHalf',    // 2.5
  'three',         // 3
  'threeAndHalf',  // 3.5
  'four',          // 4
  'fourAndHalf',   // 4.5
  'five',          // 5
] as const;

export function azimuthToCompass(az: number): CompassDir {
  const normalized = ((az % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return 'N';
  if (normalized < 67.5) return 'NE';
  if (normalized < 112.5) return 'E';
  if (normalized < 157.5) return 'SE';
  if (normalized < 202.5) return 'S';
  if (normalized < 247.5) return 'SW';
  if (normalized < 292.5) return 'W';
  return 'NW';
}

/** One closed fist at arm's length is roughly 10° of sky. Rounded to nearest 0.5. */
export function altitudeToFists(altitude: number): number {
  const safe = Math.max(0, altitude);
  return Math.round((safe / 10) * 2) / 2;
}

/** i18n key under sky.directions.fists.*. For values > 5 returns 'many' so the caller can pass {n}. */
export function fistsToKey(fists: number): { key: string; values?: { n: number } } {
  if (fists <= 0) return { key: 'half' };
  if (fists >= 5.5) return { key: 'many', values: { n: Math.round(fists) } };
  // Map 0.5..5 to FIST_KEYS index 0..9
  const idx = Math.min(FIST_KEYS.length - 1, Math.max(0, Math.round(fists * 2) - 1));
  return { key: FIST_KEYS[idx] };
}

export function compassToKey(compass: CompassDir): string {
  return compass;
}

/** Map astronomy-engine MoonPhase / 360 (0..1) to the 8 named phases used in copy. */
export function moonPhaseKey(phase: number): string {
  // phase: 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter
  const p = ((phase % 1) + 1) % 1;
  if (p < 0.03 || p > 0.97) return 'new';
  if (p < 0.22) return 'thinCrescent';
  if (p < 0.28) return 'firstQuarter';
  if (p < 0.47) return 'waxingGibbous';
  if (p < 0.53) return 'full';
  if (p < 0.72) return 'waningGibbous';
  if (p < 0.78) return 'lastQuarter';
  return 'thinWaning';
}

export const __compassKeys = COMPASS_KEYS;
