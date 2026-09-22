// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  privy: vi.fn(),
  linked: vi.fn(),
  db: vi.fn(),
  rate: vi.fn(),
  weight: vi.fn(),
  cast: vi.fn(),
  observable: vi.fn(),
}));
vi.mock('@/lib/api-auth', () => ({ verifyPrivy: mocks.privy, getSessionWalletAddresses: mocks.linked }));
process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test';
vi.mock('@/lib/db', () => ({ getDb: mocks.db }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.rate, sideraVoteRateLimit: {} }));
vi.mock('@/lib/sidera/night', () => ({
  allCards: vi.fn(async () => []),
  castVote: mocks.cast,
  voteWeight: mocks.weight,
  votingNight: vi.fn(async () => '2026-09-20'),
}));
vi.mock('@/lib/sidera/target', () => ({ observableTonight: mocks.observable }));
import { POST } from '@/app/api/sidera/votes/route';

const WALLET = '11111111111111111111111111111111';

function vote(designation: string) {
  return POST(
    new NextRequest('http://localhost/api/sidera/votes', {
      method: 'POST',
      body: JSON.stringify({ walletAddress: WALLET, designation }),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.privy.mockResolvedValue('did:privy:holder');
  mocks.linked.mockResolvedValue([WALLET]);
  mocks.db.mockReturnValue({});
  mocks.rate.mockResolvedValue({ success: true, remaining: 9, reset: 0 });
  mocks.observable.mockReturnValue([{ card: { id: 'c-saturn', designation: 'SATURN' } }]);
});

it('refuses someone who holds no card', async () => {
  mocks.weight.mockResolvedValue(0);
  expect((await vote('SATURN')).status).toBe(403);
  expect(mocks.cast).not.toHaveBeenCalled();
});

it('refuses a card Node 01 cannot photograph that night', async () => {
  mocks.weight.mockResolvedValue(3);
  const res = await vote('M31');
  expect(res.status).toBe(400);
  expect((await res.json()).error).toBe('M31 cannot be photographed on the night of 2026-09-20.');
  expect(mocks.cast).not.toHaveBeenCalled();
});

it('records a holder’s weighted vote for the voting night', async () => {
  mocks.weight.mockResolvedValue(7);
  const res = await vote('SATURN');
  expect(res.status).toBe(200);
  expect(mocks.cast).toHaveBeenCalledWith({}, { wallet: WALLET, cardId: 'c-saturn', night: '2026-09-20', weight: 7 });
});

it('refuses a session with no Solana wallet linked', async () => {
  mocks.linked.mockResolvedValue([]);
  expect((await vote('SATURN')).status).toBe(403);
});
