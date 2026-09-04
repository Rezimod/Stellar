import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchSkyForecast = vi.fn();
vi.mock('@/lib/sky-data', () => ({ fetchSkyForecast: (...a: unknown[]) => fetchSkyForecast(...a) }));

// No database in a unit test: the store reports that it cannot answer, which
// the routing has to survive rather than treat as "everything is free".
vi.mock('@/lib/db', () => ({ getDb: () => null }));

// Tbilisi One is still commissioning, and a commissioning node reports offline
// — correctly, since it cannot take a booking, so routing to it would be a
// lie. These cases are about what happens once a node *is* live, so the
// registry is given an active one. `adapterFor` stays real.
vi.mock('@/lib/observatory/nodes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/observatory/nodes')>();
  return { ...actual, NODES: [{ ...actual.NODES[0], status: 'active' as const }] };
});

/** Open-Meteo answers in GMT, so every stamp here is UTC. */
function forecast(cloudCover: number) {
  const hours = [];
  for (let d = 0; d < 3; d++) {
    for (let h = 0; h < 24; h++) {
      hours.push({
        time: `2026-01-${String(15 + d).padStart(2, '0')}T${String(h).padStart(2, '0')}:00`,
        cloudCover,
        visibility: 0,
        temp: 0,
        humidity: 0,
        wind: 0,
      });
    }
  }
  return [{ date: '2026-01-15', hours }];
}

/** Tbilisi's own node sits at 41.71/44.83; anything else is "the visitor". */
const NODE_LAT = 41.7151;

async function route(hereCloud: number, nodeCloud: number, now = new Date('2026-01-15T20:00:00Z')) {
  fetchSkyForecast.mockImplementation(async (lat: number) =>
    Math.abs(lat - NODE_LAT) < 0.001 ? forecast(nodeCloud) : forecast(hereCloud),
  );
  const { routeFrom } = await import('@/lib/observatory/routing');
  // Batumi, far enough from the node to be a different place on the map.
  return routeFrom(41.6168, 41.6367, now);
}

describe('routing to a clearer sky', () => {
  beforeEach(() => fetchSkyForecast.mockReset());

  it('offers a node that is meaningfully clearer', async () => {
    const r = await route(95, 5);
    expect(r.hereCloud).toBe(95);
    expect(r.options).toHaveLength(1);
    expect(r.options[0].readiness.cloudCover).toBe(5);
    expect(r.sameSky).toBe(false);
  });

  it('refuses to sell a booking that changes nothing', async () => {
    // Both under the same weather system. A network of one instrument in the
    // same cloud has nothing to route to, and saying so is the whole point.
    const r = await route(90, 85);
    expect(r.options).toHaveLength(0);
    expect(r.sameSky).toBe(true);
  });

  it('will not call a marginal difference an opportunity', async () => {
    const { BETTER_BY_POINTS } = await import('@/lib/observatory/routing');
    const r = await route(80, 80 - (BETTER_BY_POINTS - 1));
    expect(r.options).toHaveLength(0);
    expect(r.sameSky).toBe(true);
  });

  it('takes the threshold exactly, not approximately', async () => {
    const { BETTER_BY_POINTS } = await import('@/lib/observatory/routing');
    const r = await route(80, 80 - BETTER_BY_POINTS);
    expect(r.options).toHaveLength(1);
  });

  it('offers nothing at all when the node is in daylight', async () => {
    // 08:00 UTC is midday over Tbilisi: clear, and useless.
    const r = await route(95, 0, new Date('2026-06-15T08:00:00Z'));
    expect(r.options).toHaveLength(0);
    expect(r.sameSky).toBe(false);
  });

  it('survives a forecast it cannot reach, and claims nothing', async () => {
    // Replace the module for this test only. Routing the rejection through the
    // shared vi.fn() makes vitest's own settled-result tracking report it as
    // unhandled even though routeFrom awaits and catches it — the same trap
    // documented in observatory-readiness.test.ts.
    vi.resetModules();
    vi.doMock('@/lib/sky-data', () => ({
      fetchSkyForecast: async () => {
        throw new Error('open-meteo down');
      },
    }));

    const { routeFrom } = await import('@/lib/observatory/routing');
    const r = await routeFrom(41.6168, 41.6367, new Date('2026-01-15T20:00:00Z'));

    expect(r.hereCloud).toBeNull();
    // The node is still listed — it may well be observable — but with no
    // numbers on either side the surface must not claim it is better.
    for (const option of r.options) expect(option.readiness.cloudCover).toBeNull();

    vi.doUnmock('@/lib/sky-data');
    vi.resetModules();
  });

  it('offers no slot rather than one somebody may already hold', async () => {
    // The reservation store is unavailable in this test, and "unavailable"
    // must not read as "everything is free".
    const r = await route(95, 5);
    expect(r.options[0].nextSlot).toBeNull();
  });
});
