// Grant-evidence mint report: enumerate every real Discovery Attestation cNFT
// on mainnet via Helius DAS, resolve each mint's blocktime, and emit
// docs/grant-evidence/mints-report.csv + mints-report.md plus a headline count.
// Re-runnable (daily cron OK): mint timestamps are cached in
// docs/grant-evidence/.mint-report-cache.json so only new assets hit the RPC.
//
//   node scripts/mint-report.mjs        (or: npm run report:mints)
//
// Env: HELIUS_API_KEY or NEXT_PUBLIC_HELIUS_RPC_URL (DAS-capable RPC, required),
//      DATABASE_URL (optional — enables the app-DB cross-check).
import fs from 'fs';
import path from 'path';

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

const COLLECTION = process.env.COLLECTION_MINT_ADDRESS ?? '6Pt5BNk1nzL4rhG2z1SuDCn18vjN1uAvFTU8oK6uhsXm';
const TREE = process.env.MERKLE_TREE_ADDRESS ?? '3R9uV6aLb5dkb38Jg4KZjqR4MoCYXtKdeWXRqatf8zWe';

const rpcUrl = process.env.HELIUS_API_KEY
  ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
  : (process.env.NEXT_PUBLIC_HELIUS_RPC_URL ?? process.env.SOLANA_RPC_URL);
if (!rpcUrl) {
  console.error('Set HELIUS_API_KEY or NEXT_PUBLIC_HELIUS_RPC_URL (DAS-capable RPC required)');
  process.exit(1);
}

const OUT_DIR = path.join(process.cwd(), 'docs', 'grant-evidence');
const CACHE_PATH = path.join(OUT_DIR, '.mint-report-cache.json');
fs.mkdirSync(OUT_DIR, { recursive: true });

let rpcId = 0;
async function rpc(method, params) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }),
    });
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }
    const json = await res.json();
    if (json.error) throw new Error(`${method}: ${JSON.stringify(json.error)}`);
    return json.result;
  }
  throw new Error(`${method}: rate-limited after retries`);
}

// 1. Enumerate the collection, fully paginated. (Helius DAS cannot sweep a
// bare tree — searchAssets requires owner or grouping — so the collection
// grouping is the enumeration source; rows are then filtered to our tree.)
const assets = new Map();
function takePage(items) {
  for (const a of items ?? []) {
    assets.set(a.id, {
      id: a.id,
      owner: a.ownership?.owner ?? '',
      name: a.content?.metadata?.name ?? '',
      tree: a.compression?.tree ?? '',
      burnt: a.burnt === true,
    });
  }
}
for (let page = 1; ; page++) {
  const r = await rpc('getAssetsByGroup', { groupKey: 'collection', groupValue: COLLECTION, page, limit: 1000 });
  takePage(r?.items);
  if ((r?.items?.length ?? 0) < 1000) break;
}
const live = [...assets.values()].filter((a) => !a.burnt && a.tree === TREE);
console.log(`DAS: ${assets.size} assets in collection, ${live.length} live on tree ${TREE}`);

// 2. Mint timestamp per asset: getSignaturesForAsset (oldest signature = the
// mint) then getTransaction for its blocktime. Cached across runs.
let cache = {};
if (fs.existsSync(CACHE_PATH)) cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));

async function resolveMint(asset) {
  if (cache[asset.id]?.blockTime) return cache[asset.id];
  const sigs = await rpc('getSignaturesForAsset', { id: asset.id, page: 1, limit: 1000 });
  const items = sigs?.items ?? [];
  // Helius returns [signature, type] tuples, newest first; the mint is oldest.
  const mint = items.find(([, type]) => /mint/i.test(type ?? '')) ?? items[items.length - 1];
  if (!mint) return null;
  const [signature] = mint;
  const tx = await rpc('getTransaction', [signature, { maxSupportedTransactionVersion: 0, commitment: 'confirmed' }]);
  const entry = { signature, blockTime: tx?.blockTime ?? null };
  cache[asset.id] = entry;
  return entry;
}

const rows = [];
const POOL = 6;
let cursor = 0;
async function worker() {
  while (cursor < live.length) {
    const asset = live[cursor++];
    try {
      const mint = await resolveMint(asset);
      rows.push({ ...asset, signature: mint?.signature ?? '', blockTime: mint?.blockTime ?? null });
    } catch (e) {
      console.error(`  ${asset.id}: ${e.message}`);
      rows.push({ ...asset, signature: '', blockTime: null });
    }
    if (rows.length % 25 === 0) console.log(`  resolved ${rows.length}/${live.length} mint timestamps`);
  }
}
await Promise.all(Array.from({ length: POOL }, worker));
fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));

rows.sort((a, b) => (a.blockTime ?? 0) - (b.blockTime ?? 0));
const iso = (t) => (t ? new Date(t * 1000).toISOString() : '');
const day = (t) => (t ? iso(t).slice(0, 10) : 'unknown');

// 3. Aggregates.
const isTest = (r) => /verify test|smoke test/i.test(r.name);
const real = rows.filter((r) => !isTest(r));
const owners = new Map();
for (const r of real) owners.set(r.owner, (owners.get(r.owner) ?? 0) + 1);
const perDay = new Map();
for (const r of real) perDay.set(day(r.blockTime), (perDay.get(day(r.blockTime)) ?? 0) + 1);

const counts = [...owners.values()];
const mean = counts.reduce((s, n) => s + n, 0) / (counts.length || 1);
const sd = Math.sqrt(counts.reduce((s, n) => s + (n - mean) ** 2, 0) / (counts.length || 1));
const threshold = Math.max(5, Math.ceil(mean + 3 * sd));
const outliers = [...owners.entries()].filter(([, n]) => n >= threshold).sort((a, b) => b[1] - a[1]);

// 4. Optional app-DB cross-check. observation_log.mint_tx mixes real tx
// signatures with off-chain event tags (find:/checkin:/cosmic:/challenge:),
// and signature rows from before the mainnet tree went live (2026-06-21,
// tx 4ZMWp24yYW98…) are devnet-pilot history — classify before comparing
// against chain, and verify each mainnet-era signature actually landed.
let dbSection = '_DB cross-check skipped (no DATABASE_URL)._';
if (process.env.DATABASE_URL) {
  try {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    const SIG = '^[1-9A-HJ-NP-Za-km-z]{80,90}$';
    const MAINNET_SINCE = '2026-06-21';
    const [{ n: cohortUsers }] = await sql`select count(*)::int as n from user_cohorts`;
    const [{ n: appUsers }] = await sql`select count(*)::int as n from users`;
    const [c] = await sql`select
      count(*) filter (where mint_tx !~ ${SIG})::int as tags,
      count(*) filter (where mint_tx ~ ${SIG} and created_at < ${MAINNET_SINCE})::int as devnet,
      count(*) filter (where mint_tx ~ ${SIG} and created_at >= ${MAINNET_SINCE})::int as mainnet
      from observation_log where mint_tx is not null`;
    const attempts = await sql`select mint_tx from observation_log
      where mint_tx ~ ${SIG} and created_at >= ${MAINNET_SINCE}`;
    let landed = 0, failedOnChain = 0, notFound = 0;
    for (const a of attempts) {
      const tx = await rpc('getTransaction', [a.mint_tx, { maxSupportedTransactionVersion: 0, commitment: 'confirmed' }]).catch(() => null);
      if (!tx) notFound++;
      else if (tx.meta?.err) failedOnChain++;
      else landed++;
    }
    dbSection = [
      '| App-DB metric | Count |',
      '| --- | ---: |',
      `| Onboarded users (\`users\`) | ${appUsers} |`,
      `| Cohort-tracked wallets (\`user_cohorts\`) | ${cohortUsers} |`,
      `| \`observation_log\` mint rows — devnet pilot (before ${MAINNET_SINCE}) | ${c.devnet} |`,
      `| \`observation_log\` mint rows — mainnet era | ${c.mainnet} |`,
      `| \`observation_log\` rows with an off-chain event tag (not mints) | ${c.tags} |`,
      '',
      `Mainnet-era DB mint rows verified against chain: **${landed} landed**, ${failedOnChain} failed on-chain, ${notFound} not found.` +
        (failedOnChain || notFound
          ? ' Failed/not-found rows are recorded as minted in the DB and should be corrected.'
          : ''),
      '',
      `On-chain vs DB: **${real.length}** live user cNFTs on-chain vs **${landed}** landed mainnet mint rows in the app DB` +
        (real.length === landed ? ' — consistent.' : ' — investigate the gap (test mints, retries, or out-of-app mints).'),
    ].join('\n');
  } catch (e) {
    dbSection = `_DB cross-check failed: ${e.message}_`;
  }
}

// 5. Outputs.
const solscanAsset = (id) => `https://solscan.io/token/${id}`;
const csv = [
  'asset_id,owner,mint_timestamp_utc,mint_tx,solscan_asset,solscan_tx,name,is_test',
  ...rows.map((r) =>
    [r.id, r.owner, iso(r.blockTime), r.signature, solscanAsset(r.id),
     r.signature ? `https://solscan.io/tx/${r.signature}` : '',
     `"${r.name.replaceAll('"', '""')}"`, isTest(r)].join(',')),
].join('\n');
fs.writeFileSync(path.join(OUT_DIR, 'mints-report.csv'), csv + '\n');

const dated = real.filter((r) => r.blockTime);
const samples = [...real].filter((r) => r.blockTime).slice(-5).reverse();
const md = `# Stellar — Discovery Attestation Mint Report (mainnet)

Generated by \`scripts/mint-report.mjs\` from Helius DAS. All figures are live
on-chain data — every row is independently verifiable on Solscan.

- **Collection:** [\`${COLLECTION}\`](https://solscan.io/token/${COLLECTION})
- **Merkle tree:** [\`${TREE}\`](https://solscan.io/account/${TREE})

## Headline

| Metric | Value |
| --- | ---: |
| **Total verified-observation cNFT mints** | **${real.length}** |
| Unique owner wallets | ${owners.size} |
| Date range | ${dated.length ? `${day(dated[0].blockTime)} → ${day(dated[dated.length - 1].blockTime)}` : 'n/a'} |
| Internal test mints (excluded above) | ${rows.length - real.length} |

## Mints per day

| Date | Mints |
| --- | ---: |
${[...perDay.entries()].sort().map(([d, n]) => `| ${d} | ${n} |`).join('\n')}

## Wallet concentration

${outliers.length
    ? `Flagged wallets with ≥${threshold} mints (mean ${mean.toFixed(1)}/wallet — review for non-organic activity):\n\n` +
      outliers.map(([w, n]) => `- [\`${w}\`](https://solscan.io/account/${w}) — ${n} mints`).join('\n')
    : `No outlier wallets — no wallet holds ≥${threshold} mints (mean ${mean.toFixed(1)} per wallet).`}

## Sample mints (most recent)

${samples.map((r) => `- ${day(r.blockTime)} — [${r.name || r.id}](${solscanAsset(r.id)}) ([mint tx](https://solscan.io/tx/${r.signature}))`).join('\n') || '_none_'}

## App-DB cross-check

${dbSection}

Full row-level data: [mints-report.csv](./mints-report.csv)
`;
fs.writeFileSync(path.join(OUT_DIR, 'mints-report.md'), md);

console.log(`\nHEADLINE: ${real.length} verified-observation cNFT mints on mainnet`);
console.log(`  unique owners: ${owners.size}, test mints excluded: ${rows.length - real.length}`);
console.log(`  wrote docs/grant-evidence/mints-report.csv + mints-report.md`);
