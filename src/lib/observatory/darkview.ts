/**
 * Stellar's client for a Darkview observatory.
 *
 * Darkview is a separate, grant-funded project with its own repository and an
 * audited statement that it shares no code with Stellar — see
 * docs/observatory-network.md §4.1. Nothing here is copied from it. This file
 * speaks its published contract (`contracts/openapi.yaml`, operation
 * `getObservatoryStatus`) the way any third-party client would, and the shape
 * below is only the subset Stellar reads.
 *
 * The single most important thing in this file is that Darkview has two modes.
 * Its contract says, in as many words, that SIMULATED is the default always and
 * that REAL is reachable only through an explicit attended operator action. So
 * being connected to a Darkview observatory does not make a frame evidence —
 * being connected to one that is in REAL mode, right now, does. Everything else
 * resolves to 'simulated', including every failure.
 */

import { getSunAltitude, getTonightDarkWindow } from '@/lib/dark-window';
import {
  CLOUD_LIMIT,
  SUN_LIMIT_DEG,
  currentCloudCover,
  type ObservatoryAdapter,
} from './adapter';
import type { Provenance } from './provenance';
import type { NodeReadiness, ObservatoryNode } from './types';

/** A status poll that has not answered in this long is a node that is not there. */
const TIMEOUT_MS = 4_000;

/** The slice of PublicObservatoryStatus Stellar reads. */
type DarkviewStatus = {
  mode: 'SIMULATED' | 'REAL';
  link: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  weatherStatus: 'CLEAR' | 'CLOUDY' | 'UNSAFE' | 'UNKNOWN';
  weatherHold: boolean;
  weatherNote: string | null;
  missionInProgress: boolean;
};

export class DarkviewAdapter implements ObservatoryAdapter {
  /**
   * Empty when the node declares a link but no address is configured. That is a
   * misconfiguration, not a simulator, and it resolves to offline rather than
   * quietly becoming one.
   */
  constructor(private readonly baseUrl: string) {}

  /**
   * Instrument-grade only while the observatory is in REAL mode and its agent
   * is connected. A DEGRADED link means the heartbeat is late, which is exactly
   * when we know least about what the telescope is doing, so it does not
   * qualify. Every other answer — simulated mode, no link, a malformed reply, a
   * timeout, a thrown error — is 'simulated'.
   */
  async provenanceNow(): Promise<Provenance> {
    const status = await this.status();
    if (!status) return 'simulated';
    return status.mode === 'REAL' && status.link === 'ONLINE' ? 'instrument' : 'simulated';
  }

  async getReadiness(node: ObservatoryNode, now = new Date()): Promise<NodeReadiness> {
    const dark = getTonightDarkWindow(node.lat, node.lon, now);
    const base = {
      nodeId: node.id,
      checkedAt: now.toISOString(),
      nextWindowAt: dark.duskStart?.toISOString() ?? null,
    };

    const status = await this.status();
    if (!status || status.link === 'OFFLINE') {
      return {
        ...base,
        state: 'offline',
        cloudCover: null,
        detail: status ? `No agent connection at ${node.site}.` : null,
      };
    }
    if (status.link === 'DEGRADED') {
      return {
        ...base,
        state: 'offline',
        cloudCover: null,
        detail: `Heartbeat is late at ${node.site}.`,
      };
    }

    // The Sun is Stellar's own arithmetic, not something to ask a telescope.
    const sunAltitude = getSunAltitude(node.lat, node.lon, now);
    if (sunAltitude > SUN_LIMIT_DEG) {
      return {
        ...base,
        state: 'daylight',
        cloudCover: null,
        detail:
          sunAltitude > 0
            ? `Sun is ${sunAltitude.toFixed(0)}° above the horizon at ${node.site}.`
            : `Twilight at ${node.site} — the sky is not dark enough yet.`,
      };
    }

    // Darkview reports a verdict; Stellar has the number. Neither overrides the
    // other — an operator hold stands whatever the forecast says.
    const cloudCover = await currentCloudCover(node, now);
    if (status.weatherHold || status.weatherStatus === 'UNSAFE') {
      return {
        ...base,
        state: 'weather',
        cloudCover,
        detail: status.weatherNote ?? `The operator has held ${node.site} for weather.`,
      };
    }
    if (status.weatherStatus === 'CLOUDY' || (cloudCover !== null && cloudCover > CLOUD_LIMIT)) {
      return {
        ...base,
        state: 'weather',
        cloudCover,
        detail:
          cloudCover !== null
            ? `${Math.round(cloudCover)}% cloud over ${node.site}.`
            : `Cloud over ${node.site}.`,
      };
    }

    if (status.missionInProgress) {
      return { ...base, state: 'busy', cloudCover, detail: 'A mission is running.' };
    }

    return {
      ...base,
      state: 'online',
      cloudCover,
      detail:
        status.mode === 'SIMULATED'
          ? 'Connected, and running its own simulator — frames are not evidence.'
          : null,
    };
  }

  /** Null on anything at all going wrong. Callers must treat null as the worst case. */
  private async status(): Promise<DarkviewStatus | null> {
    if (!this.baseUrl) return null;

    try {
      const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/observatory/state`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return null;
      return parse(await res.json());
    } catch {
      return null;
    }
  }
}

/**
 * Validated at the boundary, because this is another service's output.
 *
 * Anything unrecognised in `mode` or `link` fails the whole parse rather than
 * defaulting: a future enum member Stellar has never heard of must not be
 * guessed at when the guess decides whether something can be minted.
 */
function parse(body: unknown): DarkviewStatus | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;

  const mode = b.mode;
  const link = b.link;
  if (mode !== 'SIMULATED' && mode !== 'REAL') return null;
  if (link !== 'ONLINE' && link !== 'DEGRADED' && link !== 'OFFLINE') return null;

  const weather = (typeof b.weather === 'object' && b.weather !== null ? b.weather : {}) as Record<
    string,
    unknown
  >;
  const weatherStatus = weather.status;

  return {
    mode,
    link,
    weatherStatus:
      weatherStatus === 'CLEAR' ||
      weatherStatus === 'CLOUDY' ||
      weatherStatus === 'UNSAFE' ||
      weatherStatus === 'UNKNOWN'
        ? weatherStatus
        : 'UNKNOWN',
    // An absent hold flag is treated as held. The cost of a false hold is a
    // customer waiting; the cost of a missed one is a wet telescope.
    weatherHold: weather.holdActive !== false,
    weatherNote: typeof weather.note === 'string' ? weather.note : null,
    missionInProgress: b.missionInProgress === true,
  };
}
