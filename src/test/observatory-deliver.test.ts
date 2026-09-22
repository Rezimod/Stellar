import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SimNodeAdapter } from '@/lib/observatory/adapter';
import { deliverDueRequests } from '@/lib/observatory/deliver';
import { NODES } from '@/lib/observatory/nodes';
import { DarkviewAdapter } from '@/lib/observatory/darkview';
import { admitToCollection, type Provenance } from '@/lib/observatory/provenance';
import type { CaptureRequest } from '@/lib/observatory/requests';

const mocks = vi.hoisted(() => ({
  provenance: 'instrument' as Provenance,
  scheduledRequests: vi.fn(),
  attachToTonightsCard: vi.fn(),
}));

// The sweep's own surroundings: one scheduled request, a database that takes
// every write, and an adapter that always gets its frame. Only the node lookup
// and adapter are replaced in the registry — NODES stays the real one.
vi.mock('@/lib/observatory/nodes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/observatory/nodes')>();
  return {
    ...actual,
    getNode: (id: string) => {
      const found = actual.getNode(id);
      return found && { ...found, status: 'active' as const };
    },
    adapterFor: () => ({
      capture: async () => ({ ok: true, exposureSec: 1, subs: 10, opticalTrain: 'test', roi: 'full' }),
      provenanceNow: async () => mocks.provenance,
    }),
  };
});
vi.mock('@/lib/observatory/requests', () => ({
  scheduledRequests: mocks.scheduledRequests,
  markDelivered: async () => true,
  returnToQueue: async () => true,
  expireScheduled: async () => 0,
}));
vi.mock('@/lib/observatory/reservations', () => ({ release: async () => 'released' }));
vi.mock('@/lib/observatory/captures', () => ({
  recordCapture: async (input: { provenance: Provenance; targetId: string }) => ({
    recorded: true,
    capture: { id: 'capture-1', provenance: input.provenance, targetId: input.targetId },
    admitted: admitToCollection(input.provenance).admitted,
    reason: null,
  }),
}));
vi.mock('@/lib/db', () => ({
  getDb: () => ({ update: () => ({ set: () => ({ where: async () => undefined }) }) }),
}));
vi.mock('@/lib/sidera/attach', () => ({ attachToTonightsCard: mocks.attachToTonightsCard }));

// A clear sky over the node, so weather never decides these cases.
vi.mock('@/lib/sky-data', () => ({
  fetchSkyForecast: async () => {
    const hours = [];
    for (let d = 0; d < 3; d++) {
      for (let h = 0; h < 24; h++) {
        hours.push({
          time: `2026-01-${String(15 + d).padStart(2, '0')}T${String(h).padStart(2, '0')}:00`,
          cloudCover: 2,
          visibility: 0,
          temp: 0,
          humidity: 0,
          wind: 0,
        });
      }
    }
    return [{ date: '2026-01-15', hours }];
  },
}));

const node = { ...NODES[0], status: 'active' as const };
/**
 * 20:00 UTC in mid-January: properly dark over Tbilisi, with Jupiter at 69°
 * and Orion at 41°. The Moon is seventy degrees *below* the horizon that
 * night, which is exactly the sort of thing these cases have to pick around —
 * the adapter refuses it, correctly.
 */
const NIGHT = new Date('2026-01-15T20:00:00Z');

describe('an unattended capture', () => {
  const sim = new SimNodeAdapter();

  it('reports what it did, and never what the frame is worth', async () => {
    const result = await sim.capture(node, { targetId: 'jupiter' }, NIGHT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.exposureSec).toBeGreaterThan(0);
    expect(result.subs).toBeGreaterThan(0);
    // Nothing in the outcome says "instrument" or "simulated" — that is
    // provenanceNow's job, asked separately at the moment of capture.
    expect(Object.keys(result)).not.toContain('provenance');
  });

  it('uses short subs on something bright and long ones on something faint', async () => {
    const planet = await sim.capture(node, { targetId: 'jupiter' }, NIGHT);
    const nebula = await sim.capture(node, { targetId: 'm42' }, NIGHT);
    if (!planet.ok || !nebula.ok) throw new Error('both were above the horizon');

    // Lucky imaging against long subs: four orders of magnitude apart, and the
    // faint one stacks far fewer of them.
    expect(nebula.exposureSec).toBeGreaterThan(planet.exposureSec);
    expect(planet.subs).toBeGreaterThan(nebula.subs);
  });

  it('refuses in daylight, and says another night could work', async () => {
    const noon = new Date('2026-06-15T08:00:00Z');
    const result = await sim.capture(node, { targetId: 'jupiter' }, noon);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe('retry');
  });

  it('refuses a target under the horizon, and that is worth retrying', async () => {
    // The Moon is 70° below the horizon on this otherwise perfect night. The
    // answer is "not tonight", not "never".
    const result = await sim.capture(node, { targetId: 'moon' }, NIGHT);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe('retry');
  });

  it('refuses a target the instrument does not carry, for good', async () => {
    const result = await sim.capture(node, { targetId: 'vega' }, NIGHT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    // No night fixes this, so it must not cycle through the queue forever.
    expect(result.kind).toBe('terminal');
  });

  it('a commissioning node cannot be worked at all', async () => {
    const result = await sim.capture(NODES[0], { targetId: 'jupiter' }, NIGHT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe('retry');
    expect(result.reason).toMatch(/commissioning/i);
  });
});

describe('a Darkview observatory has no unattended capture yet', () => {
  it('says so rather than inventing an endpoint on somebody else’s contract', async () => {
    const result = await new DarkviewAdapter('https://example.invalid').capture();

    expect(result.ok).toBe(false);
    if (result.ok) return;
    // Retryable, so a request keeps its window and refunds itself when the
    // window closes rather than failing the customer immediately.
    expect(result.kind).toBe('retry');
    expect(result.reason).toMatch(/contract/i);
  });
});

describe('the cron and tonight’s card', () => {
  const request: CaptureRequest = {
    id: 'request-1',
    privyId: 'did:privy:holder',
    nodeId: 'tbilisi-01',
    targetId: 'jupiter',
    targetName: 'Jupiter',
    windowStart: '2026-01-10',
    windowEnd: '2026-01-20',
    priceTetri: 4000,
    state: 'scheduled',
    slotId: 'tbilisi-01:2026-01-15T19:50Z',
    createdAt: '2026-01-10T00:00:00Z',
    scheduledAt: '2026-01-10T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.scheduledRequests.mockResolvedValue([request]);
  });

  it('still delivers when attaching to the card fails', async () => {
    mocks.provenance = 'instrument';
    mocks.attachToTonightsCard.mockRejectedValue(new Error('database went away'));

    const sweep = await deliverDueRequests(NIGHT);
    expect(mocks.attachToTonightsCard).toHaveBeenCalledTimes(1);
    expect(sweep.delivered).toBe(1);
  });

  it('never makes a simulated frame the card’s image', async () => {
    mocks.provenance = 'simulated';

    const sweep = await deliverDueRequests(NIGHT);
    expect(sweep.delivered).toBe(1);
    expect(mocks.attachToTonightsCard).not.toHaveBeenCalled();
  });
});
