import { pgTable, uuid, text, integer, timestamp, doublePrecision, boolean, uniqueIndex, index, date } from 'drizzle-orm/pg-core'

// Run in Neon SQL editor if migrating an existing DB:
//   ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar text;
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  privyId: text('privy_id').unique().notNull(),
  email: text('email'),
  walletAddress: text('wallet_address'),
  username: text('username'),
  avatar: text('avatar'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('users_wallet_idx').on(table.walletAddress),
  index('users_email_idx').on(table.email),
])

export const telescopes = pgTable('telescopes', {
  id: uuid('id').defaultRandom().primaryKey(),
  privyId: text('privy_id').unique().notNull(),
  walletAddress: text('wallet_address'),
  brand: text('brand').notNull(),
  model: text('model').notNull(),
  aperture: text('aperture').notNull(),
  type: text('type'),
  starsAwarded: boolean('stars_awarded').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('telescopes_wallet_idx').on(table.walletAddress),
])

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
  observedDate: date('observed_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex('observation_log_wallet_mint_tx_unique').on(table.wallet, table.mintTx),
  uniqueIndex('obs_daily_unique').on(table.wallet, table.target, table.observedDate),
  index('obs_log_created_at_idx').on(table.createdAt),
  index('obs_log_target_idx').on(table.target),
])

export const emailSubscribers = pgTable('email_subscribers', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  privyId: text('privy_id').notNull(),
  walletAddress: text('wallet_address').notNull(),
  productId: text('product_id').notNull(),
  productName: text('product_name').notNull(),
  productImage: text('product_image'),
  dealerId: text('dealer_id').notNull(),
  amountSol: doublePrecision('amount_sol').notNull(),
  amountFiat: doublePrecision('amount_fiat').notNull(),
  currency: text('currency').notNull(),
  paymentReference: text('payment_reference').notNull(),
  signature: text('signature'),
  status: text('status').notNull().default('pending'),
  shippingName: text('shipping_name').notNull(),
  shippingPhone: text('shipping_phone').notNull(),
  shippingAddress: text('shipping_address').notNull(),
  shippingCity: text('shipping_city').notNull(),
  shippingCountry: text('shipping_country').notNull(),
  shippingNotes: text('shipping_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('orders_payment_reference_unique').on(table.paymentReference),
  index('orders_wallet_idx').on(table.walletAddress),
  index('orders_privy_idx').on(table.privyId),
  index('orders_created_at_idx').on(table.createdAt),
])

export const marketCashouts = pgTable('market_cashouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  wallet: text('wallet').notNull(),
  marketId: integer('market_id').notNull(),
  side: text('side').notNull(),
  originalStake: integer('original_stake').notNull(),
  refundedAmount: integer('refunded_amount').notNull(),
  refundTx: text('refund_tx'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex('cashouts_wallet_market_side_unique').on(table.wallet, table.marketId, table.side),
  index('cashouts_wallet_idx').on(table.wallet),
])
