import { describe, expect, it } from 'vitest';
import { galileanMoons } from '@/lib/observatory/jupiter-moons';

const date = new Date('2026-10-18T20:00:00Z');
const moons = galileanMoons(date);

describe('Galilean moons', () => {
  it('returns all four, in orbital order', () => {
    expect(moons.map((m) => m.id)).toEqual(['io', 'europa', 'ganymede', 'callisto']);
  });

  it('orders their mean separations the way the orbits do', () => {
    // Sampled across a fortnight so no single geometry can fake the ordering.
    const mean: Record<string, number> = {};
    for (let hour = 0; hour < 336; hour += 3) {
      const at = new Date(date.getTime() + hour * 3_600_000);
      for (const m of galileanMoons(at)) {
        mean[m.id] = (mean[m.id] ?? 0) + Math.abs(m.eastArcsec) / 112;
      }
    }
    expect(mean.io).toBeLessThan(mean.europa);
    expect(mean.europa).toBeLessThan(mean.ganymede);
    expect(mean.ganymede).toBeLessThan(mean.callisto);
  });

  it('keeps every moon within Callisto\'s orbit — about 13 Jupiter radii', () => {
    for (const m of moons) expect(m.separationRadii).toBeLessThan(30);
  });

  it('puts Io through a full orbit in about 1.77 days', () => {
    // Count sign changes of the east-west offset: two per orbit.
    let crossings = 0;
    let previous = galileanMoons(date).find((m) => m.id === 'io')!.eastArcsec;
    for (let hour = 1; hour <= 24 * 7; hour++) {
      const east = galileanMoons(new Date(date.getTime() + hour * 3_600_000))
        .find((m) => m.id === 'io')!.eastArcsec;
      if (Math.sign(east) !== Math.sign(previous)) crossings++;
      previous = east;
    }
    // 7 days / 1.769 days = 3.96 orbits, so about 8 crossings.
    expect(crossings).toBeGreaterThanOrEqual(7);
    expect(crossings).toBeLessThanOrEqual(9);
  });

  it('classifies a moon on the disc by which side of Jupiter it is on', () => {
    for (let hour = 0; hour < 72; hour += 1) {
      for (const m of galileanMoons(new Date(date.getTime() + hour * 3_600_000))) {
        if (m.state === 'transit') expect(m.inFront).toBe(true);
        if (m.state === 'occulted') expect(m.inFront).toBe(false);
        if (m.state === 'clear') expect(m.separationRadii).toBeGreaterThanOrEqual(1);
      }
    }
  });
});
