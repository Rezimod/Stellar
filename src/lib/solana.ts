import {
  Connection,
  PublicKey,
  Transaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

const DEVNET_URL = 'https://api.devnet.solana.com';
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

let _connection: Connection | null = null;
function getConnection(): Connection {
  if (!_connection) _connection = new Connection(DEVNET_URL, 'confirmed');
  return _connection;
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
    console.log(`[Solana] Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(3)} SOL`);
    if (balance < 0.01 * LAMPORTS_PER_SOL) {
      console.log('[Solana] Low balance, airdropping...');
      const sig = await connection.requestAirdrop(publicKey, LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, 'confirmed');
      console.log('[Solana] Airdrop done');
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

    console.log('[Solana] ✅ Confirmed:', signature);
    console.log(`[Solana] 🔗 https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    return { success: true, txId: signature, method: 'onchain' };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Solana] TX failed:', msg);
    if (msg.includes('rejected') || msg.includes('User rejected')) {
      return { success: false, txId: '', method: 'simulated', error: 'Transaction cancelled' };
    }
    return { ...simResult(), error: msg };
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
    verification: { cloudCover: observation.cloudCover, oracle: observation.oracleHash, source: 'farmhawk' },
    stars: observation.stars,
  });
}

// Legacy shim for old callers
export async function mintNFT(name: string, _symbol: string): Promise<{ success: boolean; txId: string; mint: string }> {
  await new Promise(r => setTimeout(r, 2000));
  const r = simResult();
  return { success: true, txId: r.txId, mint: r.txId.slice(0, 8) };
}
