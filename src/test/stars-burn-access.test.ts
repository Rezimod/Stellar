// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ rows: vi.fn(), balance: vi.fn(), owns: vi.fn() }));
vi.mock('@privy-io/server-auth', () => ({ PrivyClient: class { verifyAuthToken = async () => ({ userId: 'owner' }); } }));
vi.mock('@/lib/api-auth', () => ({ assertOwnsWallet: mocks.owns }));
vi.mock('@/lib/db', () => ({ getDb: () => ({ select: () => ({ from: () => ({ where: () => ({ limit: mocks.rows }) }) }) }) }));
vi.mock('@/lib/solana', () => ({ getStarsBalance: mocks.balance }));
vi.mock('@/lib/kill-switch', () => ({ paused: () => null }));
vi.mock('@/lib/network-guard', () => ({ networkMisconfig: () => null }));
import { GET } from '@/app/api/stars/burn/route';

const wallet = '11111111111111111111111111111111';
const request = () => GET(new NextRequest(`http://localhost/api/stars/burn?orderId=order&walletAddress=${wallet}`, { headers: { Authorization: 'Bearer test' } }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.owns.mockResolvedValue(true);
  mocks.balance.mockResolvedValue(1000);
});

it('does not disclose another wallet’s order price or discount eligibility', async () => {
  mocks.rows.mockResolvedValue([{ walletAddress: 'victim', currency: 'GEL', amountFiat: 100, gelDiscount: 0 }]);
  expect((await request()).status).toBe(404);
  expect(mocks.balance).not.toHaveBeenCalled();
});

it('returns eligibility for the account’s own order', async () => {
  mocks.rows.mockResolvedValue([{ walletAddress: wallet, currency: 'GEL', amountFiat: 100, gelDiscount: 0 }]);
  const response = await request();
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ balance: 1000 });
});
