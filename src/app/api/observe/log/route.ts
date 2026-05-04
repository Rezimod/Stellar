import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { observationLog } from '@/lib/schema'
import { and, eq, gte, sum } from 'drizzle-orm'
import { PublicKey } from '@solana/web3.js'
import { awardStarsOnChain, DAILY_STARS_CAP } from '@/lib/stars'
import { createHmac } from 'crypto'
import { verifyRateLimit, checkRateLimit } from '@/lib/rate-limit'

// Server-side stars calculation — mirrors REWARD_TABLE in observe/verify
const STARS_BY_CONFIDENCE: Record<string, { base: number; rare_bonus: number }> = {
  high:     { base: 50, rare_bonus: 30 },
  medium:   { base: 25, rare_bonus: 15 },
  low:      { base: 10, rare_bonus: 5 },
  rejected: { base: 0,  rare_bonus: 0 },
}
const RARE_OBJECTS = ['saturn', 'jupiter', 'mars', 'venus', 'mercury', 'deep_sky']

export async function POST(req: NextRequest) {
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

  // Verify token for non-rejected observations (prevents clients from claiming arbitrary confidence)
  if (confidence !== 'rejected') {
    const token = body.verificationToken;
    if (!token) {
      return NextResponse.json({ logged: false, reason: 'Missing verification token' }, { status: 401 });
    }
    const capturedAt = body.capturedAt ?? '';
    const expectedTokenData = [
      body.identifiedObject ?? body.target ?? '',
      confidence,
      capturedAt,
      body.fileHash ?? '',
      body.deviceTier ?? '',
      body.deviceMake ?? '',
      body.deviceModel ?? '',
      body.isInternetSourced ? '1' : '0',
    ].join(':');
    const expectedToken = createHmac('sha256', process.env.ANTHROPIC_API_KEY ?? '')
      .update(expectedTokenData)
      .digest('hex');
    if (token !== expectedToken) {
      return NextResponse.json({ logged: false, reason: 'Invalid verification token' }, { status: 401 });
    }
  }

  // Calculate stars server-side from confidence (never trust client-provided stars)
  const target = body.target ?? '';
  const identifiedForRare = (body.identifiedObject ?? target).toLowerCase();
  const isRare = RARE_OBJECTS.some(r => identifiedForRare.includes(r));
  const reward = STARS_BY_CONFIDENCE[confidence] ?? { base: 0, rare_bonus: 0 };
  const stars = reward.base + (isRare ? reward.rare_bonus : 0);

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

    const starsToAward = todayStars + stars > DAILY_STARS_CAP
      ? Math.max(DAILY_STARS_CAP - todayStars, 0)
      : stars

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
    })

    // Award tokens on-chain (non-blocking — log still succeeds even if this fails)
    if (wallet && starsToAward > 0) {
      awardStarsOnChain(wallet, starsToAward, `observation: ${target}`).catch(err =>
        console.error('[observe/log] Star award failed:', err)
      )
    }

    return NextResponse.json({ logged: true, starsAwarded: starsToAward, starsMinted: true })
  } catch (err) {
    console.error('[observe/log]', err)
    return NextResponse.json({ logged: false, error: 'An unexpected error occurred' }, { status: 500 })
  }
}
