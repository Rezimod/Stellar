import { Body, Equator, Horizon, Observer, SearchAltitude, SearchRiseSet } from 'astronomy-engine';

/** The Sun's altitude in degrees above the horizon, right now, where you are. */
export function getSunAltitude(lat: number, lon: number, date: Date): number {
  const observer = new Observer(lat, lon, 0);
  const eq = Equator(Body.Sun, date, observer, true, true);
  return Horizon(date, observer, eq.ra, eq.dec, 'normal').altitude;
}

export interface TonightDarkWindow {
  duskStart: Date | null;
  dawnEnd: Date | null;
  midpoint: Date | null;
  evalTime: Date;
  isCurrentlyDark: boolean;
}

// Practical "dark enough" threshold for visual observation. -18° is true
// astronomical darkness (deep-sky imaging), but bright planets, the Moon,
// and major DSOs are perfectly observable from end-of-nautical-twilight
// onward — and at sub-tropical latitudes in summer the -18° window can be
// short or non-existent. Using -12° matches the consumer "is it dark?"
// expectation and avoids labelling 30+ min of usable sky as "Daylight".
const ASTRONOMICAL_DEPRESSION = -12;

/**
 * Returns the astronomical dark window for "tonight" at the given location.
 *
 * "Tonight" = the night that begins on the calendar day of `reference`. If
 * `reference` falls in the early hours BEFORE today's dawn, that pre-dawn
 * window is used instead so the widget keeps showing the same night until
 * the sun actually comes up.
 *
 * `evalTime` is the time to use when querying planet positions:
 *   - if currently inside the dark window: the current moment
 *   - otherwise: the midpoint of tonight's dark window (most representative)
 *   - fallback when the sun never gets dark enough (high-latitude summer): now
 */
export function getTonightDarkWindow(
  lat: number,
  lon: number,
  reference: Date = new Date(),
): TonightDarkWindow {
  const observer = new Observer(lat, lon, 0);

  // Anchor the search at local noon of the day the night belongs to, so we
  // cover both the pre-dawn slice (still "tonight" in colloquial use) and the
  // upcoming evening.
  //
  // "Local" here is derived from the observer's longitude, NOT from the
  // runtime clock: this function runs both in the browser and on the server
  // (Vercel = UTC), and a user can pick an observing site in another zone. The
  // old `reference.getHours()` version made a Tbilisi afternoon look like
  // morning to a UTC server and returned *last* night's window.
  const lonOffsetMs = (lon / 15) * 3_600_000;
  const local = new Date(reference.getTime() + lonOffsetMs);
  let anchorMs =
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), 12, 0, 0, 0) -
    lonOffsetMs;
  if (local.getUTCHours() < 12) anchorMs -= 24 * 3600 * 1000;
  const anchor = new Date(anchorMs);

  let duskStart: Date | null = null;
  let dawnEnd: Date | null = null;

  try {
    const sunSet = SearchRiseSet(Body.Sun, observer, -1, anchor, 1);
    const duskSearchStart = sunSet?.date ?? anchor;
    const duskHit = SearchAltitude(Body.Sun, observer, -1, duskSearchStart, 1, ASTRONOMICAL_DEPRESSION);
    if (duskHit) {
      duskStart = duskHit.date;
      const dawnHit = SearchAltitude(Body.Sun, observer, +1, duskHit.date, 1, ASTRONOMICAL_DEPRESSION);
      if (dawnHit) dawnEnd = dawnHit.date;
    }
  } catch {
    // Sun never reaches ASTRONOMICAL_DEPRESSION (polar summer). Leave nulls.
  }

  let midpoint: Date | null = null;
  if (duskStart && dawnEnd) {
    midpoint = new Date((duskStart.getTime() + dawnEnd.getTime()) / 2);
  } else {
    // Fallback: civil sunset → next sunrise midpoint.
    try {
      const sunSet = SearchRiseSet(Body.Sun, observer, -1, anchor, 1);
      if (sunSet) {
        const sunRise = SearchRiseSet(Body.Sun, observer, +1, sunSet.date, 1);
        if (sunRise) {
          midpoint = new Date((sunSet.date.getTime() + sunRise.date.getTime()) / 2);
        }
      }
    } catch {
      // give up — evalTime will fall back to reference
    }
  }

  const isCurrentlyDark = !!(duskStart && dawnEnd && reference >= duskStart && reference <= dawnEnd);
  const evalTime = isCurrentlyDark ? reference : (midpoint ?? reference);

  return { duskStart, dawnEnd, midpoint, evalTime, isCurrentlyDark };
}
