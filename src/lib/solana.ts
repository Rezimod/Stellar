import {
  Connection,
  PublicKey,
  Transaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';

const RPC_URL = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

function getConnection(): Connection {
  return new Connection(RPC_URL, 'confirmed');
}

export type MintResult = {
  success: boolean;
  txId: string;
  method: 'onchain' | 'simulated';
  error?: string;
};

function simResult(): MintResult {
  return {
    success: true,
    txId: 'sim_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    method: 'simulated',
  };
}

export async function ensureBalance(publicKey: PublicKey): Promise<void> {
  const connection = getConnection();
  try {
    const balance = await connection.getBalance(publicKey);
    if (balance < 0.01 * LAMPORTS_PER_SOL) {
      const sig = await connection.requestAirdrop(publicKey, LAMPORTS_PER_SOL);
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ signature: sig, ...latestBlockhash }, 'confirmed');
    }
  } catch (e) {
    console.warn('[Solana] Airdrop failed (rate limited):', e);
  }
}

async function createOnChainProof(
  sendTransaction: (tx: Transaction, connection: Connection) => Promise<string>,
  publicKey: PublicKey,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  memoData: Record<string, any>
): Promise<MintResult> {
  const connection = getConnection();
  try {
    const memo = JSON.stringify({
      app: 'stellar',
      agent: 'stellar/observer',
      ...memoData,
      observer: publicKey.toString(),
      ts: Date.now(),
    });

    const transaction = new Transaction().add({
      keys: [{ pubkey: publicKey, isSigner: true, isWritable: false }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memo, 'utf-8'),
    });

    const signature = await sendTransaction(transaction, connection);
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed');

    return { success: true, txId: signature, method: 'onchain' };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Solana] TX failed:', msg);
    if (msg.includes('rejected') || msg.includes('User rejected')) {
      return { success: false, txId: '', method: 'simulated', error: 'Transaction cancelled' };
    }
    return { success: false, txId: '', method: 'simulated', error: msg };
  }
}

export async function mintMembership(
  sendTransaction: ((tx: Transaction, connection: Connection) => Promise<string>) | null,
  publicKey: PublicKey | null
): Promise<MintResult> {
  if (!sendTransaction || !publicKey) return { ...simResult(), txId: 'email_' + Date.now().toString(36) };
  return createOnChainProof(sendTransaction, publicKey, { type: 'membership', name: 'Stellar Club Membership' });
}

export async function mintTelescopePassport(
  sendTransaction: ((tx: Transaction, connection: Connection) => Promise<string>) | null,
  publicKey: PublicKey | null,
  telescope: { brand: string; model: string; aperture: string }
): Promise<MintResult> {
  if (!sendTransaction || !publicKey) return { ...simResult(), txId: 'email_' + Date.now().toString(36) };
  return createOnChainProof(sendTransaction, publicKey, {
    type: 'telescope',
    name: `${telescope.brand} ${telescope.model}`,
    aperture: telescope.aperture,
  });
}

export async function mintObservation(
  sendTransaction: ((tx: Transaction, connection: Connection) => Promise<string>) | null,
  publicKey: PublicKey | null,
  observation: { target: string; timestamp: string; lat: number; lon: number; cloudCover: number; oracleHash: string; stars: number }
): Promise<MintResult> {
  if (!sendTransaction || !publicKey) return { ...simResult(), txId: 'email_' + Date.now().toString(36) };
  return createOnChainProof(sendTransaction, publicKey, {
    type: 'observation',
    target: observation.target,
    timestamp: observation.timestamp,
    location: { lat: observation.lat, lon: observation.lon },
    verification: {
      oracle: 'open-meteo-v1',
      cloudCover: observation.cloudCover,
      hash: observation.oracleHash,
      source: 'open-meteo sky oracle',
    },
    stars: observation.stars,
  });
}

export async function getStarsBalance(walletAddress: string): Promise<number> {
  if (!process.env.STARS_TOKEN_MINT) return 0;
  try {
    const connection = getConnection();
    const ata = await getAssociatedTokenAddress(
      new PublicKey(process.env.STARS_TOKEN_MINT),
      new PublicKey(walletAddress)
    );
    const account = await getAccount(connection, ata);
    return Number(account.amount);
  } catch {
    return 0;
  }
}

