import { pgTable, uuid, text, integer, timestamp, doublePrecision } from 'drizzle-orm/pg-core'
// FIX-15: To prevent double-awards, run this once on the DB:
// CREATE UNIQUE INDEX obs_daily_unique ON observation_log (wallet, target, DATE(created_at AT TIME ZONE 'UTC'));
// Drizzle schema DSL cannot express DATE() function-based unique indexes; this must be applied manually.

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  privyId: text('privy_id').unique().notNull(),
  email: text('email'),
  walletAddress: text('wallet_address'),
  username: text('username'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const observationLog = pgTable('observation_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  wallet: text('wallet').notNull(),
  target: text('target').notNull(),
  stars: integer('stars').notNull().default(0),
  confidence: text('confidence').notNull(),
  mintTx: text('mint_tx'),
  lat: doublePrecision('lat'),
  lon: doublePrecision('lon'),
  identifiedObject: text('identified_object'),
  starsAwarded: integer('stars_awarded'),
  oracleHash: text('oracle_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
