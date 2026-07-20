import { describe, expect, it } from 'vitest';
import {
  angularSeparation,
  circularMedian,
  eventToPointing,
} from '@/lib/sky/use-device-heading';

/**
 * The sky dome is only as good as this geometry, and it has regressed twice
 * before (see `9f3e08b`, `a3d443b`). These cases pin the physical meaning of
 * every axis: each one is a pose you can reproduce by hand with a phone.
 *
 * Device frame, portrait reference: +X right edge, +Y top edge, +Z out of the
 * screen. The camera looks along −Z. World frame is East-North-Up.
 */
function ev(alpha: number, beta: number, gamma: number): DeviceOrientationEvent {
  return { alpha, beta, gamma, absolute: false } as DeviceOrientationEvent;
}

describe('eventToPointing — camera aim', () => {
  it('reads straight down when the phone lies flat, screen up', () => {
    // Phone on a table. The back camera faces the floor.
    const p = eventToPointing(ev(0, 0, 0))!;
    expect(p.altitude).toBeCloseTo(-90, 4);
  });

  it('reads the horizon due north when the phone is held upright facing north', () => {
    // β = 90° stands the phone vertical; α = 0 keeps its top edge at north.
    const p = eventToPointing(ev(0, 90, 0))!;
    expect(p.altitude).toBeCloseTo(0, 4);
    expect(p.headingRaw).toBeCloseTo(0, 4);
  });

  it('tracks yaw: rotating the device 90° swings the aim 90°', () => {
    // α increases counter-clockwise, so the heading of the aim decreases.
    const p = eventToPointing(ev(90, 90, 0))!;
    expect(p.altitude).toBeCloseTo(0, 4);
    expect(p.headingRaw).toBeCloseTo(270, 4);
  });

  it('reads the zenith when the phone is held screen-down, flat', () => {
    const p = eventToPointing(ev(0, 180, 0))!;
    expect(p.altitude).toBeCloseTo(90, 4);
  });

  it('reads a 45° altitude when the phone is tilted halfway back', () => {
    const p = eventToPointing(ev(0, 135, 0))!;
    expect(p.altitude).toBeCloseTo(45, 4);
    expect(p.headingRaw).toBeCloseTo(0, 4);
  });

  it('returns null when beta or gamma are missing', () => {
    expect(eventToPointing({ alpha: 0, beta: null, gamma: 0 } as DeviceOrientationEvent)).toBeNull();
  });
});

describe('eventToPointing — the compass reference axis', () => {
  /**
   * `webkitCompassHeading` describes the device's +Y (top) edge. `topAzRaw` is
   * that same axis in our frame, and comparing the two is what yields the
   * north offset — so it has to agree with the compass or the anchor is wrong.
   */
  it('puts the top edge due north when the phone is level and unrotated', () => {
    const p = eventToPointing(ev(0, 0, 0))!;
    expect(p.topAzRaw).toBeCloseTo(0, 4);
  });

  it('swings the top edge west when the device yaws 90° counter-clockwise', () => {
    const p = eventToPointing(ev(90, 0, 0))!;
    expect(p.topAzRaw).toBeCloseTo(270, 4);
  });

  it('refuses to report a reference axis when the phone points at the sky', () => {
    // THE bug this rewrite exists for. At β = 90° the top edge aims at the
    // zenith, its horizontal projection vanishes, and `magneticHeading`
    // becomes undefined and flips ~180° across vertical. Sampling here is
    // what produced the "moon on the wrong side of the dome" reports, so the
    // reference axis must read as unusable rather than as some number.
    expect(eventToPointing(ev(0, 90, 0))!.topAzRaw).toBeNull();
    expect(eventToPointing(ev(0, 88, 0))!.topAzRaw).toBeNull();
    expect(eventToPointing(ev(0, 92, 0))!.topAzRaw).toBeNull();
  });

  it('still reports a reference axis in the level poses we sample at', () => {
    // The gate accepts |β| ≤ 50°, so every pose inside it must be usable.
    for (const beta of [-50, -25, 0, 25, 50]) {
      expect(eventToPointing(ev(0, beta, 0))!.topAzRaw).not.toBeNull();
    }
  });
});

describe('circularMedian', () => {
  it('returns null for an empty window', () => {
    expect(circularMedian([])).toBeNull();
  });

  it('averages correctly across the 0/360 wrap', () => {
    // A naive arithmetic mean of these gives ~180° — the exact opposite
    // direction. This is why the anchor uses circular statistics.
    const m = circularMedian([358, 359, 0, 1, 2])!;
    expect(Math.abs(((m + 180) % 360) - 180)).toBeLessThan(2);
  });

  it('ignores a large one-sided outlier', () => {
    // Magnetometer spikes near metal are big and one-directional; a mean
    // would let a single reading drag the whole anchor.
    const m = circularMedian([100, 101, 100, 99, 100, 220])!;
    expect(m).toBeGreaterThan(98);
    expect(m).toBeLessThan(102);
  });
});

describe('angularSeparation', () => {
  it('is zero for identical directions', () => {
    expect(angularSeparation(30, 120, 30, 120)).toBeCloseTo(0, 6);
  });

  it('measures azimuth separation along the horizon', () => {
    expect(angularSeparation(0, 0, 0, 90)).toBeCloseTo(90, 6);
  });

  it('collapses azimuth differences at the zenith', () => {
    // Two "directions" at alt 90 are the same point regardless of azimuth.
    expect(angularSeparation(90, 0, 90, 180)).toBeCloseTo(0, 4);
  });
});
