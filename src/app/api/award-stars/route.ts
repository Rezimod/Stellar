import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60; // Solana token mint can take 15-30s
import { awardStarsRateLimit, awardStarsDailyLimit, checkRateLimit } from '@/lib/rate-limit';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import { STARS_TOKEN_PROGRAM_ID, getStarsMintAuthority } from '@/lib/stars';
import bs58 from 'bs58';
import { getDb } from '@/lib/db';
import { observationLog } from '@/lib/schema';
import { and, eq, or } from 'drizzle-orm';
import { verifyPrivy, assertOwnsWallet } from '@/lib/api-auth';
import { isAllowedAwardReason } from '@/lib/award-stars-policy';
import { remainingStarsAllowance } from '@/lib/stars-cap';
import { paused } from '@/lib/kill-switch';
import { networkMisconfig } from '@/lib/network-guard';
import { targetAltitude } from '@/lib/sky/target-visibility';

const RPC_URL = process.env.SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com';

export async function POST(req: NextRequest) {
  const p = paused();
  if (p) return p;
  const n = networkMisconfig();
  if (n) return n;
  const privyId = await verifyPrivy(req);
  if (!privyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { recipientAddress?: unknown; reason?: unknown; idempotencyKey?: unknown; lat?: unknown; lon?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { recipientAddress, reason, idempotencyKey } = body;
  const recipient = recipientAddress as string;

  // Validate recipientAddress
  let recipientPublicKey: PublicKey;
  try {
    recipientPublicKey = new PublicKey(recipient);
  } catch {
    return NextResponse.json({ error: 'Invalid recipientAddress' }, { status: 400 });
  }

  const owns = await assertOwnsWallet(privyId, recipient);
  if (!owns) {
    return NextResponse.json({ error: 'Wallet does not match session' }, { status: 403 });
  }

  const { success, remaining } = await checkRateLimit(awardStarsRateLimit, recipient);
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before trying again.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': String(remaining) } }
    );
  }
  // Daily ceiling per wallet — bounds Stars issuance independently of the
  // per-hour limit so a single wallet cannot drain the program over a 24h window.
  const daily = await checkRateLimit(awardStarsDailyLimit, recipient);
  if (!daily.success) {
    return NextResponse.json(
      { error: 'Daily Stars limit reached for this wallet. Come back tomorrow.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': String(daily.remaining), 'X-RateLimit-Window': 'daily' } }
    );
  }

  // Validate reason
  if (typeof reason !== 'string' || reason.trim().length === 0) {
    return NextResponse.json({ error: 'reason must be a non-empty string' }, { status: 400 });
  }
  const reasonStr = (reason as string).trim();
  if (!isAllowedAwardReason(reasonStr)) {
    return NextResponse.json({ error: 'reason not allowed' }, { status: 400 });
  }

  // Idempotency key is required — every legitimate client sends one.
  if (typeof idempotencyKey !== 'string' || idempotencyKey.length === 0) {
    return NextResponse.json({ error: 'idempotencyKey is required' }, { status: 400 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: 'Rewards are temporarily unavailable' }, { status: 503 });
  }

  // Proof-of-find, the only remaining award: re-derive the target's altitude
  // server-side and only award when it is actually above the horizon at the
  // user's coordinates.
  const targetId = reasonStr.slice('find:'.length);
  const lat = typeof body.lat === 'number' ? body.lat : NaN;
  const lon = typeof body.lon === 'number' ? body.lon : NaN;
  if (!isFinite(lat) || !isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: 'lat and lon required for find reward' }, { status: 400 });
  }
  const altitude = targetAltitude(targetId, lat, lon, new Date());
  if (altitude === null) {
    return NextResponse.json({ error: 'unknown find target' }, { status: 400 });
  }
  if (altitude <= 0) {
    // Target isn't above the horizon now — no genuine find, succeed with 0 so
    // the client UI settles without minting.
    return NextResponse.json({ success: true, txId: null, awarded: 0, reason: 'not_visible' });
  }
  let amount = 10;

  // Unified issuance cap: clamp to what this wallet may still earn under the
  // shared daily + trailing-30-day monthly caps (same ledger as observations).
  // This is what enforces the multi-month curve to a Stars-only telescope. A
  // retry of an already-credited award may see the prior row counted and clamp
  // to 0 — safe (Stars were already delivered), never over-issues.
  if (db) {
    const remaining = await remainingStarsAllowance(db, recipient);
    amount = Math.min(amount, remaining);
    if (amount <= 0) {
      return NextResponse.json({ success: true, txId: null, awarded: 0, capped: true });
    }
  }

  // Resolve config BEFORE claiming an idempotency slot — a 503 here must not
  // leave a dangling 'pending' row that blocks later retries.
  const mintAddress = process.env.STARS_TOKEN_MINT;
  if (!mintAddress) {
    return NextResponse.json({ error: 'Stars token not configured' }, { status: 503 });
  }

  const privateKeyB58 = process.env.FEE_PAYER_PRIVATE_KEY;
  if (!privateKeyB58) {
    return NextResponse.json({ error: 'Fee payer not configured' }, { status: 503 });
  }

  // Idempotency: claim a slot BEFORE the mint so concurrent retries can't
  // double-mint. The slot is a 'pending' ledger row keyed by (wallet, mintTx =
  // idempotencyKey). Confirmed mints flip to 'minted'; uncertain outcomes stay
  // pending until reconciled, so a retry cannot issue the same reward twice.
  const todayStr = new Date().toISOString().split('T')[0];
  const idemKey = idempotencyKey;
  let claimed = false;
  if (db) {
    const claim = () => db.insert(observationLog).values({
      wallet: recipient, target: reasonStr, stars: amount,
      confidence: 'pending', mintTx: idemKey, observedDate: todayStr,
    });
    try {
      await claim();
      claimed = true;
    } catch (err) {
      const cause = (err as { cause?: { code?: string } })?.cause;
      if ((err as { code?: string })?.code !== '23505' && cause?.code !== '23505') {
        console.error('[award-stars] cannot record reward claim', err);
        return NextResponse.json({ error: 'Rewards are temporarily unavailable' }, { status: 503 });
      }
      // A timeout is not proof of a failed mint. Retain the claim until its
      // on-chain outcome is reconciled, even when it is old.
      const existing = await db
        .select({ confidence: observationLog.confidence })
        .from(observationLog)
        .where(and(
          eq(observationLog.wallet, recipient),
          or(
            eq(observationLog.mintTx, idemKey),
            and(eq(observationLog.target, reasonStr), eq(observationLog.observedDate, todayStr)),
          ),
        ))
        .limit(1);
      if (existing[0]?.confidence === 'minted') {
        return NextResponse.json({ success: true, txId: 'already_awarded', cached: true });
      }
      return NextResponse.json({ error: 'Reward confirmation is pending', pending: true }, { status: 503 });
    }
  }

  try {
    const feePayerKeypair = Keypair.fromSecretKey(bs58.decode(privateKeyB58));
    const mintAuthority = getStarsMintAuthority();
    const mintPublicKey = new PublicKey(mintAddress);
    const connection = new Connection(RPC_URL, 'confirmed');

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

    console.log('[award-stars] Awarding', amount, 'stars to:', recipient.slice(0, 8) + '...', 'reason:', reason);
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

    // Confirm the slot: flip 'pending' → 'minted' now that Stars are on-chain.
    if (db && claimed) {
      try {
        await db.update(observationLog)
          .set({ confidence: 'minted' })
          .where(and(eq(observationLog.wallet, recipient), eq(observationLog.mintTx, idemKey)));
      } catch { /* non-fatal — the row already serves idempotency */ }
    }

    return NextResponse.json({
      success: true,
      txId: signature,
      awarded: amount,
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'mainnet-beta'}`,
    });
  } catch (err) {
    console.error('[award-stars]', err);
    return NextResponse.json({ error: 'Reward confirmation is pending', pending: true }, { status: 503 });
  }
}
