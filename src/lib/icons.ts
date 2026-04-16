/**
 * Space icon paths — all from Tabler Icons (MIT license)
 * Use with <img src={ICONS.moon} /> or as inline SVG via next/image
 */
export const ICONS = {
  moon:       '/icons/moon.svg',
  moonStars:  '/icons/moon-stars.svg',
  sun:        '/icons/sun.svg',
  star:       '/icons/star.svg',
  stars:      '/icons/stars.svg',
  planet:     '/icons/planet.svg',
  telescope:  '/icons/telescope.svg',
  rocket:     '/icons/rocket.svg',
  comet:      '/icons/comet.svg',
  satellite:  '/icons/satellite.svg',
  ufo:        '/icons/ufo.svg',
  meteor:     '/icons/meteor.svg',
} as const;

export type IconKey = keyof typeof ICONS;

/**
 * Constellation SVGs — hand-crafted with accurate star positions
 * Styled to match Stellar's deep-space theme (indigo lines, white stars)
 */
export const CONSTELLATIONS = {
  orion:      '/icons/constellations/orion.svg',
  ursaMajor:  '/icons/constellations/ursa-major.svg',
  cassiopeia: '/icons/constellations/cassiopeia.svg',
  scorpius:   '/icons/constellations/scorpius.svg',
} as const;

export type ConstellationKey = keyof typeof CONSTELLATIONS;
