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

export type Section = 'object' | 'almanac';

/** What the card prints and how it is sold, beyond the row the database keeps. */
export type CardRecord = {
  section: Section;
  /** An Almanac card's event, ISO 8601 UTC. Null for an object. */
  eventStartUtc: string | null;
  eventEndUtc: string | null;
  /** The designation of the card this one is paired with, if any. */
  pairsWith: string | null;
  /** Includes a physical fragment, redeemable later. */
  physical: boolean;
  /** Three figures on the face: label and value. */
  stats: [[string, string], [string, string], [string, string]];
  /** One short line of card text. */
  line: string;
};

export type AuthoredCard = {
  seed: CardSeed;
  subject: ObservabilitySubject;
  observability: Observability;
  record: CardRecord;
};

type Extras = Pick<CardRecord, 'stats' | 'line'> & Partial<Pick<CardRecord, 'pairsWith' | 'physical'>>;

const record = (extras: Extras, event: Pick<CardRecord, 'section' | 'eventStartUtc' | 'eventEndUtc'>): CardRecord => ({
  ...event,
  pairsWith: extras.pairsWith ?? null,
  physical: extras.physical ?? false,
  stats: extras.stats,
  line: extras.line,
});

const OBJECT = { section: 'object', eventStartUtc: null, eventEndUtc: null } as const;

/** The node every First Light card is judged against. */
export const JUDGING_NODE_ID = 'tbilisi-01';

/** One placeholder until the art exists. */
export const PLACEHOLDER_ART = '/cards/placeholder.svg';

/** Rendered from Explore's own planet maps by tools/explore/render-card.ts —
 *  art, not a Node 01 frame. Everything else is drawn from its record. */
const RENDERED = new Set(['SATURN', 'JUPITER']);

export function subjectOf(facts: Pick<CardSeed, 'targetId' | 'decDeg'>, optics: CardOptics): ObservabilitySubject {
  return { targetId: facts.targetId, decDeg: facts.decDeg ?? null, ...optics };
}

export function authorCard(facts: CardFacts, optics: CardOptics, extras: Extras): AuthoredCard {
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
    record: record(extras, OBJECT),
  };
}

type NoSky = Omit<CardFacts, 'targetId' | 'raHours' | 'decDeg' | 'surfaceLat' | 'surfaceLon'>;

const unpointable = (facts: NoSky, targetId: string, reason: string, rec: CardRecord): AuthoredCard => {
  const seed: CardSeed = {
    ...facts,
    targetId,
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
    subject: { targetId, decDeg: null, resolveArcsec: null, magnitude: null, sizeArcmin: null },
    observability: { status: 'not_available', reason },
    record: rec,
  };
};

/**
 * A card of something Node 01 cannot point at — a specimen in a case, a
 * spacecraft beyond any telescope, the observatory's own first frame. The
 * author says why.
 */
export function authorKept(facts: NoSky, reason: string, extras: Extras): AuthoredCard {
  return unpointable(facts, 'kept', reason, record(extras, OBJECT));
}

/**
 * An Almanac card: a dated event in the real sky. Sold until the event ends,
 * then sealed. No vote decides it; Node 01 records it on the night.
 */
export function authorAlmanac(facts: NoSky, event: { start: string; end: string }, extras: Extras): AuthoredCard {
  return unpointable(
    facts,
    'event',
    'A dated event. Node 01 records it on the night, weather allowing; no vote decides it.',
    record(extras, { section: 'almanac', eventStartUtc: event.start, eventEndUtc: event.end }),
  );
}

