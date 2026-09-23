/**
 * How a card is authored.
 *
 * The author states the facts — what the object is, where it is, how large and
 * how bright — and the rarity, which is a decision. Everything else follows:
 * the edition size from the rarity, the observation status from Node 01's
 * optics and sky. Nothing that can be derived is typed by hand.
 */

import type { card } from '@/lib/schema';
import type { Rarity } from '@/lib/rarity';
import { getNode } from '@/lib/observatory/nodes';
import { EDITION_SIZE } from '@/lib/sidera/economics';
import { observability, type Observability, type ObservabilitySubject } from '@/lib/sidera/observability';

/** A card row as a set declares it, before it is filed under a set. */
export type CardSeed = Omit<typeof card.$inferInsert, 'id' | 'setId' | 'createdAt'>;

export type CardFacts = Omit<CardSeed, 'rarity' | 'observationStatus' | 'editionSize' | 'artUrl'> & {
  rarity: Rarity;
};

/** What decides whether the node can record it, beyond position. */
export type CardOptics = Pick<ObservabilitySubject, 'resolveArcsec' | 'magnitude' | 'sizeArcmin'>;

export type AuthoredCard = {
  seed: CardSeed;
  subject: ObservabilitySubject;
  observability: Observability;
};

/** The node every Set 001 card is judged against. */
export const JUDGING_NODE_ID = 'tbilisi-01';

/** One placeholder until the art exists. */
export const PLACEHOLDER_ART = '/cards/placeholder.svg';

/** Rendered from Explore's own planet maps by tools/explore/render-card.ts —
 *  art, not a Node 01 frame. Everything else is drawn from its record. */
const RENDERED = new Set(['SATURN', 'MARS', 'JUPITER', 'VENUS']);

export function subjectOf(facts: Pick<CardSeed, 'targetId' | 'decDeg'>, optics: CardOptics): ObservabilitySubject {
  return { targetId: facts.targetId, decDeg: facts.decDeg ?? null, ...optics };
}

export function authorCard(facts: CardFacts, optics: CardOptics): AuthoredCard {
  const node = getNode(JUDGING_NODE_ID);
  if (!node) throw new Error(`${JUDGING_NODE_ID} is not in the node registry`);

  const subject = subjectOf(facts, optics);
  const judged = observability(subject, node);
  return {
    seed: {
      ...facts,
      observationStatus: judged.status,
      editionSize: EDITION_SIZE[facts.rarity],
      artUrl: RENDERED.has(facts.designation) ? `/cards/${facts.designation}.webp` : PLACEHOLDER_ART,
    },
    subject,
    observability: judged,
  };
}

/**
 * A card from fiction: an original design, never an observation. There is no
 * sky it can be found in, so Node 01 never photographs it and the card says so.
 */
export function authorFiction(facts: Omit<CardFacts, 'targetId' | 'raHours' | 'decDeg' | 'surfaceLat' | 'surfaceLon'>): AuthoredCard {
  const seed: CardSeed = {
    ...facts,
    targetId: 'fiction',
    raHours: null,
    decDeg: null,
    surfaceLat: null,
    surfaceLon: null,
    observationStatus: 'not_available',
    editionSize: EDITION_SIZE[facts.rarity],
    artUrl: PLACEHOLDER_ART,
  };
  return {
    seed,
    subject: { targetId: 'fiction', decDeg: null, resolveArcsec: null, magnitude: null, sizeArcmin: null },
    observability: { status: 'not_available', reason: 'Fiction. It exists in no sky, so no telescope will ever photograph it.' },
  };
}
