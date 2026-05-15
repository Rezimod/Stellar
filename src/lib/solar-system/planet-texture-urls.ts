import type { SolarBodyId } from '@/lib/solar-system/ephemeris';

/**
 * Equirectangular planet maps for the 3D solar system.
 * Sources: NASA 3D Resources (GitHub), NASA SVS Blue Marble, NASA/Caltech JPL maps,
 * and mission-based hero assets under `public/hero/planets`.
 *
 * @see public/solar-system/CREDITS.md
 */
export const NASA_PLANET_TEXTURE_URL: Record<SolarBodyId, string> = {
  sun: '/solar-system/planets/sun.jpg',
  mercury: '/solar-system/planets/mercury.jpg',
  venus: '/solar-system/planets/venus.jpg',
  earth: '/solar-system/planets/earth.jpg',
  mars: '/solar-system/planets/mars.jpg',
  jupiter: '/solar-system/planets/jupiter.jpg',
  /** 2K Cassini-style globe (Solar System Scope texture set, NASA-derived). */
  saturn: '/solar-system/planets/saturn-2k.jpg',
  uranus: '/solar-system/planets/uranus.jpg',
  neptune: '/solar-system/planets/neptune.jpg',
  pluto: '/solar-system/planets/pluto.jpg',
};

export const NASA_TEXTURE_IDS = Object.keys(NASA_PLANET_TEXTURE_URL) as SolarBodyId[];
