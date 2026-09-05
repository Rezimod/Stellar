// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ due: vi.fn(), hours: vi.fn(), written: vi.fn() }));

// The module calls its own exports directly, so a spy on the module object
// never fires. Fake the database underneath it instead and let the real
// query builders run.
vi.mock('@/lib/db', () => {
  /** Drizzle queries are awaitable and sometimes chain `.limit()`. */
  const resolving = (rows: unknown[]) => ({
    limit: () => Promise.resolve(rows),
    then: (...a: Parameters<Promise<unknown>['then']>) => Promise.resolve(rows).then(...a),
  });

  return {
    getDb: () => ({
      // `unsettledSessions` is the only select that joins; the other is the
      // per-node delivered-hours sum.
      select: () => ({
        from: () => ({
          leftJoin: () => ({ where: () => resolving(mocks.due()) }),
          where: () => resolving([{ hours: mocks.hours() }]),
        }),
      }),
      insert: () => ({
        values: (row: unknown) => ({
          onConflictDoNothing: () => ({
            returning: () => {
              mocks.written(row);
              return Promise.resolve([{ id: 'ledger-row' }]);
            },
          }),
        }),
      }),
    }),
  };
});
import { settleDueSessions } from '@/lib/observatory/settlements';

const twentyMinutes = {
  id: 'session-20',
  nodeId: 'tbilisi-01',
  privyId: 'owner',
  feeTetri: 4000,
  startsAt: new Date('2026-09-04T18:30:00Z'),
  endsAt: new Date('2026-09-04T18:50:00Z'),
};

const settle = (minutesFor: (nodeId: string) => number) =>
  settleDueSessions({ minutesFor, provenanceFor: async () => 'instrument' });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.due.mockReturnValue([twentyMinutes]);
  mocks.hours.mockReturnValue(0);
});

it('credits the span the session was actually reserved for', async () => {
  // The node now advertises 45-minute sessions; this one ran for 20.
  const result = await settle(() => 45);
  expect(result).toEqual({ settled: 1, skipped: 0 });
  expect(mocks.written).toHaveBeenCalledWith(expect.objectContaining({ hoursDelivered: 20 / 60 }));
});

it('falls back to the node length when the stored span is unusable', async () => {
  mocks.due.mockReturnValue([{ ...twentyMinutes, endsAt: twentyMinutes.startsAt }]);
  await settle(() => 45);
  expect(mocks.written).toHaveBeenCalledWith(expect.objectContaining({ hoursDelivered: 45 / 60 }));
});

it('credits a simulated session no hours at all', async () => {
  await settleDueSessions({ minutesFor: () => 45, provenanceFor: async () => 'simulated' });
  expect(mocks.written).toHaveBeenCalledWith(
    expect.objectContaining({ hoursDelivered: 0, payable: false }),
  );
});

it('reads the fee off the reservation rather than re-rating it', async () => {
  await settle(() => 45);
  expect(mocks.written).toHaveBeenCalledWith(expect.objectContaining({ feeTetri: 4000 }));
});
