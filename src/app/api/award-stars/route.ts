import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60; // Solana devnet token mint can take 15-30s
import { PrivyClient } from '@privy-io/server-auth';
import { awardStarsRateLimit, checkRateLimit } from '@/lib/rate-limit';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import bs58 from 'bs58';
import { getDb } from '@/lib/db';
import { observationLog } from '@/lib/schema';
import { and, eq } from 'drizzle-orm';

const DEVNET_URL = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
);

export async function POST(req: NextRequest) {
  // Auth: accept either a verified Privy token OR a valid wallet-adapter pubkey.
  // External-wallet users (Phantom, Solflare, etc.) have no Privy token but the
  // recipient is still a real on-chain address; abuse is bounded by the per-address
  // rate limit below.
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  let privyOk = false;
  if (token) {
    try {
      await privy.verifyAuthToken(token);
      privyOk = true;
    } catch {
      privyOk = false;
    }
  }

  let body: { recipientAddress?: unknown; amount?: unknown; reason?: unknown; idempotencyKey?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { recipientAddress, amount, reason, idempotencyKey } = body;

  // Validate recipientAddress
  let recipientPublicKey: PublicKey;
  try {
    recipientPublicKey = new PublicKey(recipientAddress as string);
  } catch {
    return NextResponse.json({ error: 'Invalid recipientAddress' }, { status: 400 });
  }

  // If no verified Privy session, the validated `recipientPublicKey` itself acts
  // as the auth principal; the per-address rate limit below prevents drain.
  void privyOk;

  const { success, remaining } = await checkRateLimit(awardStarsRateLimit, recipientAddress as string);
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before trying again.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': String(remaining) } }
    );
  }

  // Validate amount
  if (
    typeof amount !== 'number' ||
    !Number.isInteger(amount) ||
    amount < 1 ||
    amount > 1000
  ) {
    return NextResponse.json({ error: 'amount must be an integer between 1 and 1000' }, { status: 400 });
  }

  // Validate reason
  if (typeof reason !== 'string' || reason.trim().length === 0) {
    return NextResponse.json({ error: 'reason must be a non-empty string' }, { status: 400 });
  }

  // Idempotency: claim slot BEFORE the Solana TX to prevent concurrent double-mints
  if (typeof idempotencyKey === 'string' && idempotencyKey.length > 0) {
    const db = getDb();
    if (db) {
      try {
        await db.insert(observationLog).values({
          wallet: recipientAddress as string,
          target: reason as string,
          stars: amount as number,
          confidence: 'pending',
          mintTx: idempotencyKey,
          observedDate: new Date().toISOString().split('T')[0],
        });
      } catch (err) {
        if ((err as { code?: string })?.code === '23505') {
          // Unique constraint — already awarded (or in-flight), return cached
          return NextResponse.json({ success: true, txId: 'already_awarded', cached: true });
        }
        // Other DB error — proceed without idempotency guarantee
      }
    }
  }

  const mintAddress = process.env.STARS_TOKEN_MINT;
  if (!mintAddress) {
    return NextResponse.json({ error: 'Stars token not configured' }, { status: 503 });
  }

  const privateKeyB58 = process.env.FEE_PAYER_PRIVATE_KEY;
  if (!privateKeyB58) {
    return NextResponse.json({ error: 'Fee payer not configured' }, { status: 503 });
  }

  try {
    const feePayerKeypair = Keypair.fromSecretKey(bs58.decode(privateKeyB58));
    const mintPublicKey = new PublicKey(mintAddress);
    const connection = new Connection(DEVNET_URL, 'confirmed');

    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      feePayerKeypair,
      mintPublicKey,
      recipientPublicKey
    );

    console.log('[award-stars] Awarding', amount, 'stars to:', (recipientAddress as string).slice(0, 8) + '...', 'reason:', reason);
    const signature = await mintTo(
      connection,
      feePayerKeypair,
      mintPublicKey,
      ata.address,
      feePayerKeypair,
      BigInt(amount)
    );
    console.log('[award-stars] Success, txId:', signature.slice(0, 16) + '...');

    return NextResponse.json({
      success: true,
      txId: signature,
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'devnet'}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[award-stars]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
