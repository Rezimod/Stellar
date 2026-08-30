import type { RevealedObject } from '@/lib/discovery/mockReveal';
import { objectArt } from '@/lib/discovery/passArt';
import {
  RARITY_TO_TIER,
  generateVisualGradient,
  type CelestialObject,
} from '@/lib/discovery/rarityEngine';
import type { TierId } from '@/lib/discovery/tiers';

/**
 * What <RevealedCard> needs to render one opened pass.
 *
 * Two very different objects end up on that card: the mock fixtures behind
 * /discovery/reveal?preview=, and the real draw behind /discovery/<passId>.
 * They agree on almost nothing — one carries a constellation and a hand-picked
 * palette, the other carries J2000 coordinates and a seed — so rather than
 * teaching the card about both, each is flattened here into what a specimen
 * card actually shows: what tier it is, what is in the plate, what the placard
 * says, and where the picture came from.
 */
export type RevealCard = {
  tier: TierId;
  /** The object, as it is catalogued. Goes in the specimen label. */
  name: string;
  /** Placard second line: the instrument that took the picture. The instrument
   *  is the proof the picture is real, so an object nobody has ever imaged says
   *  so rather than borrowing the slot for something else. Rendered uppercase —
   *  keep it free of notation that has meaningful case. */
  provenance: string;
  /** The mono line under the card — where it is and how far. */
  meta: string;
  /** A sentence or two under the card. */
  blurb: string;
  /** The photograph, when the object has one. */
  photo: { src: string; alt: string; scale: number } | null;
  /** Painted into the plate when it does not. A CSS `background` value. */
  fallback: string;
};

/**
 * The mock fixture's palette as the layered background the plate paints.
 *
 * Same structure the real generator produces — hot core, mid field, cool outer
 * halo — so a fixture and a draw are indistinguishable in the plate.
 */
function mockGradient(visual: RevealedObject['visual']): string {
  return [
    `radial-gradient(circle at 50% 50%, ${visual.core} 0%, transparent 26%)`,
    `radial-gradient(circle at 46% 44%, ${visual.mid} 0%, transparent 52%)`,
    `radial-gradient(circle at 58% 60%, ${visual.mid} 0%, transparent 44%)`,
    `radial-gradient(circle at 50% 50%, ${visual.halo} 0%, #01020a 78%)`,
  ].join(', ');
}

/** The real draw, from a wallet and a pass number. */
export function revealCardFromDraw(object: CelestialObject): RevealCard {
  const art = objectArt(object.id);

  return {
    tier: RARITY_TO_TIER[object.rarity],
    name: object.name,
    provenance: art ? art.instrument : 'Not yet imaged',
    meta: `${object.coordinates.ra} / ${object.coordinates.dec}`,
    blurb: object.description,
    photo: art
      ? { src: art.src, alt: `${object.name}, imaged by ${art.instrument}`, scale: art.scale ?? 1 }
      : null,
    fallback: generateVisualGradient(object.visualSeed, object.rarity),
  };
}

/** A mock fixture, for ?preview= and for reveal day's placeholder draw. */
export function revealCardFromMock(object: RevealedObject): RevealCard {
  const art = object.artId ? objectArt(object.artId) : null;

  return {
    tier: object.tier,
    name: `${object.catalog} · ${object.name}`,
    provenance: art ? art.instrument : 'Not yet imaged',
    meta: `${object.constellation} · ${object.distanceLy.toLocaleString('en-US')} light years`,
    blurb: object.blurb,
    photo: art
      ? { src: art.src, alt: `${object.name}, imaged by ${art.instrument}`, scale: art.scale ?? 1 }
      : null,
    fallback: mockGradient(object.visual),
  };
}
