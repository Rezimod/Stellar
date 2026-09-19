/**
 * The small set of reads and writes the Sidera slice needs.
 *
 * Each takes the database as an argument rather than reaching for it, so the
 * lifecycle script, the cron hook and the Collection page all share one path
 * and a test can hand in a fake.
 */

import { asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { card, edition, nightlyTarget, observatoryCapture } from '@/lib/schema'
import type { Db } from './attach'

export type CardRow = typeof card.$inferSelect

/** Insert the card, or bring an existing one with the same designation up to date. */
export async function upsertCard(db: Db, seed: typeof card.$inferInsert): Promise<CardRow> {
  const [row] = await db
    .insert(card)
    .values(seed)
    .onConflictDoUpdate({ target: card.designation, set: seed })
    .returning()
  return row
}

/**
 * The next edition number of a card, to this holder.
 *
 * One statement: the number is computed and written together, and the unique
 * (card_id, edition_number) index is what settles two holders arriving at once
 * — the loser collides and asks again. Returns null when the card is sold out.
 */
export async function allocateEdition(
  db: Db,
  cardId: string,
  ownerWallet: string,
): Promise<{ id: string; editionNumber: number } | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { rows } = await db.execute(sql`
        INSERT INTO edition (card_id, edition_number, owner_wallet)
        SELECT ${cardId}::uuid, COALESCE(MAX(e.edition_number), 0) + 1, ${ownerWallet}
        FROM edition e
        WHERE e.card_id = ${cardId}::uuid
        HAVING COALESCE(MAX(e.edition_number), 0) < (SELECT edition_size FROM card WHERE id = ${cardId}::uuid)
        RETURNING id, edition_number
      `)
      const row = rows[0] as { id: string; edition_number: number } | undefined
      return row ? { id: row.id, editionNumber: Number(row.edition_number) } : null
    } catch (err) {
      // Drizzle wraps the driver's error; the Postgres code is on its cause.
      const { code, cause } = err as { code?: string; cause?: { code?: string } }
      if ((code ?? cause?.code) !== '23505') throw err
    }
  }
  throw new Error('edition allocation kept colliding')
}

/**
 * The night's card, decided once.
 *
 * The first decision for a date stands: asking again returns what was already
 * chosen rather than choosing again, so a re-run cannot change a night that
 * holders may already have been told about.
 */
export async function decideNightlyTarget(
  db: Db,
  input: { nightDate: string; cardId: string; decisionBasis: string },
): Promise<typeof nightlyTarget.$inferSelect> {
  await db.insert(nightlyTarget).values(input).onConflictDoNothing({ target: nightlyTarget.nightDate })
  const [row] = await db.select().from(nightlyTarget).where(eq(nightlyTarget.nightDate, input.nightDate))
  return row
}

export type CaptureSummary = {
  id: string
  targetName: string
  capturedAt: string
  provenance: string
  nodeId: string
}

export type HolderEdition = {
  editionId: string
  designation: string
  name: string
  editionNumber: number
  editionSize: number
  rarity: string
  observationStatus: string
  latest: CaptureSummary | null
  /** Every night this card was photographed, most recent first. */
  history: Array<CaptureSummary & { nightDate: string }>
}

const captureColumns = {
  id: observatoryCapture.id,
  targetName: observatoryCapture.targetName,
  capturedAt: observatoryCapture.capturedAt,
  provenance: observatoryCapture.provenance,
  nodeId: observatoryCapture.nodeId,
}

function summary(row: { id: string; targetName: string; capturedAt: Date; provenance: string; nodeId: string }): CaptureSummary {
  return {
    id: row.id,
    targetName: row.targetName,
    capturedAt: row.capturedAt.toISOString(),
    provenance: row.provenance,
    nodeId: row.nodeId,
  }
}

/** A holder's editions, each with its card's latest capture and full history. */
export async function holderView(db: Db, wallet: string): Promise<HolderEdition[]> {
  const rows = await db
    .select({
      editionId: edition.id,
      cardId: card.id,
      designation: card.designation,
      name: card.name,
      editionNumber: edition.editionNumber,
      editionSize: card.editionSize,
      rarity: card.rarity,
      observationStatus: card.observationStatus,
      captureId: observatoryCapture.id,
      targetName: observatoryCapture.targetName,
      capturedAt: observatoryCapture.capturedAt,
      provenance: observatoryCapture.provenance,
      nodeId: observatoryCapture.nodeId,
    })
    .from(edition)
    .innerJoin(card, eq(card.id, edition.cardId))
    .leftJoin(observatoryCapture, eq(observatoryCapture.id, edition.observationCaptureId))
    .where(eq(edition.ownerWallet, wallet))
    .orderBy(asc(card.designation), asc(edition.editionNumber))
  if (rows.length === 0) return []

  const nights = await db
    .select({ cardId: nightlyTarget.cardId, nightDate: nightlyTarget.nightDate, ...captureColumns })
    .from(nightlyTarget)
    .innerJoin(observatoryCapture, eq(observatoryCapture.id, nightlyTarget.captureId))
    .where(inArray(nightlyTarget.cardId, [...new Set(rows.map((r) => r.cardId))]))
    .orderBy(desc(nightlyTarget.nightDate))

  return rows.map((r) => ({
    editionId: r.editionId,
    designation: r.designation,
    name: r.name,
    editionNumber: r.editionNumber,
    editionSize: r.editionSize,
    rarity: r.rarity,
    observationStatus: r.observationStatus,
    latest:
      r.captureId && r.targetName && r.capturedAt && r.provenance && r.nodeId
        ? summary({ id: r.captureId, targetName: r.targetName, capturedAt: r.capturedAt, provenance: r.provenance, nodeId: r.nodeId })
        : null,
    history: nights
      .filter((n) => n.cardId === r.cardId)
      .map((n) => ({ ...summary(n), nightDate: n.nightDate })),
  }))
}
