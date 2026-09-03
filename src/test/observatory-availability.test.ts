import { describe, expect, it } from 'vitest';
import { buildSlots, findSlot, slotId } from '@/lib/observatory/availability';
import { getSunAltitude } from '@/lib/dark-window';
import { siteLocalHours } from '@/lib/observatory/site-time';
import type { ObservatoryNode } from '@/lib/observatory/types';

const tbilisi: ObservatoryNode = {
  id: 'tbilisi-01',
  name: 'Tbilisi One',
  site: 'Tbilisi, Georgia',
  countryCode: 'GE',
  lat: 41.7151,
  lon: 44.8271,
  timezone: 'Asia/Tbilisi',
  bortle: 8,
  tier: 'first_party',
  status: 'active',
  instrument: {
    optics: 'Celestron NexStar 6SE',
    apertureMm: 150,
    focalLengthMm: 1500,
    mount: 'Single-fork altazimuth, GoTo',
    camera: 'ZWO ASI585MC',
    sensorWidthMm: 11.18,
    sensorHeightMm: 6.32,
    pixelSizeUm: 2.9,
    suitedTo: ['Moon'],
  },
  priceGel: 40,
  sessionMinutes: 20,
  availability: { fromHourLocal: 20, toHourLocal: 2 },
};

/** An autumn afternoon in Tbilisi: the night ahead is a normal one. */
const afternoon = new Date('2026-09-15T12:00:00Z');

describe('buildSlots', () => {
  it('offers slots on every night asked for', () => {
    const slots = buildSlots(tbilisi, { now: afternoon, nights: 3 });
    expect(new Set(slots.map((s) => s.night)).size).toBe(3);
  });

  it('never offers a slot before the requested moment', () => {
    const slots = buildSlots(tbilisi, { now: afternoon, nights: 3 });
    for (const slot of slots) {
      expect(new Date(slot.startsAt).getTime()).toBeGreaterThan(afternoon.getTime());
    }
  });

  it('only sells time when the Sun is well down at the site', () => {
    for (const slot of buildSlots(tbilisi, { now: afternoon, nights: 3 })) {
      expect(getSunAltitude(tbilisi.lat, tbilisi.lon, new Date(slot.startsAt))).toBeLessThan(-12);
      expect(getSunAltitude(tbilisi.lat, tbilisi.lon, new Date(slot.endsAt))).toBeLessThan(-12);
    }
  });

  it("respects the operator's hours on the site's own clock", () => {
    for (const slot of buildSlots(tbilisi, { now: afternoon, nights: 3 })) {
      const start = siteLocalHours(tbilisi.timezone, new Date(slot.startsAt));
      const end = siteLocalHours(tbilisi.timezone, new Date(new Date(slot.endsAt).getTime() - 1));
      expect(start >= 20 || start < 2).toBe(true);
      expect(end >= 20 || end < 2).toBe(true);
    }
  });

  it('groups a post-midnight slot with the evening it belongs to', () => {
    const slots = buildSlots(tbilisi, { now: afternoon, nights: 1 });
    const afterMidnight = slots.filter(
      (s) => siteLocalHours(tbilisi.timezone, new Date(s.startsAt)) < 2,
    );
    expect(afterMidnight.length).toBeGreaterThan(0);
    // 01:20 on the 16th is part of the night that opened on the 15th.
    for (const slot of afterMidnight) expect(slot.night).toBe(slots[0].night);
  });

  it('leaves the instrument time to turn around between sessions', () => {
    const slots = buildSlots(tbilisi, { now: afternoon, nights: 1 });
    for (let i = 1; i < slots.length; i++) {
      const gap = new Date(slots[i].startsAt).getTime() - new Date(slots[i - 1].endsAt).getTime();
      expect(gap).toBeGreaterThanOrEqual(10 * 60_000);
    }
  });

  it('gives every slot the length the node sells', () => {
    for (const slot of buildSlots(tbilisi, { now: afternoon, nights: 2 })) {
      const length = new Date(slot.endsAt).getTime() - new Date(slot.startsAt).getTime();
      expect(length).toBe(tbilisi.sessionMinutes * 60_000);
    }
  });

  it('is deterministic — the same night yields the same ids', () => {
    const a = buildSlots(tbilisi, { now: afternoon, nights: 2 });
    const b = buildSlots(tbilisi, { now: afternoon, nights: 2 });
    expect(a.map((s) => s.id)).toEqual(b.map((s) => s.id));
    expect(new Set(a.map((s) => s.id)).size).toBe(a.length);
    expect(a[0].id).toBe(slotId(tbilisi.id, new Date(a[0].startsAt)));
  });

  it('sells nothing where the Sun never sets', () => {
    // Svalbard in June: no astronomical night, so no night to sell.
    const polar: ObservatoryNode = { ...tbilisi, id: 'polar-01', lat: 78.2, lon: 15.6, timezone: 'Arctic/Longyearbyen' };
    expect(buildSlots(polar, { now: new Date('2026-06-15T12:00:00Z'), nights: 3 })).toEqual([]);
  });

  it('runs the whole dark window when the operator sets no hours', () => {
    const alwaysOn: ObservatoryNode = { ...tbilisi, availability: undefined };
    expect(buildSlots(alwaysOn, { now: afternoon, nights: 1 }).length).toBeGreaterThan(
      buildSlots(tbilisi, { now: afternoon, nights: 1 }).length,
    );
  });
});

describe('findSlot', () => {
  it('finds a slot it offered', () => {
    const [first] = buildSlots(tbilisi, { now: afternoon, nights: 1 });
    expect(findSlot(tbilisi, first.id, { now: afternoon, nights: 1 })?.startsAt).toBe(first.startsAt);
  });

  it('refuses an id the timetable never offered', () => {
    // Noon at the site: real format, real node, but never a bookable slot.
    expect(findSlot(tbilisi, 'tbilisi-01:2026-09-16T08:00Z', { now: afternoon })).toBeNull();
  });
});
