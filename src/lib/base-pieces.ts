/**
 * Player-built base pieces (Explore): the store behind /api/bases.
 *
 * Every call reports a store that cannot answer (no DATABASE_URL, the table
 * not created yet, Neon down) as null or 'unavailable' rather than throwing,
 * so the game can keep a player's pieces for the session and say saving is
 * unavailable instead of failing the surface.
 */

import { and, eq, or } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { basePieces } from '@/lib/schema'
import type { BuildScope, BuildWorld } from '@/lib/solar-system/build-rules'

export type PieceRow = {
  id: string
  world: string
  scope: string
  ownerPrivyId: string
  module: string
  x: number
  z: number
  yaw: number
  createdAt: Date
}

/** The colony of a world, plus the caller's own private pieces there. */
export async function listPieces(world: BuildWorld, privyId: string | null): Promise<PieceRow[] | null> {
  const db = getDb()
  if (!db) return null
  try {
    const colony = eq(basePieces.scope, 'colony')
    const where = privyId
      ? and(eq(basePieces.world, world), or(colony, and(eq(basePieces.scope, 'private'), eq(basePieces.ownerPrivyId, privyId))))
      : and(eq(basePieces.world, world), colony)
    return await db.select().from(basePieces).where(where)
  } catch (err) {
    console.error('[bases] list failed', err)
    return null
  }
}

export type NewPiece = { world: BuildWorld; scope: BuildScope; ownerPrivyId: string; module: string; x: number; z: number; yaw: number }

export async function insertPiece(p: NewPiece): Promise<PieceRow | null> {
  const db = getDb()
  if (!db) return null
  try {
    const [row] = await db.insert(basePieces).values(p).returning()
    return row ?? null
  } catch (err) {
    console.error('[bases] insert failed', err)
    return null
  }
}

export type DeleteOutcome = 'deleted' | 'not_found' | 'not_owner' | 'unavailable'

export async function deletePiece(id: string, privyId: string): Promise<DeleteOutcome> {
  const db = getDb()
  if (!db) return 'unavailable'
  try {
    const gone = await db.delete(basePieces)
      .where(and(eq(basePieces.id, id), eq(basePieces.ownerPrivyId, privyId)))
      .returning({ id: basePieces.id })
    if (gone.length > 0) return 'deleted'
    const still = await db.select({ id: basePieces.id }).from(basePieces).where(eq(basePieces.id, id))
    return still.length > 0 ? 'not_owner' : 'not_found'
  } catch (err) {
    console.error('[bases] delete failed', err)
    return 'unavailable'
  }
}
