// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { PgDialect } from 'drizzle-orm/pg-core';
const mocks = vi.hoisted(() => ({ db: vi.fn(), claim: vi.fn(), rows: vi.fn(), where: vi.fn(), update: vi.fn(), mint: vi.fn(), ata: vi.fn() }));
vi.mock('@/lib/api-auth', () => ({ verifyPrivy: async () => 'owner', assertOwnsWallet: async () => true }));
vi.mock('@/lib/db', () => ({ getDb: mocks.db }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: async () => ({ success: true, remaining: 10 }), awardStarsRateLimit: {}, awardStarsDailyLimit: {} }));
vi.mock('@/lib/kill-switch', () => ({ paused: () => null }));
vi.mock('@/lib/network-guard', () => ({ networkMisconfig: () => null }));
vi.mock('@/lib/stars-cap', () => ({ remainingStarsAllowance: async () => 100 }));
vi.mock('@/lib/stars', () => ({ STARS_TOKEN_PROGRAM_ID: 'program', getStarsMintAuthority: () => ({}) }));
vi.mock('@solana/spl-token', () => ({ getOrCreateAssociatedTokenAccount: mocks.ata, mintTo: mocks.mint }));
vi.mock('@solana/web3.js', () => ({ PublicKey: class {}, Connection: class {}, Keypair: { fromSecretKey: () => ({}) } }));
import { POST } from '@/app/api/award-stars/route';

const request = () => POST(new NextRequest('http://localhost/api/award-stars', { method: 'POST', body: JSON.stringify({ recipientAddress: 'wallet', amount: 50, reason: 'telescope:first-registration', idempotencyKey: 'registration:wallet' }) }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('STARS_TOKEN_MINT', 'mint');
  vi.stubEnv('FEE_PAYER_PRIVATE_KEY', '11111111111111111111111111111111');
  mocks.db.mockReturnValue({
    insert: () => ({ values: mocks.claim }),
    select: () => ({ from: () => ({ where: mocks.where }) }),
    update: () => ({ set: () => ({ where: mocks.update }) }),
  });
  mocks.claim.mockResolvedValue(undefined);
  mocks.where.mockReturnValue({ limit: mocks.rows });
  mocks.rows.mockResolvedValue([{ confidence: 'pending', createdAt: new Date(0) }]);
  mocks.ata.mockResolvedValue({ address: 'ata' });
  mocks.mint.mockResolvedValue('confirmed-signature');
});
afterEach(() => vi.unstubAllEnvs());

it('does not mint without a database', async () => {
  mocks.db.mockReturnValue(null);
  expect((await request()).status).toBe(503);
  expect(mocks.mint).not.toHaveBeenCalled();
});

it('does not mint when the claim cannot be persisted', async () => {
  mocks.claim.mockRejectedValue({ code: '08006' });
  expect((await request()).status).toBe(503);
  expect(mocks.mint).not.toHaveBeenCalled();
});

it.each([{ code: '23505' }, { cause: { code: '23505' } }])('never reclaims an old pending award after a duplicate claim %j', async (error) => {
  mocks.claim.mockRejectedValue(error);
  const response = await request();
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ pending: true });
  expect(mocks.claim).toHaveBeenCalledOnce();
  expect(mocks.mint).not.toHaveBeenCalled();
});

it('returns an already confirmed award without minting again', async () => {
  mocks.claim.mockRejectedValue({ code: '23505' });
  mocks.rows.mockResolvedValue([{ confidence: 'minted' }]);
  expect(await (await request()).json()).toMatchObject({ cached: true });
  expect(mocks.mint).not.toHaveBeenCalled();
});

it('looks up the stable receipt key so yesterday’s confirmed award can be recognized', async () => {
  mocks.claim.mockRejectedValue({ code: '23505' });
  mocks.rows.mockResolvedValue([{ confidence: 'minted' }]);
  await request();
  // Call 0 is the telescope-registration scope check; call 1 is the receipt
  // lookup. The key it searches for is the server's, not the request's.
  const lookup = new PgDialect().sqlToQuery(mocks.where.mock.calls[1][0]);
  expect(lookup.params).toContain('telescope:wallet:first');
  expect(lookup.params).not.toContain('registration:wallet');
  expect(mocks.mint).not.toHaveBeenCalled();
});

it('confirms a newly persisted award', async () => {
  expect(await (await request()).json()).toMatchObject({ success: true, awarded: 50 });
  expect(mocks.mint).toHaveBeenCalledOnce();
  // The ledger slot is confirmed, and the registration bonus is marked paid.
  expect(mocks.update).toHaveBeenCalledTimes(2);
});

it('retains the claim after an uncertain transaction failure', async () => {
  mocks.mint.mockRejectedValue(new Error('confirmation timeout'));
  const response = await request();
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ pending: true });
  expect(mocks.update).not.toHaveBeenCalled();
});
