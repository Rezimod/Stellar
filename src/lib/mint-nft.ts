import bs58 from 'bs58';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  keypairIdentity,
  publicKey as toPublicKey,
} from '@metaplex-foundation/umi';
import { base58 } from '@metaplex-foundation/umi/serializers';
import { mintToCollectionV1, mplBubblegum } from '@metaplex-foundation/mpl-bubblegum';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { uploadJsonToIrys } from './irys';

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
  tier?: 'C' | 'S' | 'U';
  demo?: boolean;
  verified?: boolean;
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

  // Prefer Helius RPC (faster, more reliable) over the public mainnet endpoint
  const rpcUrl =
    process.env.NEXT_PUBLIC_HELIUS_RPC_URL ??
    process.env.SOLANA_RPC_URL ??
    'https://api.mainnet-beta.solana.com';

  const secretKey = bs58.decode(FEE_PAYER_PRIVATE_KEY);

  const umi = createUmi(rpcUrl)
    .use(mplBubblegum())
    .use(mplTokenMetadata());

  const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
  umi.use(keypairIdentity(keypair));

  const recipient = params.userAddress ? toPublicKey(params.userAddress) : keypair.publicKey;

  const verified = params.verified !== false;
  const name = verified ? `Stellar: ${params.target}` : `Stellar Keepsake: ${params.target}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://stellarrclub.vercel.app';
  const shortHash = (params.oracleHash ?? '').slice(0, 10);
  const tierSuffix = params.tier ? `&i=${params.tier}` : '';

  // Metadata lives on Irys (permanent, decentralized). Fallback to the compact
  // app URL so a storage hiccup never blocks a mint. The Metaplex URI limit is
  // 200 bytes — Irys gateway URLs are ~60, the fallback stays short too.
  const imageUrl = `${appUrl}/api/nft-image?target=${encodeURIComponent(params.target)}&ts=${params.timestampMs}&lat=${params.lat.toFixed(4)}&lon=${params.lon.toFixed(4)}&cc=${params.cloudCover}&stars=${params.stars}&rarity=${encodeURIComponent(params.rarity ?? 'Common')}`;
  let uri = `${appUrl}/m/o?t=${encodeURIComponent(params.target)}&d=${params.timestampMs}&la=${params.lat.toFixed(4)}&lo=${params.lon.toFixed(4)}&cc=${params.cloudCover}&h=${shortHash}&s=${params.stars}&r=${encodeURIComponent(params.rarity ?? 'Common')}&m=${params.multiplier ?? 1}${tierSuffix}`;
  try {
    uri = await uploadJsonToIrys({
      name,
      symbol: 'STLR',
      description: verified
        ? `Verified observation of ${params.target}. Cloud cover ${params.cloudCover}%, oracle hash ${shortHash}. Sealed on Solana.`
        : `Unverified keepsake — a photo captured by the observer but not certified by the Stellar oracle as this object on this night. No Stars awarded. Minted on Solana as a personal record.`,
      image: imageUrl,
      external_url: appUrl,
      attributes: [
        { trait_type: 'Target', value: params.target },
        { trait_type: 'Date', value: new Date(params.timestampMs).toISOString().split('T')[0] },
        { trait_type: 'Location', value: `${params.lat.toFixed(2)}, ${params.lon.toFixed(2)}` },
        { trait_type: 'Cloud Cover', value: `${params.cloudCover}%` },
        { trait_type: 'Oracle Hash', value: params.oracleHash ?? '' },
        { trait_type: 'Stars Earned', value: params.stars },
        { trait_type: 'Rarity', value: params.rarity ?? 'Common' },
        { trait_type: 'Verified', value: verified ? 'Yes' : 'No' },
        { trait_type: 'Streak Multiplier', value: params.multiplier ?? 1 },
        ...(params.tier ? [{ trait_type: 'Tier', value: params.tier }] : []),
        ...(params.demo ? [{ trait_type: 'Demo', value: 'true' }] : []),
      ],
    });
  } catch (err) {
    console.warn('[mint-nft] Irys upload failed, using app URL fallback:', err instanceof Error ? err.message : err);
  }

  // 'processed' commitment returns in ~1-2s vs 15-30s for 'confirmed'.
  // Route has maxDuration=60, so give the mint enough headroom for slow ticks.
  const TIMEOUT_MS = 25000;
  const treeKey = toPublicKey(MERKLE_TREE_ADDRESS);
  const collectionKey = toPublicKey(COLLECTION_MINT_ADDRESS);

  async function attempt(): Promise<string> {
    // mintToCollectionV1 mints AND verifies collection membership in one
    // instruction. The fee-payer (umi identity) is the collection authority, so
    // collectionAuthority defaults to it — no extra signer or verifyCollection
    // call needed. `verified: false` is required here; the program flips it.
    const mintPromise = mintToCollectionV1(umi, {
      leafOwner: recipient,
      merkleTree: treeKey,
      collectionMint: collectionKey,
      metadata: {
        name,
        uri,
        sellerFeeBasisPoints: 0,
        collection: { key: collectionKey, verified: false },
        creators: [],
      },
    }).sendAndConfirm(umi, { send: { skipPreflight: true }, confirm: { commitment: 'processed' } });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Mint timeout after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
    );

    const { signature } = await Promise.race([mintPromise, timeoutPromise]);
    return base58.deserialize(signature)[0];
  }

  // One retry on transient devnet failures (timeouts, blockhash expiry, etc.)
  try {
    return { txId: await attempt() };
  } catch (err) {
    console.warn('[mint-nft] First attempt failed, retrying once:', err instanceof Error ? err.message : err);
    return { txId: await attempt() };
  }
}
