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
//
// §4 (burn Stars for marketplace discount) — required SQL:
//   ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS burn_stars integer NOT NULL DEFAULT 0;
//   ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS burn_signature text;
//   ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gel_discount double precision NOT NULL DEFAULT 0;
//   CREATE TABLE IF NOT EXISTS stars_burns (
//     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//     order_id uuid,
//     redeem_code_id uuid,
//     wallet_address text NOT NULL,
//     amount integer NOT NULL,
//     kind text NOT NULL,
//     signature text NOT NULL,
//     created_at timestamptz NOT NULL DEFAULT now()
//   );
//   -- Idempotency: one discount-burn per order, one shop-purchase-burn per order.
//   CREATE UNIQUE INDEX IF NOT EXISTS stars_burns_order_kind_unique
//     ON stars_burns (order_id, kind) WHERE order_id IS NOT NULL;
//   CREATE INDEX IF NOT EXISTS stars_burns_wallet_idx
//     ON stars_burns (wallet_address);
//
// §5 (redeem-at-Astroman codes) — required SQL:
//   CREATE TABLE IF NOT EXISTS redeem_codes (
//     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//     code text NOT NULL UNIQUE,
//     stars_burned integer NOT NULL,
//     gel_value double precision NOT NULL,
//     wallet_address text NOT NULL,
//     burn_signature text,
//     status text NOT NULL DEFAULT 'active',
//     created_at timestamptz NOT NULL DEFAULT now(),
//     expires_at timestamptz NOT NULL,
//     spent_at timestamptz,
//     spent_by text
//   );
//   CREATE INDEX IF NOT EXISTS redeem_codes_wallet_idx
//     ON redeem_codes (wallet_address);
//   CREATE INDEX IF NOT EXISTS redeem_codes_status_idx
//     ON redeem_codes (status);
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
  fileHash: text('file_hash'),
  uploadSource: text('upload_source'),
  deviceTier: text('device_tier'),
  deviceMake: text('device_make'),
  deviceModel: text('device_model'),
  exifLat: doublePrecision('exif_lat'),
  exifLon: doublePrecision('exif_lon'),
  exifTakenAt: timestamp('exif_taken_at', { withTimezone: true }),
  isInternetSourced: boolean('is_internet_sourced').default(false),
  verificationNotes: jsonb('verification_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex('observation_log_wallet_mint_tx_unique').on(table.wallet, table.mintTx),
  uniqueIndex('obs_daily_unique').on(table.wallet, table.target, table.observedDate),
  index('obs_log_created_at_idx').on(table.createdAt),
  index('obs_log_target_idx').on(table.target),
  index('obs_log_file_hash_idx').on(table.fileHash),
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
  // §4: optional Stars-for-discount burn applied at order creation; the
  // actual SPL burn is signed at /api/orders/confirm and recorded in
  // stars_burns. burn_stars and gel_discount are 0 for orders without burn.
  burnStars: integer('burn_stars').notNull().default(0),
  burnSignature: text('burn_signature'),
  gelDiscount: doublePrecision('gel_discount').notNull().default(0),
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

// §4: server-side log of every SPL Stars burn — discount on a marketplace
// order (kind='discount-burn'), in-app Star Shop purchase
// (kind='shop-purchase'), or one-time Astroman till redemption
// (kind='redeem-code'). The unique (order_id, kind) index prevents
// double-burning when /api/orders/confirm is retried.
export const starsBurns = pgTable('stars_burns', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id'),
  redeemCodeId: uuid('redeem_code_id'),
  walletAddress: text('wallet_address').notNull(),
  amount: integer('amount').notNull(),
  kind: text('kind').notNull(),
  signature: text('signature').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('stars_burns_order_kind_unique').on(t.orderId, t.kind),
  index('stars_burns_wallet_idx').on(t.walletAddress),
])

// §5: one-time codes the user generates by burning Stars; redeemed by the
// Astroman cashier via /api/redeem-code/validate. 7-day expiry; status
// transitions are 'active' → 'spent' (validate) or 'active' → 'expired'
// (computed lazily on read).
export const redeemCodes = pgTable('redeem_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(),
  starsBurned: integer('stars_burned').notNull(),
  gelValue: doublePrecision('gel_value').notNull(),
  walletAddress: text('wallet_address').notNull(),
  burnSignature: text('burn_signature'),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  spentAt: timestamp('spent_at', { withTimezone: true }),
  spentBy: text('spent_by'),
}, (t) => [
  index('redeem_codes_wallet_idx').on(t.walletAddress),
  index('redeem_codes_status_idx').on(t.status),
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

export const tweetDrafts = pgTable('tweet_drafts', {
  id: uuid('id').defaultRandom().primaryKey(),
  kind: text('kind').notNull(),
  body: text('body').notNull(),
  context: jsonb('context'),
  imageBase64: text('image_base64'),
  status: text('status').notNull().default('pending'),
  postedTweetId: text('posted_tweet_id'),
  postedAt: timestamp('posted_at', { withTimezone: true }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('tweet_drafts_status_idx').on(t.status),
  index('tweet_drafts_created_idx').on(t.createdAt),
])
