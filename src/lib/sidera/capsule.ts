/**
 * Capsules: listing, purchase, opening, voiding, and the public log.
 *
 * Every state change and its log entry are written by one neon-http batch,
 * which runs as a single transaction: there is no moment at which a capsule
 * has changed state and the log does not yet say so. neon-http has no
 * interactive transactions, so each batch is built to fail as a whole when
 * the world moved under it — a NOT NULL or unique violation rolls back every
 * statement — and the caller reads again and retries a bounded number of times.
 *
 * capsule_log is only ever INSERTed into. Nothing in this file, or anywhere in
 * src, updates or deletes it (a test holds that), and the database refuses to.
 */

import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { isRarity, type Rarity } from '@/lib/rarity';
import type { Db } from './attach';
import type { LogRow } from './audit';
import { CAPSULE_PRICE_GEL, CARDS_PER_CAPSULE, RARITY_ODDS_BPS } from './economics';
import {
  commitmentOf,
  newServerSecret,
  planPulls,
  purchaseHash,
  purchaseMessage,
  type PlannedPull,
  type SupplyEntry,
} from './randomness';

const MAX_ATTEMPTS = 8;

// ─── Sealing ────────────────────────────────────────────────────────────────

function sealKey(): Buffer {
  const hex = process.env.CAPSULE_SEAL_KEY ?? '';
  if (!/^[0-9a-f]{64}$/i.test(hex)) throw new Error('CAPSULE_SEAL_KEY must be 32 bytes of hex');
  return Buffer.from(hex, 'hex');
}

/** AES-256-GCM, with the capsule id as associated data so a sealed secret cannot be moved to another row. */
export function sealSecret(secret: string, capsuleId: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', sealKey(), iv);
  cipher.setAAD(Buffer.from(capsuleId, 'utf8'));
  const body = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), body.toString('base64')].join(':');
}

export function unsealSecret(sealed: string, capsuleId: string): string {
  const [version, iv, tag, body] = sealed.split(':');
  if (version !== 'v1') throw new Error('unknown seal version');
  const decipher = createDecipheriv('aes-256-gcm', sealKey(), Buffer.from(iv, 'base64'));
  decipher.setAAD(Buffer.from(capsuleId, 'utf8'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(body, 'base64')), decipher.final()]).toString('utf8');
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function pgCode(err: unknown): string | undefined {
  const { code, cause } = err as { code?: string; cause?: { code?: string } };
  return code ?? cause?.code;
}

/** A write that lost a race: someone else took the number, the edition, or the capsule. */
function lostRace(err: unknown): boolean {
  const code = pgCode(err);
  return code === '23505' || code === '23502';
}

/** Exponential, with full jitter, so openings that collided do not wake together and collide again. */
function backoff(attempt: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.random() * 10 * 2 ** attempt));
}

type Rows<T> = { rows: T[] };

/** db.batch over raw statements, each of which answers with its rows. */
function runBatch(db: Db, items: ReadonlyArray<BatchItem<'pg'>>): Promise<Array<Rows<Record<string, unknown>>>> {
  return db.batch(items as [BatchItem<'pg'>, ...BatchItem<'pg'>[]]) as Promise<Array<Rows<Record<string, unknown>>>>;
}

// ─── Supply ─────────────────────────────────────────────────────────────────

export type SupplyRow = SupplyEntry & { cardId: string; editionSize: number };

/**
 * Every card of the set, with how many editions are left. Edition numbers are
 * gapless from 1, so the highest number allocated is the number allocated.
 */
export async function readSupply(db: Db, setId: string): Promise<SupplyRow[]> {
  const { rows } = (await db.execute(sql`
    SELECT c.id, c.designation, c.rarity, c.edition_size,
      COALESCE((SELECT MAX(e.edition_number) FROM edition e WHERE e.card_id = c.id), 0) AS allocated
    FROM card c
    WHERE c.set_id = ${setId}::uuid
    ORDER BY c.designation
  `)) as Rows<{ id: string; designation: string; rarity: string; edition_size: number; allocated: number | string }>;
  return rows
    .filter((r) => isRarity(r.rarity))
    .map((r) => ({
      cardId: r.id,
      designation: r.designation,
      rarity: r.rarity as Rarity,
      editionSize: Number(r.edition_size),
      remaining: Number(r.edition_size) - Number(r.allocated),
    }));
}

// ─── Listing ────────────────────────────────────────────────────────────────

export type ListedCapsule = { id: string; sequence: number; commitment: string };

/**
 * Lists `count` capsules of a set, each committed before it exists for sale.
 *
 * Numbers are MAX(sequence)+1 inside one transaction, so a batch of five takes
 * five consecutive numbers; a second lister at the same moment collides on the
 * unique index and the whole batch is retried, never half-written. Refuses to
 * list more capsules than the set's remaining editions can fill.
 */
export async function listCapsules(
  db: Db,
  input: { setId: string; count: number; priceGel?: number },
): Promise<ListedCapsule[]> {
  const price = input.priceGel ?? CAPSULE_PRICE_GEL;
  const supply = await readSupply(db, input.setId);
  const remaining = supply.reduce((sum, s) => sum + Math.max(0, s.remaining), 0);
  const { rows: open } = (await db.execute(sql`
    SELECT COALESCE(SUM(cards_per_capsule), 0) AS draws FROM capsule
    WHERE set_id = ${input.setId}::uuid AND state IN ('listed', 'purchased')
  `)) as Rows<{ draws: number | string }>;
  const owed = Number(open[0]?.draws ?? 0);
  if (owed + input.count * CARDS_PER_CAPSULE > remaining) {
    throw new Error(`Not enough editions left: ${remaining} remain, ${owed} are owed to capsules already listed.`);
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const capsules = Array.from({ length: input.count }, () => {
      const id = randomUUID();
      const secret = newServerSecret();
      return { id, commitment: commitmentOf(secret), sealed: sealSecret(secret, id) };
    });
    const statements = capsules.map((c) =>
      db.execute(sql`
        WITH c AS (
          INSERT INTO capsule (id, set_id, sequence, commitment, server_secret_sealed, price_gel, cards_per_capsule)
          SELECT ${c.id}::uuid, ${input.setId}::uuid, COALESCE(MAX(sequence), 0) + 1, ${c.commitment}, ${c.sealed},
            ${price}, ${CARDS_PER_CAPSULE}
          FROM capsule
          RETURNING id, sequence, commitment
        )
        INSERT INTO capsule_log (capsule_id, capsule_sequence, event, commitment)
        SELECT id, sequence, 'listed', commitment FROM c
        RETURNING capsule_id, capsule_sequence
      `),
    );
    try {
      const results = await runBatch(db, statements);
      return results.map((r, i) => ({
        id: capsules[i].id,
        sequence: Number(r.rows[0].capsule_sequence),
        commitment: capsules[i].commitment,
      }));
    } catch (err) {
      if (!lostRace(err)) throw err;
      await backoff(attempt);
    }
  }
  throw new Error('capsule listing kept colliding');
}

/** Capsules on sale, lowest number first. Never selects the sealed secret. */
export async function capsulesOnSale(db: Db, limit = 50) {
  const { rows } = (await db.execute(sql`
    SELECT id, set_id, sequence, commitment, price_gel, cards_per_capsule, listed_at
    FROM capsule WHERE state = 'listed' ORDER BY sequence LIMIT ${limit}
  `)) as Rows<{ id: string; set_id: string; sequence: number | string; commitment: string; price_gel: number; cards_per_capsule: number; listed_at: string }>;
  return rows.map((r) => ({
    id: r.id,
    setId: r.set_id,
    sequence: Number(r.sequence),
    commitment: r.commitment,
    priceGel: Number(r.price_gel),
    cardsPerCapsule: Number(r.cards_per_capsule),
    listedAt: r.listed_at,
  }));
}

// ─── Purchase ───────────────────────────────────────────────────────────────

type CapsuleRow = {
  id: string;
  set_id: string;
  sequence: number | string;
  commitment: string;
  server_secret_sealed: string;
  server_secret: string | null;
  state: 'listed' | 'purchased' | 'opened' | 'void';
  price_gel: number;
  cards_per_capsule: number;
  buyer_wallet: string | null;
  buyer_nonce: string | null;
  order_id: string | null;
};

export async function readCapsule(db: Db, capsuleId: string): Promise<CapsuleRow | null> {
  const { rows } = (await db.execute(sql`
    SELECT id, set_id, sequence, commitment, server_secret_sealed, server_secret, state, price_gel,
      cards_per_capsule, buyer_wallet, buyer_nonce, order_id
    FROM capsule WHERE id = ${capsuleId}::uuid
  `)) as Rows<CapsuleRow>;
  return rows[0] ?? null;
}

export type PurchaseResult =
  | { ok: true; orderId: string; sequence: number; message: string; purchaseHash: string; priceGel: number }
  | { ok: false; reason: 'not_found' | 'not_listed' | 'commitment_mismatch' };

/**
 * Takes a listed capsule for a buyer, with their nonce, and opens its order.
 *
 * One batch: the capsule changes hands, the 'purchased' entry is logged, and
 * the order row is written — or none of it happens. From this moment the
 * nonce is public and fixed; the capsule can only end opened or voided, and
 * either is in the log.
 */
export async function purchaseCapsule(
  db: Db,
  input: {
    capsuleId: string;
    commitment: string;
    wallet: string;
    nonce: string;
    signature: string | null;
    privyId: string;
    amountSol: number;
    paymentReference: string;
  },
): Promise<PurchaseResult> {
  const capsuleRow = await readCapsule(db, input.capsuleId);
  if (!capsuleRow) return { ok: false, reason: 'not_found' };
  if (capsuleRow.commitment !== input.commitment) return { ok: false, reason: 'commitment_mismatch' };
  if (capsuleRow.state !== 'listed') return { ok: false, reason: 'not_listed' };

  const sequence = Number(capsuleRow.sequence);
  const terms = { capsuleId: input.capsuleId, sequence, commitment: input.commitment, wallet: input.wallet, nonce: input.nonce };
  const hash = purchaseHash(terms);
  const orderId = randomUUID();
  const priceGel = Number(capsuleRow.price_gel);

  const [claimed, order] = await runBatch(db, [
    db.execute(sql`
      WITH c AS (
        UPDATE capsule SET state = 'purchased', buyer_wallet = ${input.wallet}, buyer_nonce = ${input.nonce},
          buyer_signature = ${input.signature}, purchase_hash = ${hash}, order_id = ${orderId}::uuid, purchased_at = now()
        WHERE id = ${input.capsuleId}::uuid AND state = 'listed' AND commitment = ${input.commitment}
        RETURNING id, sequence, commitment, buyer_wallet, buyer_nonce, purchase_hash
      )
      INSERT INTO capsule_log (capsule_id, capsule_sequence, event, commitment, buyer_wallet, buyer_nonce, purchase_hash)
      SELECT id, sequence, 'purchased', commitment, buyer_wallet, buyer_nonce, purchase_hash FROM c
      RETURNING seq
    `),
    db.execute(sql`
      INSERT INTO orders (id, privy_id, wallet_address, product_id, product_name, dealer_id, payment_method,
        amount_sol, amount_stars, amount_fiat, currency, payment_reference, status,
        shipping_name, shipping_phone, shipping_address, shipping_city, shipping_country)
      SELECT ${orderId}::uuid, ${input.privyId}, ${input.wallet}, 'sidera-capsule', ${`Capsule ${sequence}`}, 'sidera', 'sol',
        ${input.amountSol}, 0, ${priceGel}, 'GEL', ${input.paymentReference}, 'pending', '', '', '', '', ''
      WHERE EXISTS (SELECT 1 FROM capsule WHERE id = ${input.capsuleId}::uuid AND order_id = ${orderId}::uuid)
      RETURNING id
    `),
  ]);

  if (claimed.rows.length === 0 || order.rows.length === 0) return { ok: false, reason: 'not_listed' };
  return { ok: true, orderId, sequence, message: purchaseMessage(terms), purchaseHash: hash, priceGel };
}

// ─── Opening ────────────────────────────────────────────────────────────────

export type OpenedPull = {
  drawIndex: number;
  designation: string;
  name: string;
  rarity: string;
  editionNumber: number;
  editionSize: number;
};

export async function readPulls(db: Db, capsuleId: string): Promise<OpenedPull[]> {
  const { rows } = (await db.execute(sql`
    SELECT p.draw_index, k.designation, k.name, p.rarity, e.edition_number, k.edition_size
    FROM capsule_pull p
    JOIN edition e ON e.id = p.edition_id
    JOIN card k ON k.id = p.card_id
    WHERE p.capsule_id = ${capsuleId}::uuid
    ORDER BY p.draw_index
  `)) as Rows<{ draw_index: number; designation: string; name: string; rarity: string; edition_number: number; edition_size: number }>;
  return rows.map((r) => ({
    drawIndex: Number(r.draw_index),
    designation: r.designation,
    name: r.name,
    rarity: r.rarity,
    editionNumber: Number(r.edition_number),
    editionSize: Number(r.edition_size),
  }));
}

/**
 * The statements that open a capsule, in order: the capsule flips to opened
 * and reveals its secret; each draw allocates the card's next edition number
 * and records the pull; the 'opened' entry is logged with the secret, the
 * odds, the supply the draws were made against and the pulls.
 *
 * Each pull fails loudly instead of quietly writing nothing. Its edition id
 * and its capsule id come from sub-selects into NOT NULL columns: a card that
 * sold out since the supply was read, or a capsule that is not this batch's
 * to open, gives NULL, the insert fails, and the batch rolls back whole.
 */
export function openStatements(
  db: Db,
  input: { capsuleId: string; secret: string; owner: string; plan: PlannedPull[]; supply: SupplyRow[]; draws: number },
) {
  const cardId = new Map(input.supply.map((s) => [s.designation, s.cardId]));
  const published: SupplyEntry[] = input.supply.map(({ designation, rarity, remaining }) => ({ designation, rarity, remaining }));
  return [
    db.execute(sql`
      UPDATE capsule SET state = 'opened', opened_at = now(), server_secret = ${input.secret}
      WHERE id = ${input.capsuleId}::uuid AND state = 'purchased'
      RETURNING id
    `),
    ...input.plan.map((p) => {
      const card = cardId.get(p.designation);
      return db.execute(sql`
        WITH e AS (
          INSERT INTO edition (card_id, edition_number, owner_wallet, capsule_id, observation_capture_id)
          SELECT ${card}::uuid, COALESCE(MAX(x.edition_number), 0) + 1, ${input.owner}, ${input.capsuleId}::uuid,
            (SELECT nt.capture_id FROM nightly_target nt
             WHERE nt.card_id = ${card}::uuid AND nt.capture_id IS NOT NULL
             ORDER BY nt.night_date DESC LIMIT 1)
          FROM edition x
          WHERE x.card_id = ${card}::uuid
          HAVING COALESCE(MAX(x.edition_number), 0) < (SELECT edition_size FROM card WHERE id = ${card}::uuid)
          RETURNING id
        )
        INSERT INTO capsule_pull (capsule_id, draw_index, edition_id, card_id, rarity)
        VALUES (
          (SELECT id FROM capsule WHERE id = ${input.capsuleId}::uuid AND state = 'opened'),
          ${p.drawIndex}, (SELECT id FROM e), ${card}::uuid, ${p.rarity}
        )
        RETURNING id
      `);
    }),
    db.execute(sql`
      INSERT INTO capsule_log (capsule_id, capsule_sequence, event, commitment, buyer_wallet, buyer_nonce, purchase_hash, outcome)
      SELECT c.id, c.sequence, 'opened', c.commitment, c.buyer_wallet, c.buyer_nonce, c.purchase_hash,
        jsonb_build_object(
          'secret', c.server_secret,
          'draws', ${input.draws}::int,
          'oddsBps', ${JSON.stringify(RARITY_ODDS_BPS)}::jsonb,
          'supply', ${JSON.stringify(published)}::jsonb,
          'pulls', (
            SELECT jsonb_agg(jsonb_build_object(
              'drawIndex', p.draw_index, 'designation', k.designation, 'rarity', p.rarity, 'editionNumber', e.edition_number
            ) ORDER BY p.draw_index)
            FROM capsule_pull p JOIN edition e ON e.id = p.edition_id JOIN card k ON k.id = p.card_id
            WHERE p.capsule_id = c.id
          )
        )
      FROM capsule c WHERE c.id = ${input.capsuleId}::uuid AND c.state = 'opened'
      RETURNING seq
    `),
  ] as const;
}

export type OpenResult =
  | { ok: true; alreadyOpened: boolean; secret: string; pulls: OpenedPull[] }
  | { ok: false; reason: 'not_found' | 'not_purchased' };

/**
 * Opens a purchased capsule. Whether the caller may is the route's business;
 * this is the draw and the allocation.
 *
 * The supply is read, the draws are planned from secret + nonce + supply, and
 * the batch is sent. If it loses a race — another opening took an edition
 * number first, or sold a card out — nothing was written, and the next attempt
 * reads the supply again. The draws only change if the supply they depend on
 * did; whichever supply the successful attempt used is the one logged.
 */
export async function openCapsule(db: Db, capsuleId: string): Promise<OpenResult> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const c = await readCapsule(db, capsuleId);
    if (!c) return { ok: false, reason: 'not_found' };
    if (c.state === 'opened') {
      return { ok: true, alreadyOpened: true, secret: c.server_secret ?? '', pulls: await readPulls(db, capsuleId) };
    }
    if (c.state !== 'purchased' || !c.buyer_wallet || !c.buyer_nonce) return { ok: false, reason: 'not_purchased' };

    const secret = unsealSecret(c.server_secret_sealed, c.id);
    const supply = await readSupply(db, c.set_id);
    const draws = Number(c.cards_per_capsule);
    const plan = planPulls({ secret, nonce: c.buyer_nonce, capsuleId, supply, draws });

    const statements = openStatements(db, { capsuleId, secret, owner: c.buyer_wallet, plan, supply, draws });
    try {
      await runBatch(db, statements);
      return { ok: true, alreadyOpened: false, secret, pulls: await readPulls(db, capsuleId) };
    } catch (err) {
      if (!lostRace(err)) throw err;
      await backoff(attempt);
    }
  }
  throw new Error('capsule opening kept colliding');
}

// ─── Voiding ────────────────────────────────────────────────────────────────

/**
 * Withdraws a capsule that was never opened, and reveals its secret with the
 * reason. A capsule voided after purchase stays in the log as exactly that.
 * Refused once the capsule's order is paid: a paid capsule is opened, not voided.
 */
export async function voidCapsule(
  db: Db,
  input: { capsuleId: string; reason: string },
): Promise<{ ok: true } | { ok: false; reason: 'not_found' | 'not_voidable' | 'paid' }> {
  const c = await readCapsule(db, input.capsuleId);
  if (!c) return { ok: false, reason: 'not_found' };
  if (c.state !== 'listed' && c.state !== 'purchased') return { ok: false, reason: 'not_voidable' };

  const secret = unsealSecret(c.server_secret_sealed, c.id);
  const outcome = JSON.stringify({ secret, reason: input.reason, priorState: c.state });
  const [changed] = await runBatch(db, [
    db.execute(sql`
      WITH c AS (
        UPDATE capsule SET state = 'void', voided_at = now(), server_secret = ${secret}
        WHERE id = ${c.id}::uuid AND state = ${c.state}
          AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = capsule.order_id AND o.status = 'paid')
        RETURNING id, sequence, commitment, buyer_wallet, buyer_nonce, purchase_hash
      )
      INSERT INTO capsule_log (capsule_id, capsule_sequence, event, commitment, buyer_wallet, buyer_nonce, purchase_hash, outcome)
      SELECT id, sequence, 'voided', commitment, buyer_wallet, buyer_nonce, purchase_hash, ${outcome}::jsonb FROM c
      RETURNING seq
    `),
    db.execute(sql`
      UPDATE orders SET status = 'cancelled'
      WHERE id = ${c.order_id}::uuid AND status = 'pending'
        AND EXISTS (SELECT 1 FROM capsule WHERE id = ${c.id}::uuid AND state = 'void')
    `),
  ]);
  if (changed.rows.length === 0) return { ok: false, reason: c.order_id ? 'paid' : 'not_voidable' };
  return { ok: true };
}

// ─── The public log ─────────────────────────────────────────────────────────

export async function readLog(db: Db, opts: { afterSeq?: number; limit?: number } = {}): Promise<LogRow[]> {
  const { rows } = (await db.execute(sql`
    SELECT seq, capsule_id, capsule_sequence, event, commitment, buyer_wallet, buyer_nonce, purchase_hash, outcome, at
    FROM capsule_log
    WHERE seq > ${opts.afterSeq ?? 0}
    ORDER BY seq
    LIMIT ${opts.limit ?? 5000}
  `)) as Rows<{
    seq: number | string;
    capsule_id: string;
    capsule_sequence: number | string;
    event: LogRow['event'];
    commitment: string;
    buyer_wallet: string | null;
    buyer_nonce: string | null;
    purchase_hash: string | null;
    outcome: unknown;
    at: string | Date;
  }>;
  return rows.map((r) => ({
    seq: Number(r.seq),
    capsuleId: r.capsule_id,
    capsuleSequence: Number(r.capsule_sequence),
    event: r.event,
    commitment: r.commitment,
    buyerWallet: r.buyer_wallet,
    buyerNonce: r.buyer_nonce,
    purchaseHash: r.purchase_hash,
    outcome: r.outcome,
    at: r.at instanceof Date ? r.at.toISOString() : String(r.at),
  }));
}
