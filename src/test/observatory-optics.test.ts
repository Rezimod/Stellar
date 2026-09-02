import { describe, expect, it } from 'vitest';
import {
  apparentDiameterArcsec,
  fieldOfView,
  fieldRotationDegPerHour,
  focalRatio,
  resolvingPowerArcsec,
} from '@/lib/observatory/optics';
import { NODES } from '@/lib/observatory/nodes';

const instrument = NODES[0].instrument;

describe('field of view', () => {
  it('frames about 26 x 14 arcmin on a 6SE at native focal length', () => {
    const fov = fieldOfView(instrument);

    expect(fov.widthArcmin).toBeCloseTo(25.6, 1);
    expect(fov.heightArcmin).toBeCloseTo(14.5, 1);
  });

  it('cannot fit the full Moon, which is about 31 arcmin across', () => {
    expect(fieldOfView(instrument).widthArcmin).toBeLessThan(31);
  });

  it('is inversely proportional to focal length', () => {
    const reduced = fieldOfView({ ...instrument, focalLengthMm: 945 });

    expect(reduced.widthArcmin).toBeCloseTo(fieldOfView(instrument).widthArcmin * (1500 / 945), 3);
    // With the f/6.3 reducer the Moon does fit.
    expect(reduced.widthArcmin).toBeGreaterThan(31);
  });

  it('reports a sub-arcsecond plate scale, so seeing is the limit and not the sensor', () => {
    expect(fieldOfView(instrument).plateScaleArcsecPx).toBeCloseTo(0.4, 1);
  });
});

describe('instrument constants', () => {
  it('computes the focal ratio', () => {
    expect(focalRatio(instrument)).toBeCloseTo(10, 6);
  });

  it('gives a 150 mm aperture a resolving power under an arcsecond', () => {
    expect(resolvingPowerArcsec(instrument)).toBeCloseTo(0.77, 2);
  });
});

describe('apparent diameter', () => {
  it('puts Jupiter in the 30-50 arcsecond range', () => {
    const d = apparentDiameterArcsec('jupiter', new Date('2026-01-15T20:00:00Z'));

    expect(d).not.toBeNull();
    expect(d!).toBeGreaterThan(29);
    expect(d!).toBeLessThan(51);
  });

  it('puts the Moon near half a degree', () => {
    const d = apparentDiameterArcsec('moon', new Date('2026-01-15T20:00:00Z'))!;

    expect(d / 60).toBeGreaterThan(28);
    expect(d / 60).toBeLessThan(35);
  });

  it('varies Mars with distance rather than returning a constant', () => {
    const near = apparentDiameterArcsec('mars', new Date('2027-02-19T00:00:00Z'))!;
    const far = apparentDiameterArcsec('mars', new Date('2026-01-15T00:00:00Z'))!;

    expect(near).not.toBeCloseTo(far, 1);
  });

  it('returns null for anything that is not a solar-system body', () => {
    expect(apparentDiameterArcsec('m42', new Date())).toBeNull();
  });
});

describe('field rotation', () => {
  it('is faster near the zenith than low down', () => {
    const high = Math.abs(fieldRotationDegPerHour(41.7, 80, 180));
    const low = Math.abs(fieldRotationDegPerHour(41.7, 25, 180));

    expect(high).toBeGreaterThan(low);
  });

  it('reverses sign either side of the meridian', () => {
    const south = fieldRotationDegPerHour(41.7, 50, 0);
    const north = fieldRotationDegPerHour(41.7, 50, 180);

    expect(Math.sign(south)).toBe(-Math.sign(north));
  });

  it('does not diverge exactly at the zenith', () => {
    expect(Number.isFinite(fieldRotationDegPerHour(41.7, 90, 180))).toBe(true);
  });
});
