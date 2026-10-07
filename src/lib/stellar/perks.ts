/**
 * What holding a card gives, by its rarity. One rule per tier:
 *
 * - Ultra Rare: the meteorites and the moon rock. The card carries the piece of
 *   it that it shows.
 * - Epic: the planets. Each edition is a 30-minute session on Live Telescope V1.
 * - Rare: everything else Live Telescope V1 will point at: the objects it can
 *   photograph and the dated night-sky events. Each edition is an entry in the
 *   draw for a visitor's seat at a live session.
 * - Common: the rest. Each edition votes on the night's target, and the cards
 *   that were the set's headliners vote harder.
 *
 * Every edition votes; the tiers above common vote with a fixed weight.
 * PROVISIONAL (Gate 4): sessions and visitor seats open with the telescope,
 * which is commissioning.
 */

import type { Rarity } from '@/lib/rarity';

/** How long one Epic session lasts. */
export const SESSION_MINUTES = 30;

/** Commons that vote three times: the set's former headliners. */
const VOTE_3 = new Set(['APOLLO-11', 'AURORA', 'CARTWHEEL', 'CMB', 'EARTHRISE', 'ETA-CARINAE', 'FIRST-LIGHT', 'GREAT-ECLIPSE', 'HALLEY', 'HUBBLE-DEEP-FIELD', 'M1', 'M87', 'MILKY-WAY', 'PLUTO', 'TON-618', 'TOTAL-ECLIPSE', 'VENUS-TRANSIT']);

/** Commons that vote twice. */
const VOTE_2 = new Set(['ALPHA-CEN', 'ANTARES', 'BLOOD-MOON', 'CARINA', 'CEN-A', 'CHICXULUB', 'ENCELADUS', 'HALE-BOPP', 'HELIX', 'HORSEHEAD', 'IO', 'JWST', 'LEONIDS', 'M104', 'M31', 'M51', 'OMEGA-CEN', 'OUMUAMUA', 'RING-OF-FIRE', 'SL9', 'SN-1987A', 'SUN', 'TARANTULA', 'TRAPPIST-1']);

/** What one edition adds to its holder's vote for the night's target. */
export function votePower(designation: string, rarity: Rarity): number {
  if (rarity === 'common') return VOTE_3.has(designation) ? 3 : VOTE_2.has(designation) ? 2 : 1;
  return rarity === 'rare' ? 4 : 5;
}

export type Perk = {
  /** A few words, for a pill or a list: "30-min session". */
  short: string;
  /** What it is, in one sentence. */
  line: string;
};

export function perkFor(designation: string, rarity: Rarity): Perk {
  switch (rarity) {
    case 'legendary':
      return { short: 'Real specimen', line: 'The card carries a real piece of the meteorite it shows, sent to its holder.' };
    case 'epic':
      return { short: `${SESSION_MINUTES}-min session`, line: `Each edition is a ${SESSION_MINUTES}-minute session on Live Telescope V1, booked by its holder once the telescope opens.` };
    case 'rare':
      return { short: 'Visitor draw', line: 'Each edition is an entry in the draw for a visitor’s seat at a live session on Live Telescope V1.' };
    default: {
      const v = votePower(designation, rarity);
      return { short: `Vote ×${v}`, line: `Each edition adds ${v} to its holder’s vote on what Live Telescope V1 photographs each night.` };
    }
  }
}

/** What each tier gives, for the page that explains them, scarcest first. */
export const TIER_PERKS: { rarity: Rarity; title: string; line: string }[] = [
  { rarity: 'legendary', title: 'A real meteorite', line: 'Seven cards, each carrying a real piece of the stone it shows: five meteorites, a pallasite and a piece of the Moon.' },
  { rarity: 'epic', title: `A ${SESSION_MINUTES}-minute session`, line: `The eight planets. Each edition is ${SESSION_MINUTES} minutes at the controls of Live Telescope V1.` },
  { rarity: 'rare', title: 'A visitor’s seat', line: 'What the telescope can point at, and the night-sky events. Each edition enters the draw to watch a live session.' },
  { rarity: 'common', title: 'A vote on the night', line: 'Every other card. Each edition votes on the night’s target, once, twice or three times.' },
];
