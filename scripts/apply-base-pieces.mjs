// Creates the base_pieces table (player base building in Explore) from
// scripts/sql/base-pieces.sql. Idempotent: every statement is IF NOT EXISTS.
//
// Run:  node scripts/apply-base-pieces.mjs
// Requires DATABASE_URL (read from .env.local, same as the app).
// This is the only way the table is meant to be created — never drizzle-kit push.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    if (!(k in process.env)) process.env[k] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  }
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'sql', 'base-pieces.sql');
const statements = fs.readFileSync(file, 'utf-8')
  .split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
  .split(';').map((s) => s.trim()).filter(Boolean);

const sql = neon(process.env.DATABASE_URL);
for (const s of statements) {
  console.log(`> ${s.split('\n')[0]}`);
  await sql.query(s);
}
const [{ n }] = await sql.query('SELECT count(*)::int AS n FROM base_pieces');
console.log(`base_pieces ready (${n} rows)`);
