import { describe, expect, it } from 'vitest';
import {
  BIRTH_PLACES,
  bestMomentOn,
  COMMISSION_TETRI,
  FIRST_LIGHT_TIERS,
  compassPoint,
  moonPhaseName,
  placeById,
  priceTetriFor,
  skyAt,
} from '@/lib/observatory/first-light';
import { getSunAltitude } from '@/lib/dark-window';

const tbilisi = BIRTH_PLACES[0];

describe('what a poster costs', () => {
  it('adds the commission to the sheet, and only when one is asked for', () => {
    expect(priceTetriFor('framed', false)).toBe(FIRST_LIGHT_TIERS.framed.priceTetri);
    expect(priceTetriFor('framed', true)).toBe(
      FIRST_LIGHT_TIERS.framed.priceTetri + COMMISSION_TETRI,
    );
  });

  it('prices the tiers the way the plan does', () => {
    expect(FIRST_LIGHT_TIERS.digital.priceTetri).toBe(6000);
    expect(FIRST_LIGHT_TIERS.print.priceTetri).toBe(14000);
    expect(FIRST_LIGHT_TIERS.framed.priceTetri).toBe(22000);
  });
});

describe('the Moon on a given night', () => {
  it('names a phase by elongation, not by how much is lit', () => {
    // Half-lit twice a month, and the fraction alone cannot tell the two apart.
    expect(moonPhaseName(90)).toBe('First Quarter');
    expect(moonPhaseName(270)).toBe('Last Quarter');
    expect(moonPhaseName(0)).toBe('New Moon');
    expect(moonPhaseName(180)).toBe('Full Moon');
  });

  it('wraps rather than falling off either end', () => {
    expect(moonPhaseName(360)).toBe('New Moon');
    expect(moonPhaseName(-5)).toBe('New Moon');
    expect(moonPhaseName(725)).toBe('New Moon');
  });
});

describe('the sky at a moment', () => {
  // 14 March 2019: the Moon 95.5° from the Sun and 55% lit — just past first
  // quarter, which is exactly the case the naming has to get right, since a
  // half-lit disc is also last quarter a fortnight later.
  const at = new Date('2019-03-14T21:00:00Z');

  it('computes a phase and a lit fraction that agree with each other', () => {
    const sky = skyAt({ place: tbilisi, at });
    expect(sky.moon.angle).toBeCloseTo(95.5, 0);
    expect(sky.moon.phase).toBe('First Quarter');
    expect(sky.moon.illumination).toBeCloseTo(0.55, 2);
  });

  it('places every naked-eye planet, above the horizon or not', () => {
    const sky = skyAt({ place: tbilisi, at });
    expect(sky.bodies.map((b) => b.key).sort()).toEqual([
      'jupiter',
      'mars',
      'mercury',
      'saturn',
      'venus',
    ]);
    for (const body of sky.bodies) {
      expect(body.up).toBe(body.altitude > 0);
      expect(Number.isFinite(body.altitude)).toBe(true);
    }
  });

  it('places a fixed target and a moving one alike', () => {
    for (const targetId of ['m42', 'saturn']) {
      const sky = skyAt({ place: tbilisi, at, targetId });
      expect(sky.target, targetId).not.toBeNull();
      expect(Number.isFinite(sky.target!.altitude)).toBe(true);
    }
  });

  it('says nothing rather than guessing at a target it does not carry', () => {
    expect(skyAt({ place: tbilisi, at, targetId: 'betelgeuse' }).target).toBeNull();
  });

  it('is the same sky whichever way you ask for it — the arithmetic is not random', () => {
    const a = skyAt({ place: tbilisi, at, targetId: 'saturn' });
    const b = skyAt({ place: tbilisi, at, targetId: 'saturn' });
    expect(a.target!.altitude).toBe(b.target!.altitude);
    expect(a.moon.illumination).toBe(b.moon.illumination);
  });

  it('gives a different sky from a different place', () => {
    const north = skyAt({ place: placeById('zugdidi')!, at, targetId: 'saturn' });
    const east = skyAt({ place: placeById('telavi')!, at, targetId: 'saturn' });
    expect(north.target!.altitude).not.toBe(east.target!.altitude);
  });

  it('a date decades back is still exact — this half needs no telescope', () => {
    const long = skyAt({ place: tbilisi, at: new Date('1974-06-02T22:30:00Z'), targetId: 'jupiter' });
    expect(long.moon.phase.length).toBeGreaterThan(0);
    expect(Number.isFinite(long.target!.altitude)).toBe(true);
  });
});

describe('compassPoint', () => {
  it('names the eight points and wraps at north', () => {
    expect(compassPoint(0)).toBe('N');
    expect(compassPoint(90)).toBe('E');
    expect(compassPoint(180)).toBe('S');
    expect(compassPoint(270)).toBe('W');
    expect(compassPoint(359)).toBe('N');
    expect(compassPoint(-90)).toBe('W');
  });
});

describe('the hour the object was highest', () => {
  const place = BIRTH_PLACES[0];

  it('finds an hour that actually works when the one given does not', () => {
    // 21:00 on this date has Saturn below the horizon; some hour of that day
    // does not, and that is the one a poster should be cut for.
    const at = new Date('2019-03-14T21:00:00Z');
    expect(skyAt({ place, at, targetId: 'saturn' }).target!.up).toBe(false);

    const best = bestMomentOn({ place, date: at, targetId: 'saturn' });
    expect(best).not.toBeNull();
    expect(best!.altitude).toBeGreaterThan(0);
    expect(skyAt({ place, at: best!.at, targetId: 'saturn' }).target!.up).toBe(true);
  });

  it('only ever offers an hour that is actually dark', () => {
    const best = bestMomentOn({ place, date: new Date('2019-03-14T21:00:00Z'), targetId: 'saturn' })!;
    expect(getSunAltitude(place.lat, place.lon, best.at)).toBeLessThan(-6);
  });

  it('is the highest dark hour, not merely a passable one', () => {
    const best = bestMomentOn({ place, date: new Date('2019-03-14T21:00:00Z'), targetId: 'saturn' })!;
    for (let m = 0; m < 24 * 60; m += 30) {
      const at = new Date(Date.UTC(2019, 2, 14, 0, 0, 0) + m * 60_000);
      if (getSunAltitude(place.lat, place.lon, at) > -6) continue;
      const alt = skyAt({ place, at, targetId: 'saturn' }).target!.altitude;
      expect(best.altitude).toBeGreaterThanOrEqual(alt - 0.001);
    }
  });

  it('stays on the day it was asked about', () => {
    const at = new Date('2019-03-14T21:00:00Z');
    const best = bestMomentOn({ place, date: at, targetId: 'saturn' })!;
    expect(best.at.toISOString().slice(0, 10)).toBe('2019-03-14');
  });

  it('says nothing rather than offering an hour that would not have worked', () => {
    // Orion is above the horizon through a June afternoon from Georgia. An
    // hour is only useful if it is also dark, and in late June there is none.
    expect(
      bestMomentOn({ place, date: new Date('2019-06-21T12:00:00Z'), targetId: 'm42' }),
    ).toBeNull();
  });

  it('refuses a target it does not carry', () => {
    expect(
      bestMomentOn({ place, date: new Date('2019-03-14T21:00:00Z'), targetId: 'betelgeuse' }),
    ).toBeNull();
  });
});
