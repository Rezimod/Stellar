// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), owns: vi.fn(), mint: vi.fn(), rate: vi.fn() }));
vi.mock('@/lib/api-auth', () => ({ verifyPrivy: mocks.auth, assertOwnsWallet: mocks.owns }));
vi.mock('@/lib/mint-nft', () => ({ mintCompressedNFT: mocks.mint }));
vi.mock('@/lib/kill-switch', () => ({ paused: () => null }));
vi.mock('@/lib/network-guard', () => ({ networkMisconfig: () => null }));
vi.mock('@/lib/db', () => ({ getDb: () => null }));
vi.mock('@/lib/stars', () => ({ awardStarsOnChain: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.rate, mintRateLimit: {} }));
import { POST } from '@/app/api/mint/route';

const request = (body: unknown) => POST(new NextRequest('http://localhost/api/mint', { method: 'POST', body: JSON.stringify(body) }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('NEXT_PUBLIC_SOLANA_CLUSTER', 'mainnet-beta');
  mocks.auth.mockResolvedValue(null);
  mocks.owns.mockResolvedValue(false);
});
afterEach(() => vi.unstubAllEnvs());

it('refuses production demo minting before any chain operation', async () => {
  expect((await request({ demo: true, userAddress: '11111111111111111111111111111111' })).status).toBe(403);
  expect(mocks.mint).not.toHaveBeenCalled();
});

it('also refuses demos in a development app pointed at mainnet', async () => {
  vi.stubEnv('NODE_ENV', 'development');
  expect((await request({ demo: true })).status).toBe(403);
  expect(mocks.mint).not.toHaveBeenCalled();
});

it('does not treat knowledge of a wallet address as authentication', async () => {
  expect((await request({ userAddress: '11111111111111111111111111111111' })).status).toBe(401);
  expect(mocks.mint).not.toHaveBeenCalled();
});

it('rejects a wallet that is not linked to the authenticated account', async () => {
  mocks.auth.mockResolvedValue('owner');
  expect((await request({ userAddress: '11111111111111111111111111111111' })).status).toBe(403);
  expect(mocks.mint).not.toHaveBeenCalled();
});

it.each([null, []])('rejects malformed bodies %j', async (body) => {
  expect((await request(body)).status).toBe(400);
  expect(mocks.mint).not.toHaveBeenCalled();
});
