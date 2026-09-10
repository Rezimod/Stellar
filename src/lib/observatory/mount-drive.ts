/**
 * The mount as a machine with two axes, driven by hand.
 *
 * A GoTo is a planned timeline (see mission.ts). Holding a direction key on a
 * NexStar hand control is not: the axis spins up while the key is down and
 * spins down when it is released, at whichever of the nine rates is selected.
 * This module integrates that motion so the frame can be steered by hand,
 * with the same limits the real fork has.
 */

import type { AltAz } from './safety';

export type Axis = 'alt' | 'az';

/** Sidereal rate, degrees per second — what the tracking drive runs at. */
export const SIDEREAL_DEG_S = 15.041 / 3600;

/** Rate 9 on this mount. Celestron quotes 3-4°/s depending on the power source. */
export const MAX_SLEW_DEG_S = 3;

/**
 * The nine hand-control rates, as the NexStar manual lists them: 1-5 are
 * multiples of sidereal for centring in an eyepiece, 6-9 are degrees per
 * second for getting across the sky.
 */
export const HC_RATES: ReadonlyArray<{ rate: number; degPerSec: number; label: string }> = [
  { rate: 1, degPerSec: 0.5 * SIDEREAL_DEG_S, label: '0.5×' },
  { rate: 2, degPerSec: 2 * SIDEREAL_DEG_S, label: '2×' },
  { rate: 3, degPerSec: 8 * SIDEREAL_DEG_S, label: '8×' },
  { rate: 4, degPerSec: 16 * SIDEREAL_DEG_S, label: '16×' },
  { rate: 5, degPerSec: 32 * SIDEREAL_DEG_S, label: '32×' },
  { rate: 6, degPerSec: 0.5, label: '0.5°/s' },
  { rate: 7, degPerSec: 1, label: '1°/s' },
  { rate: 8, degPerSec: 2, label: '2°/s' },
  { rate: 9, degPerSec: MAX_SLEW_DEG_S, label: '3°/s' },
];

export function rateDegPerSec(rate: number): number {
  return (HC_RATES.find((r) => r.rate === rate) ?? HC_RATES[HC_RATES.length - 1]).degPerSec;
}

/**
 * Where the altitude axis will physically go. The 20° observing floor and the
 * 85° tracking ceiling in safety.ts are about targets; the fork itself swings
 * from the horizon to just short of straight up.
 */
export const ALT_TRAVEL = { min: 0, max: 89 } as const;

/**
 * Spin-up and spin-down at full rate, seconds. Measured from recordings of a
 * NexStar 8SE: the motors reach pitch in under half a second and take three
 * times longer to wind down. Slower rates scale both proportionally.
 */
export const SPIN_UP_S = 0.4;
export const SPIN_DOWN_S = 1.5;

/** Longest step the integrator will take. A tab left in the background must not slew across the sky on return. */
const MAX_STEP_S = 0.1;

export type AxisRates = { alt: number; az: number };

export class MountDrive {
  altitude = 0;
  azimuth = 0;
  private commanded: AxisRates = { alt: 0, az: 0 };
  private actual: AxisRates = { alt: 0, az: 0 };
  private lastMs: number | null = null;

  setPointing(p: AltAz) {
    this.altitude = Math.min(ALT_TRAVEL.max, Math.max(ALT_TRAVEL.min, p.altitude));
    this.azimuth = ((p.azimuth % 360) + 360) % 360;
  }

  get pointing(): AltAz {
    return { altitude: this.altitude, azimuth: this.azimuth };
  }

  /** Signed actual rate on each axis, degrees per second. */
  get rates(): AxisRates {
    return { ...this.actual };
  }

  get moving(): boolean {
    return (
      this.actual.alt !== 0 || this.actual.az !== 0 || this.commanded.alt !== 0 || this.commanded.az !== 0
    );
  }

  press(axis: Axis, direction: 1 | -1, rate: number) {
    this.commanded[axis] = direction * rateDegPerSec(rate);
  }

  release(axis: Axis) {
    this.commanded[axis] = 0;
  }

  /** Both keys up. The axes still take their spin-down time to stop. */
  releaseAll() {
    this.commanded.alt = 0;
    this.commanded.az = 0;
  }

  /** Emergency stop: the axes are dead now, no spin-down. */
  halt() {
    this.releaseAll();
    this.actual.alt = 0;
    this.actual.az = 0;
  }

  /** Advance the axes to `nowMs`. Returns the new pointing. */
  step(nowMs: number): AltAz {
    if (this.lastMs === null) {
      this.lastMs = nowMs;
      return this.pointing;
    }
    const dt = Math.min(MAX_STEP_S, Math.max(0, (nowMs - this.lastMs) / 1000));
    this.lastMs = nowMs;

    for (const axis of ['alt', 'az'] as const) {
      this.actual[axis] = ramp(this.actual[axis], this.commanded[axis], dt);
    }

    const alt = this.altitude + this.actual.alt * dt;
    if (alt <= ALT_TRAVEL.min || alt >= ALT_TRAVEL.max) {
      // The fork is against its stop. The motor stalls; it does not keep pushing.
      this.altitude = Math.min(ALT_TRAVEL.max, Math.max(ALT_TRAVEL.min, alt));
      this.actual.alt = 0;
    } else {
      this.altitude = alt;
    }
    this.azimuth = (((this.azimuth + this.actual.az * dt) % 360) + 360) % 360;

    return this.pointing;
  }
}

/**
 * Move an axis rate toward what is commanded, with the motor's own
 * acceleration. Speeding up is quick; slowing down — including reversing,
 * which has to pass through zero — takes the longer spin-down.
 */
function ramp(actual: number, commanded: number, dt: number): number {
  if (actual === commanded) return actual;
  const speedingUp = Math.sign(commanded) === Math.sign(actual) && Math.abs(commanded) > Math.abs(actual);
  const accel = MAX_SLEW_DEG_S / (speedingUp ? SPIN_UP_S : SPIN_DOWN_S);
  const delta = accel * dt;
  if (Math.abs(commanded - actual) <= delta) return commanded;
  return actual + Math.sign(commanded - actual) * delta;
}
