import {
  Body,
  Observer,
  Equator,
  Horizon,
  Illumination,
  SearchRiseSet,
  SearchHourAngle,
} from 'astronomy-engine';

export interface PlanetInfo {
  key: string;
  altitude: number;
  azimuth: number;
  azimuthDir: string;
  rise: Date | null;
  transit: Date | null;
  set: Date | null;
  magnitude: number;
  visible: boolean;
}

const BODIES: { body: Body; key: string }[] = [
  { body: Body.Moon,    key: 'moon' },
  { body: Body.Mercury, key: 'mercury' },
  { body: Body.Venus,   key: 'venus' },
  { body: Body.Mars,    key: 'mars' },
  { body: Body.Jupiter, key: 'jupiter' },
  { body: Body.Saturn,  key: 'saturn' },
];

const AZ_DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

function azDir(az: number): string {
  return AZ_DIRS[Math.round(az / 45) % 8];
}

function fmtTime(d: Date | null): Date | null {
  return d;
}

export function getVisiblePlanets(lat: number, lng: number, date: Date): PlanetInfo[] {
  const observer = new Observer(lat, lng, 0);

  const midnight = new Date(date);
  midnight.setHours(0, 0, 0, 0);

  return BODIES.map(({ body, key }) => {
    const eq    = Equator(body, date, observer, true, true);
    const horiz = Horizon(date, observer, eq.ra, eq.dec, 'normal');

    let magnitude = 0;
    try { magnitude = Illumination(body, date).mag; } catch { /* ignore */ }

    const rise = SearchRiseSet(body, observer, +1, midnight, 1);
    const set  = SearchRiseSet(body, observer, -1, midnight, 1);

    let transit: Date | null = null;
    try {
      transit = SearchHourAngle(body, observer, 0, midnight, +1).time.date;
    } catch { /* ignore */ }

    return {
      key,
      altitude:    Math.round(horiz.altitude * 10) / 10,
      azimuth:     Math.round(horiz.azimuth),
      azimuthDir:  azDir(horiz.azimuth),
      rise:        rise ? rise.date : null,
      transit,
      set:         set  ? set.date  : null,
      magnitude:   Math.round(magnitude * 10) / 10,
      visible:     horiz.altitude > 10,
    };
  }).sort((a, b) => b.altitude - a.altitude);
}
