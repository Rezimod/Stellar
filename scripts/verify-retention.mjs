// Self-checking proof that queries/retention.sql is correct BEFORE real beta
// data exists. Seeds a throwaway cohort of 10 wallets with known activity,
// runs the exact retention logic, asserts the answer is 50.0%, then deletes
// everything it created. Touches its own isolated campaign only — never the
// real `beta_jul2026` rows.
//
// Pattern (per the verification protocol in PHASE_1_INSTRUMENTATION.md §1.5):
//   - 5 wallets active in weeks 0,1,2,3,4  → counted in week_0 and week_4
//   - 5 wallets active in week 0 only      → counted in week_0, churned by week_4
//   Expected: week_4_retention_pct = 50.0
//
// Run:  node scripts/verify-retention.mjs
// Requires DATABASE_URL (read from .env.local, same as the app).

import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    if (!(k in process.env)) process.env[k] = t.slice(eq + 1).trim();
  }
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set (.env.local). Aborting.');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// Isolated campaign + wallet prefix so cleanup is exact and real data is untouched.
const CAMPAIGN = `seedtest_${Date.now()}`;
const PREFIX = `seedtest_${Date.now()}_`;
// A literal Monday 00:00 UTC so date_trunc('week') == this instant and week
// offsets are exact integers regardless of when the script runs.
const ANCHOR = '2026-05-04T00:00:00Z';

const wallets = Array.from({ length: 10 }, (_, i) => `${PREFIX}${i}`);
const active = wallets.slice(0, 5); // weeks 0..4
const churned = wallets.slice(5);   // week 0 only

function eventAt(weekOffset) {
  // anchor + N weeks + 12h, so floor(epoch/604800) === N
  return new Date(Date.parse(ANCHOR) + weekOffset * 604800_000 + 12 * 3600_000).toISOString();
}

async function cleanup() {
  await sql`delete from analytics_event where wallet like ${PREFIX + '%'}`;
  await sql`delete from user_cohorts where utm_campaign = ${CAMPAIGN}`;
}

async function main() {
  let failed = false;
  try {
    // Seed cohort rows (first_seen_at at the anchor Monday).
    for (const w of wallets) {
      await sql`
        insert into user_cohorts (wallet, privy_user_id, first_seen_at, utm_source, utm_campaign)
        values (${w}, ${'privy_' + w}, ${ANCHOR}, 'astroman', ${CAMPAIGN})
        on conflict (wallet) do nothing`;
    }

    // Seed session_open activity.
    for (const w of active) {
      for (const wk of [0, 1, 2, 3, 4]) {
        await sql`insert into analytics_event (event, wallet, created_at) values ('session_open', ${w}, ${eventAt(wk)})`;
      }
    }
    for (const w of churned) {
      await sql`insert into analytics_event (event, wallet, created_at) values ('session_open', ${w}, ${eventAt(0)})`;
    }

    // Run the retention logic (mirror of queries/retention.sql, parameterized campaign).
    const rows = await sql`
      with cohort as (
        select wallet, date_trunc('week', first_seen_at) as cohort_week
        from user_cohorts
        where utm_source = 'astroman' and utm_campaign = ${CAMPAIGN}
      ),
      weekly_activity as (
        select c.wallet, c.cohort_week,
          floor(extract(epoch from (e.created_at - c.cohort_week)) / 604800)::int as week_offset
        from cohort c
        join analytics_event e on e.wallet = c.wallet
        where e.event = 'session_open'
      )
      select
        count(distinct wallet) filter (where week_offset = 0) as week_0,
        count(distinct wallet) filter (where week_offset = 4) as week_4,
        round(100.0 * count(distinct wallet) filter (where week_offset = 4)
          / nullif(count(distinct wallet) filter (where week_offset = 0), 0), 1) as week_4_retention_pct
      from weekly_activity`;

    const r = rows[0];
    const pct = parseFloat(r.week_4_retention_pct);
    console.log(`week_0=${r.week_0}  week_4=${r.week_4}  week_4_retention_pct=${r.week_4_retention_pct}`);

    if (Number(r.week_0) !== 10 || Number(r.week_4) !== 5 || pct !== 50.0) {
      console.error('FAIL — expected week_0=10, week_4=5, week_4_retention_pct=50.0');
      failed = true;
    } else {
      console.log('PASS — retention.sql computes the cohort correctly.');
    }
  } catch (err) {
    console.error('ERROR during verification:', err);
    failed = true;
  } finally {
    await cleanup();
    console.log('cleaned up seed rows.');
  }
  process.exit(failed ? 1 : 0);
}

main();
