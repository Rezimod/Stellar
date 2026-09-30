import { getTonightDarkWindow } from '@/lib/dark-window';
import type { Station } from '@/lib/observatory/sim-stations';
import { targetPosition, type TelescopeTarget } from '@/lib/observatory/telescope-targets';
import { SET_001_CARDS } from '@/lib/sets/set-001';

export type Span = { start: number; end: number };
export type PathPoint = { t: number; altitude: number; azimuth: number };

/** Tonight's dark window at a station, or the next twelve hours where the Sun never goes down far enough. */
export function nightSpan(station: Station, now: Date): Span {
  const w = getTonightDarkWindow(station.lat, station.lon, now, station.timezone);
  if (w.duskStart && w.dawnEnd) return { start: w.duskStart.getTime(), end: w.dawnEnd.getTime() };
  return { start: now.getTime(), end: now.getTime() + 12 * 3_600_000 };
}

export function altitudePath(target: TelescopeTarget, station: Station, span: Span, samples = 40): PathPoint[] {
  return Array.from({ length: samples + 1 }, (_, i) => {
    const t = span.start + ((span.end - span.start) * i) / samples;
    const p = targetPosition(target, station, new Date(t));
    return { t, altitude: p.altitude, azimuth: p.azimuth };
  });
}

export const bestOf = (path: PathPoint[]) => path.reduce((a, b) => (b.altitude > a.altitude ? b : a));

/** The next moment, within a day, the target climbs above the horizon. */
export function risesAt(target: TelescopeTarget, station: Station, now: Date): number | null {
  for (let m = 10; m <= 24 * 60; m += 10) {
    const t = now.getTime() + m * 60_000;
    if (targetPosition(target, station, new Date(t)).altitude > 0) return t;
  }
  return null;
}

export function clock(t: number, timezone: string, seconds = false) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    ...(seconds ? { second: '2-digit' } : {}),
    hourCycle: 'h23',
  }).format(new Date(t));
}

/** The First Light card drawn of each telescope target, where there is one. */
const CARD_BY_TARGET = new Map<string, string>();
for (const c of SET_001_CARDS) {
  const id = c.seed.targetId;
  if (c.seed.observationStatus === 'not_available') continue;
  for (const key of [id, `star-${id}`]) if (!CARD_BY_TARGET.has(key)) CARD_BY_TARGET.set(key, c.seed.designation);
}
export const cardForTarget = (id: string) => CARD_BY_TARGET.get(id) ?? null;
export const plateArt = (designation: string, layer: 'sky' | 'object' | 'survey') => `/cards/plate/${designation}/${layer}.svg`;
