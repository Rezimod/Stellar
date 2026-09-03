/**
 * When a node can be booked.
 *
 * A slot exists only where two windows overlap: the sky is dark at the site,
 * and the operator has said they will accept work. Both are computed here, so
 * the timetable a visitor sees is the timetable the instrument could actually
 * honour — no slot is offered at noon, or at 04:00 to an operator who sleeps.
 *
 * Pure and deterministic: the same node and the same `now` always yield the
 * same slots, with the same ids, on the server and in a test. Weather is a
 * separate, decorating step because it is the only part that needs a network.
 */

import { getSunAltitude, getTonightDarkWindow } from '@/lib/dark-window';
import { fetchSkyForecast } from '@/lib/sky-data';
import { LIMITS } from './safety';
import { siteDateStamp, siteHourStamp, siteLocalHours } from './site-time';
import type { ObservatoryNode } from './types';

/** Minutes between one session ending and the next starting: park, hand over, re-align. */
const TURNAROUND_MIN = 10;
/** Slots start on this grid, so a night reads as a timetable rather than a stream of odd minutes. */
const GRID_MIN = 10;
/** A slot closer than this to its start cannot be booked — the node needs warning. */
const LEAD_MIN = 30;
/** How far ahead the timetable runs. Open-Meteo carries seven days of cloud. */
export const DEFAULT_NIGHTS = 5;

const MIN_MS = 60_000;

export type Slot = {
  /** `nodeId:2026-09-04T18:30Z` — deterministic, so a client cannot invent one. */
  id: string;
  nodeId: string;
  startsAt: string;
  endsAt: string;
  /** The night this slot belongs to, as the site's own calendar date. */
  night: string;
  /** Cloud cover percent at the site for the hour it starts, where the forecast reaches. */
  cloudCover: number | null;
};

export function slotId(nodeId: string, startsAt: Date): string {
  return `${nodeId}:${startsAt.toISOString().slice(0, 16)}Z`;
}

/**
 * Every bookable slot for this node over the next `nights` nights.
 *
 * Nights are walked one calendar day at a time because a dark window belongs
 * to a night, not to a date: the window that opens at 20:40 closes at 05:10
 * the following morning, and both halves are the same night's slots.
 */
export function buildSlots(
  node: ObservatoryNode,
  { now = new Date(), nights = DEFAULT_NIGHTS }: { now?: Date; nights?: number } = {},
): Slot[] {
  const earliest = now.getTime() + LEAD_MIN * MIN_MS;
  const lengthMs = node.sessionMinutes * MIN_MS;
  const grid = GRID_MIN * MIN_MS;

  const slots: Slot[] = [];
  const seen = new Set<string>();

  for (let n = 0; n < nights; n++) {
    const dark = getTonightDarkWindow(node.lat, node.lon, new Date(now.getTime() + n * 86_400_000));
    // No astronomical night at this latitude on this date — nothing to sell.
    if (!dark.duskStart || !dark.dawnEnd) continue;

    const windowEnd = dark.dawnEnd.getTime();
    let cursor = Math.ceil(Math.max(dark.duskStart.getTime(), earliest) / grid) * grid;

    while (cursor + lengthMs <= windowEnd) {
      const startsAt = new Date(cursor);
      const endsAt = new Date(cursor + lengthMs);
      const lastInstant = new Date(cursor + lengthMs - 1);

      // The dark window bounds the search cheaply; the Sun decides. Its
      // altitude is the same measure the readiness gate uses, and the two
      // disagree by a few minutes at the edges — on which side, a booked
      // session would be handed a sky still too bright to work in.
      if (getSunAltitude(node.lat, node.lon, startsAt) > LIMITS.sunAltitudeCeilingDeg) {
        // Still dusk: try again a grid step later, when it is darker.
        cursor += grid;
        continue;
      }
      if (getSunAltitude(node.lat, node.lon, lastInstant) > LIMITS.sunAltitudeCeilingDeg) {
        // Dark at the start but light by the end means dawn — the night is over.
        break;
      }

      if (!withinOperatorHours(node, startsAt, endsAt)) {
        // Step by the grid rather than a whole session, so the first slot of
        // the operator's window starts when the window does.
        cursor += grid;
        continue;
      }

      const id = slotId(node.id, startsAt);
      if (!seen.has(id)) {
        seen.add(id);
        slots.push({
          id,
          nodeId: node.id,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          night: nightOf(node.timezone, startsAt),
          cloudCover: null,
        });
      }
      cursor += lengthMs + TURNAROUND_MIN * MIN_MS;
    }
  }

  return slots.sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1));
}

/** The one slot with this id, or null when the id is not a slot this node offers. */
export function findSlot(
  node: ObservatoryNode,
  id: string,
  options?: { now?: Date; nights?: number },
): Slot | null {
  return buildSlots(node, options).find((s) => s.id === id) ?? null;
}

/** Cloud cover at the site for each slot's starting hour. Never throws; weather is optional. */
export async function attachForecast(node: ObservatoryNode, slots: Slot[]): Promise<Slot[]> {
  if (slots.length === 0) return slots;

  try {
    const days = await fetchSkyForecast(node.lat, node.lon);
    const byHour = new Map<string, number>();
    for (const day of days) {
      for (const hour of day.hours) byHour.set(hour.time.slice(0, 13), hour.cloudCover);
    }

    return slots.map((slot) => ({
      ...slot,
      cloudCover: byHour.get(siteHourStamp(node.timezone, new Date(slot.startsAt))) ?? null,
    }));
  } catch {
    return slots;
  }
}

/**
 * The night a slot belongs to.
 *
 * A 01:20 slot is part of the evening that preceded it, not of the calendar
 * day it lands in — so the timetable groups the way an observer thinks.
 */
function nightOf(timezone: string, startsAt: Date): string {
  return siteDateStamp(timezone, new Date(startsAt.getTime() - 12 * 3_600_000));
}

/** Both ends of the session must fall inside the operator's declared hours. */
function withinOperatorHours(node: ObservatoryNode, startsAt: Date, endsAt: Date): boolean {
  const window = node.availability;
  if (!window) return true;

  const inside = (at: Date) => {
    const hour = siteLocalHours(node.timezone, at);
    return window.fromHourLocal <= window.toHourLocal
      ? hour >= window.fromHourLocal && hour < window.toHourLocal
      : hour >= window.fromHourLocal || hour < window.toHourLocal;
  };

  // The last instant of the session, not the first instant of the next one.
  return inside(startsAt) && inside(new Date(endsAt.getTime() - 1));
}
