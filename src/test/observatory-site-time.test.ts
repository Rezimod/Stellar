import { describe, expect, it } from 'vitest';
import { airmass, formatHours, hourAngle, localSiderealHours } from '@/lib/observatory/site-time';

const TBILISI_LON = 44.8271;

describe('sidereal time', () => {
  it('stays inside the 24 hour dial', () => {
    for (const iso of ['2026-01-01T00:00:00Z', '2026-06-15T12:00:00Z', '2026-09-03T23:59:00Z']) {
      const lst = localSiderealHours(TBILISI_LON, new Date(iso));
      expect(lst).toBeGreaterThanOrEqual(0);
      expect(lst).toBeLessThan(24);
    }
  });

  it('advances about 4 minutes more than the clock over a solar day', () => {
    const a = localSiderealHours(TBILISI_LON, new Date('2026-09-03T00:00:00Z'));
    const b = localSiderealHours(TBILISI_LON, new Date('2026-09-04T00:00:00Z'));
    const gained = (((b - a) % 24) + 24) % 24;

    expect(gained * 60).toBeGreaterThan(3.5);
    expect(gained * 60).toBeLessThan(4.5);
  });
});

describe('hour angle', () => {
  it('is zero for a target on the meridian', () => {
    const when = new Date('2026-09-03T20:00:00Z');
    const onMeridian = localSiderealHours(TBILISI_LON, when);

    expect(Math.abs(hourAngle(onMeridian, TBILISI_LON, when))).toBeLessThan(0.001);
  });

  it('is negative east of the meridian, where a target is still rising', () => {
    const when = new Date('2026-09-03T20:00:00Z');
    const lst = localSiderealHours(TBILISI_LON, when);

    expect(hourAngle((lst + 2) % 24, TBILISI_LON, when)).toBeCloseTo(-2, 3);
  });

  it('wraps rather than running off the dial', () => {
    const when = new Date('2026-09-03T20:00:00Z');

    for (const ra of [0, 6, 12, 18, 23.9]) {
      const ha = hourAngle(ra, TBILISI_LON, when);
      expect(ha).toBeGreaterThanOrEqual(-12);
      expect(ha).toBeLessThanOrEqual(12);
    }
  });
});

describe('airmass', () => {
  it('is 1 at the zenith', () => {
    expect(airmass(90)!).toBeCloseTo(1, 3);
  });

  it('is about 2 at 30 degrees altitude', () => {
    expect(airmass(30)!).toBeCloseTo(2, 1);
  });

  it('rises steeply toward the horizon without diverging', () => {
    const low = airmass(5)!;
    expect(low).toBeGreaterThan(10);
    expect(Number.isFinite(low)).toBe(true);
  });

  it('is undefined below the horizon', () => {
    expect(airmass(-1)).toBeNull();
  });
});

describe('formatHours', () => {
  it('writes sexagesimal', () => {
    expect(formatHours(3.5)).toBe('03:30:00');
  });

  it('signs a negative hour angle', () => {
    expect(formatHours(-1.25)).toBe('-01:15:00');
  });
});
