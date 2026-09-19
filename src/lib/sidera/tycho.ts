/**
 * TYCHO, the first card.
 *
 * A crater rather than a planet, on purpose: the telescope is pointed at the
 * Moon, and the card is one place on it. The selenographic position is what
 * says which part of the frame belongs to this card — the IAU gazetteer gives
 * Tycho's centre as 43.31° S, 11.36° W.
 */

import type { card } from '@/lib/schema'

export const TYCHO: typeof card.$inferInsert = {
  designation: 'TYCHO',
  name: 'Tycho',
  objectType: 'lunar crater',
  rarity: 'rare',
  observationStatus: 'eligible',
  editionSize: 10,
  targetId: 'moon',
  catalogRef: 'IAU Tycho (lunar crater)',
  // The Moon moves; its right ascension and declination are computed per night.
  raHours: null,
  decDeg: null,
  surfaceLat: -43.31,
  surfaceLon: -11.36,
  artUrl: null,
  blurb:
    'A young impact crater in the southern highlands, 85 km across, with a central peak ' +
    'and rays that run across the near side for more than 1,500 km. It is clearest a few ' +
    'nights either side of full Moon, when those rays are brightest.',
}
