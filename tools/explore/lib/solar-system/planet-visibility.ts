import {
  Body,
  Equator,
  Horizon,
  Observer,
  SearchRiseSet,
} from 'astronomy-engine';
import type { SolarBodyId } from '@/lib/solar-system/ephemeris';

const BODY_MAP: Record<SolarBodyId, Body> = {
  sun: Body.Sun,
  mercury: Body.Mercury,
  venus: Body.Venus,
  earth: Body.Earth,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
  uranus: Body.Uranus,
  neptune: Body.Neptune,
  pluto: Body.Pluto,
};

export interface VisibilityWindow {
  /** When planet rises above horizon (or null if circumpolar/never rises). */
  riseTime: Date | null;
  /** When planet is highest in sky. */
  transitTime: Date | null;
  /** When planet sets below horizon (or null if circumpolar/never sets). */
  setTime: Date | null;
  /** Maximum altitude in degrees. */
  maxAltitude: number;
  /** Best viewing window start (when alt > 20°). */
  bestStartTime: Date | null;
  /** Best viewing window end (when alt drops below 20°). */
  bestEndTime: Date | null;
  /** Overall visibility status. */
  status: 'visible' | 'rising' | 'setting' | 'below-horizon' | 'circumpolar';
}

/** Calculate planet visibility for a given observer location and date.
 *  Uses astronomy-engine to compute rise/set/transit times.
 */
export function getPlanetVisibility(
  planetId: SolarBodyId,
  observerLat: number,
  observerLng: number,
  date: Date = new Date(),
): VisibilityWindow {
  const body = BODY_MAP[planetId];
  const observer = new Observer(observerLat, observerLng, 0); // elev 0 for simplicity

  // Start search from midnight tonight
  const midnight = new Date(date);
  midnight.setHours(0, 0, 0, 0);

  try {
    // SearchRiseSet(body, observer, direction, startDate, searchCount)
    // direction: +1 = rising, -1 = setting
    const riseEvent = SearchRiseSet(body, observer, +1, midnight, 1);
    const setEvent = SearchRiseSet(body, observer, -1, midnight, 1);

    // Helper to get altitude at a time point
    const getAltitude = (d: Date): number => {
      try {
        const eq = Equator(body, d, observer, true, true);
        const h = Horizon(d, observer, eq.ra, eq.dec, 'normal');
        return h.altitude;
      } catch {
        return -90;
      }
    };

    // Compute altitude at a few points during the night to find max
    let maxAlt = -90;
    let maxAltTime: Date | null = null;

    const searchStart = riseEvent?.date ? new Date(riseEvent.date.getTime()) : new Date(midnight);
    const searchEnd = setEvent?.date ? new Date(setEvent.date.getTime()) : new Date(midnight.getTime() + 86400000);

    let current = new Date(searchStart);
    while (current < searchEnd) {
      const alt = getAltitude(current);
      if (alt > maxAlt) {
        maxAlt = alt;
        maxAltTime = new Date(current);
      }
      current = new Date(current.getTime() + 3600000); // step 1 hour
    }

    // Compute altitude at best viewing altitude (20° above horizon)
    let bestStartTime: Date | null = null;
    let bestEndTime: Date | null = null;

    if (riseEvent?.date && setEvent?.date) {
      // Find when planet crosses 20° altitude
      let search = new Date(riseEvent.date.getTime());
      const endSearch = new Date(setEvent.date.getTime());

      // Linear search for 20° altitude crossing
      while (search < endSearch) {
        const alt = getAltitude(search);
        if (alt >= 20) {
          bestStartTime = new Date(search);
          break;
        }
        search = new Date(search.getTime() + 60000); // step 1 min
      }

      search = new Date(setEvent.date.getTime());
      while (search > riseEvent.date) {
        const alt = getAltitude(search);
        if (alt >= 20) {
          bestEndTime = new Date(search);
          break;
        }
        search = new Date(search.getTime() - 60000);
      }
    }

    // Determine status
    let status: VisibilityWindow['status'] = 'below-horizon';
    const now = new Date();
    const nowAlt = getAltitude(now);

    if (nowAlt > 0) {
      if (riseEvent?.date && riseEvent.date > now) {
        status = 'rising';
      } else if (setEvent?.date && setEvent.date > now) {
        status = 'visible';
      } else if (!setEvent?.date) {
        status = 'circumpolar';
      }
    }

    return {
      riseTime: riseEvent?.date ?? null,
      transitTime: maxAltTime ?? null,
      setTime: setEvent?.date ?? null,
      maxAltitude: maxAlt > -90 ? maxAlt : 0,
      bestStartTime,
      bestEndTime,
      status,
    };
  } catch (err) {
    // Fallback on error
    console.error('visibility calculation failed:', err);
    return {
      riseTime: null,
      transitTime: null,
      setTime: null,
      maxAltitude: 0,
      bestStartTime: null,
      bestEndTime: null,
      status: 'below-horizon',
    };
  }
}
