import { describe, expect, it } from 'vitest';
import {
  ALT_TRAVEL,
  HC_RATES,
  MAX_SLEW_DEG_S,
  MountDrive,
  SIDEREAL_DEG_S,
  SPIN_DOWN_S,
  SPIN_UP_S,
  rateDegPerSec,
} from '@/lib/observatory/mount-drive';

/** Run the drive in 16 ms frames for `seconds`. */
function run(drive: MountDrive, fromMs: number, seconds: number): number {
  let t = fromMs;
  const end = fromMs + seconds * 1000;
  while (t < end) {
    t += 16;
    drive.step(t);
  }
  return t;
}

describe('hand-control rates', () => {
  it('lists the nine NexStar rates in order, sidereal multiples first', () => {
    expect(HC_RATES.map((r) => r.rate)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(rateDegPerSec(5)).toBeCloseTo(32 * SIDEREAL_DEG_S, 9);
    expect(rateDegPerSec(9)).toBe(MAX_SLEW_DEG_S);
  });

  it('crosses a 26-arcminute field in about three seconds at rate 5', () => {
    expect((26 / 60) / rateDegPerSec(5)).toBeGreaterThan(3);
    expect((26 / 60) / rateDegPerSec(5)).toBeLessThan(3.5);
  });
});

describe('the drive', () => {
  it('spins up in under half a second and holds the commanded rate', () => {
    const drive = new MountDrive();
    drive.setPointing({ altitude: 40, azimuth: 180 });
    drive.step(0);
    drive.press('az', 1, 9);
    run(drive, 0, SPIN_UP_S + 0.05);

    expect(drive.rates.az).toBeCloseTo(MAX_SLEW_DEG_S, 6);
    expect(drive.azimuth).toBeGreaterThan(180);
  });

  it('keeps moving through its spin-down after the key is released', () => {
    const drive = new MountDrive();
    drive.setPointing({ altitude: 40, azimuth: 180 });
    drive.step(0);
    drive.press('az', 1, 9);
    let t = run(drive, 0, 1);
    drive.release('az');
    const atRelease = drive.azimuth;
    t = run(drive, t, SPIN_DOWN_S / 2);

    expect(drive.rates.az).toBeGreaterThan(0);
    expect(drive.rates.az).toBeLessThan(MAX_SLEW_DEG_S);
    expect(drive.azimuth).toBeGreaterThan(atRelease);

    run(drive, t, SPIN_DOWN_S);
    expect(drive.rates.az).toBe(0);
    expect(drive.moving).toBe(false);
  });

  it('stalls against the altitude stop instead of going over the top', () => {
    const drive = new MountDrive();
    drive.setPointing({ altitude: 88, azimuth: 0 });
    drive.step(0);
    drive.press('alt', 1, 9);
    run(drive, 0, 3);

    expect(drive.altitude).toBe(ALT_TRAVEL.max);
    expect(drive.rates.alt).toBe(0);
  });

  it('wraps azimuth through north', () => {
    const drive = new MountDrive();
    drive.setPointing({ altitude: 40, azimuth: 359 });
    drive.step(0);
    drive.press('az', 1, 9);
    run(drive, 0, 2);

    expect(drive.azimuth).toBeGreaterThan(0);
    expect(drive.azimuth).toBeLessThan(10);
  });

  it('is barely moving at a centring rate', () => {
    const drive = new MountDrive();
    drive.setPointing({ altitude: 40, azimuth: 180 });
    drive.step(0);
    drive.press('alt', -1, 3);
    run(drive, 0, 10);

    // Rate 3 is 8x sidereal: a third of a degree in ten seconds.
    expect(40 - drive.altitude).toBeCloseTo(10 * 8 * SIDEREAL_DEG_S, 2);
  });

  it('never integrates a long background gap into a jump', () => {
    const drive = new MountDrive();
    drive.setPointing({ altitude: 40, azimuth: 180 });
    drive.step(0);
    drive.press('az', 1, 9);
    run(drive, 0, 1);
    const before = drive.azimuth;
    drive.step(60_000);

    expect(drive.azimuth - before).toBeLessThan(0.5);
  });
});
