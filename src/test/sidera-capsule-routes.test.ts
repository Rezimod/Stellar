// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  privy: vi.fn(),
  owns: vi.fn(),
  db: vi.fn(),
  rate: vi.fn(),
  readCapsule: vi.fn(),
  openCapsule: vi.fn(),
  purchaseCapsule: vi.fn(),
  orderRows: [] as Array<{ status: string }>,
}));
vi.mock('@/lib/api-auth', () => ({ verifyPrivy: mocks.privy, assertOwnsWallet: mocks.owns, getSessionWalletAddresses: vi.fn(async () => []) }));
vi.mock('@/lib/db', () => ({ getDb: mocks.db }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.rate, sideraOpenRateLimit: {}, sideraBuyRateLimit: {} }));
vi.mock('@/lib/sidera/capsule', () => ({
  readCapsule: mocks.readCapsule,
  openCapsule: mocks.openCapsule,
  purchaseCapsule: mocks.purchaseCapsule,
}));
vi.mock('@/lib/sidera/orders', () => ({
  gelToSol: async () => 0.1,
  merchantWallet: () => ({ toBase58: () => 'merchant' }),
  newPaymentReference: () => 'reference',
  paymentUrl: () => 'solana:merchant',
}));
import { POST as open } from '@/app/api/sidera/capsules/open/route';
import { POST as buy } from '@/app/api/sidera/capsules/buy/route';

const CAPSULE = '00000000-0000-4000-8000-000000000001';
const HOLDER = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
const HEX = 'ab'.repeat(32);

function post(url: string, body: unknown) {
  return new NextRequest(`http://localhost${url}`, { method: 'POST', body: JSON.stringify(body) });
}

const bought = { id: CAPSULE, sequence: 1, commitment: HEX, state: 'purchased', buyer_wallet: HOLDER, buyer_nonce: HEX, order_id: 'order-1', price_gel: 39 };

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.STELLAR_PAUSED;
  mocks.privy.mockResolvedValue('privy-holder');
  mocks.owns.mockResolvedValue(true);
  mocks.rate.mockResolvedValue({ success: true, remaining: 1, reset: Date.now() + 60_000 });
  mocks.readCapsule.mockResolvedValue(bought);
  mocks.openCapsule.mockResolvedValue({ ok: true, alreadyOpened: false, secret: HEX, pulls: [] });
  mocks.orderRows = [{ status: 'paid' }];
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'from', 'where']) chain[m] = () => chain;
  chain.limit = async () => mocks.orderRows;
  mocks.db.mockReturnValue(chain);
});

describe('opening a capsule', () => {
  it('opens for its holder once the order is paid', async () => {
    const res = await open(post('/api/sidera/capsules/open', { capsuleId: CAPSULE }));
    expect(res.status).toBe(200);
    expect(mocks.openCapsule).toHaveBeenCalledWith(expect.anything(), CAPSULE);
    expect(mocks.owns).toHaveBeenCalledWith('privy-holder', HOLDER);
  });

  it('is not found for anyone but the holder', async () => {
    mocks.owns.mockResolvedValue(false);
    const res = await open(post('/api/sidera/capsules/open', { capsuleId: CAPSULE }));
    expect(res.status).toBe(404);
    expect(mocks.openCapsule).not.toHaveBeenCalled();
  });

  it('waits for the payment, and for an order the session placed', async () => {
    mocks.orderRows = [{ status: 'pending' }];
    expect((await open(post('/api/sidera/capsules/open', { capsuleId: CAPSULE }))).status).toBe(409);
    mocks.orderRows = [];
    expect((await open(post('/api/sidera/capsules/open', { capsuleId: CAPSULE }))).status).toBe(404);
    expect(mocks.openCapsule).not.toHaveBeenCalled();
  });

  it('refuses without a session, and while paused', async () => {
    mocks.privy.mockResolvedValue(null);
    expect((await open(post('/api/sidera/capsules/open', { capsuleId: CAPSULE }))).status).toBe(401);
    process.env.STELLAR_PAUSED = '1';
    expect((await open(post('/api/sidera/capsules/open', { capsuleId: CAPSULE }))).status).toBe(503);
    expect(mocks.openCapsule).not.toHaveBeenCalled();
  });
});

describe('buying a capsule', () => {
  const body = { walletAddress: HOLDER, capsuleId: CAPSULE, commitment: HEX, nonce: HEX };

  it('refuses a nonce that is not 32 bytes of hex', async () => {
    for (const nonce of ['', 'AB'.repeat(32), 'ab'.repeat(31), 42]) {
      expect((await buy(post('/api/sidera/capsules/buy', { ...body, nonce }))).status).toBe(400);
    }
    expect(mocks.purchaseCapsule).not.toHaveBeenCalled();
  });

  it('refuses a signature that is not the holder’s over this purchase', async () => {
    mocks.readCapsule.mockResolvedValue({ ...bought, state: 'listed' });
    const res = await buy(post('/api/sidera/capsules/buy', { ...body, signature: '1'.repeat(88) }));
    expect(res.status).toBe(400);
    expect(mocks.purchaseCapsule).not.toHaveBeenCalled();
  });

  it('refuses a wallet the session does not hold', async () => {
    mocks.owns.mockResolvedValue(false);
    expect((await buy(post('/api/sidera/capsules/buy', body))).status).toBe(403);
    expect(mocks.purchaseCapsule).not.toHaveBeenCalled();
  });

  it('returns the purchase message and its hash as the buyer’s receipt', async () => {
    mocks.readCapsule.mockResolvedValue({ ...bought, state: 'listed' });
    mocks.purchaseCapsule.mockResolvedValue({ ok: true, orderId: 'order-1', sequence: 1, message: 'Sidera capsule purchase\n…', purchaseHash: 'cd'.repeat(32), priceGel: 39 });
    const res = await buy(post('/api/sidera/capsules/buy', body));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ orderId: 'order-1', purchaseHash: 'cd'.repeat(32), purchaseMessage: expect.stringMatching(/^Sidera capsule purchase/) });
    expect(mocks.purchaseCapsule).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ nonce: HEX, wallet: HOLDER, privyId: 'privy-holder' }));
  });

  it('says so when the capsule was taken first', async () => {
    mocks.readCapsule.mockResolvedValue({ ...bought, state: 'listed' });
    mocks.purchaseCapsule.mockResolvedValue({ ok: false, reason: 'not_listed' });
    expect((await buy(post('/api/sidera/capsules/buy', body))).status).toBe(409);
  });
});
