/**
 * Renames the last sidera values in the card database, in one transaction:
 * order product ids sidera-capsule / sidera-card:* and dealer 'sidera', and
 * the analytics event sidera_view.
 *
 *   STELLAR_DATABASE_CONFIRM=stellar npx tsx scripts/stellar-rename-data.ts
 */

import { neon } from '@neondatabase/serverless'
import { requireStellarDatabase } from './stellar-guard'

requireStellarDatabase()
const sql = neon(process.env.DATABASE_URL!)

async function main() {
  const r = await sql.transaction([
    sql`UPDATE orders SET product_id = 'stellar-' || substr(product_id, 8) WHERE product_id LIKE 'sidera-%'`,
    sql`UPDATE orders SET dealer_id = 'stellar' WHERE dealer_id = 'sidera'`,
    sql`UPDATE analytics_event SET event = 'stellar_view' WHERE event = 'sidera_view'`,
    sql`SELECT
      (SELECT count(*) FROM orders WHERE product_id LIKE 'sidera%' OR dealer_id = 'sidera') AS old_orders,
      (SELECT count(*) FROM analytics_event WHERE event = 'sidera_view') AS old_events,
      (SELECT count(*) FROM analytics_event WHERE event = 'stellar_view') AS stellar_events`,
  ])
  console.log(r[3])
}

main()
