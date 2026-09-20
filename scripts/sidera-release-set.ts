/**
 * Puts a set on sale, and optionally lists the first capsules of it.
 *
 *   SIDERA_DATABASE_CONFIRM=sidera npx tsx scripts/sidera-release-set.ts [capsules]
 *
 * Releasing is the one switch: until a set's status is 'released', neither a
 * capsule nor a single card can be bought. Idempotent — a set already released
 * is left alone, and no capsule is listed unless a count is given. Refuses to
 * run unless DATABASE_URL is the sidera Neon branch (sidera-guard.ts), and
 * listing needs CAPSULE_SEAL_KEY: without it a capsule can never be opened.
 */

import { sql } from 'drizzle-orm'
import { getDb } from '../src/lib/db'
import { SET_001 } from '../src/lib/sets/set-001'
import { listCapsules } from '../src/lib/sidera/capsule'
import { requireSideraDatabase } from './sidera-guard'

async function main() {
  requireSideraDatabase()
  if (!process.env.CAPSULE_SEAL_KEY) throw new Error('CAPSULE_SEAL_KEY is not set: a capsule listed now could never be opened')

  const count = Number(process.argv[2] ?? 0)
  if (!Number.isInteger(count) || count < 0) throw new Error('the capsule count must be a whole number')

  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const { rows } = (await db.execute(sql`
    UPDATE card_set SET status = 'released', released_at = COALESCE(released_at, now())
    WHERE code = ${SET_001.code}
    RETURNING id, status, released_at
  `)) as { rows: Array<{ id: string; status: string; released_at: string }> }
  const set = rows[0]
  if (!set) throw new Error(`${SET_001.code} is not in this database — seed it first`)
  console.log(`${SET_001.code} is ${set.status}, released ${new Date(set.released_at).toISOString()}`)

  if (count === 0) {
    console.log('No capsules listed. Pass a count to list some.')
    return
  }
  const listed = await listCapsules(db, { setId: set.id, count })
  console.log(`${listed.length} capsules listed:`)
  for (const c of listed) console.log(`  ${String(c.sequence).padStart(3, '0')}  ${c.id}  ${c.commitment}`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
