import { describe, expect, it, vi } from 'vitest';
import { admitToCollection } from '@/lib/observatory/provenance';
import { SimNodeAdapter } from '@/lib/observatory/adapter';
import { NODES, adapterFor } from '@/lib/observatory/nodes';

vi.mock('@/lib/sky-data', () => ({ fetchSkyForecast: async () => [] }));

describe('admitToCollection', () => {
  it('refuses a simulated frame, with a reason a surface can show', () => {
    const verdict = admitToCollection('simulated');
    expect(verdict.admitted).toBe(false);
    expect(verdict.admitted === false && verdict.reason.length).toBeGreaterThan(0);
  });

  it('admits an instrument frame', () => {
    expect(admitToCollection('instrument')).toEqual({ admitted: true });
  });

  it('refuses anything that is not the word instrument', () => {
    // The column is text, and a row written by an older build — or by hand —
    // must not become evidence by being unrecognised.
    const smuggled = 'INSTRUMENT' as unknown as 'instrument';
    expect(admitToCollection(smuggled).admitted).toBe(false);
  });
});

describe('adapters declare what their frames are worth', () => {
  it('the simulator is simulated', () => {
    expect(new SimNodeAdapter().provenance).toBe('simulated');
  });

  it('every node on the network answers with an adapter that declares provenance', () => {
    for (const node of NODES) {
      expect(['simulated', 'instrument']).toContain(adapterFor(node).provenance);
    }
  });

  it('no node currently produces evidence — nothing here can mint', () => {
    // Until a node is wired to real hardware this must stay true. When the
    // first instrument adapter lands, this test is the thing that says so.
    for (const node of NODES) {
      expect(admitToCollection(adapterFor(node).provenance).admitted).toBe(false);
    }
  });
});
