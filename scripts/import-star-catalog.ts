// Run once: npm run setup:stars
// Downloads HYG v3 catalog (~100k stars, mag <= 8.0) into Neon star_catalog table
// Source: https://github.com/astronexus/HYG-Database (MIT license)

import * as fs from 'fs';
import * as path from 'path';
import { Client } from '@neondatabase/serverless';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

const CSV_URL = 'https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/v3/hyg_v3.csv';
const BATCH_SIZE = 500;
const MAG_LIMIT = 8.0;

type StarRow = [
  number,       // id
  number | null,// hip
  number | null,// hd
  number | null,// hr
  string | null,// proper_name
  number,       // ra
  number,       // dec
  number | null,// dist
  number | null,// mag
  string | null,// con
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not set — point it to your Neon DB in .env.local');
    process.exit(1);
  }

  const client = new Client(databaseUrl);
  await client.connect();

  console.log('Creating star_catalog table...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS star_catalog (
      id           INTEGER PRIMARY KEY,
      hip          INTEGER,
      hd           INTEGER,
      hr           INTEGER,
      proper_name  TEXT,
      ra           FLOAT NOT NULL,
      dec          FLOAT NOT NULL,
      dist         FLOAT,
      mag          FLOAT,
      con          TEXT,
      claimed_by   TEXT,
      claimed_name TEXT,
      claim_nft    TEXT,
      claimed_at   TIMESTAMPTZ
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_star_catalog_ra_dec ON star_catalog (ra, dec)`);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_star_catalog_claimed
    ON star_catalog (claimed_by)
    WHERE claimed_by IS NOT NULL
  `);
  console.log('Table ready. Downloading HYG v3 catalog...');

  const response = await fetch(CSV_URL);
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let headers: string[] = [];
  let batch: StarRow[] = [];
  let totalImported = 0;
  let rowsProcessed = 0;

  const flush = async () => {
    if (batch.length === 0) return;
    const cols = '(id, hip, hd, hr, proper_name, ra, dec, dist, mag, con)';
    const placeholders = batch
      .map((_, i) => {
        const b = i * 10;
        return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},$${b+9},$${b+10})`;
      })
      .join(',');
    const params = batch.flat() as (string | number | null)[];
    await client.query(
      `INSERT INTO star_catalog ${cols} VALUES ${placeholders} ON CONFLICT (id) DO NOTHING`,
      params
    );
    totalImported += batch.length;
    batch = [];
  };

  const processLine = async (line: string) => {
    if (!line.trim()) return;
    const cols = line.split(',');

    if (headers.length === 0) {
      headers = cols.map(h => h.trim());
      return;
    }

    const get = (name: string): string => {
      const idx = headers.indexOf(name);
      return idx >= 0 ? (cols[idx]?.trim() ?? '') : '';
    };

    const ra = parseFloat(get('ra'));
    const dec = parseFloat(get('dec'));
    if (!isFinite(ra) || !isFinite(dec)) return;

    const mag = parseFloat(get('mag'));
    if (!isFinite(mag) || mag > MAG_LIMIT) return;

    const id = parseInt(get('id'));
    if (!isFinite(id) || isNaN(id)) return;

    const hip = parseInt(get('hip'));
    const hd = parseInt(get('hd'));
    const hr = parseInt(get('hr'));
    const dist = parseFloat(get('dist'));
    const proper = get('proper') || null;
    const con = get('con') || null;

    batch.push([
      id,
      isFinite(hip) && !isNaN(hip) ? hip : null,
      isFinite(hd) && !isNaN(hd) ? hd : null,
      isFinite(hr) && !isNaN(hr) ? hr : null,
      proper,
      ra,
      dec,
      isFinite(dist) && !isNaN(dist) ? dist : null,
      isFinite(mag) ? mag : null,
      con,
    ]);

    rowsProcessed++;
    if (rowsProcessed % 5000 === 0) {
      console.log(`  Processed ${rowsProcessed.toLocaleString()} rows, imported ${totalImported.toLocaleString()}...`);
    }

    if (batch.length >= BATCH_SIZE) {
      await flush();
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      await processLine(line);
    }
  }
  if (buffer.trim()) await processLine(buffer);
  await flush();

  await client.end();
  console.log(`\nDone. Total imported: ${totalImported.toLocaleString()} stars (mag <= ${MAG_LIMIT})`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
