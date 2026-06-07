import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { observationLog } from '@/lib/schema'
import { and, eq, gte, sum, count, inArray } from 'drizzle-orm'
import { PublicKey } from '@solana/web3.js'
import { awardStarsOnChain, DAILY_STARS_CAP } from '@/lib/stars'
import { createHmac } from 'crypto'
import { verifyRateLimit, checkRateLimit } from '@/lib/rate-limit'
import { eventsForTarget } from '@/lib/astro-events'
import { EVENT_BONUS_MULTIPLIER } from '@/lib/constants'
import { verifyPrivy, assertOwnsWallet } from '@/lib/api-auth'
import { recordObservationOnChain } from '@/lib/observation-program'
import { tierForCount, applyReputationMultiplier } from '@/lib/reputation'
import { ensurePassport } from '@/lib/telescope-passport'

// On-chain attestation can add a few seconds of devnet confirmation latency.
export const maxDuration = 60

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((res) => setTimeout(() => res(null), ms))])
}

// Server-side stars calculation — mirrors REWARD_TABLE in observe/verify
const STARS_BY_CONFIDENCE: Record<string, { base: number; rare_bonus: number }> = {
  high:     { base: 50, rare_bonus: 30 },
  medium:   { base: 25, rare_bonus: 15 },
  low:      { base: 10, rare_bonus: 5 },
  rejected: { base: 0,  rare_bonus: 0 },
}
const RARE_OBJECTS = ['saturn', 'jupiter', 'mars', 'venus', 'mercury', 'deep_sky']

export async function POST(req: NextRequest) {
  const privyId = await verifyPrivy(req);
  // Rate-limit by wallet (parsed from body after validation below)
  // Initial coarse limit by IP to prevent unauthenticated spam
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
  const { success: ipOk } = await checkRateLimit(verifyRateLimit, `log:${ip}`);
  if (!ipOk) {
    return NextResponse.json({ logged: false, error: 'Too many requests' }, { status: 429 });
  }

  let body: {
    wallet?: string
    target?: string
    verificationToken?: string
    confidence?: string
    mintTx?: string | null
    lat?: number
    lon?: number
    identifiedObject?: string
    oracleHash?: string
    capturedAt?: string
    fileHash?: string
    uploadSource?: string
    deviceTier?: string
    deviceMake?: string | null
    deviceModel?: string | null
    exifLat?: number | null
    exifLon?: number | null
    exifTakenAt?: string | null
    isInternetSourced?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ logged: false })
  }

  const db = getDb()
  if (!db) {
    return NextResponse.json({ logged: false })
  }

  // Validate wallet
  let wallet: string;
  try {
    wallet = new PublicKey(body.wallet ?? '').toString();
  } catch {
    return NextResponse.json({ logged: false });
  }

  // Validate confidence
  const VALID_CONFIDENCE = ['high', 'medium', 'low', 'rejected'] as const;
  const confidence = VALID_CONFIDENCE.includes(body.confidence as typeof VALID_CONFIDENCE[number])
    ? (body.confidence as string)
    : 'unknown';

  // If authenticated, enforce the submitted wallet is linked to this session.
  if (privyId) {
    const owns = await assertOwnsWallet(privyId, wallet);
    if (!owns) {
      return NextResponse.json({ logged: false, reason: 'Wallet does not match session' }, { status: 403 });
    }
  }

  // Verify token for non-rejected observations (prevents clients from claiming arbitrary confidence)
  if (confidence !== 'rejected') {
    const token = body.verificationToken;
    if (!token) {
      return NextResponse.json({ logged: false, reason: 'Missing verification token' }, { status: 401 });
    }
    const capturedAt = body.capturedAt ?? '';
    const expectedTokenDataV2 = [
      body.identifiedObject ?? body.target ?? '',
      confidence,
      capturedAt,
      body.fileHash ?? '',
      body.deviceTier ?? '',
      body.deviceMake ?? '',
      body.deviceModel ?? '',
      body.isInternetSourced ? '1' : '0',
      wallet,
    ].join(':');
    const expectedTokenDataLegacy = [
      body.identifiedObject ?? body.target ?? '',
      confidence,
      capturedAt,
      body.fileHash ?? '',
      body.deviceTier ?? '',
      body.deviceMake ?? '',
      body.deviceModel ?? '',
      body.isInternetSourced ? '1' : '0',
    ].join(':');
    const tokenSecret = process.env.OBSERVATION_TOKEN_SECRET || process.env.ANTHROPIC_API_KEY || '';
    if (!tokenSecret) {
      return NextResponse.json({ logged: false, reason: 'Server misconfigured' }, { status: 503 });
    }
    const expectedTokenV2 = createHmac('sha256', tokenSecret)
      .update(expectedTokenDataV2)
      .digest('hex');
    // Legacy tokens omitted wallet binding — disabled by default.
    // Set ALLOW_LEGACY_OBSERVE_TOKEN=true only for rollback.
    const allowLegacy = process.env.ALLOW_LEGACY_OBSERVE_TOKEN === 'true';
    const expectedTokenLegacy = createHmac('sha256', tokenSecret)
      .update(expectedTokenDataLegacy)
      .digest('hex');
    if (token !== expectedTokenV2 && (!allowLegacy || token !== expectedTokenLegacy)) {
      return NextResponse.json({ logged: false, reason: 'Invalid verification token' }, { status: 401 });
    }
  }

  // Calculate stars server-side from confidence (never trust client-provided stars)
  const target = body.target ?? '';
  const identifiedForRare = (body.identifiedObject ?? target).toLowerCase();
  const isRare = RARE_OBJECTS.some(r => identifiedForRare.includes(r));
  const reward = STARS_BY_CONFIDENCE[confidence] ?? { base: 0, rare_bonus: 0 };
  const baseStars = reward.base + (isRare ? reward.rare_bonus : 0);

  // Event-window 2x bonus: when the observation timestamp is within ±24h of
  // an AstroEvent matching this target, double the Stars award.
  const capturedAtForEvents =
    typeof body.capturedAt === 'string' && !isNaN(new Date(body.capturedAt).getTime())
      ? new Date(body.capturedAt)
      : new Date();
  const matchedEvents = eventsForTarget(identifiedForRare || target, capturedAtForEvents);
  const eventBonusApplied = baseStars > 0 && matchedEvents.length > 0;
  const stars = eventBonusApplied ? baseStars * EVENT_BONUS_MULTIPLIER : baseStars;
  if (eventBonusApplied) {
    console.log('[observe/log] 2x event bonus', {
      target: identifiedForRare || target,
      baseStars,
      bonus: EVENT_BONUS_MULTIPLIER,
      eventName: matchedEvents[0]?.name,
    });
  }

  try {
    // Idempotency: reject duplicate submissions within 60s
    const sixtySecondsAgo = new Date(Date.now() - 60_000)
    const existing = await db
      .select({ id: observationLog.id })
      .from(observationLog)
      .where(
        and(
          eq(observationLog.wallet, wallet),
          eq(observationLog.target, target),
          gte(observationLog.createdAt, sixtySecondsAgo)
        )
      )
      .limit(1)
    if (existing.length > 0) {
      return NextResponse.json({ logged: true, starsAwarded: 0, duplicate: true })
    }

    // Rate limit: check total stars awarded to this wallet today
    let todayStars = 0
    if (wallet) {
      const startOfDay = new Date()
      startOfDay.setUTCHours(0, 0, 0, 0)
      const rows = await db
        .select({ total: sum(observationLog.stars) })
        .from(observationLog)
        .where(
          and(
            eq(observationLog.wallet, wallet),
            gte(observationLog.createdAt, startOfDay)
          )
        )

      todayStars = Number(rows[0]?.total ?? 0)
    }

    // Reputation multiplier — based on the observer's standing BEFORE this
    // observation (count of prior accepted observations). The on-chain
    // ObserverProfile is the canonical mirror; the DB count is the fast path.
    let priorAccepted = 0
    if (wallet) {
      const acc = await db
        .select({ c: count() })
        .from(observationLog)
        .where(
          and(
            eq(observationLog.wallet, wallet),
            inArray(observationLog.confidence, ['high', 'medium', 'low']),
          ),
        )
      priorAccepted = Number(acc[0]?.c ?? 0)
    }
    const standing = tierForCount(priorAccepted)
    const reputationStars = applyReputationMultiplier(stars, priorAccepted)

    // Per-object cooldown: user can only submit same target once per 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSameTarget = await db
      .select({ id: observationLog.id })
      .from(observationLog)
      .where(
        and(
          eq(observationLog.wallet, wallet),
          eq(observationLog.target, target),
          gte(observationLog.createdAt, oneDayAgo)
        )
      )
      .limit(1);

    if (recentSameTarget.length > 0) {
      return NextResponse.json(
        { logged: false, reason: 'You already observed this target today. Come back tomorrow for a new observation!' },
        { status: 200 }
      );
    }

    const starsToAward = todayStars + reputationStars > DAILY_STARS_CAP
      ? Math.max(DAILY_STARS_CAP - todayStars, 0)
      : reputationStars

    // Proof-of-Observation: record the verified attestation on-chain (oracle-
    // signed, gasless). Best-effort with a timeout — an RPC hiccup never blocks
    // the Stars/DB path; on failure chain_tx/chain_pda stay null and can be
    // backfilled from observation_log later.
    let chain: { txId: string; pda: string } | null = null;
    if (wallet && confidence !== 'rejected' && typeof body.fileHash === 'string' && body.fileHash) {
      chain = await withTimeout(
        recordObservationOnChain({
          observer: wallet,
          fileHash: body.fileHash,
          target,
          identifiedObject: body.identifiedObject ?? target,
          confidence,
          lat: typeof body.lat === 'number' ? body.lat : 0,
          lon: typeof body.lon === 'number' ? body.lon : 0,
          observedAtMs: capturedAtForEvents.getTime(),
          oracleHash: body.oracleHash ?? '',
          cloudCover: 0,
          stars: starsToAward,
        }).catch((err) => {
          console.error('[observe/log] on-chain record failed:', err);
          return null;
        }),
        25_000,
      );
    }

    const exifTakenDate = typeof body.exifTakenAt === 'string' ? new Date(body.exifTakenAt) : null;
    await db.insert(observationLog).values({
      wallet,
      target,
      stars: starsToAward,
      confidence,
      mintTx: body.mintTx ?? null,
      lat: typeof body.lat === 'number' ? body.lat : null,
      lon: typeof body.lon === 'number' ? body.lon : null,
      identifiedObject: body.identifiedObject ?? target ?? null,
      starsAwarded: starsToAward,
      oracleHash: body.oracleHash ?? null,
      observedDate: new Date().toISOString().split('T')[0],
      fileHash: typeof body.fileHash === 'string' ? body.fileHash : null,
      uploadSource: typeof body.uploadSource === 'string' ? body.uploadSource : null,
      deviceTier: typeof body.deviceTier === 'string' ? body.deviceTier : null,
      deviceMake: typeof body.deviceMake === 'string' ? body.deviceMake : null,
      deviceModel: typeof body.deviceModel === 'string' ? body.deviceModel : null,
      exifLat: typeof body.exifLat === 'number' && isFinite(body.exifLat) ? body.exifLat : null,
      exifLon: typeof body.exifLon === 'number' && isFinite(body.exifLon) ? body.exifLon : null,
      exifTakenAt: exifTakenDate && !isNaN(exifTakenDate.getTime()) ? exifTakenDate : null,
      isInternetSourced: body.isInternetSourced === true,
      chainTx: chain?.txId ?? null,
      chainPda: chain?.pda ?? null,
    })

    // Award tokens on-chain (non-blocking — log still succeeds even if this fails)
    if (wallet && starsToAward > 0) {
      awardStarsOnChain(wallet, starsToAward, `observation: ${target}`).catch(err =>
        console.error('[observe/log] Star award failed:', err)
      )
    }

    // Soulbound Telescope Passport: mint/refresh only when this observation
    // crosses a reputation-tier boundary (count goes priorAccepted → +1). Keeps
    // it to one chain op per tier-up; best-effort, never blocks the response.
    const newStanding = tierForCount(priorAccepted + 1)
    if (
      wallet &&
      confidence !== 'rejected' &&
      newStanding.hasPassport &&
      newStanding.tierIndex !== standing.tierIndex
    ) {
      await withTimeout(
        ensurePassport(wallet, priorAccepted + 1).catch((err) => {
          console.error('[observe/log] passport ensure failed:', err)
          return null
        }),
        25_000,
      )
    }

    return NextResponse.json({
      logged: true,
      starsAwarded: starsToAward,
      starsMinted: true,
      chainTx: chain?.txId ?? null,
      chainPda: chain?.pda ?? null,
      reputation: {
        tier: standing.tier.key,
        tierName: standing.tier.name,
        multiplier: standing.multiplier,
      },
    })
  } catch (err) {
    console.error('[observe/log]', err)
    return NextResponse.json({ logged: false, error: 'An unexpected error occurred' }, { status: 500 })
  }
}
