// @vitest-environment node
// The award route: the server prices the record, pays once per wallet, and
// returns the first award to a second report. The progress route: nothing
// for nobody, and one credit per achievement for the session's wallets.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  verify: vi.fn(), owns: vi.fn(), wallets: vi.fn(), db: vi.fn(), award: vi.fn(), remaining: vi.fn(),
}));
vi.mock('@/lib/api-auth', () => ({
  verifyPrivy: mocks.verify, assertOwnsWallet: mocks.owns, getSessionWalletAddresses: mocks.wallets,
}));
vi.mock('@/lib/kill-switch', () => ({ paused: () => null }));
vi.mock('@/lib/network-guard', () => ({ networkMisconfig: () => null }));
vi.mock('@/lib/db', () => ({ getDb: mocks.db }));
vi.mock('@/lib/stars', () => ({ awardStarsOnChain: mocks.award }));
vi.mock('@/lib/stars-cap', () => ({ remainingStarsAllowance: mocks.remaining }));
import { POST } from '@/app/api/games/explore/complete/route';
import { GET } from '@/app/api/games/explore/route';

const WALLET = '7EYnhQoR9YM3N7UoaKRoA44Uy8JeaZV3qyouov87awMs';

/** A ledger that remembers its inserts and can refuse a duplicate claim. */
function fakeDb(opts: { duplicateClaim?: boolean; plays?: { game: string; stars: number; createdAt: Date }[] } = {}) {
  const inserted: { table: unknown; values: Record<string, unknown> }[] = [];
  const updates: Record<string, unknown>[] = [];
  const deletes: unknown[] = [];
  const db = {
    insert: (table: unknown) => ({
      values: async (values: Record<string, unknown>) => {
        if (opts.duplicateClaim && 'confidence' in values) throw Object.assign(new Error('dup'), { code: '23505' });
        inserted.push({ table, values });
      },
    }),
    select: () => ({
      from: () => ({
        where: () => {
          const rows = opts.plays ?? [];
          return Object.assign(Promise.resolve(rows), { limit: async () => rows });
        },
      }),
    }),
    update: () => ({ set: (v: Record<string, unknown>) => ({ where: async () => { updates.push(v); } }) }),
    delete: () => ({ where: async () => { deletes.push(1); } }),
  };
  return { db, inserted, updates, deletes };
}

const post = (body: unknown, token = 'token') => POST(new NextRequest('http://localhost/api/games/explore/complete', {
  method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: token ? { Authorization: `Bearer ${token}` } : {},
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.verify.mockResolvedValue('privy-user');
  mocks.owns.mockResolvedValue(true);
  mocks.wallets.mockResolvedValue([WALLET]);
  mocks.award.mockResolvedValue('signature');
  mocks.remaining.mockResolvedValue(500);
});

describe('POST /api/games/explore/complete', () => {
  it('needs a session', async () => {
    mocks.verify.mockResolvedValue(null);
    expect((await post({ wallet: WALLET, achievement: 'explore.first_steps' })).status).toBe(401);
  });

  it('refuses an achievement it does not price, before touching the ledger', async () => {
    const { db } = fakeDb();
    mocks.db.mockReturnValue(db);
    for (const achievement of ['explore.moon_cheese', '__proto__', 12, null]) {
      const res = await post({ wallet: WALLET, achievement });
      expect(res.status, String(achievement)).toBe(400);
    }
    expect(mocks.owns).not.toHaveBeenCalled();
    expect(mocks.award).not.toHaveBeenCalled();
  });

  it('refuses a wallet the session does not own', async () => {
    mocks.owns.mockResolvedValue(false);
    expect((await post({ wallet: WALLET, achievement: 'explore.first_steps' })).status).toBe(403);
  });

  it('pays the catalogue price, on chain and in the ledger', async () => {
    const f = fakeDb();
    mocks.db.mockReturnValue(f.db);
    const res = await post({ wallet: WALLET, achievement: 'explore.telescope_calibrated' });
    expect(await res.json()).toEqual({ achievement: 'explore.telescope_calibrated', starsAwarded: 20, alreadyAwarded: false });
    expect(mocks.award).toHaveBeenCalledWith(WALLET, 20, 'game:explore:explore.telescope_calibrated');
    expect(f.inserted.map((i) => i.values)).toEqual([
      expect.objectContaining({ wallet: WALLET, target: 'game:explore:explore.telescope_calibrated', mintTx: `game:explore:explore.telescope_calibrated:${WALLET}` }),
      expect.objectContaining({ wallet: WALLET, game: 'explore:explore.telescope_calibrated', stars: 20 }),
    ]);
    expect(f.updates).toEqual([{ confidence: 'minted', stars: 20 }]);
  });

  it('ignores any amount the client proposes', async () => {
    const f = fakeDb();
    mocks.db.mockReturnValue(f.db);
    const res = await post({ wallet: WALLET, achievement: 'explore.first_steps', stars: 9999, starsAwarded: 9999 });
    expect(await res.json()).toMatchObject({ starsAwarded: 10 });
  });

  it('stays under the shared Stars cap', async () => {
    mocks.remaining.mockResolvedValue(4);
    mocks.db.mockReturnValue(fakeDb().db);
    const res = await post({ wallet: WALLET, achievement: 'explore.lunar_geology' });
    expect(await res.json()).toMatchObject({ starsAwarded: 4 });
    expect(mocks.award).toHaveBeenCalledWith(WALLET, 4, expect.any(String));
  });

  it('returns the first award to a second report instead of paying again', async () => {
    const f = fakeDb({ duplicateClaim: true, plays: [{ game: 'explore:explore.first_steps', stars: 10, createdAt: new Date() }] });
    mocks.db.mockReturnValue(f.db);
    const res = await post({ wallet: WALLET, achievement: 'explore.first_steps' });
    expect(await res.json()).toEqual({ achievement: 'explore.first_steps', starsAwarded: 10, alreadyAwarded: true });
    expect(mocks.award).not.toHaveBeenCalled();
    expect(f.inserted).toEqual([]);
  });

  it('releases the claim when the mint fails, so a retry can pay', async () => {
    const f = fakeDb();
    mocks.db.mockReturnValue(f.db);
    mocks.award.mockResolvedValue(null);
    const res = await post({ wallet: WALLET, achievement: 'explore.power_restored' });
    expect(res.status).toBe(500);
    expect(f.deletes).toHaveLength(2);
    expect(f.updates).toEqual([]);
  });
});

describe('GET /api/games/explore', () => {
  const get = (token?: string) => GET(new NextRequest('http://localhost/api/games/explore', { headers: token ? { Authorization: `Bearer ${token}` } : {} }));

  it('answers a stranger with nothing credited, not an error', async () => {
    mocks.verify.mockResolvedValue(null);
    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ credited: [], totalStars: 0, maxStars: 95 });
    expect(mocks.db).not.toHaveBeenCalled();
  });

  it('lists one credit per achievement, in the crew\'s order, and adds them up', async () => {
    const at = new Date('2026-09-28T10:00:00.000Z');
    mocks.db.mockReturnValue(fakeDb({ plays: [
      { game: 'explore:explore.power_restored', stars: 15, createdAt: at },
      { game: 'explore:explore.first_steps', stars: 10, createdAt: at },
      { game: 'explore:explore.first_steps', stars: 10, createdAt: at },
      { game: 'explore:explore.not_a_thing', stars: 99, createdAt: at },
    ] }).db);
    const body = await (await get('token')).json();
    expect(body).toEqual({
      credited: [
        { id: 'explore.first_steps', stars: 10, at: at.toISOString() },
        { id: 'explore.power_restored', stars: 15, at: at.toISOString() },
      ],
      totalStars: 25,
      maxStars: 95,
    });
  });

  it('answers with nothing credited when the ledger is down', async () => {
    mocks.db.mockReturnValue({ select: () => { throw new Error('down'); } });
    const res = await get('token');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ credited: [], totalStars: 0 });
  });
});
