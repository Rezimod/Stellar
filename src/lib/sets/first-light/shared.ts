/**
 * What every First Light family file uses to state where a thing is and how
 * it looks from Earth. Fixed positions are J2000; the node's own catalogue
 * (sky-field.ts) is used where it has the object.
 */

import { DEEP_SKY_BY_ID } from '@/lib/observatory/sky-field';
import type { CardFacts, CardOptics } from '../build';

export const NO_POSITION = { raHours: null, decDeg: null, surfaceLat: null, surfaceLon: null } as const;
export const OFF_MOON = { surfaceLat: null, surfaceLon: null } as const;

/** A moving body, or a detail on one: no fixed position, only a size. */
export const body = (resolveArcsec: number | null, magnitude: number | null = null): CardOptics => ({
  resolveArcsec,
  magnitude,
  sizeArcmin: null,
});

/** A deep-sky object from the node's catalogue, seen whole. */
export function deepSky(id: string): Pick<CardFacts, 'raHours' | 'decDeg'> & { optics: CardOptics } {
  const d = DEEP_SKY_BY_ID.get(id);
  if (!d) throw new Error(`${id} is not in the deep-sky catalogue`);
  return {
    raHours: d.ra,
    decDeg: d.dec,
    optics: { resolveArcsec: null, magnitude: d.mag, sizeArcmin: { major: d.major, minor: d.minor ?? d.major } },
  };
}

/** A fixed object the catalogue does not carry: position, integrated magnitude, and its axes in arcminutes if extended. */
export function fixed(
  raHours: number,
  decDeg: number,
  magnitude: number | null,
  size?: [number, number],
): Pick<CardFacts, 'raHours' | 'decDeg'> & { optics: CardOptics } {
  return {
    raHours,
    decDeg,
    optics: { resolveArcsec: null, magnitude, sizeArcmin: size ? { major: size[0], minor: size[1] } : null },
  };
}
