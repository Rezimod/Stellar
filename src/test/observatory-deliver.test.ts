import { describe, expect, it, vi } from 'vitest';
import { SimNodeAdapter } from '@/lib/observatory/adapter';
import { NODES } from '@/lib/observatory/nodes';
import { DarkviewAdapter } from '@/lib/observatory/darkview';

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
    const result = await sim.capture(node, { targetId: 'betelgeuse' }, NIGHT);
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
