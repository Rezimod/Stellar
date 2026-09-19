/**
 * Paying for Sidera: capsules and single cards, on the existing orders table
 * and the existing Solana Pay rail. A card processor is out of scope for beta.
 *
 * An order is created pending with a fresh reference key; it becomes paid only
 * once findReference finds a transaction carrying that key and validateTransfer
 * confirms it paid the merchant the order's amount. The pending → paid step is
 * one conditional UPDATE, so a confirmation retried or raced is paid once.
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { encodeURL, findReference, validateTransfer } from '@solana/pay';
import BigNumber from 'bignumber.js';
import { and, eq } from 'drizzle-orm';
import { card, edition, orders } from '@/lib/schema';
import { priceToSol } from '@/lib/dealers';
import { fetchSolPriceRates } from '@/lib/sol-price';
import type { Db } from './attach';
import { allocateEdition } from './repo';

export type OrderRow = typeof orders.$inferSelect;

export const CAPSULE_PRODUCT_ID = 'sidera-capsule';
export const CARD_PRODUCT_PREFIX = 'sidera-card:';

export function merchantWallet(): PublicKey | null {
  try {
    return process.env.NEXT_PUBLIC_MERCHANT_WALLET ? new PublicKey(process.env.NEXT_PUBLIC_MERCHANT_WALLET) : null;
  } catch {
    return null;
  }
}

/** Lari to SOL at the current rate, to the lamport-safe six places the orders table already uses. */
export async function gelToSol(gel: number): Promise<number> {
  const { solPerGEL, solPrice } = await fetchSolPriceRates();
  return +priceToSol(gel, 'GEL', solPerGEL, solPrice).toFixed(6);
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
    })
    .returning();
  return row;
}

export type PaymentCheck = { paid: true; signature: string } | { paid: false; error?: string; status?: number };

/** Looks for the order's payment on chain. Does not write. */
export async function findPayment(order: OrderRow): Promise<PaymentCheck> {
  const recipient = merchantWallet();
  if (!recipient) return { paid: false, error: 'Merchant wallet not configured', status: 503 };
  let reference: PublicKey;
  try {
    reference = new PublicKey(order.paymentReference);
  } catch {
    return { paid: false, error: 'Invalid reference', status: 400 };
  }

  const connection = new Connection(process.env.SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com', 'confirmed');
  let signature: string;
  try {
    signature = (await findReference(connection, reference, { finality: 'confirmed' })).signature;
  } catch {
    return { paid: false };
  }
  // findReference only proves some transaction carried the key; the transfer
  // itself must pay the merchant the order's amount.
  try {
    await validateTransfer(
      connection,
      signature,
      { recipient, amount: new BigNumber(order.amountSol), reference },
      { commitment: 'confirmed' },
    );
  } catch (err) {
    console.warn('[sidera/confirm] transfer validation failed:', err instanceof Error ? err.message : err);
    return { paid: false, error: 'Payment amount does not match order', status: 400 };
  }
  return { paid: true, signature };
}

/** pending → paid, once. Returns the row either way. */
export async function markPaid(db: Db, orderId: string, signature: string): Promise<OrderRow> {
  await db
    .update(orders)
    .set({ status: 'paid', signature, paidAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.status, 'pending')));
  const [row] = await db.select().from(orders).where(eq(orders.id, orderId));
  return row;
}

export type CardFulfilment =
  | { ok: true; editionNumber: number; editionSize: number; designation: string }
  | { ok: false; reason: 'sold_out' | 'unknown_card' };

/**
 * The edition a paid single-card order bought. Idempotent: the order's own
 * edition is returned if it already has one, and the unique index on
 * edition.order_id means a raced second confirmation cannot allocate twice.
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
    const allocated = await allocateEdition(db, c.id, order.walletAddress, order.id);
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
