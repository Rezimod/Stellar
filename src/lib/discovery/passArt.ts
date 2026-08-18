import type { TierId } from '@/lib/discovery/tiers';

/**
 * Real photographs for the pass cards.
 *
 * Generated gradients were standing in for artwork, and they read as what they
 * were. These are telescope images of objects that are genuinely in the tier's
 * own draw pool, so the picture on a Rare card is a real frame of a real Rare
 * object rather than decoration.
 *
 * Choosing the representative was constrained by what has actually been
 * photographed. Most Common objects are bright stars, which resolve to a point
 * — Betelgeuse is one of the few whose disc has ever been imaged. Most Rare
 * objects are exoplanets, which are almost never seen directly — HR 8799 is one
 * of the handful that has been. Nothing here is an artist's impression.
 *
 * `credit` is not decorative: the two ESO frames are CC BY 4.0, which requires
 * attribution wherever they appear.
 */

export type PassArt = {
  /** Path under /public. */
  src: string;
  /** The object actually in frame — must exist in that tier's pool. */
  objectId: string;
  objectName: string;
  /** Instrument or observatory, for the card's micro-caption. */
  instrument: string;
  credit: string;
  /** Percentage focal point, so a crop keeps the subject centred. */
  focus: { x: number; y: number };
  /** Zoom applied to the crop. HR 8799's subject is a small core in a wide
   *  dark frame; at 1x it reads as an empty card. */
  scale: number;
};

export const PASS_ART: Record<TierId, PassArt> = {
  common: {
    src: '/images/dso/betelgeuse.jpg',
    objectId: 'betelgeuse',
    objectName: 'Betelgeuse',
    instrument: 'ALMA',
    credit: 'ALMA (ESO/NAOJ/NRAO)',
    focus: { x: 50, y: 50 },
    scale: 1.15,
  },
  uncommon: {
    src: '/images/dso/m42.jpg',
    objectId: 'm42-orion',
    objectName: 'The Orion Nebula',
    instrument: 'Hubble',
    credit: 'NASA, ESA, M. Robberto',
    focus: { x: 50, y: 50 },
    scale: 1,
  },
  rare: {
    src: '/images/dso/hr8799.jpg',
    objectId: 'hr8799e',
    objectName: 'HR 8799 e',
    instrument: 'VLT',
    credit: 'ESO',
    focus: { x: 50, y: 50 },
    scale: 2.1,
  },
  epic: {
    src: '/images/dso/m1.jpg',
    objectId: 'm1-crab',
    objectName: 'The Crab Nebula',
    instrument: 'Hubble',
    credit: 'NASA, ESA, J. Hester, A. Loll',
    focus: { x: 50, y: 50 },
    scale: 1.05,
  },
  legendary: {
    src: '/images/dso/eta-carinae.jpg',
    objectId: 'eta-carinae',
    objectName: 'Eta Carinae',
    instrument: 'Hubble',
    credit: 'NASA, N. Smith (UC Berkeley)',
    focus: { x: 50, y: 52 },
    scale: 1.25,
  },
};

/**
 * Photograph per catalogue object, for the reveal and the share card.
 *
 * Only 13 of the 110 objects have a frame, and that is not a backlog — most of
 * the catalogue has never been directly imaged. So this is a lookup with a
 * fallback, not a table to be completed: an object with a photograph shows it,
 * and everything else keeps the deterministic generated artwork. Adding a file
 * here upgrades that object everywhere at once.
 *
 * Every key is asserted against the real draw pools in discovery-art.test.ts —
 * a typo would silently fall back to a gradient forever.
 */
export const OBJECT_ART: Record<string, { src: string; instrument: string; credit: string }> = {
  betelgeuse: { src: '/images/dso/betelgeuse.jpg', instrument: 'ALMA', credit: 'ALMA (ESO/NAOJ/NRAO)' },
  'eta-carinae': { src: '/images/dso/eta-carinae.jpg', instrument: 'Hubble', credit: 'NASA, N. Smith (UC Berkeley)' },
  hr8799e: { src: '/images/dso/hr8799.jpg', instrument: 'VLT', credit: 'ESO' },
  'm1-crab': { src: '/images/dso/m1.jpg', instrument: 'Hubble', credit: 'NASA, ESA, J. Hester, A. Loll' },
  'm13-hercules': { src: '/images/dso/m13-cluster.jpg', instrument: 'Hubble', credit: 'NASA, ESA' },
  'm17-omega': { src: '/images/dso/m17-omega.jpg', instrument: 'Hubble', credit: 'NASA, ESA' },
  'm31-andromeda': { src: '/images/dso/m31.jpg', instrument: 'Hubble', credit: 'NASA, ESA' },
  'm42-orion': { src: '/images/dso/m42.jpg', instrument: 'Hubble', credit: 'NASA, ESA, M. Robberto' },
  'm45-pleiades': { src: '/images/dso/m45.jpg', instrument: 'Hubble', credit: 'NASA, ESA' },
  'm51-whirlpool': { src: '/images/dso/m51.jpg', instrument: 'Hubble', credit: 'NASA, ESA' },
  'm57-ring': { src: '/images/dso/m57-ring.jpg', instrument: 'Hubble', credit: 'NASA, ESA' },
  'm8-lagoon': { src: '/images/dso/m8.jpg', instrument: 'Hubble', credit: 'NASA, ESA' },
  'ngc869-double': { src: '/images/dso/ngc869.jpg', instrument: 'Hubble', credit: 'NASA, ESA' },
};

/** The photograph for an object, or null when it has never been imaged. */
export function objectArt(objectId: string) {
  return OBJECT_ART[objectId] ?? null;
}

/** Distinct credit lines, for the attribution note under a set of cards. */
export function artCredits(): string[] {
  return [...new Set(Object.values(PASS_ART).map((a) => a.credit))];
}
