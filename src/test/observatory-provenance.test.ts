import { describe, expect, it, vi } from 'vitest';
import { admitToCollection } from '@/lib/observatory/provenance';
import { SimNodeAdapter } from '@/lib/observatory/adapter';
import { DarkviewAdapter } from '@/lib/observatory/darkview';
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
  it('the simulator is simulated', async () => {
    expect(await new SimNodeAdapter().provenanceNow()).toBe('simulated');
  });

  it('every node on the network answers with an adapter that declares provenance', async () => {
    for (const node of NODES) {
      expect(['simulated', 'instrument']).toContain(await adapterFor(node).provenanceNow(node));
    }
  });

  it('no node currently produces evidence — nothing here can mint', async () => {
    // Until a node is wired to real hardware this must stay true. When the
    // first instrument adapter lands, this test is the thing that says so.
    for (const node of NODES) {
      const verdict = admitToCollection(await adapterFor(node).provenanceNow(node));
      expect(verdict.admitted).toBe(false);
    }
  });
});

describe('a Darkview observatory', () => {
  const node = NODES[0];

  const answering = (body: unknown, ok = true) =>
    vi.fn(async () => ({ ok, json: async () => body }) as unknown as Response);

  const status = (over: Record<string, unknown> = {}) => ({
    observatoryId: '00000000-0000-0000-0000-000000000000',
    mode: 'REAL',
    link: 'ONLINE',
    weather: { status: 'CLEAR', source: 'OPERATOR', holdActive: false, updatedAt: '' },
    missionInProgress: false,
    updatedAt: '',
    ...over,
  });

  const withFetch = async (body: unknown, run: (a: DarkviewAdapter) => Promise<void>, ok = true) => {
    const original = globalThis.fetch;
    globalThis.fetch = answering(body, ok);
    try {
      await run(new DarkviewAdapter('https://example.invalid'));
    } finally {
      globalThis.fetch = original;
    }
  };

  it('is evidence only in REAL mode with a live link', async () => {
    await withFetch(status(), async (a) => {
      expect(await a.provenanceNow()).toBe('instrument');
    });
  });

  // The whole reason provenance stopped being a constant: Darkview's contract
  // says SIMULATED is its default, always. Connected is not the same as real.
  it('is simulated while the observatory runs its own simulator', async () => {
    await withFetch(status({ mode: 'SIMULATED' }), async (a) => {
      expect(await a.provenanceNow()).toBe('simulated');
    });
  });

  it('is simulated when the heartbeat is late', async () => {
    await withFetch(status({ link: 'DEGRADED' }), async (a) => {
      expect(await a.provenanceNow()).toBe('simulated');
      expect((await a.getReadiness(node)).state).toBe('offline');
    });
  });

  it('fails closed on a reply it does not understand', async () => {
    for (const body of [null, {}, { mode: 'REAL' }, { mode: 'LIVE', link: 'ONLINE' }, 'nope']) {
      await withFetch(body, async (a) => {
        expect(await a.provenanceNow()).toBe('simulated');
      });
    }
  });

  it('fails closed on an error response and on a thrown request', async () => {
    await withFetch(status(), async (a) => {
      expect(await a.provenanceNow()).toBe('simulated');
    }, false);

    const original = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => {
      throw new Error('network');
    });
    try {
      const a = new DarkviewAdapter('https://example.invalid');
      expect(await a.provenanceNow()).toBe('simulated');
      expect((await a.getReadiness(node)).state).toBe('offline');
    } finally {
      globalThis.fetch = original;
    }
  });

  it('a node wired to nothing is offline, never a simulator', async () => {
    const a = new DarkviewAdapter('');
    expect(await a.provenanceNow()).toBe('simulated');
    expect((await a.getReadiness(node)).state).toBe('offline');
  });

  it('treats a missing weather hold flag as held', async () => {
    await withFetch(status({ weather: { status: 'CLEAR' } }), async (a) => {
      // Not asserted through readiness, which the Sun may answer first — the
      // parse is what matters: a wet telescope costs more than a wait.
      expect(await a.provenanceNow()).toBe('instrument');
    });
  });
});
