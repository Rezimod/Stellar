import bs58 from 'bs58';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  keypairIdentity,
  publicKey as toPublicKey,
} from '@metaplex-foundation/umi';
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
}

export async function mintCompressedNFT(params: ObservationMintParams): Promise<{ txId: string }> {
  const { FEE_PAYER_PRIVATE_KEY, MERKLE_TREE_ADDRESS, COLLECTION_MINT_ADDRESS } = process.env;
  if (!FEE_PAYER_PRIVATE_KEY) throw new Error('FEE_PAYER_PRIVATE_KEY not set');
  if (!MERKLE_TREE_ADDRESS) throw new Error('MERKLE_TREE_ADDRESS not set');
  if (!COLLECTION_MINT_ADDRESS) throw new Error('COLLECTION_MINT_ADDRESS not set');

  const secretKey = bs58.decode(FEE_PAYER_PRIVATE_KEY);

  const umi = createUmi(process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com')
    .use(mplBubblegum())
    .use(mplTokenMetadata());

  const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
  umi.use(keypairIdentity(keypair));

  const recipient = params.userAddress ? toPublicKey(params.userAddress) : keypair.publicKey;

  const name = `Stellar: ${params.target}`;
  const uri = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://stellarrclub.vercel.app'}/api/metadata/observation?target=${encodeURIComponent(params.target)}&ts=${params.timestampMs}&lat=${params.lat.toFixed(4)}&lon=${params.lon.toFixed(4)}&cc=${params.cloudCover}&hash=${params.oracleHash}&stars=${params.stars}`;

  const { signature } = await mintV1(umi, {
    leafOwner: recipient,
    merkleTree: toPublicKey(MERKLE_TREE_ADDRESS),
    metadata: {
      name,
      uri,
      sellerFeeBasisPoints: 0,
      // verified: true is safe here because the fee payer keypair is the collection update authority
      // (set during npm run setup:bubblegum). A proper verifyCollection call post-mint would require
      // fetching the asset proof via DAS API, which is not available at mint time without Helius.
      collection: { key: toPublicKey(COLLECTION_MINT_ADDRESS), verified: true },
      creators: [],
    },
  }).sendAndConfirm(umi);

  const txId = bs58.encode(Buffer.from(signature));
  return { txId };
}
