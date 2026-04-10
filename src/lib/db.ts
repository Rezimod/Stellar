import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
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
