import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60; // Solana token mint can take 15-30s
import { awardStarsRateLimit, awardStarsDailyLimit, checkRateLimit } from '@/lib/rate-limit';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import { STARS_TOKEN_PROGRAM_ID, getStarsMintAuthority } from '@/lib/stars';
import bs58 from 'bs58';
import { getDb } from '@/lib/db';
import { observationLog } from '@/lib/schema';
import { and, eq, gte, like, count } from 'drizzle-orm';
import { verifyPrivy, assertOwnsWallet } from '@/lib/api-auth';
import { isAllowedAwardReason, maxAwardAmountForReason } from '@/lib/award-stars-policy';
import { remainingStarsAllowance } from '@/lib/stars-cap';
import { paused } from '@/lib/kill-switch';
import { networkMisconfig } from '@/lib/network-guard';
import { scoreQuiz, MAX_QUIZ_REWARDS_PER_WEEK } from '@/lib/quizzes';
import { streakFromDates, DAILY_CHECKIN_BASE_REWARD } from '@/lib/daily-checkin';
import { getTierForStreak } from '@/lib/constellation-streak';
import { verifyObservationTokenForWallet } from '@/lib/observation-token';
import { rollCosmicBonus } from '@/lib/cosmic-bonus';
import { getActiveChallenge } from '@/lib/celestial-challenges';
import { targetAltitude } from '@/lib/sky/target-visibility';
import type { NftRarity } from '@/lib/nft-rarity';

// Map an observation's verified confidence to a cosmic-bonus rarity tier. The
// roll is then server-decided (seeded by the signed token), never client-sent.
function rarityFromConfidence(confidence: string): NftRarity {
  if (confidence === 'high') return 'Astral';
  if (confidence === 'medium') return 'Stellar';
  return 'Common';
}

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

  let body: { recipientAddress?: unknown; amount?: unknown; reason?: unknown; idempotencyKey?: unknown; answers?: unknown; verificationToken?: unknown; lat?: unknown; lon?: unknown };
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

  // ── Server-authoritative amount ────────────────────────────────────────────
  // Activity rewards (quiz / find / daily_checkin) are computed from server-held
  // data, never the client number — closing the "free Stars" claim. Observation-
  // triggered rewards (cosmic_bonus, weekly_challenge) and telescope:first-
  // registration still pass the client amount through the policy cap; those are
  // locked down server-side in Stage 2.
  let amount: number;
  if (reasonStr.startsWith('quiz:')) {
    const picks = Array.isArray(body.answers) ? (body.answers as unknown[]) : null;
    if (!picks) {
      return NextResponse.json({ error: 'answers required for quiz reward' }, { status: 400 });
    }
    const scored = scoreQuiz(reasonStr.slice('quiz:'.length), picks as number[]);
    if (!scored) {
      return NextResponse.json({ error: 'invalid quiz or answers' }, { status: 400 });
    }
    amount = scored.stars;
  } else if (reasonStr.startsWith('find:')) {
    // Proof-of-find: re-derive the target's altitude server-side and only award
    // when it is actually above the horizon at the user's coordinates. Closes the
    // "POST find:anything for free Stars" hole — the client can no longer claim a
    // find for an object that isn't up (or a bogus id).
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
    amount = 10;
  } else if (reasonStr === 'daily_checkin') {
    const today = new Date().toISOString().split('T')[0];
    let streak = 1;
    if (db) {
      const rows = await db
        .select({ d: observationLog.observedDate })
        .from(observationLog)
        .where(and(eq(observationLog.wallet, recipient), eq(observationLog.target, 'daily_checkin')));
      const dates = rows.map((r) => r.d).filter((d): d is string => typeof d === 'string');
      streak = streakFromDates([...dates, today], today);
    }
    amount = Math.round(DAILY_CHECKIN_BASE_REWARD * getTierForStreak(streak).multiplier);
  } else if (reasonStr.startsWith('cosmic_bonus:') || reasonStr === 'weekly_challenge') {
    // Observation-triggered rewards: require the signed observation token so they
    // can't be claimed without a real verified observation. The server decides
    // the amount — the client never supplies it.
    const tok = verifyObservationTokenForWallet(
      typeof body.verificationToken === 'string' ? body.verificationToken : null,
      recipient,
    );
    if (!tok.ok) {
      if (tok.status === 503) {
        return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
      }
      return NextResponse.json({ error: 'Observation proof required' }, { status: 403 });
    }
    if (reasonStr.startsWith('cosmic_bonus:')) {
      // Deterministic server roll seeded by the signed observation (fileHash) +
      // wallet + day + target — same observation always yields the same result,
      // so a retry can't fish for a better roll.
      const rarity = rarityFromConfidence(tok.payload.confidence);
      const targetId = reasonStr.slice('cosmic_bonus:'.length);
      const roll = rollCosmicBonus(rarity, tok.payload.fileHash, privyId, targetId);
      amount = roll.triggered ? roll.amount : 0;
    } else {
      // weekly_challenge: token proves a real observation; cap to the active
      // challenge's true bonus so the amount can't be inflated. (Full ledger-
      // derived completion is a follow-up.)
      amount = getActiveChallenge().bonusStars;
    }
  } else {
    const clientAmount = body.amount;
    if (typeof clientAmount !== 'number' || !Number.isInteger(clientAmount) || clientAmount < 1 || clientAmount > 500) {
      return NextResponse.json({ error: 'amount must be an integer between 1 and 500' }, { status: 400 });
    }
    const reasonMax = maxAwardAmountForReason(reasonStr);
    if (clientAmount > reasonMax) {
      return NextResponse.json(
        { error: `amount exceeds maximum (${reasonMax}) for this reason` },
        { status: 400 },
      );
    }
    amount = clientAmount;
  }

  // Server determined no Stars are owed (failed quiz, no-pick timeout) — succeed
  // without minting so the client UI settles cleanly.
  if (amount <= 0) {
    return NextResponse.json({ success: true, txId: null, awarded: 0 });
  }

  // Weekly quiz budget: Stars from at most MAX_QUIZ_REWARDS_PER_WEEK quiz
  // completions per wallet in any trailing 7-day window. The per-quiz-per-day
  // limit is already enforced by the (wallet, target, observed_date) unique
  // index on the claim insert below.
  if (reasonStr.startsWith('quiz:') && db) {
    const weekAgo = new Date(Date.now() - 7 * 86_400_000);
    const rows = await db
      .select({ c: count() })
      .from(observationLog)
      .where(and(
        eq(observationLog.wallet, recipient),
        like(observationLog.target, 'quiz:%'),
        gte(observationLog.createdAt, weekAgo),
      ));
    if (Number(rows[0]?.c ?? 0) >= MAX_QUIZ_REWARDS_PER_WEEK) {
      return NextResponse.json({ success: true, txId: null, awarded: 0, capped: 'weekly_quiz_limit' });
    }
  }

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
  // idempotencyKey). On a confirmed mint it flips to 'minted'; on a FAILED mint
  // it is released (in the catch below) so a genuine retry can re-mint — a
  // failed mint never leaves a silent "already awarded" with no Stars.
  const todayStr = new Date().toISOString().split('T')[0];
  // Activity rewards use a server-derived slot key — a crafted client key can't
  // dodge the once-per-day dedup. Other reasons keep the client's key (it is
  // scoped by tx/challenge ids the server can't derive here).
  const idemKey =
    reasonStr.startsWith('quiz:') ? `${reasonStr}:${recipient}:${todayStr}`
    : reasonStr === 'daily_checkin' ? `checkin:${recipient}:${todayStr}`
    : idempotencyKey;
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
      if ((err as { code?: string })?.code !== '23505') {
        // Non-uniqueness DB error — proceed without the idempotency guarantee.
      } else {
        // A row already blocks the insert. If it is THIS idempotency key stalled
        // in 'pending' (a crashed/timed-out prior attempt > 2 min old), reclaim
        // it; otherwise it is a genuine duplicate (already minted, in-flight, or
        // the same reason already awarded today) → return cached.
        const existing = await db
          .select({ id: observationLog.id, confidence: observationLog.confidence, createdAt: observationLog.createdAt })
          .from(observationLog)
          .where(and(eq(observationLog.wallet, recipient), eq(observationLog.mintTx, idemKey)))
          .limit(1);
        const row = existing[0];
        const stale = !!row && row.confidence === 'pending' && !!row.createdAt && row.createdAt.getTime() < Date.now() - 120_000;
        if (stale && row) {
          await db.delete(observationLog).where(eq(observationLog.id, row.id));
          try { await claim(); claimed = true; }
          catch { return NextResponse.json({ success: true, txId: 'already_awarded', cached: true }); }
        } else {
          return NextResponse.json({ success: true, txId: 'already_awarded', cached: true });
        }
      }
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
    // Release the claimed slot so a retry can re-mint — never strand the award.
    if (db && claimed) {
      try {
        await db.delete(observationLog)
          .where(and(eq(observationLog.wallet, recipient), eq(observationLog.mintTx, idemKey)));
      } catch { /* best-effort slot release */ }
    }
    return NextResponse.json({ error: 'Failed to award Stars' }, { status: 500 });
  }
}
