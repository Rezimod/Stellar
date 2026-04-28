import { NextRequest, NextResponse } from 'next/server';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import { isValidPublicKey } from '@/lib/validate';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const maxDuration = 30;

// Devnet-only gas drip: tops up an external wallet (Phantom, Solflare, Backpack…)
// so users never need to manually airdrop SOL to sign transactions on Stellar.
const TOPUP_LAMPORTS = 0.02 * LAMPORTS_PER_SOL;
const MIN_LAMPORTS = 0.005 * LAMPORTS_PER_SOL;

let _limiter: Ratelimit | null = null;
function getLimiter(): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  if (_limiter) return _limiter;
  _limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(3, '3600 s'),
    prefix: 'rl:wallet-fund',
  });
  return _limiter;
}

export async function POST(req: NextRequest) {
  let body: { address?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const address = typeof body.address === 'string' ? body.address : '';
  if (!isValidPublicKey(address)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }

  const rpcUrl = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
  // Hard guard: never run gas-drip outside devnet.
  if (!rpcUrl.includes('devnet')) {
    return NextResponse.json({ error: 'Gas drip is devnet-only' }, { status: 503 });
  }

  const sk = process.env.FEE_PAYER_PRIVATE_KEY;
  if (!sk) {
    return NextResponse.json({ error: 'Fee payer not configured' }, { status: 503 });
  }

  try {
    const connection = new Connection(rpcUrl, 'confirmed');
    const recipient = new PublicKey(address);
    const balance = await connection.getBalance(recipient);
    if (balance >= MIN_LAMPORTS) {
      // Don't burn rate-limit budget on no-ops — clients call this every
      // bet/claim defensively, and most calls hit this branch.
      return NextResponse.json({ funded: false, balance, reason: 'sufficient' });
    }

    const limiter = getLimiter();
    if (limiter) {
      const { success } = await limiter.limit(address);
      if (!success) {
        return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
      }
    }

    const feePayer = Keypair.fromSecretKey(bs58.decode(sk));
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: feePayer.publicKey,
        toPubkey: recipient,
        lamports: TOPUP_LAMPORTS,
      }),
    );
    tx.feePayer = feePayer.publicKey;
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    tx.partialSign(feePayer);

    const sig = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
    await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      'confirmed',
    );

    return NextResponse.json({
      funded: true,
      txId: sig,
      lamports: TOPUP_LAMPORTS,
      explorerUrl: `https://explorer.solana.com/tx/${sig}?cluster=devnet`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[wallet/fund] failed:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
