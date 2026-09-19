/**
 * Files Set 001 and its cards in the sidera database.
 *
 *   SIDERA_DATABASE_CONFIRM=sidera npm run sidera:seed
 *
 * Idempotent. Run only with DATABASE_URL pointing at the sidera Neon branch.
 */

import { config as loadEnv } from 'dotenv'
import { getDb } from '../src/lib/db'
import { SET_001, SET_001_CARDS } from '../src/lib/sets/set-001'
import { seedSet } from '../src/lib/sidera/seed'

loadEnv({ path: '.env.local' })
loadEnv()

async function main() {
  if (process.env.SIDERA_DATABASE_CONFIRM !== 'sidera') {
    console.error(
      'Refusing to run: set SIDERA_DATABASE_CONFIRM=sidera, with DATABASE_URL pointing at the sidera Neon branch.',
    )
    process.exit(1)
  }
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const { cards } = await seedSet(db, SET_001, SET_001_CARDS)
  console.log(`${SET_001.code}: ${cards.length} cards filed`)
  for (const c of cards) {
    console.log(`  ${c.designation.padEnd(18)} ${c.rarity.padEnd(10)} ${c.observationStatus.padEnd(14)} ${c.editionSize}`)
  }
}

main().catch((error) => {
  console.error('Seeding Set 001 failed:', error)
  process.exit(1)
})
