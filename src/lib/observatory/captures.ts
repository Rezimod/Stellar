/**
 * What a session produced.
 *
 * A capture is written with the provenance its adapter declared, and the
 * Collection decision is taken here rather than by the surface that displays
 * it — see `provenance.ts`. Until an instrument is wired, every row is
 * 'simulated' and `observationLogId` stays null; when a real node captures, the
 * same row admits and the link lands in that column with no UI change.
 */

import { and, asc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { observatoryCapture } from '@/lib/schema'
import { admitToCollection, type Provenance } from './provenance'

export type Capture = {
  id: string
  sessionId: string
  nodeId: string
  targetId: string
  targetName: string
  provenance: Provenance
  exposureSec: number
  subs: number
  capturedAt: string
  /** The observation this became, when it was admitted. Null for simulated frames. */
  observationLogId: string | null
}

export type CaptureResult =
  | { recorded: true; capture: Capture; admitted: boolean; reason: string | null }
  | { recorded: false }

export async function recordCapture(input: {
  sessionId: string
  nodeId: string
  privyId: string
  targetId: string
  targetName: string
  provenance: Provenance
  exposureSec: number
  subs: number
  capturedAt: Date
}): Promise<CaptureResult> {
  const db = getDb()
  if (!db) return { recorded: false }

  const verdict = admitToCollection(input.provenance)

  try {
    const [row] = await db
      .insert(observatoryCapture)
      .values({
        sessionId: input.sessionId,
        nodeId: input.nodeId,
        privyId: input.privyId,
        targetId: input.targetId,
        targetName: input.targetName,
        provenance: input.provenance,
        exposureSec: input.exposureSec,
        subs: input.subs,
        capturedAt: input.capturedAt,
      })
      .returning()

    return {
      recorded: true,
      capture: shape(row),
      admitted: verdict.admitted,
      reason: verdict.admitted ? null : verdict.reason,
    }
  } catch (err) {
    console.error('[observatory] cannot record capture', err)
    return { recorded: false }
  }
}

/** Everything one session captured, oldest first. Scoped to the holder. */
export async function capturesForSession(
  sessionId: string,
  privyId: string,
): Promise<Capture[]> {
  const db = getDb()
  if (!db) return []

  try {
    const rows = await db
      .select()
      .from(observatoryCapture)
      .where(
        and(eq(observatoryCapture.sessionId, sessionId), eq(observatoryCapture.privyId, privyId)),
      )
      .orderBy(asc(observatoryCapture.capturedAt))

    return rows.map(shape)
  } catch (err) {
    console.error('[observatory] cannot read captures', err)
    return []
  }
}

function shape(row: typeof observatoryCapture.$inferSelect): Capture {
  return {
    id: row.id,
    sessionId: row.sessionId,
    nodeId: row.nodeId,
    targetId: row.targetId,
    targetName: row.targetName,
    // The column is text; anything the database holds that is not the word
    // 'instrument' is treated as simulated, which is the safe direction.
    provenance: row.provenance === 'instrument' ? 'instrument' : 'simulated',
    exposureSec: row.exposureSec,
    subs: row.subs,
    capturedAt: row.capturedAt.toISOString(),
    observationLogId: row.observationLogId,
  }
}
