// Shared sky palette — star tints, constellation display names, and the small
// colour helpers used by both the dome (SkyMap) and the immersive AR overlay
// (ARFinder). Previously each component carried its own copy; the maps drifted
// (e.g. Sirius rendered a different blue in each view). This is the single
// source of truth — where the two maps diverged, the SkyMap value wins.

/**
 * Per-star spectral tint — overrides the magnitude-only fallback for the
 * brightest stars where the eye can actually pick out colour. Hot O/B stars
 * read blue-white; K-type read warm orange; M-type red giants read deep
 * orange-red. Matches what the eye sees through clean dark-sky air.
 */
export const STAR_TINT: Record<string, string> = {
  // Blue-white (B/A class)
  sirius:    '#cfe1ff',
  vega:      '#d4e4ff',
  rigel:     '#cee0ff',
  spica:     '#cfe0ff',
  regulus:   '#d8e4f6',
  bellatrix: '#d6e2f4',
  alnilam:   '#d4e0f4',
  alnitak:   '#d4e0f4',
  mintaka:   '#d4e0f4',
  // White (A/F)
  altair:    '#f4f1e6',
  deneb:     '#f0eee0',
  procyon:   '#F8F4EC',
  castor:    '#ecedf0',
  // Yellow / yellow-white (F/G)
  capella:   '#fbe9ad',
  pollux:    '#f3c98a',
  // Orange (K)
  arcturus:  '#f0a55c',
  aldebaran: '#ec8b56',
  algieba:   '#f3b079',
  // Red giants (M)
  betelgeuse:'#e87454',
  antares:   '#e36c4a',
  // Additional figure stars.
  saiph:     '#cee0ff',
  fawaris:   '#d4e0f4',
  sheliak:   '#d8e1f4',
  sulafat:   '#d8e1f4',
  pherkad:   '#f0eee0',
  denebola:  '#d4e0f4',
  zosma:     '#d8e1f4',
  dschubba:  '#cee0ff',
};

/** Constellation key → display label. */
export const CONSTELLATION_NAMES: Record<string, string> = {
  orion:      'ORION',
  ursaMajor:  'URSA MAJOR',
  ursaMinor:  'URSA MINOR',
  cassiopeia: 'CASSIOPEIA',
  cygnus:     'CYGNUS',
  andromeda:  'ANDROMEDA',
  lyra:       'LYRA',
  leo:        'LEO',
  scorpius:   'SCORPIUS',
};

/**
 * Star colour for the AR overlay — the per-star tint where known, else a
 * magnitude-based fallback (brightest read blue-white, faint read warm).
 */
export function starTint(id: string, mag: number): string {
  if (STAR_TINT[id]) return STAR_TINT[id];
  if (mag <= -1) return '#cfe7ff';
  if (mag <= 0) return '#f8f4ec';
  if (mag <= 1) return '#ffd39b';
  return '#e8d8b6';
}

/** Hex colour → rgba() string with the given alpha. */
export function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.replace('#', '');
  const normalized = raw.length === 3
    ? raw.split('').map((ch) => ch + ch).join('')
    : raw;
  const value = Number.parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
