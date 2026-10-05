// @vitest-environment node
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const pay = vi.hoisted(() => ({ signatures: vi.fn(), validateTransfer: vi.fn(), telegram: vi.fn() }));
vi.mock('@solana/pay', async (actual) => ({
  ...(await actual<typeof import('@solana/pay')>()),
  validateTransfer: pay.validateTransfer,
}));
vi.mock('@solana/web3.js', async (actual) => {
  const real = await actual<typeof import('@solana/web3.js')>();
  class Connection {
    getSignaturesForAddress = pay.signatures;
  }
  return { ...real, Connection };
});
vi.mock('@/lib/telegram', () => ({ sendTelegram: pay.telegram }));
import type { Db } from '@/lib/stellar/attach';
import { findPayment, fulfilCardOrder, paymentNetworkProblem, unpaidRehearsal, usdToSol, orderHash, type OrderRow } from '@/lib/stellar/orders';
import { SolPriceUnavailableError, SOL_PRICE_FALLBACK, fetchSolPriceRates } from '@/lib/sol-price';

const MERCHANT = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
const REFERENCE = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
const EXPIRES = new Date('2026-09-20T12:15:00Z');

const order = (extra: Partial<OrderRow> = {}) => ({
  id: '00000000-0000-4000-8000-0000000000aa', amountSol: 0.1, paymentReference: REFERENCE, expiresAt: EXPIRES, ...extra,
}) as OrderRow;

beforeEach(() => {
  process.env.NEXT_PUBLIC_MERCHANT_WALLET = MERCHANT;
  pay.signatures.mockReset().mockResolvedValue([]);
  pay.validateTransfer.mockReset().mockResolvedValue({ blockTime: null });
  pay.telegram.mockReset().mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllGlobals());

describe('finding a payment', () => {
  const at = (iso: string) => Math.floor(Date.parse(iso) / 1000);
  // getSignaturesForAddress answers newest first.
  const sig = (signature: string, iso: string | null, err: unknown = null) => ({ signature, blockTime: iso ? at(iso) : null, err });

  it('is paid, inside the window, when the transfer landed before the quote lapsed', async () => {
    pay.signatures.mockResolvedValue([sig('sig', '2026-09-20T12:10:00Z')]);
    expect(await findPayment(order())).toEqual({ paid: true, signature: 'sig', paidAt: new Date('2026-09-20T12:10:00Z'), late: false });
  });

  it('is late when the block time is after the window, or unknown', async () => {
    pay.signatures.mockResolvedValue([sig('sig', '2026-09-20T12:16:00Z')]);
    expect(await findPayment(order())).toMatchObject({ paid: true, late: true });
    pay.signatures.mockResolvedValue([sig('sig', null)]);
    expect(await findPayment(order())).toMatchObject({ paid: true, late: true });
  });

  it('never accepts a transfer for an order of nothing', async () => {
    expect(await findPayment(order({ amountSol: 0 }))).toMatchObject({ paid: false, status: 400 });
    expect(pay.signatures).not.toHaveBeenCalled();
  });

  it('tells no transfer yet apart from a chain it could not ask', async () => {
    expect(await findPayment(order())).toEqual({ paid: false });
    pay.signatures.mockRejectedValue(new Error('fetch failed'));
    expect(await findPayment(order())).toMatchObject({ paid: false, status: 503 });
  });

  it('looks past a failed or wrong transfer to a valid one after it', async () => {
    pay.signatures.mockResolvedValue([sig('good', '2026-09-20T12:12:00Z'), sig('short', '2026-09-20T12:11:00Z'), sig('failed', '2026-09-20T12:10:00Z', { InstructionError: [0, 'x'] })]);
    pay.validateTransfer.mockImplementation(async (_c: unknown, s: string) => {
      if (s === 'short') throw new Error('amount not transferred');
      return { blockTime: null };
    });
    expect(await findPayment(order())).toMatchObject({ paid: true, signature: 'good', late: false });
    expect(pay.validateTransfer).not.toHaveBeenCalledWith(expect.anything(), 'failed', expect.anything(), expect.anything());
  });

  it('refuses when the only transfer paid the wrong amount', async () => {
    pay.signatures.mockResolvedValue([sig('short', '2026-09-20T12:11:00Z')]);
    pay.validateTransfer.mockRejectedValue(new Error('amount not transferred'));
    expect(await findPayment(order())).toMatchObject({ paid: false, status: 400 });
  });

  it('takes the first of two valid transfers and reports the second as owed back', async () => {
    pay.signatures.mockResolvedValue([sig('second', '2026-09-20T12:12:00Z'), sig('first', '2026-09-20T12:10:00Z')]);
    expect(await findPayment(order())).toMatchObject({ paid: true, signature: 'first' });
    expect(pay.telegram).toHaveBeenCalledWith(expect.stringContaining('second'));
  });
});

describe('the payment network', () => {
  afterEach(() => {
    delete process.env.SOLANA_RPC_URL;
    delete process.env.NEXT_PUBLIC_SOLANA_CLUSTER;
    delete process.env.VERCEL_ENV;
    delete process.env.NEXT_PUBLIC_STELLAR_SIMULATED_PAYMENT;
  });

  it('refuses a devnet RPC under mainnet wallets, and anything but mainnet in production', async () => {
    process.env.SOLANA_RPC_URL = 'https://api.devnet.solana.com';
    expect(paymentNetworkProblem()).toMatch(/devnet/);
    process.env.NEXT_PUBLIC_SOLANA_CLUSTER = 'devnet';
    expect(paymentNetworkProblem()).toBeNull();
    process.env.VERCEL_ENV = 'production';
    expect(paymentNetworkProblem()).toMatch(/mainnet/);
    expect(await findPayment(order())).toMatchObject({ paid: false, status: 503 });
    expect(pay.signatures).not.toHaveBeenCalled();
  });

  it('has no network to check in a rehearsal', () => {
    process.env.NEXT_PUBLIC_STELLAR_SIMULATED_PAYMENT = '1';
    process.env.SOLANA_RPC_URL = 'https://api.devnet.solana.com';
    process.env.VERCEL_ENV = 'production';
    expect(paymentNetworkProblem()).toBeNull();
  });
});

describe('a rehearsal deployment', () => {
  afterEach(() => { delete process.env.NEXT_PUBLIC_STELLAR_SIMULATED_PAYMENT; });

  it('settles the order itself, asks no chain, and records a signature that says so', async () => {
    process.env.NEXT_PUBLIC_STELLAR_SIMULATED_PAYMENT = '1';
    const found = await findPayment(order());
    expect(found).toMatchObject({ paid: true, late: false, signature: `simulated-no-payment:${REFERENCE}` });
    expect(pay.signatures).not.toHaveBeenCalled();
    expect(pay.validateTransfer).not.toHaveBeenCalled();
  });

  it('is off unless the deployment says exactly 1', async () => {
    process.env.NEXT_PUBLIC_STELLAR_SIMULATED_PAYMENT = 'true';
    expect(await findPayment(order())).toEqual({ paid: false });
  });

  it('leaves its paid orders unpaid on a deployment that sells for real', () => {
    const rehearsed = { signature: `simulated-no-payment:${REFERENCE}` };
    expect(unpaidRehearsal(rehearsed)).toBe(true);
    expect(unpaidRehearsal({ signature: 'real' })).toBe(false);
    process.env.NEXT_PUBLIC_STELLAR_SIMULATED_PAYMENT = '1';
    expect(unpaidRehearsal(rehearsed)).toBe(false);
  });
});

describe('quoting in SOL', () => {
  it('refuses to quote on the fallback rate, where the marketplace still falls back', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    await expect(usdToSol(39)).rejects.toBeInstanceOf(SolPriceUnavailableError);
    expect(await fetchSolPriceRates()).toEqual(SOL_PRICE_FALLBACK);

    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    await expect(usdToSol(39)).rejects.toBeInstanceOf(SolPriceUnavailableError);
  });

  it('quotes at the live rate', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ solana: { usd: 150 } }) })));
    expect(await usdToSol(39)).toBeGreaterThan(0);
  });

  it('asks the next feed when one refuses', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      url.includes('coinbase') ? { ok: false } : { ok: true, json: async () => ({ result: { SOLUSD: { c: ['120.5'] } } }) },
    ));
    expect((await fetchSolPriceRates({ strict: true })).solPrice).toBe(120.5);
  });

  it('quotes a rehearsal without a live feed', async () => {
    process.env.NEXT_PUBLIC_STELLAR_SIMULATED_PAYMENT = '1';
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    expect(await usdToSol(39)).toBeGreaterThan(0);
    delete process.env.NEXT_PUBLIC_STELLAR_SIMULATED_PAYMENT;
  });
});

describe('a direct card sale', () => {
  it('allocates only what capsules are not owed, and logs the sale with the order’s hash, not the wallet', async () => {
    const execute = vi.fn(async (_q: SQL) => ({ rows: [{ edition_number: 6 }] }));
    const chain: Record<string, unknown> = {};
    for (const m of ['from', 'where']) chain[m] = () => chain;
    let reads = 0;
    chain.limit = async () => (reads++ === 0 ? [{ id: 'card-1', editionSize: 300 }] : []);
    const db = { execute, select: () => chain, update: vi.fn() } as unknown as Db;
    const o = order({ productId: 'stellar-card:TYCHO', walletAddress: 'holder-wallet', status: 'paid' });

    expect(await fulfilCardOrder(db, o)).toEqual({ ok: true, editionNumber: 6, editionSize: 300, designation: 'TYCHO' });
    const { sql, params } = new PgDialect().sqlToQuery(execute.mock.calls[0][0]);
    expect(sql).toMatch(/state IN \('listed', 'purchased'\)\)\s*>= 1/);
    expect(sql).toMatch(/INSERT INTO capsule_log \(event, outcome\)\s*SELECT 'card_sold'/);
    expect(params).toContain(orderHash(o.id));
    const logged = sql.slice(sql.indexOf('INSERT INTO capsule_log'));
    expect(logged).not.toMatch(/owner_wallet|wallet/);
  });

  it('marks the order refund_due when no edition can be spared', async () => {
    const execute = vi.fn(async () => ({ rows: [] }));
    const chain: Record<string, unknown> = {};
    for (const m of ['from', 'where']) chain[m] = () => chain;
    let reads = 0;
    chain.limit = async () => (reads++ === 0 ? [{ id: 'card-1', editionSize: 300 }] : []);
    const set = vi.fn(() => ({ where: async () => undefined }));
    const db = { execute, select: () => chain, update: () => ({ set }) } as unknown as Db;

    expect(await fulfilCardOrder(db, order({ productId: 'stellar-card:TYCHO', walletAddress: 'w', status: 'paid' }))).toEqual({ ok: false, reason: 'sold_out' });
    expect(set).toHaveBeenCalledWith({ status: 'refund_due' });
  });
});
