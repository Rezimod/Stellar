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
  /**
   * The 720px globe, not the 2K one. `5ab6075` swapped Saturn onto saturn-2k.jpg
   * for the resolution, but that map carries about a third of Saturn's chroma and
   * almost none of its cloud structure, so the planet renders as flat cream. This
   * one is softer up close and much the better picture.
   */
  saturn: '/solar-system/planets/saturn.jpg',
  uranus: '/solar-system/planets/uranus.jpg',
  neptune: '/solar-system/planets/neptune.jpg',
  pluto: '/solar-system/planets/pluto.jpg',
};

export const NASA_TEXTURE_IDS = Object.keys(NASA_PLANET_TEXTURE_URL) as SolarBodyId[];
