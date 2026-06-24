// One-off: create the user_cohorts table + campaign index, idempotently.
// Mirrors the Drizzle definition in src/lib/schema.ts exactly. Used instead of
// `drizzle-kit push` because push needs an interactive TTY to disambiguate a
// new table from a rename. Safe to run more than once.
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
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

await sql`
  create table if not exists user_cohorts (
    wallet         text primary key,
    privy_user_id  text not null,
    first_seen_at  timestamptz not null default now(),
    utm_source     text,
    utm_medium     text,
    utm_campaign   text,
    utm_content    text,
    referrer       text,
    landing_path   text,
    country        text,
    created_at     timestamptz not null default now()
  )`;
await sql`create index if not exists user_cohorts_campaign_idx on user_cohorts (utm_source, utm_campaign)`;

const cols = await sql`
  select column_name from information_schema.columns
  where table_name = 'user_cohorts' order by ordinal_position`;
console.log('user_cohorts ready. columns:', cols.map((c) => c.column_name).join(', '));
process.exit(0);
