/**
 * Files a set and its cards in the database.
 *
 * Idempotent: the set is matched on its code and each card on its designation,
 * so a re-run brings rows up to date and adds nothing. Editions and nights are
 * never touched.
 */

import { cardSet } from '@/lib/schema';
import type { AuthoredCard } from '@/lib/sets/build';
import type { Db } from './attach';
import { upsertCard, type CardRow } from './repo';

export type SetSpec = {
  code: string;
  name: string;
  status: string;
  releasedAt: Date | null;
};

export async function seedSet(
  db: Db,
  spec: SetSpec,
  cards: AuthoredCard[],
): Promise<{ setId: string; cards: CardRow[] }> {
  const values = { ...spec, cardCount: cards.length };
  const [set] = await db
    .insert(cardSet)
    .values(values)
    .onConflictDoUpdate({ target: cardSet.code, set: values })
    .returning({ id: cardSet.id });

  const rows: CardRow[] = [];
  for (const c of cards) rows.push(await upsertCard(db, { ...c.seed, setId: set.id }));
  return { setId: set.id, cards: rows };
}
