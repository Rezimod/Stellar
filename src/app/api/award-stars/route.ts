import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60; // Solana devnet token mint can take 15-30s
import { awardStarsRateLimit, awardStarsDailyLimit, checkRateLimit } from '@/lib/rate-limit';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import { STARS_TOKEN_PROGRAM_ID, getStarsMintAuthority } from '@/lib/stars';
import bs58 from 'bs58';
import { getDb } from '@/lib/db';
import { observationLog } from '@/lib/schema';
import { and, eq } from 'drizzle-orm';
import { verifyPrivy, assertOwnsWallet } from '@/lib/api-auth';
import { isAllowedAwardReason, maxAwardAmountForReason } from '@/lib/award-stars-policy';
import { paused } from '@/lib/kill-switch';

const DEVNET_URL = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';

export async function POST(req: NextRequest) {
  const p = paused();
  if (p) return p;
  const privyId = await verifyPrivy(req);
  if (!privyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  const owns = await assertOwnsWallet(privyId, recipientAddress as string);
  if (!owns) {
    return NextResponse.json({ error: 'Wallet does not match session' }, { status: 403 });
  }

  const { success, remaining } = await checkRateLimit(awardStarsRateLimit, recipientAddress as string);
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before trying again.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': String(remaining) } }
    );
  }
  // Daily ceiling per wallet — bounds Stars issuance independently of the
  // per-hour limit so a single wallet cannot drain the program over a 24h window.
  const daily = await checkRateLimit(awardStarsDailyLimit, recipientAddress as string);
  if (!daily.success) {
    return NextResponse.json(
      { error: 'Daily Stars limit reached for this wallet. Come back tomorrow.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': String(daily.remaining), 'X-RateLimit-Window': 'daily' } }
    );
  }

  // Validate amount. 500 is the cap that covers every legitimate mission
  // payout in MISSIONS / STAR_PAYOUT_BY_TIER (max 250 base × 2 event bonus).
  if (
    typeof amount !== 'number' ||
    !Number.isInteger(amount) ||
    amount < 1 ||
    amount > 500
  ) {
    return NextResponse.json({ error: 'amount must be an integer between 1 and 500' }, { status: 400 });
  }

  // Validate reason
  if (typeof reason !== 'string' || reason.trim().length === 0) {
    return NextResponse.json({ error: 'reason must be a non-empty string' }, { status: 400 });
  }
  const reasonStr = (reason as string).trim();
  if (!isAllowedAwardReason(reasonStr)) {
    return NextResponse.json({ error: 'reason not allowed' }, { status: 400 });
  }
  const reasonMax = maxAwardAmountForReason(reasonStr);
  if (typeof amount === 'number' && amount > reasonMax) {
    return NextResponse.json(
      { error: `amount exceeds maximum (${reasonMax}) for this reason` },
      { status: 400 },
    );
  }

  // Idempotency key is required — every legitimate client sends one.
  if (typeof idempotencyKey !== 'string' || idempotencyKey.length === 0) {
    return NextResponse.json({ error: 'idempotencyKey is required' }, { status: 400 });
  }

  // Idempotency: claim slot BEFORE the Solana TX to prevent concurrent double-mints
  if (typeof idempotencyKey === 'string' && idempotencyKey.length > 0) {
    const db = getDb();
    if (db) {
      try {
        await db.insert(observationLog).values({
          wallet: recipientAddress as string,
          target: reasonStr,
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
    const mintAuthority = getStarsMintAuthority();
    const mintPublicKey = new PublicKey(mintAddress);
    const connection = new Connection(DEVNET_URL, 'confirmed');

    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      feePayerKeypair,
      mintPublicKey,
      recipientPublicKey,
      false,
      'confirmed',
      undefined,
      STARS_TOKEN_PROGRAM_ID,
    );

    console.log('[award-stars] Awarding', amount, 'stars to:', (recipientAddress as string).slice(0, 8) + '...', 'reason:', reason);
    const signature = await mintTo(
      connection,
      feePayerKeypair,
      mintPublicKey,
      ata.address,
      mintAuthority,
      BigInt(amount),
      [],
      undefined,
      STARS_TOKEN_PROGRAM_ID,
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
