// @vitest-environment node
import { createHash, randomUUID } from 'node:crypto';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Db } from '@/lib/sidera/attach';
import { auditLog, type LogRow } from '@/lib/sidera/audit';
import { commitmentOf } from '@/lib/sidera/randomness';
import { listCapsules, openCapsule, sealSecret } from '@/lib/sidera/capsule';

/**
 * An in-memory Postgres, just faithful enough to race in.
 *
 * It reads the statements capsule.ts actually builds. A batch is one
 * transaction: it takes a snapshot when it starts, yields so that other
 * batches can start and commit in between, computes every MAX()+1 from its
 * snapshot plus its own writes — exactly the window in which two openings
 * pick the same edition number — and at commit checks the unique indexes
 * against what is committed by then. A collision rolls the whole batch back
 * with 23505; a HAVING that finds the card sold out leaves a NULL in a NOT
 * NULL column, 23502. That is the behaviour the design relies on.
 */
type Capsule = {
  id: string; set_id: string; sequence: number; commitment: string; server_secret_sealed: string;
  server_secret: string | null; state: string; price_gel: number; cards_per_capsule: number;
  buyer_wallet: string | null; buyer_nonce: string | null; purchase_hash: string | null; order_id: string | null;
};
type Card = { id: string; set_id: string; designation: string; name: string; rarity: string; edition_size: number };
type Edition = { id: string; card_id: string; edition_number: number; capsule_id: string | null };
type Pull = { capsule_id: string; draw_index: number; edition_id: string; card_id: string; rarity: string };
type State = { capsules: Capsule[]; cards: Card[]; editions: Edition[]; pulls: Pull[]; log: LogRow[] };

const pgError = (code: string) => Object.assign(new Error(`pg ${code}`), { code });
const dialect = new PgDialect();
const tick = () => new Promise((r) => setTimeout(r, Math.random() * 4));

function fakePostgres(state: State) {
  let logSeq = 0;
  const stats = { batches: 0, rolledBack: 0 };
  const clone = (s: State): State => structuredClone(s);
  const maxNumber = (s: State, cardId: string) => Math.max(0, ...s.editions.filter((e) => e.card_id === cardId).map((e) => e.edition_number));

  function read(sql: string, params: unknown[], s: State): { rows: unknown[] } {
    if (sql.includes('FROM capsule WHERE id =') && sql.includes('server_secret_sealed')) {
      return { rows: s.capsules.filter((c) => c.id === params[0]) };
    }
    if (sql.includes('SELECT c.id, c.designation')) {
      return {
        rows: s.cards.filter((c) => c.set_id === params[0]).map((c) => ({ ...c, allocated: maxNumber(s, c.id) })),
      };
    }
    if (sql.includes('SELECT p.draw_index')) {
      const rows = s.pulls
        .filter((p) => p.capsule_id === params[0])
        .sort((a, b) => a.draw_index - b.draw_index)
        .map((p) => {
          const card = s.cards.find((c) => c.id === p.card_id)!;
          const e = s.editions.find((x) => x.id === p.edition_id)!;
          return { draw_index: p.draw_index, designation: card.designation, name: card.name, rarity: p.rarity, edition_number: e.edition_number, edition_size: card.edition_size };
        });
      return { rows };
    }
    if (sql.includes('SUM(cards_per_capsule)')) {
      const owed = s.capsules.filter((c) => c.set_id === params[0] && (c.state === 'listed' || c.state === 'purchased'));
      return { rows: [{ draws: owed.reduce((n, c) => n + c.cards_per_capsule, 0) }] };
    }
    throw new Error(`unexpected read: ${sql}`);
  }

  /** Applies one write to the transaction's working copy; returns its rows. */
  function write(sql: string, p: unknown[], tx: State): { rows: unknown[] } {
    if (/INSERT INTO capsule \(id, set_id, sequence/.test(sql)) {
      const [id, setId, commitment, sealed, price, perCapsule] = p as [string, string, string, string, number, number];
      const sequence = Math.max(0, ...tx.capsules.map((c) => c.sequence)) + 1;
      tx.capsules.push({ id, set_id: setId, sequence, commitment, server_secret_sealed: sealed, server_secret: null, state: 'listed', price_gel: price, cards_per_capsule: perCapsule, buyer_wallet: null, buyer_nonce: null, purchase_hash: null, order_id: null });
      tx.log.push({ seq: 0, capsuleId: id, capsuleSequence: sequence, event: 'listed', commitment, buyerWallet: null, buyerNonce: null, purchaseHash: null, outcome: null, at: '' });
      return { rows: [{ capsule_id: id, capsule_sequence: sequence }] };
    }
    if (/^\s*UPDATE capsule SET state = 'opened'/.test(sql)) {
      const [secret, id] = p as [string, string];
      const c = tx.capsules.find((x) => x.id === id && x.state === 'purchased');
      if (!c) return { rows: [] };
      c.state = 'opened';
      c.server_secret = secret;
      return { rows: [{ id }] };
    }
    if (/INSERT INTO edition \(card_id, edition_number, owner_wallet, capsule_id/.test(sql)) {
      const [cardId, , capsuleId] = p as [string, string, string];
      const drawIndex = p[7] as number;
      const rarity = p[9] as string;
      const card = tx.cards.find((c) => c.id === cardId)!;
      const next = maxNumber(tx, cardId) + 1;
      const edition = next <= card.edition_size ? { id: randomUUID(), card_id: cardId, edition_number: next, capsule_id: capsuleId } : null;
      if (edition) tx.editions.push(edition);
      const opened = tx.capsules.find((c) => c.id === capsuleId && c.state === 'opened');
      if (!edition || !opened) throw pgError('23502');
      if (tx.pulls.some((x) => x.capsule_id === capsuleId && x.draw_index === drawIndex)) throw pgError('23505');
      tx.pulls.push({ capsule_id: capsuleId, draw_index: drawIndex, edition_id: edition.id, card_id: cardId, rarity });
      return { rows: [{ id: randomUUID() }] };
    }
    if (/INSERT INTO capsule_log[\s\S]*'opened'/.test(sql)) {
      const [draws, odds, supply, id] = p as [number, string, string, string];
      const c = tx.capsules.find((x) => x.id === id && x.state === 'opened');
      if (!c) return { rows: [] };
      const pulls = tx.pulls
        .filter((x) => x.capsule_id === id)
        .sort((a, b) => a.draw_index - b.draw_index)
        .map((x) => ({
          drawIndex: x.draw_index,
          designation: tx.cards.find((k) => k.id === x.card_id)!.designation,
          rarity: x.rarity,
          editionNumber: tx.editions.find((e) => e.id === x.edition_id)!.edition_number,
        }));
      tx.log.push({
        seq: 0, capsuleId: id, capsuleSequence: c.sequence, event: 'opened', commitment: c.commitment,
        buyerWallet: c.buyer_wallet, buyerNonce: c.buyer_nonce, purchaseHash: c.purchase_hash,
        outcome: { secret: c.server_secret, draws, oddsBps: JSON.parse(odds), supply: JSON.parse(supply), pulls }, at: '',
      });
      return { rows: [{ seq: 0 }] };
    }
    throw new Error(`unexpected write: ${sql}`);
  }

  /** Commits the transaction's changes onto what is committed now, or refuses as Postgres would. */
  function commit(start: State, tx: State) {
    const fresh = <T,>(after: T[], before: T[]) => after.slice(before.length);
    const editions = fresh(tx.editions, start.editions);
    const pulls = fresh(tx.pulls, start.pulls);
    const capsules = fresh(tx.capsules, start.capsules);
    for (const e of editions) {
      if (state.editions.some((x) => x.card_id === e.card_id && x.edition_number === e.edition_number)) throw pgError('23505');
    }
    for (const x of pulls) {
      if (state.pulls.some((y) => y.capsule_id === x.capsule_id && y.draw_index === x.draw_index)) throw pgError('23505');
    }
    for (const c of capsules) if (state.capsules.some((y) => y.sequence === c.sequence)) throw pgError('23505');
    // A row this transaction updated that someone else changed since its snapshot.
    for (const c of tx.capsules.slice(0, start.capsules.length)) {
      const before = start.capsules.find((x) => x.id === c.id)!;
      const now = state.capsules.find((x) => x.id === c.id)!;
      if (c.state !== before.state && now.state !== before.state) throw pgError('23505');
    }

    state.editions.push(...editions);
    state.pulls.push(...pulls);
    state.capsules.push(...capsules);
    for (const c of tx.capsules.slice(0, start.capsules.length)) {
      if (c.state !== start.capsules.find((x) => x.id === c.id)!.state) Object.assign(state.capsules.find((x) => x.id === c.id)!, c);
    }
    for (const row of fresh(tx.log, start.log)) state.log.push({ ...row, seq: ++logSeq, at: new Date().toISOString() });
  }

  const statement = (query: SQL) => {
    const { sql, params } = dialect.sqlToQuery(query);
    return { sql, params, then: (ok: (v: unknown) => unknown, fail: (e: unknown) => unknown) => Promise.resolve().then(() => read(sql, params, state)).then(ok, fail) };
  };

  const db = {
    execute: statement,
    batch: async (items: Array<{ sql: string; params: unknown[] }>) => {
      stats.batches++;
      const start = clone(state);
      const tx = clone(state);
      await tick();
      try {
        const results = items.map((q) => write(q.sql, q.params, tx));
        await tick();
        commit(start, tx);
        return results;
      } catch (err) {
        stats.rolledBack++;
        throw err;
      }
    },
  } as unknown as Db;
  return { db, stats };
}

const SET = '00000000-0000-4000-8000-000000000501';

function card(designation: string, rarity: string, size: number): Card {
  return { id: randomUUID(), set_id: SET, designation, name: designation, rarity, edition_size: size };
}

/** Capsules already bought: listed and purchased are other tests' business here. */
function purchased(n: number, from = 1): Capsule[] {
  return Array.from({ length: n }, (_, i) => {
    const id = randomUUID();
    const secret = createHash('sha256').update(`secret-${from + i}`).digest('hex');
    return {
      id, set_id: SET, sequence: from + i, commitment: commitmentOf(secret), server_secret_sealed: sealSecret(secret, id),
      server_secret: null, state: 'purchased', price_gel: 39, cards_per_capsule: 3, buyer_wallet: `holder-${from + i}`,
      buyer_nonce: createHash('sha256').update(`nonce-${from + i}`).digest('hex'), purchase_hash: null, order_id: randomUUID(),
    };
  });
}

function numbersByCard(state: State) {
  const by = new Map<string, number[]>();
  for (const e of state.editions) by.set(e.card_id, [...(by.get(e.card_id) ?? []), e.edition_number]);
  return [...by.values()].map((n) => n.sort((a, b) => a - b));
}

beforeAll(() => {
  process.env.CAPSULE_SEAL_KEY = 'ab'.repeat(32);
});

describe('opening capsules at the same moment', () => {
  it('hands out unique, gapless edition numbers, and every opening verifies', async () => {
    // Few cards and many openings, so nearly every opening collides with another.
    const cards = [card('C1', 'common', 60), card('C2', 'common', 60), card('R1', 'rare', 20), card('E1', 'epic', 6), card('L1', 'legendary', 2)];
    const state: State = { capsules: purchased(24), cards, editions: [], pulls: [], log: [] };
    const { db, stats } = fakePostgres(state);

    const first = await Promise.allSettled(state.capsules.map((c) => openCapsule(db, c.id)));
    expect(stats.rolledBack).toBeGreaterThan(0);

    // Under this much contention an opening may run out of retries. It must
    // then have written nothing: its capsule is still purchased, with no pulls
    // and no editions, and the numbers the others took are still gapless.
    const gaveUp = state.capsules.filter((_, i) => first[i].status === 'rejected');
    for (const c of gaveUp) {
      expect(c.state).toBe('purchased');
      expect(state.pulls.some((p) => p.capsule_id === c.id)).toBe(false);
      expect(state.editions.some((e) => e.capsule_id === c.id)).toBe(false);
    }
    for (const numbers of numbersByCard(state)) {
      expect(numbers).toEqual(Array.from({ length: numbers.length }, (_, i) => i + 1));
    }
    // And the holder simply opens it again.
    for (const c of gaveUp) expect(await openCapsule(db, c.id)).toMatchObject({ ok: true, alreadyOpened: false });

    expect(state.editions).toHaveLength(24 * 3);
    expect(state.pulls).toHaveLength(24 * 3);
    for (const numbers of numbersByCard(state)) {
      expect(numbers).toEqual(Array.from({ length: numbers.length }, (_, i) => i + 1));
    }
    for (const c of cards) expect(state.editions.filter((e) => e.card_id === c.id).length).toBeLessThanOrEqual(c.edition_size);
    expect(state.capsules.every((c) => c.state === 'opened')).toBe(true);

    // Every opened capsule's log entry re-derives to exactly what was allocated.
    const opened = state.log.filter((r) => r.event === 'opened');
    expect(opened).toHaveLength(24);
    const listedAndPurchased = state.capsules.flatMap((c) => [
      { ...opened[0], seq: -c.sequence * 2, capsuleId: c.id, capsuleSequence: c.sequence, event: 'listed' as const, commitment: c.commitment, buyerWallet: null, buyerNonce: null, purchaseHash: null, outcome: null },
    ]);
    const audit = auditLog([...listedAndPurchased, ...state.log]);
    expect(audit.flags).toEqual([]);
    expect(audit.verified).toBe(24);
  });

  it('draws against the supply left, down to the last edition', async () => {
    // Exactly as many editions as draws: the last openings must take what the first left.
    const cards = [card('C1', 'common', 9), card('R1', 'rare', 3), card('E1', 'epic', 2), card('L1', 'legendary', 1)];
    const state: State = { capsules: purchased(5), cards, editions: [], pulls: [], log: [] };
    const { db } = fakePostgres(state);

    const first = await Promise.allSettled(state.capsules.map((c) => openCapsule(db, c.id)));
    for (const [i, c] of state.capsules.entries()) if (first[i].status === 'rejected') await openCapsule(db, c.id);

    expect(state.editions).toHaveLength(15);
    for (const c of cards) expect(state.editions.filter((e) => e.card_id === c.id)).toHaveLength(c.edition_size);
    for (const numbers of numbersByCard(state)) expect(numbers).toEqual(Array.from({ length: numbers.length }, (_, i) => i + 1));
  });

  it('opens a capsule once when it is opened twice at once', async () => {
    const cards = [card('C1', 'common', 50), card('R1', 'rare', 50), card('E1', 'epic', 50), card('L1', 'legendary', 50)];
    const state: State = { capsules: purchased(1), cards, editions: [], pulls: [], log: [] };
    const { db } = fakePostgres(state);

    const [a, b] = await Promise.all([openCapsule(db, state.capsules[0].id), openCapsule(db, state.capsules[0].id)]);

    expect(state.pulls).toHaveLength(3);
    expect(state.editions).toHaveLength(3);
    expect(state.log.filter((r) => r.event === 'opened')).toHaveLength(1);
    expect(a.ok && b.ok && a.pulls).toEqual(b.ok && b.pulls);
    expect([a, b].filter((r) => r.ok && r.alreadyOpened)).toHaveLength(1);
  });

  it('refuses a capsule that was never bought', async () => {
    const cards = [card('C1', 'common', 5)];
    const [c] = purchased(1);
    const state: State = { capsules: [{ ...c, state: 'listed', buyer_wallet: null, buyer_nonce: null }], cards, editions: [], pulls: [], log: [] };
    const { db } = fakePostgres(state);
    expect(await openCapsule(db, c.id)).toEqual({ ok: false, reason: 'not_purchased' });
    expect(state.editions).toHaveLength(0);
  });
});

describe('listing capsules at the same moment', () => {
  it('numbers them 1, 2, 3 … with no gap and no repeat, each logged as listed', async () => {
    const cards = [card('C1', 'common', 1000)];
    const state: State = { capsules: [], cards, editions: [], pulls: [], log: [] };
    const { db, stats } = fakePostgres(state);

    await Promise.all(Array.from({ length: 6 }, () => listCapsules(db, { setId: SET, count: 3 })));

    const sequences = state.capsules.map((c) => c.sequence).sort((a, b) => a - b);
    expect(sequences).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    expect(stats.rolledBack).toBeGreaterThan(0);
    expect(state.log.filter((r) => r.event === 'listed').map((r) => r.capsuleSequence).sort((a, b) => a - b)).toEqual(sequences);
    expect(auditLog(state.log).flags).toEqual([]);
  });

  it('refuses to list more capsules than the set has editions for', async () => {
    const state: State = { capsules: purchased(1), cards: [card('C1', 'common', 7)], editions: [], pulls: [], log: [] };
    const { db } = fakePostgres(state);
    await expect(listCapsules(db, { setId: SET, count: 2 })).rejects.toThrow(/Not enough editions/);
    await expect(listCapsules(db, { setId: SET, count: 1 })).resolves.toHaveLength(1);
  });
});
