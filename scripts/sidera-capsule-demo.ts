/**
 * Capsules, end to end, on the sidera database.
 *
 *   Three capsules listed (each committed before sale) → two bought with test
 *   nonces → both opened → both verified from the public log → the log and
 *   its audit printed. The third stays on sale, unless the run had to use a
 *   temporary seal key, in which case it is voided unsold.
 *
 *   SIDERA_DATABASE_CONFIRM=sidera npm run sidera:capsules
 *
 * DEMO ONLY: payment is skipped. The two orders are marked paid directly,
 * with the signature 'demo-no-payment', instead of going through Solana Pay.
 * Nothing in src does this; only this script. Refuses to run unless
 * DATABASE_URL is the sidera Neon branch — see sidera-guard.ts.
 */

import { randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { getDb } from '../src/lib/db'
import { cardSet } from '../src/lib/schema'
import { SET_001 } from '../src/lib/sets/set-001'
import { auditLog, type OpenedOutcome } from '../src/lib/sidera/audit'
import { listCapsules, openCapsule, purchaseCapsule, readLog, voidCapsule } from '../src/lib/sidera/capsule'
import { markPaid } from '../src/lib/sidera/orders'
import { verifyCapsule } from '../src/lib/sidera/randomness'
import { requireSideraDatabase } from './sidera-guard'

async function main() {
  requireSideraDatabase()
  const temporaryKey = !process.env.CAPSULE_SEAL_KEY
  if (temporaryKey) {
    process.env.CAPSULE_SEAL_KEY = randomBytes(32).toString('hex')
    console.log('CAPSULE_SEAL_KEY is not set: using a key for this run only. The unsold capsule is voided at the end,\nsince nothing after this run could open it.\n')
  }
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const [set] = await db.select({ id: cardSet.id }).from(cardSet).where(eq(cardSet.code, SET_001.code))
  if (!set) throw new Error(`${SET_001.code} is not filed — run npm run sidera:seed first`)

  console.log('1. Listing three capsules. Each commitment is logged before any purchase exists.')
  const listed = await listCapsules(db, { setId: set.id, count: 3 })
  for (const c of listed) console.log(`   capsule ${c.sequence}  ${c.id}  commitment ${c.commitment}`)

  console.log('\n2. Buying two, with test nonces. [DEMO ONLY: Solana Pay skipped, orders marked paid directly]')
  for (const [i, c] of listed.slice(0, 2).entries()) {
    const nonce = randomBytes(32).toString('hex')
    const bought = await purchaseCapsule(db, {
      capsuleId: c.id,
      commitment: c.commitment,
      wallet: `sidera-test-holder-000${i + 1}`,
      nonce,
      signature: null,
      privyId: 'sidera-demo',
      amountSol: 0,
      paymentReference: `demo-${c.id}`,
    })
    if (!bought.ok) throw new Error(`purchase of capsule ${c.sequence} refused: ${bought.reason}`)
    await markPaid(db, bought.orderId, 'demo-no-payment')
    console.log(`   capsule ${c.sequence}  nonce ${nonce}  purchase hash ${bought.purchaseHash}`)
  }

  console.log('\n3. Opening them.')
  for (const c of listed.slice(0, 2)) {
    const opened = await openCapsule(db, c.id)
    if (!opened.ok) throw new Error(`capsule ${c.sequence} did not open: ${opened.reason}`)
    console.log(`   capsule ${c.sequence}  secret ${opened.secret}`)
    for (const p of opened.pulls) {
      console.log(`     draw ${p.drawIndex}  ${p.designation.padEnd(18)} ${p.rarity.padEnd(10)} edition ${p.editionNumber} of ${p.editionSize}`)
    }
  }

  if (temporaryKey) {
    const unsold = listed[2]
    await voidCapsule(db, { capsuleId: unsold.id, reason: 'demo run ended; its seal key was temporary' })
    console.log(`\n   capsule ${unsold.sequence} voided unsold, its secret revealed`)
  }

  const log = await readLog(db)
  console.log('\n4. Verifying each from the public log alone.')
  for (const c of listed.slice(0, 2)) {
    const opened = log.find((r) => r.capsuleId === c.id && r.event === 'opened')
    if (!opened) throw new Error(`no 'opened' entry for capsule ${c.sequence}`)
    const o = opened.outcome as OpenedOutcome
    const result = verifyCapsule({
      commitment: opened.commitment,
      secret: o.secret,
      nonce: opened.buyerNonce ?? '',
      capsuleId: c.id,
      pulls: o.pulls,
      supply: o.supply,
      draws: o.draws,
      oddsBps: o.oddsBps,
    })
    console.log(`   capsule ${c.sequence}: ${result.ok ? 'verified' : `FAILED — ${result.problems.join('; ')}`}`)
  }

  console.log('\n5. The log for these three capsules.')
  const ours = new Set(listed.map((c) => c.id))
  for (const r of log.filter((x) => ours.has(x.capsuleId))) {
    const detail = r.event === 'opened'
      ? (r.outcome as OpenedOutcome).pulls.map((p) => `${p.designation}#${p.editionNumber}`).join(', ')
      : r.buyerNonce ? `nonce ${r.buyerNonce.slice(0, 16)}…` : ''
    console.log(`   #${String(r.seq).padEnd(4)} capsule ${String(r.capsuleSequence).padEnd(4)} ${r.event.padEnd(10)} ${r.commitment.slice(0, 16)}…  ${detail}`)
  }

  const audit = auditLog(log)
  console.log('\n6. Audit of the whole log.')
  console.log(`   listed ${audit.listed}, purchased ${audit.purchased}, opened ${audit.opened}, voided ${audit.voided}, verified ${audit.verified}`)
  if (audit.flags.length === 0) console.log('   no flags')
  for (const f of audit.flags) console.log(`   ${f.kind}  capsule ${f.capsuleSequence ?? '-'}  ${f.detail}`)
}

main().catch((error) => {
  console.error('The capsule demo failed:', error)
  process.exit(1)
})
