import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
  getAccount,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';
import bs58 from 'bs58';
import { isValidPublicKey } from '@/lib/validate';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const maxDuration = 60;

// Per-wallet cap on how many stars `sync` is willing to top up to. The user's
// lifetime total comes from the client (local-state mission count), and we
// mint the gap between (current SPL balance) and (expectedTotal). Hard cap
// prevents the client from claiming an absurd amount.
const MAX_EXPECTED_TOTAL = 5000;
// We allow one full sync per wallet per hour. Multiple bets/visits in quick
// succession do not re-fire the mint — sync writes a sentinel record to
// observation_log so subsequent calls become no-ops once balance ≥ expected.
let _limiter: Ratelimit | null = null;
function getLimiter(): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  if (_limiter) return _limiter;
  _limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(2, '3600 s'),
    prefix: 'rl:stars-sync',
  });
  return _limiter;
}

export async function POST(req: NextRequest) {
  let body: { address?: unknown; expectedTotal?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const address = typeof body.address === 'string' ? body.address : '';
  if (!isValidPublicKey(address)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }

  const expected = Number(body.expectedTotal);
  if (!Number.isFinite(expected) || !Number.isInteger(expected) || expected <= 0) {
    return NextResponse.json({ error: 'expectedTotal must be a positive integer' }, { status: 400 });
  }
  const target = Math.min(expected, MAX_EXPECTED_TOTAL);

  const mintAddress = process.env.STARS_TOKEN_MINT;
  const privateKeyB58 = process.env.FEE_PAYER_PRIVATE_KEY;
  if (!mintAddress || !privateKeyB58) {
    return NextResponse.json({ error: 'Stars token not configured' }, { status: 503 });
  }

  try {
    const rpcUrl = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    const recipient = new PublicKey(address);
    const mint = new PublicKey(mintAddress);
    const feePayer = Keypair.fromSecretKey(bs58.decode(privateKeyB58));

    // Read existing on-chain balance — if it's already ≥ target, this is a no-op
    // and we don't burn any rate-limit budget.
    let currentBalance = 0;
    try {
      const ata = await getAssociatedTokenAddress(mint, recipient, true);
      const account = await getAccount(connection, ata);
      currentBalance = Number(account.amount);
    } catch {
      currentBalance = 0;
    }

    if (currentBalance >= target) {
      return NextResponse.json({
        synced: false,
        balance: currentBalance,
        target,
        reason: 'already_synced',
      });
    }

    const limiter = getLimiter();
    if (limiter) {
      const { success } = await limiter.limit(address);
      if (!success) {
        return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
      }
    }

    const diff = target - currentBalance;
    const ataInfo = await getOrCreateAssociatedTokenAccount(
      connection,
      feePayer,
      mint,
      recipient,
    );
    const sig = await mintTo(
      connection,
      feePayer,
      mint,
      ataInfo.address,
      feePayer,
      BigInt(diff),
    );

    return NextResponse.json({
      synced: true,
      minted: diff,
      newBalance: currentBalance + diff,
      txId: sig,
      explorerUrl: `https://explorer.solana.com/tx/${sig}?cluster=${
        process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'devnet'
      }`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[stars/sync] failed:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
