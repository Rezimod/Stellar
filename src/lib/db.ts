import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { sql as drizzleSql } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import * as schema from './schema'

type Schema = typeof schema
let cachedDb: NeonHttpDatabase<Schema> | null = null

export function getDb(): NeonHttpDatabase<Schema> | null {
  if (!process.env.DATABASE_URL) return null
  if (!cachedDb) {
    const sql = neon(process.env.DATABASE_URL)
    cachedDb = drizzle(sql, { schema })
  }
  return cachedDb
}

// Idempotent ensure-columns for the §4 Stars-burn discount path. A previous
// orders table predates these columns; a deploy that ships the new schema
// but skips the manual ALTER on Neon leaves every SOL order insert failing
// with "column does not exist". Run lazily so the API is self-healing.
let burnColumnsEnsured = false
let burnColumnsPromise: Promise<void> | null = null
export async function ensureOrdersBurnColumns(): Promise<void> {
  if (burnColumnsEnsured) return
  if (burnColumnsPromise) return burnColumnsPromise
  const db = getDb()
  if (!db) return
  burnColumnsPromise = (async () => {
    try {
      await db.execute(drizzleSql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS burn_stars integer NOT NULL DEFAULT 0`)
      await db.execute(drizzleSql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS burn_signature text`)
      await db.execute(drizzleSql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gel_discount double precision NOT NULL DEFAULT 0`)
      burnColumnsEnsured = true
    } catch (err) {
      console.error('[db] failed to ensure orders burn columns', err)
      throw err
    } finally {
      burnColumnsPromise = null
    }
  })()
  return burnColumnsPromise
}
