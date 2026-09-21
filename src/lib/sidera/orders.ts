/**
 * Paying for Sidera: capsules and single cards, on the existing orders table
 * and the existing Solana Pay rail. A card processor is out of scope for beta.
 *
 * An order is created pending with a fresh reference key and a quote that
 * stands for ORDER_WINDOW_MINUTES; it becomes paid only once findReference
 * finds a transaction carrying that key, validateTransfer confirms it paid the
 * merchant the order's amount, and its block time is inside the window. A
 * transfer that arrives later is recorded as refund_due, never dropped. The
 * pending → paid step is one conditional UPDATE, so a confirmation retried or
 * raced is paid once.
 */

import { createHash } from 'node:crypto';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { FindReferenceError, encodeURL, findReference, validateTransfer } from '@solana/pay';
import BigNumber from 'bignumber.js';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { card, edition, orders } from '@/lib/schema';
import { priceToSol } from '@/lib/dealers';
import { fetchSolPriceRates } from '@/lib/sol-price';
import type { Db } from './attach';
import { ORDER_WINDOW_MINUTES } from './economics';

export type OrderRow = typeof orders.$inferSelect;

export const CAPSULE_PRODUCT_ID = 'sidera-capsule';
export const CARD_PRODUCT_PREFIX = 'sidera-card:';

/**
 * Whether this deployment is rehearsing rather than selling.
 *
 * With it on, no Solana transfer is looked for and no money moves: an order is
 * treated as paid the moment its buyer asks, and the signature recorded says
 * so. It is a deployment setting, never a request parameter, and the rehearsal
 * is marked in the capsule log at purchase, so a rehearsal sale can never be
 * read back as a real one.
 */
export function simulatedPayments(): boolean {
  return process.env.NEXT_PUBLIC_SIDERA_SIMULATED_PAYMENT === '1';
}

/** What a rehearsal records where a transaction signature would go. */
export function simulatedSignature(reference: string): string {
  return `simulated-no-payment:${reference}`;
}

export function merchantWallet(): PublicKey | null {
  try {
    return process.env.NEXT_PUBLIC_MERCHANT_WALLET ? new PublicKey(process.env.NEXT_PUBLIC_MERCHANT_WALLET) : null;
  } catch {
    return null;
  }
}

/**
 * Lari to SOL at the live rate, to the lamport-safe six places the orders
 * table already uses. Throws SolPriceUnavailableError rather than quote on a
 * fixed fallback rate, and refuses a quote that comes to nothing.
 */
export async function gelToSol(gel: number): Promise<number> {
  const { solPerGEL, solPrice } = await fetchSolPriceRates({ strict: true });
  const sol = +priceToSol(gel, 'GEL', solPerGEL, solPrice).toFixed(6);
  if (!(sol > 0)) throw new Error('A Sidera quote must be a positive amount of SOL');
  return sol;
}

export function orderExpiry(from = Date.now()): Date {
  return new Date(from + ORDER_WINDOW_MINUTES * 60_000);
}

export function newPaymentReference(): string {
  return Keypair.generate().publicKey.toBase58();
}

export function paymentUrl(input: { recipient: PublicKey; amountSol: number; reference: string; label: string; orderId: string }): string {
  return encodeURL({
    recipient: input.recipient,
    amount: new BigNumber(input.amountSol),
    reference: new PublicKey(input.reference),
    label: input.label,
    memo: input.orderId,
    message: `Sidera · ${input.label}`,
  }).toString();
}

/** A pending order for one card, bought on its own. */
export async function createCardOrder(
  db: Db,
  input: { privyId: string; wallet: string; designation: string; name: string; priceGel: number; amountSol: number; reference: string },
): Promise<OrderRow> {
  const [row] = await db
    .insert(orders)
    .values({
      privyId: input.privyId,
      walletAddress: input.wallet,
      productId: `${CARD_PRODUCT_PREFIX}${input.designation}`,
      productName: input.name,
      dealerId: 'sidera',
      paymentMethod: 'sol',
      amountSol: input.amountSol,
      amountStars: 0,
      amountFiat: input.priceGel,
      currency: 'GEL',
      paymentReference: input.reference,
      status: 'pending',
      shippingName: '',
      shippingPhone: '',
      shippingAddress: '',
      shippingCity: '',
      shippingCountry: '',
      expiresAt: orderExpiry(),
    })
    .returning();
  return row;
}

/**
 * A transfer found on chain: when it landed, and whether that was after the
 * order's window closed. `paid: false` with no error means no transfer yet;
 * with an error, the chain could not be asked and nothing may be concluded.
 */
export type PaymentCheck =
  | { paid: true; signature: string; paidAt: Date; late: boolean }
  | { paid: false; error?: string; status?: number };

/** Looks for the order's payment on chain. Does not write. */
export async function findPayment(order: OrderRow): Promise<PaymentCheck> {
  if (simulatedPayments()) {
    return { paid: true, signature: simulatedSignature(order.paymentReference), paidAt: new Date(), late: false };
  }
  const recipient = merchantWallet();
  if (!recipient) return { paid: false, error: 'Merchant wallet not configured', status: 503 };
  if (!(order.amountSol > 0)) return { paid: false, error: 'The order has no amount to pay', status: 400 };
  let reference: PublicKey;
  try {
    reference = new PublicKey(order.paymentReference);
  } catch {
    return { paid: false, error: 'Invalid reference', status: 400 };
  }

  const connection = new Connection(process.env.SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com', 'confirmed');
  let signature: string;
  let blockTime: number | null | undefined;
  try {
    ({ signature, blockTime } = await findReference(connection, reference, { finality: 'confirmed' }));
  } catch (err) {
    if (err instanceof FindReferenceError) return { paid: false };
    return { paid: false, error: 'The Solana network could not be reached', status: 503 };
  }
  // findReference only proves some transaction carried the key; the transfer
  // itself must pay the merchant the order's amount.
  try {
    const tx = await validateTransfer(
      connection,
      signature,
      { recipient, amount: new BigNumber(order.amountSol), reference },
      { commitment: 'confirmed' },
    );
    blockTime = blockTime ?? tx.blockTime;
  } catch (err) {
    console.warn('[sidera/confirm] transfer validation failed:', err instanceof Error ? err.message : err);
    return { paid: false, error: 'Payment amount does not match order', status: 400 };
  }
  // A transfer with no block time cannot be shown to be inside the window; it
  // is treated as late, which refunds it rather than keeps it.
  const paidAt = blockTime ? new Date(blockTime * 1000) : new Date();
  const late = !blockTime || !order.expiresAt || paidAt.getTime() > order.expiresAt.getTime();
  return { paid: true, signature, paidAt, late };
}

/** pending → paid, once. Returns the row either way. */
export async function markPaid(db: Db, orderId: string, signature: string, paidAt: Date = new Date()): Promise<OrderRow> {
  await db
    .update(orders)
    .set({ status: 'paid', signature, paidAt })
    .where(and(eq(orders.id, orderId), eq(orders.status, 'pending')));
  const [row] = await db.select().from(orders).where(eq(orders.id, orderId));
  return row;
}

/** A transfer the order cannot take — late, or for an order already closed — owed back. Returns the row. */
export async function markRefundDue(db: Db, orderId: string, signature: string, paidAt: Date): Promise<OrderRow> {
  await db
    .update(orders)
    .set({ status: 'refund_due', signature, paidAt })
    .where(and(eq(orders.id, orderId), inArray(orders.status, ['pending', 'cancelled'])));
  const [row] = await db.select().from(orders).where(eq(orders.id, orderId));
  return row;
}

/** What `orderHash` in a 'card_sold' log entry is: the buyer holds the order id; the log shows only this. */
export function orderHash(orderId: string): string {
  return createHash('sha256').update(orderId, 'utf8').digest('hex');
}

type Rows<T> = { rows: T[] };

/**
 * A card's edition count, and whether the set can spare one for a direct
 * sale: the set's unallocated editions, less every draw owed to capsules
 * listed or bought and not yet opened, must leave at least one. A capsule's
 * draws may land on any card of the set (a card or tier that is gone passes
 * its share on), so the reservation is the set's, as when capsules are listed.
 */
export async function cardAvailability(db: Db, designation: string) {
  const { rows } = (await db.execute(sql`
    SELECT k.id, k.name, k.rarity, k.edition_size, cs.status AS set_status,
      (SELECT COUNT(*) FROM edition e WHERE e.card_id = k.id) AS allocated,
      (SELECT SUM(s.edition_size) FROM card s WHERE s.set_id = k.set_id)
        - (SELECT COUNT(*) FROM edition e JOIN card s ON s.id = e.card_id WHERE s.set_id = k.set_id)
        - (SELECT COALESCE(SUM(cards_per_capsule), 0) FROM capsule WHERE set_id = k.set_id AND state IN ('listed', 'purchased'))
        AS spare
    FROM card k JOIN card_set cs ON cs.id = k.set_id WHERE k.designation = ${designation}
  `)) as Rows<{ id: string; name: string; rarity: string; edition_size: number; set_status: string; allocated: number | string; spare: number | string }>;
  const r = rows[0];
  if (!r) return null;
  const released = r.set_status === 'released';
  return {
    cardId: r.id,
    name: r.name,
    rarity: r.rarity,
    editionSize: Number(r.edition_size),
    allocated: Number(r.allocated),
    /** A draft set is not on sale. Nothing in it can be bought, by capsule or on its own. */
    released,
    available: released && Number(r.allocated) < Number(r.edition_size) && Number(r.spare) >= 1,
  };
}

/**
 * The next edition of a card, for a paid direct sale, and its public log
 * entry — one statement, so neither exists without the other. Refused (null)
 * when the card is sold out or the set's remaining editions are owed to
 * capsules. The entry names the card, the edition and SHA-256 of the order id;
 * not the wallet.
 */
async function allocateCardSale(
  db: Db,
  input: { cardId: string; wallet: string; orderId: string },
): Promise<{ editionNumber: number } | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { rows } = (await db.execute(sql`
        WITH e AS (
          INSERT INTO edition (card_id, edition_number, owner_wallet, order_id, observation_capture_id)
          SELECT ${input.cardId}::uuid, COALESCE(MAX(x.edition_number), 0) + 1, ${input.wallet}, ${input.orderId}::uuid,
            (SELECT nt.capture_id FROM nightly_target nt
             WHERE nt.card_id = ${input.cardId}::uuid AND nt.capture_id IS NOT NULL
             ORDER BY nt.night_date DESC LIMIT 1)
          FROM edition x
          WHERE x.card_id = ${input.cardId}::uuid
          HAVING COALESCE(MAX(x.edition_number), 0) < (SELECT edition_size FROM card WHERE id = ${input.cardId}::uuid)
            AND (SELECT SUM(s.edition_size) FROM card s WHERE s.set_id = (SELECT set_id FROM card WHERE id = ${input.cardId}::uuid))
              - (SELECT COUNT(*) FROM edition y JOIN card s ON s.id = y.card_id
                 WHERE s.set_id = (SELECT set_id FROM card WHERE id = ${input.cardId}::uuid))
              - (SELECT COALESCE(SUM(cards_per_capsule), 0) FROM capsule
                 WHERE set_id = (SELECT set_id FROM card WHERE id = ${input.cardId}::uuid) AND state IN ('listed', 'purchased'))
              >= 1
          RETURNING id, card_id, edition_number
        ),
        logged AS (
          INSERT INTO capsule_log (event, outcome)
          SELECT 'card_sold', jsonb_build_object(
            'designation', k.designation, 'editionNumber', e.edition_number, 'editionSize', k.edition_size,
            'orderHash', ${orderHash(input.orderId)}::text)
          FROM e JOIN card k ON k.id = e.card_id
          RETURNING seq
        )
        SELECT e.edition_number FROM e
      `)) as Rows<{ edition_number: number }>;
      return rows[0] ? { editionNumber: Number(rows[0].edition_number) } : null;
    } catch (err) {
      const { code, cause } = err as { code?: string; cause?: { code?: string } };
      if ((code ?? cause?.code) !== '23505') throw err;
    }
  }
  throw new Error('edition allocation kept colliding');
}

export type CardFulfilment =
  | { ok: true; editionNumber: number; editionSize: number; designation: string }
  | { ok: false; reason: 'sold_out' | 'unknown_card' };

/**
 * The edition a paid single-card order bought. Idempotent: the order's own
 * edition is returned if it already has one, and the unique index on
 * edition.order_id means a raced second confirmation cannot allocate twice.
 * A card sold out, or whose set's last editions are owed to capsules, marks
 * the order refund_due.
 */
export async function fulfilCardOrder(db: Db, order: OrderRow): Promise<CardFulfilment> {
  const designation = order.productId.slice(CARD_PRODUCT_PREFIX.length);
  const [c] = await db
    .select({ id: card.id, editionSize: card.editionSize })
    .from(card)
    .where(eq(card.designation, designation))
    .limit(1);
  if (!c) return { ok: false, reason: 'unknown_card' };

  const held = async () => {
    const [e] = await db.select({ editionNumber: edition.editionNumber }).from(edition).where(eq(edition.orderId, order.id)).limit(1);
    return e;
  };
  const existing = await held();
  if (existing) return { ok: true, editionNumber: existing.editionNumber, editionSize: c.editionSize, designation };

  try {
    const allocated = await allocateCardSale(db, { cardId: c.id, wallet: order.walletAddress, orderId: order.id });
    if (!allocated) {
      await db.update(orders).set({ status: 'refund_due' }).where(and(eq(orders.id, order.id), eq(orders.status, 'paid')));
      return { ok: false, reason: 'sold_out' };
    }
    return { ok: true, editionNumber: allocated.editionNumber, editionSize: c.editionSize, designation };
  } catch (err) {
    const again = await held();
    if (again) return { ok: true, editionNumber: again.editionNumber, editionSize: c.editionSize, designation };
    throw err;
  }
}
