import { describe, expect, it } from 'vitest';
import {
  altAzToRaDec,
  fieldStarsNear,
  limitingMagnitude,
  northAngleDeg,
  raDecToAltAz,
  skyObjectsNear,
  tangentOffsetDeg,
} from '@/lib/observatory/sky-field';
import { targetAltAz, SIM_TARGET_BY_ID } from '@/lib/observatory/sim-targets';
import { localSiderealHours } from '@/lib/observatory/site-time';
import { NODES } from '@/lib/observatory/nodes';

const node = NODES[0];
const NIGHT = new Date('2026-01-15T20:00:00Z');
const lst = localSiderealHours(node.lon, NIGHT);

describe('horizon and equatorial agree with each other', () => {
  it('round-trips a pointing through RA/Dec and back', () => {
    for (const p of [
      { altitude: 35, azimuth: 120 },
      { altitude: 70, azimuth: 200 },
      { altitude: 20, azimuth: 350 },
      { altitude: 55, azimuth: 10 },
    ]) {
      const back = raDecToAltAz(altAzToRaDec(p, node.lat, lst), node.lat, lst);
      expect(back.altitude).toBeCloseTo(p.altitude, 6);
      expect(back.azimuth).toBeCloseTo(p.azimuth, 6);
    }
  });

  it('puts increasing azimuth to the right and increasing altitude up', () => {
    const d = tangentOffsetDeg({ altitude: 40, azimuth: 180 }, { altitude: 41, azimuth: 181 });
    expect(d.x).toBeGreaterThan(0);
    expect(d.y).toBeCloseTo(1, 9);
    expect(d.x).toBeCloseTo(Math.cos((40 * Math.PI) / 180), 6);
  });

  it('takes the short way round through north', () => {
    const d = tangentOffsetDeg({ altitude: 40, azimuth: 359 }, { altitude: 40, azimuth: 1 });
    expect(d.x).toBeGreaterThan(0);
    expect(d.x).toBeLessThan(2);
  });

  it('finds north straight up on the meridian and tilted off it', () => {
    // Due south, north on the sky is straight up the frame.
    const south = raDecToAltAz({ raHours: lst, decDeg: 10 }, node.lat, lst);
    expect(Math.abs(northAngleDeg(south, node.lat, lst))).toBeLessThan(0.5);

    // East of the meridian the field leans one way, west the other.
    const east = raDecToAltAz({ raHours: lst + 3, decDeg: 10 }, node.lat, lst);
    const west = raDecToAltAz({ raHours: lst - 3, decDeg: 10 }, node.lat, lst);
    expect(Math.sign(northAngleDeg(east, node.lat, lst))).toBe(-Math.sign(northAngleDeg(west, node.lat, lst)));
    expect(Math.abs(northAngleDeg(east, node.lat, lst))).toBeGreaterThan(10);
  });
});

describe('the anonymous field', () => {
  it('is fixed to the sky: the same place always has the same stars', () => {
    const eq = { raHours: 5.5, decDeg: 20 };
    const a = fieldStarsNear(eq, 0.3);
    const b = fieldStarsNear(eq, 0.3);
    expect(a.length).toBeGreaterThan(50);
    expect(a.map((s) => s.raHours)).toEqual(b.map((s) => s.raHours));
  });

  it('keeps the catalogue density at every declination', () => {
    // A 0.25 square-degree patch near the pole must hold as many stars as one
    // on the equator: the cells narrow, the count per square degree does not.
    for (const decDeg of [0, 45, 86]) {
      const stars = fieldStarsNear({ raHours: 6, decDeg }, 0.4).filter((s) => {
        const dx = (s.raHours - 6) * 15 * Math.cos((decDeg * Math.PI) / 180);
        return Math.abs(dx) < 0.25 && Math.abs(s.decDeg - decDeg) < 0.25;
      });
      const perSqDeg = stars.length / 0.25;
      expect(perSqDeg).toBeGreaterThan(700);
      expect(perSqDeg).toBeLessThan(1600);
    }
  });

  it('has far more faint stars than bright ones', () => {
    const stars = fieldStarsNear({ raHours: 12, decDeg: 30 }, 1);
    const faint = stars.filter((s) => s.mag > 14).length;
    const bright = stars.filter((s) => s.mag < 10).length;
    expect(faint).toBeGreaterThan(bright * 10);
    for (const s of stars) {
      expect(s.mag).toBeGreaterThanOrEqual(4);
      expect(s.mag).toBeLessThanOrEqual(16);
    }
  });

  it('does not produce stars in the field at planetary exposures', () => {
    expect(limitingMagnitude(0.01, 1, 8)).toBeLessThan(9);
    expect(limitingMagnitude(1, 1, 8)).toBeGreaterThan(11);
    expect(limitingMagnitude(8, 100, 8)).toBeGreaterThan(limitingMagnitude(8, 1, 8));
  });
});

describe('real objects', () => {
  it('places Jupiter exactly where the GoTo would send the mount', () => {
    const jupiter = SIM_TARGET_BY_ID.get('jupiter')!;
    const at = targetAltAz(jupiter, node, NIGHT);
    const objects = skyObjectsNear(node, NIGHT, at, 1, lst);
    const found = objects.find((o) => o.id === 'jupiter')!;
    expect(found).toBeDefined();
    expect(found.altitude).toBeCloseTo(at.altitude, 6);
    expect(found.azimuth).toBeCloseTo(at.azimuth, 6);
    expect(found.sizeArcmin).toBeGreaterThan(0.5);
    expect(found.sizeArcmin).toBeLessThan(0.9);
  });

  it('brings the Galilean moons along within a few arcminutes of the planet', () => {
    const at = targetAltAz(SIM_TARGET_BY_ID.get('jupiter')!, node, NIGHT);
    const objects = skyObjectsNear(node, NIGHT, at, 1, lst);
    const moons = objects.filter((o) => ['io', 'europa', 'ganymede', 'callisto'].includes(o.id));
    expect(moons.length).toBeGreaterThanOrEqual(3);
    for (const m of moons) {
      const d = tangentOffsetDeg(at, m);
      expect(Math.hypot(d.x, d.y) * 60).toBeLessThan(12);
    }
  });

  it('returns nothing far from anything', () => {
    // A blank patch: pointing at the zenith at this instant misses every catalogue entry.
    const objects = skyObjectsNear(node, NIGHT, { altitude: 89, azimuth: 0 }, 0.1, lst);
    expect(objects.filter((o) => o.kind !== 'star').length).toBe(0);
  });

  it('finds the Orion Nebula with its photograph, at the same place as the GoTo', () => {
    const m42 = SIM_TARGET_BY_ID.get('m42')!;
    const at = targetAltAz(m42, node, NIGHT);
    const found = skyObjectsNear(node, NIGHT, at, 1, lst).find((o) => o.id === 'm42')!;
    expect(found.photoSrc).toBe('/sky/targets/m42.jpg');
    expect(found.altitude).toBeCloseTo(at.altitude, 4);
    expect(found.azimuth).toBeCloseTo(at.azimuth, 4);
  });
});
