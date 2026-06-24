// One-shot mainnet check: does mintToCollectionV1 produce a VERIFIED collection
// member with our live tree / collection / fee-payer? Mints one cNFT to the
// fee-payer itself (no user wallet touched), then polls Helius DAS until the
// asset is indexed and reports grouping.verified === true.
//
//   node scripts/verify-collection-mint.mjs
import fs from 'fs';
import path from 'path';
import bs58mod from 'bs58';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { keypairIdentity, publicKey as toPublicKey } from '@metaplex-foundation/umi';
import { base58 } from '@metaplex-foundation/umi/serializers';
import { mintToCollectionV1, mplBubblegum } from '@metaplex-foundation/mpl-bubblegum';
import { mplTokenMetadata, MPL_TOKEN_METADATA_PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';

const bs58 = bs58mod.default ?? bs58mod;

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq === -1) continue;
  const k = t.slice(0, eq).trim();
  if (!(k in process.env)) process.env[k] = t.slice(eq + 1).trim();
}

const { FEE_PAYER_PRIVATE_KEY, MERKLE_TREE_ADDRESS, COLLECTION_MINT_ADDRESS } = process.env;
const rpcUrl = process.env.NEXT_PUBLIC_HELIUS_RPC_URL ?? process.env.SOLANA_RPC_URL;
if (!FEE_PAYER_PRIVATE_KEY || !MERKLE_TREE_ADDRESS || !COLLECTION_MINT_ADDRESS || !rpcUrl) {
  throw new Error('Missing FEE_PAYER_PRIVATE_KEY / MERKLE_TREE_ADDRESS / COLLECTION_MINT_ADDRESS / RPC');
}

const umi = createUmi(rpcUrl).use(mplBubblegum()).use(mplTokenMetadata());
const keypair = umi.eddsa.createKeypairFromSecretKey(bs58.decode(FEE_PAYER_PRIVATE_KEY));
umi.use(keypairIdentity(keypair));

const treeKey = toPublicKey(MERKLE_TREE_ADDRESS);
const collectionKey = toPublicKey(COLLECTION_MINT_ADDRESS);
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://stellarr.club';

// Correct accounts the 4.4.0 client otherwise defaults to the Bubblegum
// program id (which silently skips verification).
const BUBBLEGUM_PROGRAM_ID = 'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY';
const [bubblegumSigner] = umi.eddsa.findPda(toPublicKey(BUBBLEGUM_PROGRAM_ID), [
  new TextEncoder().encode('collection_cpi'),
]);
console.log('bubblegumSigner PDA:', bubblegumSigner);
console.log('tokenMetadataProgram:', MPL_TOKEN_METADATA_PROGRAM_ID);

console.log('Fee-payer / collection authority:', keypair.publicKey);
console.log('Tree:', MERKLE_TREE_ADDRESS);
console.log('Collection:', COLLECTION_MINT_ADDRESS);
console.log('Minting verification cNFT (mintToCollectionV1)...');

const { signature } = await mintToCollectionV1(umi, {
  leafOwner: keypair.publicKey,
  merkleTree: treeKey,
  collectionMint: collectionKey,
  bubblegumSigner,
  tokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
  metadata: {
    name: 'Stellar: Collection Verify Test',
    uri: `${appUrl}/m/o?t=Verify&d=0&r=Common`,
    sellerFeeBasisPoints: 0,
    collection: { key: collectionKey, verified: true }, // authority signs → verified leaf
    creators: [],
  },
}).sendAndConfirm(umi, { send: { skipPreflight: true }, confirm: { commitment: 'confirmed' } });

const sig = base58.deserialize(signature)[0];
console.log('Mint tx:', sig);
console.log(`Explorer: https://explorer.solana.com/tx/${sig}?cluster=mainnet-beta`);

// Poll DAS for a verified member in the collection (indexer lag ~5-20s).
async function das(method, params) {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  return (await res.json()).result;
}

console.log('Polling DAS for verified collection membership...');
let verified = false;
for (let i = 0; i < 15; i++) {
  await new Promise((r) => setTimeout(r, 4000));
  const owned = await das('getAssetsByOwner', {
    ownerAddress: keypair.publicKey,
    page: 1,
    limit: 1000,
  });
  const items = owned?.items ?? [];
  const match = items
    .filter((a) => (a.grouping ?? []).some((g) => g.group_key === 'collection' && g.group_value === COLLECTION_MINT_ADDRESS))
    .sort((a, b) => (b.compression?.leaf_id ?? 0) - (a.compression?.leaf_id ?? 0))[0];
  if (match) {
    const g = match.grouping.find((x) => x.group_key === 'collection');
    console.log(`  [${i}] found asset ${match.id} — collection.verified = ${g.verified}`);
    if (g.verified) {
      verified = true;
      console.log('\n✅ VERIFIED collection member. mintToCollectionV1 works on mainnet.');
      break;
    }
  } else {
    console.log(`  [${i}] not indexed yet...`);
  }
}
if (!verified) {
  console.log('\n⚠️  Not confirmed verified within poll window. Check the explorer link above and re-query DAS later.');
  process.exit(1);
}
