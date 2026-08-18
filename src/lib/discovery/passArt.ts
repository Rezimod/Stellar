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

/** Distinct credit lines, for the attribution note under a set of cards. */
export function artCredits(): string[] {
  return [...new Set(Object.values(PASS_ART).map((a) => a.credit))];
}
