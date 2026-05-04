// Reference photos for finder targets — public-domain NASA / ESA / Hubble
// imagery, downloaded from Wikimedia Commons and shipped from /public so we
// don't rely on third-party hosts at runtime.
//
// Stars (Sirius, Arcturus) intentionally have no entry; their hero falls
// back to the synthesised glyph in PlanetIcon.

export interface TargetPhoto {
  src: string;
  alt: string;
  credit: string;
}

export const TARGET_PHOTOS: Record<string, TargetPhoto> = {
  sun: {
    src: '/sky/targets/sun.jpg',
    alt: 'The Sun in extreme ultraviolet',
    credit: 'NASA / SDO',
  },
  moon: {
    src: '/sky/targets/moon.jpg',
    alt: 'Full Moon, Earth-based telescope',
    credit: 'Gregory H. Revera',
  },
  mercury: {
    src: '/sky/targets/mercury.jpg',
    alt: 'Mercury in true colour',
    credit: 'NASA / JHU APL / MESSENGER',
  },
  venus: {
    src: '/sky/targets/venus.jpg',
    alt: 'Venus globe in real colour',
    credit: 'NASA / Mariner 10',
  },
  mars: {
    src: '/sky/targets/mars.jpg',
    alt: 'Mars true colour from Rosetta',
    credit: 'ESA / OSIRIS',
  },
  jupiter: {
    src: '/sky/targets/jupiter.jpg',
    alt: 'Jupiter and the Great Red Spot',
    credit: 'NASA / Hubble',
  },
  saturn: {
    src: '/sky/targets/saturn.jpg',
    alt: 'Saturn during equinox',
    credit: 'NASA / JPL / Cassini',
  },
  uranus: {
    src: '/sky/targets/uranus.jpg',
    alt: 'Uranus from Voyager 2',
    credit: 'NASA / Voyager 2',
  },
  neptune: {
    src: '/sky/targets/neptune.jpg',
    alt: 'Neptune from Voyager 2',
    credit: 'NASA / Voyager 2',
  },
  m31: {
    src: '/sky/targets/m31.jpg',
    alt: 'Andromeda Galaxy (M31) in visible + Hα light',
    credit: 'Adam Evans / public domain',
  },
  m42: {
    src: '/sky/targets/m42.jpg',
    alt: 'Orion Nebula — Hubble 2006 mosaic',
    credit: 'NASA / ESA / Hubble',
  },
  m57: {
    src: '/sky/targets/m57.jpg',
    alt: 'Ring Nebula (M57) — Hubble',
    credit: 'NASA / ESA / Hubble',
  },
};

export function getTargetPhoto(id: string): TargetPhoto | null {
  return TARGET_PHOTOS[id] ?? null;
}
