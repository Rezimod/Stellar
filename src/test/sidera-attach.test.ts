// @vitest-environment node
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as schema from '@/lib/schema';
import { attachCaptureToCard, type Db } from '@/lib/sidera/attach';
import { holderView } from '@/lib/sidera/repo';

/**
 * A real drizzle instance over a connection string that is never dialled:
 * every statement is built exactly as it would be for Neon, and `batch` is
 * where it stops. What reaches the batch is then applied to a small in-memory
 * model by reading the statement's own SQL and parameters, so the assertions
 * are about what would have been sent.
 */
function fakeDb() {
  const db = drizzle(neon('postgresql://nobody:nothing@db.invalid/sidera'), { schema }) as unknown as Db;
  const batch = vi.spyOn(db, 'batch');
  const update = vi.spyOn(db, 'update');
  return { db, batch, update };
}

type Model = {
  editions: Array<{ id: string; cardId: string; captureId: string | null }>;
  nights: Array<{ nightDate: string; cardId: string; captureId: string | null }>;
};

/** Applies the two attach statements to the model, refusing any other shape. */
function applyTo(model: Model, queries: ReadonlyArray<unknown>) {
  for (const q of queries as ReadonlyArray<{ toSQL(): { sql: string; params: unknown[] } }>) {
    const { sql, params } = q.toSQL();
    if (/^update "edition" set "observation_capture_id" = \$1 where \("edition"\."card_id" = \$2 and not exists/.test(sql)) {
      const [capture, cardId, laterCard, night] = params as string[];
      const later = model.nights.some((n) => n.cardId === laterCard && n.captureId && n.nightDate > night);
      if (later) continue;
      for (const e of model.editions) if (e.cardId === cardId) e.captureId = capture;
    } else if (/^update "nightly_target" set "capture_id" = \$1 where \("nightly_target"\."night_date" = \$2 and "nightly_target"\."card_id" = \$3\)$/.test(sql)) {
      const [capture, night, cardId] = params as string[];
      for (const n of model.nights) if (n.nightDate === night && n.cardId === cardId) n.captureId = capture;
    } else {
      throw new Error(`unexpected statement: ${sql}`);
    }
  }
}

const CARD = '00000000-0000-4000-8000-00000000c0de';

describe('attaching a night’s capture to a card', () => {
  let model: Model;
  beforeEach(() => {
    model = {
      editions: [1, 2, 3].map((n) => ({ id: `edition-${n}`, cardId: CARD, captureId: null })),
      nights: [
        { nightDate: '2026-09-20', cardId: CARD, captureId: null },
        { nightDate: '2026-09-24', cardId: CARD, captureId: null },
        { nightDate: '2026-09-22', cardId: CARD, captureId: null },
      ],
    };
  });

  it('is one UPDATE for every edition, sent together with the history row in one batch', async () => {
    const { db, batch, update } = fakeDb();
    batch.mockImplementation(async (queries) => {
      applyTo(model, queries);
      return [] as never;
    });

    await attachCaptureToCard(db, { cardId: CARD, nightDate: '2026-09-20', captureId: 'capture-a' });

    // Three editions, one statement against the edition table — by card, never by edition id.
    expect(batch).toHaveBeenCalledTimes(1);
    const tables = update.mock.calls.map(([table]) => table);
    expect(tables.filter((t) => t === schema.edition)).toHaveLength(1);
    expect(tables.filter((t) => t === schema.nightlyTarget)).toHaveLength(1);

    const [editionUpdate, nightUpdate] = batch.mock.calls[0][0] as unknown as Array<{ toSQL(): { sql: string } }>;
    expect(editionUpdate.toSQL().sql).not.toMatch(/"edition"\."id"/);
    expect(nightUpdate.toSQL().sql).toMatch(/^update "nightly_target"/);

    expect(model.editions.map((e) => e.captureId)).toEqual(['capture-a', 'capture-a', 'capture-a']);
  });

  it('appends a second night to the history rather than replacing the first', async () => {
    const { db, batch } = fakeDb();
    batch.mockImplementation(async (queries) => {
      applyTo(model, queries);
      return [] as never;
    });

    await attachCaptureToCard(db, { cardId: CARD, nightDate: '2026-09-20', captureId: 'capture-a' });
    await attachCaptureToCard(db, { cardId: CARD, nightDate: '2026-09-24', captureId: 'capture-b' });

    expect(model.nights.filter((n) => n.captureId).map((n) => [n.nightDate, n.captureId])).toEqual([
      ['2026-09-20', 'capture-a'],
      ['2026-09-24', 'capture-b'],
    ]);
    expect(model.editions.every((e) => e.captureId === 'capture-b')).toBe(true);

    // A late frame for an earlier night joins the history, and does not wind
    // every holder's card back from the 24th to the 22nd.
    await attachCaptureToCard(db, { cardId: CARD, nightDate: '2026-09-22', captureId: 'capture-late' });
    expect(model.nights.filter((n) => n.captureId)).toHaveLength(3);
    expect(model.editions.every((e) => e.captureId === 'capture-b')).toBe(true);
  });
});

describe('the holder view', () => {
  /** Stands in for drizzle's builder: every call chains, and awaiting it yields the next result. */
  function readsReturning(...results: unknown[][]) {
    const select = vi.fn(() => {
      const result = results.shift() ?? [];
      const chain: Record<string, unknown> = {};
      for (const m of ['from', 'innerJoin', 'leftJoin', 'where', 'orderBy']) chain[m] = () => chain;
      chain.then = (resolve: (v: unknown) => unknown) => resolve(result);
      return chain;
    });
    return { select } as unknown as Db;
  }

  const base = {
    cardId: CARD,
    designation: 'TYCHO',
    name: 'Tycho',
    editionSize: 10,
    rarity: 'rare',
    observationStatus: 'eligible',
  };
  const capture = (id: string, at: string) => ({
    id,
    targetName: 'The Moon',
    capturedAt: new Date(at),
    provenance: 'simulated',
    nodeId: 'tbilisi-01',
  });

  it('carries the latest capture and every night of history, newest first', async () => {
    const b = capture('capture-b', '2026-09-24T19:24:00Z');
    const a = capture('capture-a', '2026-09-20T16:17:00Z');
    const db = readsReturning(
      [{ ...base, editionId: 'e1', editionNumber: 1, captureId: b.id, targetName: b.targetName, capturedAt: b.capturedAt, provenance: b.provenance, nodeId: b.nodeId }],
      [
        { cardId: CARD, nightDate: '2026-09-24', ...b },
        { cardId: CARD, nightDate: '2026-09-20', ...a },
      ],
    );

    const [view] = await holderView(db, 'holder');
    expect(view.latest?.id).toBe('capture-b');
    expect(view.history.map((h) => [h.nightDate, h.id])).toEqual([
      ['2026-09-24', 'capture-b'],
      ['2026-09-20', 'capture-a'],
    ]);
  });

  it('keeps an edition with no capture, with latest set to null', async () => {
    const db = readsReturning(
      [{ ...base, editionId: 'e1', editionNumber: 1, captureId: null, targetName: null, capturedAt: null, provenance: null, nodeId: null }],
      [],
    );

    const [view] = await holderView(db, 'holder');
    expect(view.latest).toBeNull();
    expect(view.history).toEqual([]);
  });
});
