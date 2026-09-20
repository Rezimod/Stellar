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
  readFullLog: vi.fn(),
  settleCapsulePayment: vi.fn(),
  gelToSol: vi.fn(),
  findPayment: vi.fn(),
  markPaid: vi.fn(),
  markRefundDue: vi.fn(),
  cardAvailability: vi.fn(),
  createCardOrder: vi.fn(),
  orderRows: [] as Array<Record<string, unknown>>,
}));
vi.mock('@/lib/api-auth', () => ({ verifyPrivy: mocks.privy, assertOwnsWallet: mocks.owns, getSessionWalletAddresses: vi.fn(async () => []) }));
vi.mock('@/lib/db', () => ({ getDb: mocks.db }));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.rate, sideraOpenRateLimit: {}, sideraBuyRateLimit: {}, sideraConfirmRateLimit: {}, sideraLogRateLimit: {},
}));
vi.mock('@/lib/sidera/capsule', () => ({
  readCapsule: mocks.readCapsule,
  openCapsule: mocks.openCapsule,
  purchaseCapsule: mocks.purchaseCapsule,
  readFullLog: mocks.readFullLog,
  settleCapsulePayment: mocks.settleCapsulePayment,
}));
vi.mock('@/lib/sidera/orders', () => ({
  CAPSULE_PRODUCT_ID: 'sidera-capsule',
  CARD_PRODUCT_PREFIX: 'sidera-card:',
  gelToSol: mocks.gelToSol,
  merchantWallet: () => ({ toBase58: () => 'merchant' }),
  newPaymentReference: () => 'reference',
  paymentUrl: () => 'solana:merchant',
  findPayment: mocks.findPayment,
  markPaid: mocks.markPaid,
  markRefundDue: mocks.markRefundDue,
  fulfilCardOrder: vi.fn(),
  cardAvailability: mocks.cardAvailability,
  createCardOrder: mocks.createCardOrder,
}));
import { POST as open } from '@/app/api/sidera/capsules/open/route';
import { POST as buy } from '@/app/api/sidera/capsules/buy/route';
import { GET as verify } from '@/app/api/sidera/capsules/verify/route';
import { POST as confirm } from '@/app/api/sidera/orders/confirm/route';
import { POST as buyCard } from '@/app/api/sidera/cards/buy/route';
import { SoldOutError, commitmentOf } from '@/lib/sidera/randomness';
import { SolPriceUnavailableError } from '@/lib/sol-price';

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
  mocks.gelToSol.mockResolvedValue(0.1);
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

  it('accepts only a strict lowercase UUID', async () => {
    for (const capsuleId of ['-'.repeat(36), 'ABCDEF00-0000-4000-8000-000000000001', `${CAPSULE.slice(0, 35)}g`]) {
      expect((await open(post('/api/sidera/capsules/open', { capsuleId }))).status).toBe(400);
    }
    expect(mocks.readCapsule).not.toHaveBeenCalled();
  });

  it('tells the holder a capsule the set could not fill is withdrawn and owed back', async () => {
    mocks.openCapsule.mockRejectedValue(new SoldOutError());
    const res = await open(post('/api/sidera/capsules/open', { capsuleId: CAPSULE }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ refundDue: true, error: expect.stringMatching(/refunded/) });
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

  it('refuses while the set is still a draft', async () => {
    mocks.cardAvailability.mockResolvedValue({ cardId: 'k', name: 'Tycho', rarity: 'common', editionSize: 300, allocated: 0, released: false, available: false });
    const res = await buyCard(post('/api/sidera/cards/buy', { walletAddress: HOLDER, designation: 'TYCHO' }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'This set is not on sale yet' });
    expect(mocks.createCardOrder).not.toHaveBeenCalled();
  });

  it('gives no quote without a live SOL price', async () => {
    mocks.readCapsule.mockResolvedValue({ ...bought, state: 'listed' });
    mocks.gelToSol.mockRejectedValue(new SolPriceUnavailableError());
    expect((await buy(post('/api/sidera/capsules/buy', body))).status).toBe(503);
    expect(mocks.purchaseCapsule).not.toHaveBeenCalled();
  });

  it('never sells a demo capsule', async () => {
    mocks.readCapsule.mockResolvedValue({ ...bought, state: 'listed', demo: true });
    expect((await buy(post('/api/sidera/capsules/buy', body))).status).toBe(404);
    expect(mocks.purchaseCapsule).not.toHaveBeenCalled();
  });

  it('says so when the capsule was taken first', async () => {
    mocks.readCapsule.mockResolvedValue({ ...bought, state: 'listed' });
    mocks.purchaseCapsule.mockResolvedValue({ ok: false, reason: 'not_listed' });
    expect((await buy(post('/api/sidera/capsules/buy', body))).status).toBe(409);
  });
});

describe('verifying a capsule', () => {
  const secret = 'ef'.repeat(32);
  const entry = (event: string, extra: Record<string, unknown> = {}) => ({
    seq: 1, capsuleId: CAPSULE, capsuleSequence: 1, event, commitment: commitmentOf(secret), buyerWallet: HOLDER, buyerNonce: HEX, purchaseHash: null, outcome: null, at: '', ...extra,
  });
  const opened = entry('opened', { outcome: { secret, draws: 0, oddsBps: { common: 1, rare: 1, epic: 1, legendary: 1 }, supply: [], pulls: [] } });

  it('reads one capsule and checks it against the commitment published at listing', async () => {
    mocks.readFullLog.mockResolvedValue([entry('listed'), entry('purchased'), opened]);
    const res = await verify(new NextRequest(`http://localhost/api/sidera/capsules/verify?capsuleId=${CAPSULE}`));
    expect(mocks.readFullLog).toHaveBeenCalledWith(expect.anything(), { capsuleId: CAPSULE });
    expect((await res.json()).verification).toEqual({ ok: true, problems: [] });

    // An 'opened' entry that repeats a different commitment does not get to choose what it is checked against.
    mocks.readFullLog.mockResolvedValue([entry('listed', { commitment: 'aa'.repeat(32) }), entry('purchased'), opened]);
    const lying = await verify(new NextRequest(`http://localhost/api/sidera/capsules/verify?capsuleId=${CAPSULE}`));
    expect((await lying.json()).verification.ok).toBe(false);
  });

  it('refuses anything but a strict UUID', async () => {
    const res = await verify(new NextRequest(`http://localhost/api/sidera/capsules/verify?capsuleId=${'-'.repeat(36)}`));
    expect(res.status).toBe(400);
    expect(mocks.readFullLog).not.toHaveBeenCalled();
  });
});

describe('confirming a payment', () => {
  const ORDER = '00000000-0000-4000-8000-0000000000aa';
  const order = (extra: Record<string, unknown>) => ({ id: ORDER, privyId: 'privy-holder', productId: 'sidera-capsule', status: 'pending', ...extra });

  it('records a transfer for a capsule order closed meanwhile as owed back, never a plain refusal', async () => {
    mocks.orderRows = [order({ status: 'cancelled' })];
    const payment = { paid: true, signature: 'sig', paidAt: new Date(), late: false };
    mocks.findPayment.mockResolvedValue(payment);
    mocks.settleCapsulePayment.mockResolvedValue(order({ status: 'refund_due', signature: 'sig' }));
    const res = await confirm(post('/api/sidera/orders/confirm', { orderId: ORDER }));
    expect(mocks.settleCapsulePayment).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'cancelled' }), payment);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ status: 'refund_due', error: expect.stringMatching(/refunded/) });
  });

  it('owes back a card payment that landed after its window', async () => {
    mocks.orderRows = [order({ productId: 'sidera-card:TYCHO' })];
    mocks.findPayment.mockResolvedValue({ paid: true, signature: 'sig', paidAt: new Date(), late: true });
    mocks.markRefundDue.mockResolvedValue(order({ productId: 'sidera-card:TYCHO', status: 'refund_due' }));
    const res = await confirm(post('/api/sidera/orders/confirm', { orderId: ORDER }));
    expect(mocks.markRefundDue).toHaveBeenCalledWith(expect.anything(), ORDER, 'sig', expect.any(Date));
    expect(mocks.markPaid).not.toHaveBeenCalled();
    expect(res.status).toBe(409);
  });

  it('refuses anything but a strict UUID', async () => {
    expect((await confirm(post('/api/sidera/orders/confirm', { orderId: '-'.repeat(36) }))).status).toBe(400);
  });
});

describe('buying a card on its own', () => {
  it('refuses an edition owed to capsules already listed', async () => {
    mocks.cardAvailability.mockResolvedValue({ cardId: 'k', name: 'Tycho', rarity: 'common', editionSize: 300, allocated: 5, released: true, available: false });
    const res = await buyCard(post('/api/sidera/cards/buy', { walletAddress: HOLDER, designation: 'TYCHO' }));
    expect(res.status).toBe(409);
    expect(mocks.createCardOrder).not.toHaveBeenCalled();
  });

  it('refuses while the set is still a draft', async () => {
    mocks.cardAvailability.mockResolvedValue({ cardId: 'k', name: 'Tycho', rarity: 'common', editionSize: 300, allocated: 0, released: false, available: false });
    const res = await buyCard(post('/api/sidera/cards/buy', { walletAddress: HOLDER, designation: 'TYCHO' }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'This set is not on sale yet' });
    expect(mocks.createCardOrder).not.toHaveBeenCalled();
  });

  it('gives no quote without a live SOL price', async () => {
    mocks.cardAvailability.mockResolvedValue({ cardId: 'k', name: 'Tycho', rarity: 'common', editionSize: 300, allocated: 5, released: true, available: true });
    mocks.gelToSol.mockRejectedValue(new SolPriceUnavailableError());
    expect((await buyCard(post('/api/sidera/cards/buy', { walletAddress: HOLDER, designation: 'TYCHO' }))).status).toBe(503);
    expect(mocks.createCardOrder).not.toHaveBeenCalled();
  });
});
