// No-mint cryptographic check: is the on-chain leaf's data_hash consistent with
// collection.verified === true? Decodes the MetadataArgs actually submitted in
// the mint tx, recomputes the Bubblegum data_hash both ways, and compares to the
// hash the indexer reports for the asset.
import fs from 'fs';
import path from 'path';
import bs58mod from 'bs58';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { publicKey as toPublicKey } from '@metaplex-foundation/umi';
import { mplBubblegum, getMetadataArgsSerializer, hashMetadataData } from '@metaplex-foundation/mpl-bubblegum';

const bs58 = bs58mod.default ?? bs58mod;

const envPath = path.join(process.cwd(), '.env.local');
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq === -1) continue;
  const k = t.slice(0, eq).trim();
  if (!(k in process.env)) process.env[k] = t.slice(eq + 1).trim();
}

const rpcUrl = process.env.NEXT_PUBLIC_HELIUS_RPC_URL ?? process.env.SOLANA_RPC_URL;
const umi = createUmi(rpcUrl).use(mplBubblegum());

// Attempt 1: submitted collection.verified = false. Asset / on-chain hash:
const SIG = '41sjndi9HfioPnykYUtcSerTzX9WrbaG55ceTSkPZkbBMKDB3xi9fBq37eATBYWCFkAjmyso9EbeXVttRBLMMN6q';
const ASSET = '47iS2BdxHUuZYvLF29ZQk3oFhZimCX27DyfMxMthjLTH';

async function rpc(method, params) {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  return (await res.json()).result;
}

// On-chain data_hash from the indexer.
const asset = await rpc('getAsset', { id: ASSET });
const onChainDataHash = asset.compression.data_hash;
console.log('on-chain data_hash:', onChainDataHash);

// Decode the MetadataArgs actually submitted in the mint instruction.
const tx = await rpc('getTransaction', [SIG, { maxSupportedTransactionVersion: 0, encoding: 'json' }]);
const msg = tx.transaction.message;
const bubblegumIdx = msg.accountKeys.findIndex((k) => k === 'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY');
const ix = msg.instructions.find((i) => i.programIdIndex === bubblegumIdx);
const data = bs58.decode(ix.data); // 8-byte discriminator + MetadataArgs
const [submitted] = getMetadataArgsSerializer().deserialize(data.slice(8));
console.log('submitted collection.verified:', submitted.collection?.value?.verified ?? submitted.collection);

function b58(bytes) {
  return bs58.encode(Uint8Array.from(bytes));
}

const asVerified = {
  ...submitted,
  collection: { __option: 'Some', value: { key: submitted.collection.value.key, verified: true } },
};
const asUnverified = {
  ...submitted,
  collection: { __option: 'Some', value: { key: submitted.collection.value.key, verified: false } },
};

const hashTrue = b58(hashMetadataData(asVerified));
const hashFalse = b58(hashMetadataData(asUnverified));
console.log('computed data_hash (verified=true): ', hashTrue);
console.log('computed data_hash (verified=false):', hashFalse);

if (onChainDataHash === hashTrue) {
  console.log('\n✅ On-chain leaf matches verified=TRUE. The cNFT IS a verified collection member.');
} else if (onChainDataHash === hashFalse) {
  console.log('\n❌ On-chain leaf matches verified=FALSE. Not verified.');
} else {
  console.log('\n⚠️ Neither matched — metadata reconstruction is off (likely a uri/default mismatch).');
}
