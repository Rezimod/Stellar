// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ earned: vi.fn(), burned: vi.fn(), mint: vi.fn(), account: vi.fn() }));
vi.mock('@/lib/api-auth', () => ({ verifyPrivy: async () => 'owner', assertOwnsWallet: async () => true }));
vi.mock('@/lib/kill-switch', () => ({ paused: () => null }));
vi.mock('@/lib/network-guard', () => ({ networkMisconfig: () => null }));
vi.mock('@/lib/validate', () => ({ isValidPublicKey: () => true }));
vi.mock('@/lib/stars', () => ({ STARS_TOKEN_PROGRAM_ID: 'program', getStarsMintAuthority: () => ({}) }));
vi.mock('@/lib/db', () => ({
  getDb: () => ({
    select: (shape: Record<string, unknown>) => ({
      from: () => ({ where: 'total' in shape ? mocks.earned : mocks.earned }),
    }),
  }),
}));
vi.mock('@solana/spl-token', () => ({
  getAssociatedTokenAddress: async () => 'ata',
  getAccount: mocks.account,
  getOrCreateAssociatedTokenAccount: async () => ({ address: 'ata' }),
  mintTo: mocks.mint,
  TOKEN_2022_PROGRAM_ID: 'token-2022',
}));
vi.mock('@solana/web3.js', () => ({ PublicKey: class {}, Connection: class {}, Keypair: { fromSecretKey: () => ({}) } }));
import { POST } from '@/app/api/stars/sync/route';

/** The two ledger reads the route makes, in order: earned, then burned. */
function ledger(earned: number, burned: number) {
  mocks.earned
    .mockResolvedValueOnce([{ total: String(earned) }])
    .mockResolvedValueOnce([{ total: String(burned) }]);
}

const request = (body: Record<string, unknown> = { address: 'wallet' }) =>
  POST(new NextRequest('http://localhost/api/stars/sync', { method: 'POST', body: JSON.stringify(body) }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('STARS_TOKEN_MINT', 'mint');
  vi.stubEnv('FEE_PAYER_PRIVATE_KEY', '11111111111111111111111111111111');
  mocks.account.mockResolvedValue({ amount: BigInt(0) });
  mocks.mint.mockResolvedValue('signature');
});
afterEach(() => vi.unstubAllEnvs());

it('ignores an inflated expectedTotal and mints only what the ledger owes', async () => {
  ledger(120, 20);
  const body = await (await request({ address: 'wallet', expectedTotal: 999_999 })).json();
  expect(body).toMatchObject({ synced: true, minted: 100 });
  expect(mocks.mint).toHaveBeenCalledOnce();
});

it('mints the full owed balance even when the client asks for less', async () => {
  ledger(120, 20);
  const body = await (await request({ address: 'wallet', expectedTotal: 1 })).json();
  expect(body).toMatchObject({ minted: 100 });
});

it('needs no client number at all', async () => {
  ledger(60, 0);
  expect(await (await request({ address: 'wallet' })).json()).toMatchObject({ minted: 60 });
});

it('mints nothing once everything earned has been burned', async () => {
  ledger(100, 100);
  const body = await (await request()).json();
  expect(body).toMatchObject({ synced: false, reason: 'nothing_owed' });
  expect(mocks.mint).not.toHaveBeenCalled();
});

it('mints nothing when the ledger cannot be read', async () => {
  mocks.earned.mockResolvedValueOnce([{ total: null }]).mockResolvedValueOnce([{ total: null }]);
  expect(await (await request()).json()).toMatchObject({ synced: false, reason: 'nothing_owed' });
  expect(mocks.mint).not.toHaveBeenCalled();
});

it('tops a partially funded wallet up to the owed figure, never past it', async () => {
  ledger(120, 20);
  mocks.account.mockResolvedValue({ amount: BigInt(40) });
  expect(await (await request()).json()).toMatchObject({ minted: 60, newBalance: 100 });
});

it('does nothing when the wallet already holds what it is owed', async () => {
  ledger(100, 0);
  mocks.account.mockResolvedValue({ amount: BigInt(100) });
  expect(await (await request()).json()).toMatchObject({ synced: false, reason: 'already_synced' });
  expect(mocks.mint).not.toHaveBeenCalled();
});
