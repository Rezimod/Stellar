// Permanent, decentralized metadata hosting via Irys (Arweave bundler).
//
// NFT metadata used to point at centralized app URLs — if the domain went down,
// the metadata broke. Irys uploads it to Arweave, so the URI is permanent and
// not tied to our infra. Uploads under 100 KiB are free on the Irys mainnet
// node (our metadata JSON is ~1 KB), so no SOL funding is needed even though the
// NFT itself mints on devnet.

import { Uploader } from '@irys/upload';
import { Solana } from '@irys/upload-solana';

type IrysUploader = Awaited<ReturnType<typeof buildUploader>>;

let cached: IrysUploader | null = null;

async function buildUploader() {
  const key = process.env.FEE_PAYER_PRIVATE_KEY;
  if (!key) throw new Error('FEE_PAYER_PRIVATE_KEY not set — cannot upload to Irys');
  // Mainnet Irys node (permanent). withWallet takes the base58 secret key.
  return Uploader(Solana).withWallet(key);
}

async function getUploader(): Promise<IrysUploader> {
  if (!cached) cached = await buildUploader();
  return cached;
}

const GATEWAY = 'https://gateway.irys.xyz';

/** Upload a JSON object to Irys; returns a permanent public gateway URL. */
export async function uploadJsonToIrys(data: unknown): Promise<string> {
  const irys = await getUploader();
  const receipt = await irys.upload(JSON.stringify(data), {
    tags: [{ name: 'Content-Type', value: 'application/json' }],
  });
  return `${GATEWAY}/${receipt.id}`;
}

/** True when an Irys upload is possible (fee-payer key present). */
export function irysEnabled(): boolean {
  return Boolean(process.env.FEE_PAYER_PRIVATE_KEY);
}
