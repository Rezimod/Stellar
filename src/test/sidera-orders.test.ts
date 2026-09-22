// @vitest-environment node
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const pay = vi.hoisted(() => ({ findReference: vi.fn(), validateTransfer: vi.fn() }));
vi.mock('@solana/pay', async (actual) => ({
  ...(await actual<typeof import('@solana/pay')>()),
  findReference: pay.findReference,
  validateTransfer: pay.validateTransfer,
}));
import { FindReferenceError } from '@solana/pay';
import type { Db } from '@/lib/sidera/attach';
import { findPayment, fulfilCardOrder, usdToSol, orderHash, type OrderRow } from '@/lib/sidera/orders';
import { SolPriceUnavailableError, SOL_PRICE_FALLBACK, fetchSolPriceRates } from '@/lib/sol-price';

const MERCHANT = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
const REFERENCE = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
const EXPIRES = new Date('2026-09-20T12:15:00Z');

const order = (extra: Partial<OrderRow> = {}) => ({
  id: '00000000-0000-4000-8000-0000000000aa', amountSol: 0.1, paymentReference: REFERENCE, expiresAt: EXPIRES, ...extra,
}) as OrderRow;

beforeEach(() => {
  process.env.NEXT_PUBLIC_MERCHANT_WALLET = MERCHANT;
  pay.findReference.mockReset();
  pay.validateTransfer.mockReset().mockResolvedValue({ blockTime: null });
});
afterEach(() => vi.unstubAllGlobals());

describe('finding a payment', () => {
  const at = (iso: string) => Math.floor(Date.parse(iso) / 1000);

  it('is paid, inside the window, when the transfer landed before the quote lapsed', async () => {
    pay.findReference.mockResolvedValue({ signature: 'sig', blockTime: at('2026-09-20T12:10:00Z') });
    expect(await findPayment(order())).toEqual({ paid: true, signature: 'sig', paidAt: new Date('2026-09-20T12:10:00Z'), late: false });
  });

  it('is late when the block time is after the window, or unknown', async () => {
    pay.findReference.mockResolvedValue({ signature: 'sig', blockTime: at('2026-09-20T12:16:00Z') });
    expect(await findPayment(order())).toMatchObject({ paid: true, late: true });
    pay.findReference.mockResolvedValue({ signature: 'sig', blockTime: null });
    expect(await findPayment(order())).toMatchObject({ paid: true, late: true });
  });

  it('never accepts a transfer for an order of nothing', async () => {
    expect(await findPayment(order({ amountSol: 0 }))).toMatchObject({ paid: false, status: 400 });
    expect(pay.findReference).not.toHaveBeenCalled();
  });

  it('tells no transfer yet apart from a chain it could not ask', async () => {
    pay.findReference.mockRejectedValue(new FindReferenceError('not found'));
    expect(await findPayment(order())).toEqual({ paid: false });
    pay.findReference.mockRejectedValue(new Error('fetch failed'));
    expect(await findPayment(order())).toMatchObject({ paid: false, status: 503 });
  });
});

describe('a rehearsal deployment', () => {
  afterEach(() => { delete process.env.NEXT_PUBLIC_SIDERA_SIMULATED_PAYMENT; });

  it('settles the order itself, asks no chain, and records a signature that says so', async () => {
    process.env.NEXT_PUBLIC_SIDERA_SIMULATED_PAYMENT = '1';
    const found = await findPayment(order());
    expect(found).toMatchObject({ paid: true, late: false, signature: `simulated-no-payment:${REFERENCE}` });
    expect(pay.findReference).not.toHaveBeenCalled();
    expect(pay.validateTransfer).not.toHaveBeenCalled();
  });

  it('is off unless the deployment says exactly 1', async () => {
    process.env.NEXT_PUBLIC_SIDERA_SIMULATED_PAYMENT = 'true';
    pay.findReference.mockRejectedValue(new FindReferenceError('not found'));
    expect(await findPayment(order())).toEqual({ paid: false });
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
});

describe('a direct card sale', () => {
  it('allocates only what capsules are not owed, and logs the sale with the order’s hash, not the wallet', async () => {
    const execute = vi.fn(async (_q: SQL) => ({ rows: [{ edition_number: 6 }] }));
    const chain: Record<string, unknown> = {};
    for (const m of ['from', 'where']) chain[m] = () => chain;
    let reads = 0;
    chain.limit = async () => (reads++ === 0 ? [{ id: 'card-1', editionSize: 300 }] : []);
    const db = { execute, select: () => chain, update: vi.fn() } as unknown as Db;
    const o = order({ productId: 'sidera-card:TYCHO', walletAddress: 'holder-wallet', status: 'paid' });

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

    expect(await fulfilCardOrder(db, order({ productId: 'sidera-card:TYCHO', walletAddress: 'w', status: 'paid' }))).toEqual({ ok: false, reason: 'sold_out' });
    expect(set).toHaveBeenCalledWith({ status: 'refund_due' });
  });
});
