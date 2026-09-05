// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ claim: vi.fn(), rows: vi.fn(), update: vi.fn(), mint: vi.fn(), ata: vi.fn() }));
vi.mock('@/lib/api-auth', () => ({ verifyPrivy: async () => 'owner', assertOwnsWallet: async () => true }));
vi.mock('@/lib/db', () => ({
  getDb: () => ({
    insert: () => ({ values: mocks.claim }),
    select: () => ({ from: () => ({ where: () => ({ limit: mocks.rows }) }) }),
    update: () => ({ set: () => ({ where: mocks.update }) }),
  }),
}));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: async () => ({ success: true, remaining: 10 }),
  awardStarsRateLimit: {},
  awardStarsDailyLimit: {},
}));
vi.mock('@/lib/kill-switch', () => ({ paused: () => null }));
vi.mock('@/lib/network-guard', () => ({ networkMisconfig: () => null }));
vi.mock('@/lib/stars-cap', () => ({ remainingStarsAllowance: async () => 500 }));
vi.mock('@/lib/stars', () => ({ STARS_TOKEN_PROGRAM_ID: 'program', getStarsMintAuthority: () => ({}) }));
vi.mock('@solana/spl-token', () => ({ getOrCreateAssociatedTokenAccount: mocks.ata, mintTo: mocks.mint }));
vi.mock('@solana/web3.js', () => ({ PublicKey: class {}, Connection: class {}, Keypair: { fromSecretKey: () => ({}) } }));
import { POST } from '@/app/api/award-stars/route';

const request = (idempotencyKey: string, amount = 50) =>
  POST(new NextRequest('http://localhost/api/award-stars', {
    method: 'POST',
    body: JSON.stringify({ recipientAddress: 'wallet', amount, reason: 'telescope:first-registration', idempotencyKey }),
  }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('STARS_TOKEN_MINT', 'mint');
  vi.stubEnv('FEE_PAYER_PRIVATE_KEY', '11111111111111111111111111111111');
  mocks.claim.mockResolvedValue(undefined);
  mocks.update.mockResolvedValue(undefined);
  mocks.ata.mockResolvedValue({ address: 'ata' });
  mocks.mint.mockResolvedValue('confirmed-signature');
});
afterEach(() => vi.unstubAllEnvs());

it('pays nothing when this account never registered a telescope', async () => {
  mocks.rows.mockResolvedValue([]);
  expect(await (await request('made-up-key')).json()).toMatchObject({ awarded: 0, txId: null });
  expect(mocks.claim).not.toHaveBeenCalled();
  expect(mocks.mint).not.toHaveBeenCalled();
});

it('pays nothing when the registration bonus was already paid', async () => {
  mocks.rows.mockResolvedValue([{ starsAwarded: true }]);
  expect(await (await request('another-key')).json()).toMatchObject({ awarded: 0 });
  expect(mocks.mint).not.toHaveBeenCalled();
});

it('pays exactly 50 once, under a server-derived key, whatever the client sends', async () => {
  mocks.rows.mockResolvedValue([{ starsAwarded: false }]);
  const body = await (await request('client-chosen-key-1', 500)).json();
  expect(body).toMatchObject({ success: true, awarded: 50 });
  expect(mocks.claim).toHaveBeenCalledWith(expect.objectContaining({ mintTx: 'telescope:wallet:first', stars: 50 }));
  // The bonus is marked paid on the telescope row itself.
  expect(mocks.update).toHaveBeenCalledTimes(2);
});
