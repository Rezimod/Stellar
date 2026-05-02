import { pgTable, uuid, text, integer, timestamp, doublePrecision, boolean, uniqueIndex, index, date, jsonb } from 'drizzle-orm/pg-core'

// Run in Neon SQL editor if migrating an existing DB:
//   ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar text;
//   CREATE TABLE IF NOT EXISTS feed_follows (
//     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//     follower_wallet text NOT NULL,
//     followed_wallet text NOT NULL,
//     created_at timestamptz NOT NULL DEFAULT now()
//   );
//   CREATE UNIQUE INDEX IF NOT EXISTS feed_follows_pair_unique
//     ON feed_follows (follower_wallet, followed_wallet);
//   CREATE INDEX IF NOT EXISTS feed_follows_follower_idx
//     ON feed_follows (follower_wallet);
//   CREATE INDEX IF NOT EXISTS feed_follows_followed_idx
//     ON feed_follows (followed_wallet);
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
  paymentMethod: text('payment_method').notNull().default('sol'),
  amountSol: doublePrecision('amount_sol').notNull().default(0),
  amountStars: integer('amount_stars').notNull().default(0),
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

export const feedPosts = pgTable('feed_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  authorWallet: text('author_wallet').notNull(),
  authorName: text('author_name'),
  authorRank: text('author_rank'),
  type: text('type').notNull(),
  body: text('body'),
  imageUrl: text('image_url'),
  achievementTarget: text('achievement_target'),
  achievementDifficulty: text('achievement_difficulty'),
  achievementStars: integer('achievement_stars'),
  achievementMintTx: text('achievement_mint_tx'),
  observationTarget: text('observation_target'),
  observationLat: text('observation_lat'),
  observationLon: text('observation_lon'),
  observationBortle: integer('observation_bortle'),
  observationNftAddress: text('observation_nft_address'),
  reactionCount: integer('reaction_count').default(0).notNull(),
  commentCount: integer('comment_count').default(0).notNull(),
  shareCount: integer('share_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('feed_posts_created_at_idx').on(t.createdAt),
  index('feed_posts_author_idx').on(t.authorWallet),
])

export const feedReactions = pgTable('feed_reactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id').notNull(),
  wallet: text('wallet').notNull(),
  reaction: text('reaction').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('feed_reactions_post_idx').on(t.postId),
  uniqueIndex('feed_reactions_unique_user_post').on(t.postId, t.wallet),
])

export const feedComments = pgTable('feed_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id').notNull(),
  authorWallet: text('author_wallet').notNull(),
  authorName: text('author_name'),
  body: text('body').notNull(),
  reactionCount: integer('reaction_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('feed_comments_post_idx').on(t.postId),
])

export const feedShares = pgTable('feed_shares', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id').notNull(),
  wallet: text('wallet').notNull(),
  destination: text('destination').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const feedFollows = pgTable('feed_follows', {
  id: uuid('id').defaultRandom().primaryKey(),
  followerWallet: text('follower_wallet').notNull(),
  followedWallet: text('followed_wallet').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('feed_follows_pair_unique').on(t.followerWallet, t.followedWallet),
  index('feed_follows_follower_idx').on(t.followerWallet),
  index('feed_follows_followed_idx').on(t.followedWallet),
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
