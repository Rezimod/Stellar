import type { SolarBodyId } from '@/lib/solar-system/ephemeris';

/**
 * Same NASA-style equirectangular assets as `HeroSkyPanel` / `MissionRotateArt`
 * (shipped under `public/hero/planets` and `public/images/planets`).
 */
export const HERO_PLANET_TEXTURE_URL: Partial<Record<SolarBodyId, string>> = {
  sun: '/hero/planets/sun.jpg',
  mercury: '/hero/planets/mercury.jpg',
  venus: '/hero/planets/venus.jpg',
  earth: '/hero/planets/earth.jpg',
  moon: '/images/planets/moon.jpg',
  mars: '/hero/planets/mars.jpg',
  jupiter: '/hero/planets/jupiter.jpg',
  saturn: '/hero/planets/saturn.jpg',
  uranus: '/hero/planets/uranus.jpg',
  neptune: '/hero/planets/neptune.jpg',
};

export const HERO_TEXTURE_IDS = Object.keys(HERO_PLANET_TEXTURE_URL) as SolarBodyId[];
