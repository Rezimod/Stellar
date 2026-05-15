import type { SolarBodyId } from '@/lib/solar-system/ephemeris';

/**
 * NASA-style equirectangular maps (same assets as homepage hero / mission art).
 * Prefer `public/hero/planets` — higher resolution than `public/images/planets`.
 */
export const HERO_PLANET_TEXTURE_URL: Record<Exclude<SolarBodyId, 'pluto'>, string> = {
  sun: '/hero/planets/sun.jpg',
  mercury: '/hero/planets/mercury.jpg',
  venus: '/hero/planets/venus.jpg',
  earth: '/hero/planets/earth.jpg',
  mars: '/hero/planets/mars.jpg',
  jupiter: '/hero/planets/jupiter.jpg',
  saturn: '/hero/planets/saturn.jpg',
  uranus: '/hero/planets/uranus.jpg',
  neptune: '/hero/planets/neptune.jpg',
};

export const HERO_TEXTURE_IDS = Object.keys(HERO_PLANET_TEXTURE_URL) as Exclude<SolarBodyId, 'pluto'>[];
