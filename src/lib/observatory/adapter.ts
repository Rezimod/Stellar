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
import type { Provenance } from './provenance';
import { utcHourStamp } from './site-time';
import type { NodeReadiness, ObservatoryNode, ReadinessState } from './types';

export interface ObservatoryAdapter {
  /**
   * What a frame taken *right now* is worth. Declared by the adapter itself,
   * so a capture cannot acquire instrument provenance by passing through a
   * surface that forgot to ask.
   *
   * This was a constant until a real node platform arrived and turned out to
   * have two modes. Darkview's own contract says SIMULATED is its default,
   * always, and REAL is reachable only through an explicit attended operator
   * action — so an adapter that answered 'instrument' because of what it is
   * connected to, rather than what that thing is doing, would mint a
   * simulator's output onto mainnet. Provenance is a property of the frame,
   * not of the class that fetched it.
   *
   * Must never throw and must fail closed: an adapter that cannot find out
   * answers 'simulated'.
   */
  provenanceNow(node: ObservatoryNode, now?: Date): Promise<Provenance>;

  /** Live operational state. Must never throw — a node that cannot answer is offline. */
  getReadiness(node: ObservatoryNode, now?: Date): Promise<NodeReadiness>;
}

/** Above this cloud cover the sky is not worth an instrument's time. */
export const CLOUD_LIMIT = 70;
/** The Sun must be at least this far down before a mission can start. */
export const SUN_LIMIT_DEG = -12;

/**
 * Readiness for a node with no hardware link yet.
 *
 * "Simulated" describes the *instrument*, not the sky: the Sun geometry and
 * the cloud cover are the real values for the real site. A node that has been
 * built but not yet wired therefore reports the truth about its conditions,
 * and only its hardware state is assumed.
 */
export class SimNodeAdapter implements ObservatoryAdapter {
  /** A model of the optics can never be evidence, whatever the sky is doing. */
  async provenanceNow(): Promise<Provenance> {
    return 'simulated';
  }

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
export async function currentCloudCover(node: ObservatoryNode, now: Date): Promise<number | null> {
  try {
    const days = await fetchSkyForecast(node.lat, node.lon);
    const hours = days.flatMap((d) => d.hours);
    if (hours.length === 0) return null;

    const stamp = utcHourStamp(now);
    return hours.find((h) => h.time.slice(0, 13) === stamp)?.cloudCover ?? null;
  } catch {
    return null;
  }
}
