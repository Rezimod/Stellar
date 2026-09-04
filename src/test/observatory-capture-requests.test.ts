import { describe, expect, it } from 'vitest';
import {
  MAX_WINDOW_DAYS,
  MIN_WINDOW_HOURS,
  REQUEST_CLASSES,
  checkWindow,
  classOf,
  planRequest,
  priceTetriFor,
} from '@/lib/observatory/capture-requests';
import { buildSlots } from '@/lib/observatory/availability';
import { NODES } from '@/lib/observatory/nodes';
import { SIM_TARGETS } from '@/lib/observatory/sim-targets';

const node = NODES[0];
const DAY = 86_400_000;

describe('what a photograph costs', () => {
  it('prices by target class, not by minutes on the mount', () => {
    expect(priceTetriFor('moon')).toBe(REQUEST_CLASSES.bright.priceTetri);
    expect(priceTetriFor('m42')).toBe(REQUEST_CLASSES.deep_short.priceTetri);
    expect(priceTetriFor('m57')).toBe(REQUEST_CLASSES.deep_long.priceTetri);
  });

  it('charges more for the faint things, which are the ones worth the wait', () => {
    expect(REQUEST_CLASSES.deep_long.priceTetri).toBeGreaterThan(
      REQUEST_CLASSES.deep_short.priceTetri,
    );
    expect(REQUEST_CLASSES.deep_short.priceTetri).toBeGreaterThan(
      REQUEST_CLASSES.bright.priceTetri,
    );
  });

  it('has a price for every target the network offers', () => {
    for (const target of SIM_TARGETS) {
      expect(classOf(target.id), target.id).not.toBeNull();
    }
  });

  it('refuses to price something it does not sell', () => {
    expect(priceTetriFor('betelgeuse')).toBeNull();
  });
});

describe('the window a customer agrees to', () => {
  const now = new Date('2026-09-04T12:00:00Z');

  it('accepts a fortnight', () => {
    expect(checkWindow(now, new Date(now.getTime() + 14 * DAY), now).ok).toBe(true);
  });

  it('refuses a window already in the past', () => {
    const start = new Date(now.getTime() - 3 * DAY);
    expect(checkWindow(start, new Date(now.getTime() - DAY), now).ok).toBe(false);
  });

  it('refuses one night, because one night is a weather bet', () => {
    const end = new Date(now.getTime() + (MIN_WINDOW_HOURS - 1) * 3_600_000);
    expect(checkWindow(now, end, now).ok).toBe(false);
  });

  it('refuses unbounded patience', () => {
    const end = new Date(now.getTime() + (MAX_WINDOW_DAYS + 2) * DAY);
    expect(checkWindow(now, end, now).ok).toBe(false);
  });

  it('refuses a window that ends before it begins', () => {
    expect(checkWindow(new Date(now.getTime() + 2 * DAY), now, now).ok).toBe(false);
  });
});

describe('planning a request into the night', () => {
  // Mid-September, so Tbilisi has a real dark window and the Moon is up at
  // some point across a fortnight.
  const now = new Date('2026-09-15T09:00:00Z');
  const windowEnd = new Date(now.getTime() + 14 * DAY);

  const plan = (taken: Set<string> = new Set(), targetId = 'moon') =>
    planRequest({ node, targetId, windowStart: now, windowEnd, taken, now });

  it('finds a slot the instrument could actually work', () => {
    const slot = plan();
    expect(slot).not.toBeNull();
    expect(new Date(slot!.startsAt).getTime()).toBeGreaterThanOrEqual(now.getTime());
    expect(new Date(slot!.endsAt).getTime()).toBeLessThanOrEqual(windowEnd.getTime());
  });

  it('never plans into a slot somebody already holds', () => {
    const first = plan();
    expect(first).not.toBeNull();

    const second = plan(new Set([first!.id]));
    expect(second).not.toBeNull();
    expect(second!.id).not.toBe(first!.id);
    // Later, not earlier: the queue takes the next gap, it does not jump one.
    expect(new Date(second!.startsAt).getTime()).toBeGreaterThan(
      new Date(first!.startsAt).getTime(),
    );
  });

  it('gives up rather than double-book when every slot is taken', () => {
    const everything = new Set(buildSlots(node, { now, nights: 15 }).map((s) => s.id));
    expect(plan(everything)).toBeNull();
  });

  it('refuses a target this network does not carry', () => {
    expect(plan(new Set(), 'betelgeuse')).toBeNull();
  });

  it('returns nothing when the window is too short to contain a slot', () => {
    const soon = new Date(now.getTime() + 3_600_000);
    expect(
      planRequest({ node, targetId: 'moon', windowStart: now, windowEnd: soon, taken: new Set(), now }),
    ).toBeNull();
  });

  it('only ever proposes slots this node actually offers', () => {
    const offered = new Set(buildSlots(node, { now, nights: 15 }).map((s) => s.id));
    const slot = plan();
    expect(offered.has(slot!.id)).toBe(true);
  });
});
