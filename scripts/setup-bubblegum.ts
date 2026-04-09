import * as fs from 'fs';
import * as path from 'path';
import bs58 from 'bs58';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { keypairIdentity, generateSigner, percentAmount } from '@metaplex-foundation/umi';
import { createTree, mplBubblegum } from '@metaplex-foundation/mpl-bubblegum';
import { createNft, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';

// Load .env.local (tsx doesn't load it automatically)
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

function setEnvVar(content: string, key: string, value: string): string {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  const line = `${key}=${value}`;
  if (regex.test(content)) return content.replace(regex, line);
  const trimmed = content.trimEnd();
  return trimmed ? `${trimmed}\n${line}\n` : `${line}\n`;
}

async function main() {
  const privateKeyB58 = process.env.FEE_PAYER_PRIVATE_KEY;
  if (!privateKeyB58) throw new Error('FEE_PAYER_PRIVATE_KEY not set in .env.local');

  const secretKey = bs58.decode(privateKeyB58);

  const umi = createUmi('https://api.devnet.solana.com')
    .use(mplBubblegum())
    .use(mplTokenMetadata());

  const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
  umi.use(keypairIdentity(keypair));

  // Create merkle tree
  console.log('Creating merkle tree (this may take 30–60s on devnet)...');
  const merkleTree = generateSigner(umi);
  const treeBuilder = await createTree(umi, {
    merkleTree,
    maxDepth: 14,
    maxBufferSize: 64,
    canopyDepth: 10,
  });
  await treeBuilder.sendAndConfirm(umi);
  const treeAddress = merkleTree.publicKey as string;
  console.log('Tree created:', treeAddress);

  // Create collection NFT
  console.log('Creating collection NFT...');
  const collectionMint = generateSigner(umi);
  await createNft(umi, {
    mint: collectionMint,
    name: 'Stellar Observations',
    symbol: 'STLR',
    uri: 'https://stellarrclub.vercel.app/api/metadata/collection',
    sellerFeeBasisPoints: percentAmount(0),
    isCollection: true,
  }).sendAndConfirm(umi);
  const collectionAddress = collectionMint.publicKey as string;
  console.log('Collection created:', collectionAddress);

  // Update .env.local
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
  envContent = setEnvVar(envContent, 'MERKLE_TREE_ADDRESS', treeAddress);
  envContent = setEnvVar(envContent, 'COLLECTION_MINT_ADDRESS', collectionAddress);
  fs.writeFileSync(envPath, envContent);

  console.log('\n=== Setup complete ===');
  console.log(`MERKLE_TREE_ADDRESS=${treeAddress}`);
  console.log(`COLLECTION_MINT_ADDRESS=${collectionAddress}`);
  console.log('.env.local updated');
}

main().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
