/**
 * The boundary between Stellar and a telescope.
 *
 * Stellar never talks to hardware — it talks to an adapter. One implementation
 * exists per node kind: the simulator here, and a network adapter per partner
 * platform. See docs/observatory-network.md §4, including the rule that no
 * node platform's source may enter this repository.
 *
 * The interface is deliberately small. Booking, mission leases and command
 * envelopes join it when the booking slice lands; adding them now would be
 * shape without behaviour.
 */

import { getSunAltitude, getTonightDarkWindow } from '@/lib/dark-window';
import { fetchSkyForecast } from '@/lib/sky-data';
import type { NodeReadiness, ObservatoryNode, ReadinessState } from './types';

export interface ObservatoryAdapter {
  /** Live operational state. Must never throw — a node that cannot answer is offline. */
  getReadiness(node: ObservatoryNode, now?: Date): Promise<NodeReadiness>;
}

/** Above this cloud cover the sky is not worth an instrument's time. */
const CLOUD_LIMIT = 70;
/** The Sun must be at least this far down before a mission can start. */
const SUN_LIMIT_DEG = -12;

/**
 * Readiness for a node with no hardware link yet.
 *
 * "Simulated" describes the *instrument*, not the sky: the Sun geometry and
 * the cloud cover are the real values for the real site. A node that has been
 * built but not yet wired therefore reports the truth about its conditions,
 * and only its hardware state is assumed.
 */
export class SimNodeAdapter implements ObservatoryAdapter {
  async getReadiness(node: ObservatoryNode, now = new Date()): Promise<NodeReadiness> {
    const base = {
      nodeId: node.id,
      checkedAt: now.toISOString(),
    };

    const sunAltitude = getSunAltitude(node.lat, node.lon, now);
    const dark = getTonightDarkWindow(node.lat, node.lon, now);
    const nextWindowAt = dark.duskStart?.toISOString() ?? null;

    if (sunAltitude > SUN_LIMIT_DEG) {
      return {
        ...base,
        state: 'daylight',
        cloudCover: null,
        nextWindowAt,
        detail:
          sunAltitude > 0
            ? `Sun is ${sunAltitude.toFixed(0)}° above the horizon at ${node.site}.`
            : `Twilight at ${node.site} — the sky is not dark enough yet.`,
      };
    }

    const cloudCover = await currentCloudCover(node, now);

    if (cloudCover !== null && cloudCover > CLOUD_LIMIT) {
      return {
        ...base,
        state: 'weather',
        cloudCover,
        nextWindowAt,
        detail: `${Math.round(cloudCover)}% cloud over ${node.site}.`,
      };
    }

    const state: ReadinessState = node.status === 'active' ? 'online' : 'offline';
    return {
      ...base,
      state,
      cloudCover,
      nextWindowAt,
      detail:
        node.status === 'commissioning'
          ? 'Built and under commissioning — not yet taking bookings.'
          : null,
    };
  }
}

/** Cloud cover at the site for the hour containing `now`, or null if unavailable. */
async function currentCloudCover(node: ObservatoryNode, now: Date): Promise<number | null> {
  try {
    const days = await fetchSkyForecast(node.lat, node.lon);
    const hours = days.flatMap((d) => d.hours);
    if (hours.length === 0) return null;

    // fetchSkyForecast asks Open-Meteo for the site's own timezone, so every
    // `time` is a local wall-clock string with no offset ("2026-09-02T21:00").
    // Parsing one with `new Date` would read it in the runtime's zone — UTC on
    // Vercel — and silently select the wrong hour by the site's UTC offset.
    // Match on the site's own wall clock instead.
    const stamp = siteHourStamp(node.timezone, now);
    return hours.find((h) => h.time.slice(0, 13) === stamp)?.cloudCover ?? null;
  } catch {
    return null;
  }
}

/** `now` as "YYYY-MM-DDTHH" on the wall clock of an IANA timezone. */
function siteHourStamp(timezone: string, now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';

  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}`;
}
