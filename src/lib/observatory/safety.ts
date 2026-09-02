/**
 * The safety envelope.
 *
 * Every command is checked here before the mission machine will act on it, and
 * a real node checks it again locally — a cloud-approved command that fails
 * local safety is refused. See docs/observatory-network.md §4.
 *
 * A refusal always carries the reason. Silently declining to move is how an
 * operator loses trust in an instrument.
 */

import { Body, Equator, Horizon, Observer } from 'astronomy-engine';
import type { ObservatoryNode } from './types';

export type SafetyCode =
  | 'below_horizon'
  | 'too_low'
  | 'above_mount_limit'
  | 'sun_too_close'
  | 'daylight';

export type SafetyVerdict = { ok: true } | { ok: false; code: SafetyCode; reason: string };

export type AltAz = { altitude: number; azimuth: number };

export const LIMITS = {
  /** Below this the target is in the murk, the roofline, or the trees. */
  minAltitudeDeg: 20,
  /**
   * A single-fork altazimuth cannot track through the zenith — the azimuth
   * axis would have to spin arbitrarily fast. Real limit, not a nicety.
   */
  maxAltitudeDeg: 85,
  /** Never point this close to the Sun. Sensor and eye both. */
  sunAvoidanceDeg: 30,
  /** The Sun must be at least this far down before a mission may run. */
  sunAltitudeCeilingDeg: -12,
} as const;

/** Angular separation between two horizon coordinates, in degrees. */
export function angularSeparation(a: AltAz, b: AltAz): number {
  const toRad = Math.PI / 180;
  const sinAlt = Math.sin(a.altitude * toRad) * Math.sin(b.altitude * toRad);
  const cosAlt =
    Math.cos(a.altitude * toRad) *
    Math.cos(b.altitude * toRad) *
    Math.cos((a.azimuth - b.azimuth) * toRad);
  // Clamp: floating point can push the sum a hair past ±1 and NaN the acos.
  return Math.acos(Math.min(1, Math.max(-1, sinAlt + cosAlt))) / toRad;
}

export function sunPosition(node: ObservatoryNode, now: Date): AltAz {
  const observer = new Observer(node.lat, node.lon, 0);
  const eq = Equator(Body.Sun, now, observer, true, true);
  const horizon = Horizon(now, observer, eq.ra, eq.dec, 'normal');
  return { altitude: horizon.altitude, azimuth: horizon.azimuth };
}

/**
 * May this instrument point here, now?
 *
 * Order matters: report the most fundamental reason first, so a user pointing
 * at a daytime target is told it is daytime rather than that the Sun is close.
 */
export function evaluateSafety(node: ObservatoryNode, target: AltAz, now: Date): SafetyVerdict {
  const sun = sunPosition(node, now);

  if (sun.altitude > LIMITS.sunAltitudeCeilingDeg) {
    return {
      ok: false,
      code: 'daylight',
      reason: `The Sun is ${sun.altitude.toFixed(0)}° above the horizon at ${node.site}.`,
    };
  }

  if (target.altitude <= 0) {
    return { ok: false, code: 'below_horizon', reason: 'That target is below the horizon.' };
  }

  if (target.altitude < LIMITS.minAltitudeDeg) {
    return {
      ok: false,
      code: 'too_low',
      reason: `${target.altitude.toFixed(0)}° above the horizon — below the ${LIMITS.minAltitudeDeg}° limit.`,
    };
  }

  if (target.altitude > LIMITS.maxAltitudeDeg) {
    return {
      ok: false,
      code: 'above_mount_limit',
      reason: `${target.altitude.toFixed(0)}° is inside the mount's ${LIMITS.maxAltitudeDeg}° zenith limit.`,
    };
  }

  const separation = angularSeparation(target, sun);
  if (separation < LIMITS.sunAvoidanceDeg) {
    return {
      ok: false,
      code: 'sun_too_close',
      reason: `${separation.toFixed(0)}° from the Sun — inside the ${LIMITS.sunAvoidanceDeg}° exclusion.`,
    };
  }

  return { ok: true };
}
