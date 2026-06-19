import { Body, Equator, Horizon, Observer } from 'astronomy-engine';
import { getVisiblePlanets } from '@/lib/planets';
import { CATALOG, raDecToAzAlt } from '@/lib/sky/catalog';

// Server-side altitude of a finder target at an observer, in degrees — or null
// when the id doesn't resolve to a known sky object. Same resolution as
// /api/sky/finder (planets + Sun via astronomy-engine, the rest from CATALOG),
// so /api/award-stars can independently confirm a "find:" target was actually
// above the horizon rather than trusting the client.
export function targetAltitude(
  id: string,
  lat: number,
  lon: number,
  date: Date,
): number | null {
  const key = id.toLowerCase();

  if (key === 'sun') {
    try {
      const observer = new Observer(lat, lon, 0);
      const eq = Equator(Body.Sun, date, observer, true, true);
      return Horizon(date, observer, eq.ra, eq.dec, 'normal').altitude;
    } catch {
      return null;
    }
  }

  // Moon + planets.
  try {
    const planet = getVisiblePlanets(lat, lon, date).find(
      (p) => p.key.toLowerCase() === key,
    );
    if (planet) return planet.altitude;
  } catch {
    // fall through to the static catalog
  }

  // Stars, doubles, clusters, nebulae, galaxies.
  const entry = CATALOG.find((e) => e.id === id);
  if (entry) {
    try {
      return raDecToAzAlt(entry.ra, entry.dec, lat, lon, date).altitude;
    } catch {
      return null;
    }
  }

  return null;
}
