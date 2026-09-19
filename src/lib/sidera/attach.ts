/**
 * One photograph, every holder.
 *
 * A night's capture is attached to a card, not to people: one UPDATE moves the
 * pointer on every edition of the card at once, however many there are, and
 * the night's row records the capture as history. Both go in one neon-http
 * batch, which runs as a single transaction — there are no interactive
 * transactions over HTTP, and a pointer without its history row (or the other
 * way round) is the one state this must never leave behind.
 */

import { and, eq, gt, isNotNull, isNull, notExists } from 'drizzle-orm'
import type { getDb } from '@/lib/db'
import { card, edition, nightlyTarget } from '@/lib/schema'
import type { ObservatoryNode } from '@/lib/observatory/types'
import { siteNightDate } from './target'

export type Db = NonNullable<ReturnType<typeof getDb>>

function attachStatements(
  db: Db,
  input: { cardId: string; nightDate: string; captureId: string },
) {
  const later = db
    .select({ id: nightlyTarget.id })
    .from(nightlyTarget)
    .where(
      and(
        eq(nightlyTarget.cardId, input.cardId),
        isNotNull(nightlyTarget.captureId),
        gt(nightlyTarget.nightDate, input.nightDate),
      ),
    )

  return [
    // Every edition of the card, in one statement. The guard keeps the pointer
    // on the latest night: a late capture for an older night joins the history
    // without winding every holder's card back.
    db
      .update(edition)
      .set({ observationCaptureId: input.captureId })
      .where(and(eq(edition.cardId, input.cardId), notExists(later))),
    db
      .update(nightlyTarget)
      .set({ captureId: input.captureId })
      .where(and(eq(nightlyTarget.nightDate, input.nightDate), eq(nightlyTarget.cardId, input.cardId))),
  ] as const
}

export async function attachCaptureToCard(
  db: Db,
  input: { cardId: string; nightDate: string; captureId: string },
): Promise<void> {
  await db.batch(attachStatements(db, input))
}

/**
 * A capture the cron recorded for some other reason — a queued request — that
 * happens to be of tonight's chosen object.
 *
 * Only the first frame of the night is taken: once the night has a capture,
 * later ones on the same target leave it alone. Returns the card id attached
 * to, or null when tonight's card is something else or already observed.
 */
export async function attachToTonightsCard(
  db: Db,
  node: ObservatoryNode,
  input: { targetId: string; captureId: string; now: Date },
): Promise<string | null> {
  const nightDate = siteNightDate(node.timezone, input.now)

  const [tonight] = await db
    .select({ cardId: nightlyTarget.cardId })
    .from(nightlyTarget)
    .innerJoin(card, eq(card.id, nightlyTarget.cardId))
    .where(
      and(
        eq(nightlyTarget.nightDate, nightDate),
        eq(card.targetId, input.targetId),
        isNull(nightlyTarget.captureId),
      ),
    )
    .limit(1)
  if (!tonight) return null

  await attachCaptureToCard(db, { cardId: tonight.cardId, nightDate, captureId: input.captureId })
  return tonight.cardId
}
