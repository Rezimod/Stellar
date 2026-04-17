import bs58 from 'bs58';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  keypairIdentity,
  publicKey as toPublicKey,
} from '@metaplex-foundation/umi';
import { base58 } from '@metaplex-foundation/umi/serializers';
import { mintV1, mplBubblegum } from '@metaplex-foundation/mpl-bubblegum';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';

export interface ObservationMintParams {
  userAddress: string | null;
  target: string;
  timestampMs: number;
  lat: number;
  lon: number;
  cloudCover: number;
  oracleHash: string;
  stars: number;
  rarity?: string;
  multiplier?: number;
}

export async function mintCompressedNFT(params: ObservationMintParams): Promise<{ txId: string }> {
  const { FEE_PAYER_PRIVATE_KEY, MERKLE_TREE_ADDRESS, COLLECTION_MINT_ADDRESS } = process.env;
  if (!FEE_PAYER_PRIVATE_KEY) {
    console.error('[mint-nft] Missing env var:', 'FEE_PAYER_PRIVATE_KEY');
    throw new Error('FEE_PAYER_PRIVATE_KEY not set');
  }
  if (!MERKLE_TREE_ADDRESS) {
    console.error('[mint-nft] Missing env var:', 'MERKLE_TREE_ADDRESS');
    throw new Error('MERKLE_TREE_ADDRESS not set');
  }
  if (!COLLECTION_MINT_ADDRESS) {
    console.error('[mint-nft] Missing env var:', 'COLLECTION_MINT_ADDRESS');
    throw new Error('COLLECTION_MINT_ADDRESS not set');
  }

  // Prefer Helius RPC (faster, more reliable) over public devnet
  const rpcUrl =
    process.env.NEXT_PUBLIC_HELIUS_RPC_URL ??
    process.env.SOLANA_RPC_URL ??
    'https://api.devnet.solana.com';

  const secretKey = bs58.decode(FEE_PAYER_PRIVATE_KEY);

  const umi = createUmi(rpcUrl)
    .use(mplBubblegum())
    .use(mplTokenMetadata());

  const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
  umi.use(keypairIdentity(keypair));

  const recipient = params.userAddress ? toPublicKey(params.userAddress) : keypair.publicKey;

  const name = `Stellar: ${params.target}`;
  const uri = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://stellarrclub.vercel.app'}/api/metadata/observation?target=${encodeURIComponent(params.target)}&ts=${params.timestampMs}&lat=${params.lat.toFixed(4)}&lon=${params.lon.toFixed(4)}&cc=${params.cloudCover}&hash=${params.oracleHash}&stars=${params.stars}&rarity=${encodeURIComponent(params.rarity ?? 'Common')}&multiplier=${params.multiplier ?? 1}`;

  // 'processed' commitment returns in ~1-2s vs 15-30s for 'confirmed'.
  // Route has maxDuration=60, so give the mint enough headroom for slow devnet ticks.
  const TIMEOUT_MS = 50000;

  const mintPromise = mintV1(umi, {
    leafOwner: recipient,
    merkleTree: toPublicKey(MERKLE_TREE_ADDRESS),
    metadata: {
      name,
      uri,
      sellerFeeBasisPoints: 0,
      collection: { key: toPublicKey(COLLECTION_MINT_ADDRESS), verified: false },
      creators: [],
    },
  }).sendAndConfirm(umi, { send: { skipPreflight: true }, confirm: { commitment: 'processed' } });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Mint timeout after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
  );

  const { signature } = await Promise.race([mintPromise, timeoutPromise]);

  const txId = base58.deserialize(signature)[0];
  return { txId };
}
