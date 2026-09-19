/**
 * TYCHO, the first card.
 *
 * A crater rather than a planet, on purpose: the telescope is pointed at the
 * Moon, and the card is one place on it. The selenographic position is what
 * says which part of the frame belongs to this card — the IAU gazetteer gives
 * Tycho's centre as 43.31° S, 11.36° W.
 */

import { authorCard } from '@/lib/sets/build';
import { arcsecFromKm, MOON_DISTANCE_KM } from './observability';

export const TYCHO_CARD = authorCard(
  {
    designation: 'TYCHO',
    name: 'Tycho',
    objectType: 'lunar crater',
    rarity: 'rare',
    targetId: 'moon',
    catalogRef: 'IAU Tycho (lunar crater)',
    // The Moon moves; its right ascension and declination are computed per night.
    raHours: null,
    decDeg: null,
    surfaceLat: -43.31,
    surfaceLon: -11.36,
    blurb:
      'A young impact crater in the southern highlands, 85 km across, with a central peak ' +
      'and rays that run across the near side for more than 1,500 km. It is clearest a few ' +
      'nights either side of full Moon, when those rays are brightest.',
  },
  { resolveArcsec: arcsecFromKm(85, MOON_DISTANCE_KM), magnitude: null, sizeArcmin: null },
);

export const TYCHO = TYCHO_CARD.seed;
