import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { verifyRateLimit, verifyDailyLimit, checkRateLimit } from '@/lib/rate-limit';
import { geminiVisionJSON, type GeminiImage } from '@/lib/gemini-vision';
import type { PhotoVerificationResult, ObservationTarget, VerificationConfidence } from '@/lib/types';
import { checkObjectVisibility } from '@/lib/astronomy-check';
import { extractExif } from '@/lib/exif';
import { findDuplicateByHash } from '@/lib/observations-dedup';
import { checkReverseImage } from '@/lib/reverse-image';
import { classifyDevice, type DeviceTier } from '@/lib/device-tier';
import { getDb } from '@/lib/db';
import { observationLog } from '@/lib/schema';
import { eventsForTarget } from '@/lib/astro-events';
import { EVENT_BONUS_MULTIPLIER } from '@/lib/constants';
import { createObservationToken } from '@/lib/observation-token';
import { verifyPrivy } from '@/lib/api-auth';
import { paused } from '@/lib/kill-switch';
import { isValidPublicKey } from '@/lib/validate';

// Vision + reverse-image + open-meteo + retries can take a while on a slow tick.
export const maxDuration = 60;

interface VisionAnalysis {
  target: ObservationTarget;
  identifiedObject: string;
  isScreenshot: boolean;
  isAiGenerated: boolean;
  hasNightSkyCharacteristics: boolean;
  sharpness: 'high' | 'medium' | 'low';
  reason: string;
  liveCaptureConfirmed?: boolean;
}

const FALLBACK_ANALYSIS: VisionAnalysis = {
  target: 'unknown',
  identifiedObject: 'Unidentified sky object',
  isScreenshot: true,
  isAiGenerated: false,
  hasNightSkyCharacteristics: false,
  sharpness: 'low',
  reason: 'Verification service unavailable — observation rejected for safety',
};

function parseVisionResponse(text: string): { analysis: VisionAnalysis; isFallback: boolean } {
  // Try direct JSON parse
  try {
    return { analysis: JSON.parse(text) as VisionAnalysis, isFallback: false };
  } catch {
    // Try extracting from markdown code fences
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        return { analysis: JSON.parse(match[1]) as VisionAnalysis, isFallback: false };
      } catch {
        // fall through
      }
    }
    return { analysis: FALLBACK_ANALYSIS, isFallback: true };
  }
}

export async function POST(req: NextRequest) {
  const p = paused();
  if (p) return p;
  // Use auth token as rate-limit key when present (prevents IP spoofing)
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const privyId = bearerToken ? await verifyPrivy(req) : null;
  if (bearerToken && !privyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
  const rateLimitKey = privyId
    ? createHash('sha256').update(privyId).digest('hex').slice(0, 16)
    : ip;
  const { success, remaining } = await checkRateLimit(verifyRateLimit, rateLimitKey);
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before trying again.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': String(remaining) } }
    );
  }
  // Daily ceiling — bounds Gemini Vision spend per user/IP at ~$0.40/day worst case.
  const daily = await checkRateLimit(verifyDailyLimit, rateLimitKey);
  if (!daily.success) {
    return NextResponse.json(
      { error: "You've used today's verification quota. Come back tomorrow." },
      { status: 429, headers: { 'X-RateLimit-Remaining': String(daily.remaining), 'X-RateLimit-Window': 'daily' } }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const latParam = formData.get('lat') as string | null;
  const lonParam = formData.get('lon') as string | null;
  const capturedAt = (formData.get('capturedAt') as string | null) ?? new Date().toISOString();
  // Wallet is used as excludeWallet for cross-wallet hash dedup. Trust boundary:
  // a lying client only sabotages their own dedup — stars/cNFT-binding still
  // requires the signed verificationToken at /api/observe/log.
  const walletParam = ((formData.get('wallet') as string | null) ?? '').slice(0, 64);
  const uploadSourceParam = ((formData.get('uploadSource') as string | null) ?? 'upload').slice(0, 32);

  // Require an authenticated principal before the expensive vision call: a
  // verified Privy session OR a syntactically valid wallet pubkey. The Stars/
  // mint path downstream (/api/observe/log) requires a Privy session + wallet
  // ownership, so a token issued to an unauthenticated wallet can't be cashed in.
  if (!privyId && !isValidPublicKey(walletParam)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Validation
  if (!file) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'file must be an image' }, { status: 400 });
  }
  if (file.size > 10_000_000) {
    return NextResponse.json({ error: 'file too large (max 10MB)' }, { status: 400 });
  }
  if (file.size < 10_000) {
    return NextResponse.json({ error: 'file too small (min 10KB)' }, { status: 400 });
  }

  const lat = Number(latParam);
  const lon = Number(lonParam);
  if (!latParam || !lonParam || !isFinite(lat) || !isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: 'lat and lon are required valid coordinates' }, { status: 400 });
  }

  // Read file buffer + hash
  const buffer = Buffer.from(await file.arrayBuffer());

  // Validate magic bytes — reject files that don't match a known image format
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const isWebp = buffer.length >= 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
  const isHeic = buffer.length >= 12 && buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70;
  if (!isJpeg && !isPng && !isWebp && !isHeic) {
    return NextResponse.json({ error: 'file must be a valid image (JPEG, PNG, WebP, or HEIC)' }, { status: 400 });
  }

  const fileHash = '0x' + createHash('sha256').update(buffer).digest('hex').slice(0, 40);

  // ───────────────────────── Pre-check pipeline ─────────────────────────
  // Run cheap, deterministic checks before the expensive Gemini Vision call.
  // Each check that fails writes a `confidence: 'rejected'` row to
  // observation_log so future attempts at the same hash short-circuit.
  //
  // Philosophy: a failed check never blocks the user. It downgrades the
  // observation to UNVERIFIED — 0 Stars, no on-chain attestation — but the
  // photo can still be minted as a keepsake NFT clearly labelled "not
  // certified". So every rejection still carries a signed verification token.
  const db = getDb();

  // EXIF + device tier are computed up front so every rejection below carries
  // consistent device/location metadata and a mint-able token.
  const exif = await extractExif(buffer);
  const exifLat = exif?.lat ?? null;
  const exifLon = exif?.lon ?? null;
  const exifTakenAt = exif?.takenAt ?? null;
  const deviceMake = exif?.make ?? null;
  const deviceModel = exif?.model ?? null;
  const deviceTier: DeviceTier = classifyDevice(deviceMake, deviceModel);
  let isInternetSourced = false;
  // Server-fetched cloud cover, signed into every token below so /api/mint can
  // enforce the overcast gate without trusting the client. 0 until the
  // Open-Meteo fetch lands (pre-fetch rejections earn 0 Stars regardless).
  let cloudCoverForToken = 0;

  async function writeRejectionRow(reason: string, notes: Record<string, unknown>) {
    if (!db || !walletParam) return;
    try {
      await db.insert(observationLog).values({
        wallet: walletParam,
        target: ((formData.get('target') as string | null) ?? 'unknown').slice(0, 64),
        stars: 0,
        confidence: 'rejected',
        fileHash,
        uploadSource: uploadSourceParam,
        verificationNotes: { reason, ...notes },
        observedDate: new Date().toISOString().split('T')[0],
      });
    } catch (err) {
      // Daily-unique constraint may collide on retries — non-fatal.
      console.warn('[verify] rejection-row insert failed:', err);
    }
  }

  // Returns a PhotoVerificationResult-shaped payload for an unverified outcome.
  // `accepted: false` + `starsEstimate: 0` means no Stars and no on-chain
  // attestation, but a signed token IS issued so the client can still mint the
  // photo as a labelled keepsake via /api/mint (which forces 0 Stars and
  // "Unverified" rarity for a 'rejected' token).
  function buildRejection(
    rejectionReason: string,
    message: string,
    opts: { identifiedObject?: string; isScreenshot?: boolean; isAiGenerated?: boolean } = {},
  ): PhotoVerificationResult {
    const identifiedObject = opts.identifiedObject || 'Unverified observation';
    const verificationToken = createObservationToken({
      target: identifiedObject,
      identifiedObject,
      confidence: 'rejected',
      capturedAt,
      fileHash,
      lat,
      lon,
      deviceTier,
      deviceMake: deviceMake ?? '',
      deviceModel: deviceModel ?? '',
      isInternetSourced,
      wallet: walletParam,
      cloudCover: cloudCoverForToken,
    }) ?? undefined;
    return {
      accepted: false,
      confidence: 'rejected',
      rejectionReason,
      verificationToken,
      target: 'unknown',
      identifiedObject,
      reason: message,
      astronomyCheck: { objectVisible: false },
      imageAnalysis: {
        isScreenshot: !!opts.isScreenshot,
        isAiGenerated: !!opts.isAiGenerated,
        hasNightSkyCharacteristics: false,
        sharpness: 'low',
      },
      starsEstimate: 0,
      metadata: {
        fileHash,
        capturedAt,
        lat,
        lon,
        cloudCover: 0,
        deviceTier,
        deviceMake,
        deviceModel,
        exifLat,
        exifLon,
        exifTakenAt: exifTakenAt ? exifTakenAt.toISOString() : null,
        isInternetSourced,
        uploadSource: uploadSourceParam,
      },
    };
  }

  // 1. Cross-wallet hash dedup
  if (walletParam) {
    try {
      const dup = await findDuplicateByHash(fileHash, walletParam);
      if (dup) {
        await writeRejectionRow('duplicate_image', { duplicateOfWallet: dup.wallet.slice(0, 8) + '…' });
        return NextResponse.json(buildRejection(
          'duplicate_image',
          'This exact photo was already submitted by another observer, so it earns no Stars. You can still keep it as an unverified NFT.',
        ));
      }
    } catch (err) {
      console.warn('[verify] dedup check failed (non-fatal):', err);
    }
  }

  // 2. EXIF GPS mismatch (> 0.5° ≈ 55km) — only check if EXIF GPS exists
  if (exifLat !== null && exifLon !== null) {
    if (Math.abs(exifLat - lat) > 0.5 || Math.abs(exifLon - lon) > 0.5) {
      const notes = { exifLat, exifLon, clientLat: lat, clientLon: lon };
      await writeRejectionRow('gps_mismatch', notes);
      return NextResponse.json(buildRejection(
        'gps_mismatch',
        "The photo's location tag does not match where you say you are, so it can't be certified — no Stars. You can still keep it as an unverified NFT.",
      ));
    }
  }

  // 3. Photo too old (> 24h before submission). Mission-configurable later.
  if (exifTakenAt) {
    const ageMs = Date.now() - exifTakenAt.getTime();
    if (ageMs > 24 * 60 * 60 * 1000) {
      await writeRejectionRow('photo_too_old', { exifTakenAt: exifTakenAt.toISOString(), ageHours: Math.floor(ageMs / 3_600_000) });
      return NextResponse.json(buildRejection(
        'photo_too_old',
        'This photo was taken more than 24 hours ago, so it earns no Stars for tonight. You can still keep it as an unverified NFT.',
      ));
    }
  }

  // 4. Reverse image lookup (optional — gated on GOOGLE_VISION_API_KEY)
  const reverse = await checkReverseImage(buffer);
  isInternetSourced = reverse.matchCount > 0;
  if (isInternetSourced) {
    await writeRejectionRow('stock_image_detected', { matchCount: reverse.matchCount, sampleUrls: reverse.sampleUrls });
    return NextResponse.json(buildRejection(
      'stock_image_detected',
      'This image was found elsewhere on the web — it looks like a stock or downloaded photo, not your own observation, so it earns no Stars. You can still keep it as an unverified NFT.',
    ));
  }
  // ──────────────────────── End pre-check pipeline ────────────────────────

  // Base64 for Gemini Vision
  const base64 = buffer.toString('base64');
  const rawType = file.type;
  const mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' =
    rawType === 'image/heic' || rawType === 'image/heif' || isHeic
      ? 'image/jpeg'
      : (rawType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp');

  // Optional second frame (double capture anti-cheat)
  const file2 = formData.get('file2') as File | null;
  let file2Base64: string | null = null;
  let file2MediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
  if (file2 && file2.type.startsWith('image/') && file2.size > 0) {
    const buf2 = Buffer.from(await file2.arrayBuffer());
    file2Base64 = buf2.toString('base64');
    file2MediaType = file2.type as typeof file2MediaType;
  }
  const isDoubleCapture = file2Base64 !== null;

  // Build the image list for the vision model
  const images: GeminiImage[] = [{ mimeType: mediaType, data: base64 }];
  if (isDoubleCapture && file2Base64) {
    images.push({ mimeType: file2MediaType, data: file2Base64 });
  }

  const singleImagePrompt = `Analyze this image. The user claims it was taken at coordinates ${lat}, ${lon} at ${capturedAt}.

Determine:
1. What celestial object is shown? (moon, specific planet, stars/constellation pattern, deep sky object, or unknown)
2. Is this image authentic? Check for:
   - Screenshot indicators (status bar, UI elements, sharp rectangular edges, notification bar)
   - AI generation artifacts (too-perfect details, unnatural star patterns, impossible physics)
   - Night sky characteristics (noise grain, atmospheric distortion, realistic star sizes)
   - Image sharpness (phone photos are naturally less sharp — that's OK and expected)

Be GENEROUS with phone photos. A blurry phone photo of the moon is VALID.
A phone photo of Jupiter as a bright dot is VALID.
A phone photo showing star trails or constellations is VALID.
Only reject obvious fakes: screenshots of planetarium apps, downloaded wallpapers, AI art.

Return ONLY valid JSON, no markdown, no preamble:
{
  "target": "moon" | "planet" | "stars" | "constellation" | "deep_sky" | "unknown",
  "identifiedObject": "specific name like 'Waxing Gibbous Moon' or 'Jupiter' or 'Orion constellation'",
  "isScreenshot": false,
  "isAiGenerated": false,
  "hasNightSkyCharacteristics": true,
  "sharpness": "high" | "medium" | "low",
  "reason": "Brief explanation of what you see and why you believe it's authentic or not"
}`;

  const doubleImagePrompt = `Analyze these TWO images taken 3 seconds apart. The user claims they were taken at coordinates ${lat}, ${lon} at ${capturedAt}.

Determine:
1. What celestial object is shown? (moon, specific planet, stars/constellation pattern, deep sky object, or unknown)
2. Is this image authentic? Check for:
   - Screenshot indicators (status bar, UI elements, sharp rectangular edges, notification bar)
   - AI generation artifacts (too-perfect details, unnatural star patterns, impossible physics)
   - Night sky characteristics (noise grain, atmospheric distortion, realistic star sizes)
   - Image sharpness (phone photos are naturally less sharp — that's OK and expected)
3. LIVE CAPTURE CHECK: Compare the two photos. If they show the same object with natural slight variation (hand movement, slight blur difference, atmospheric shimmer) that confirms they were taken live 3 seconds apart, set liveCaptureConfirmed: true. Identical photos or completely different photos → false.

Be GENEROUS with phone photos. A blurry phone photo of the moon is VALID.
Only reject obvious fakes: screenshots of planetarium apps, downloaded wallpapers, AI art.

Return ONLY valid JSON, no markdown, no preamble:
{
  "target": "moon" | "planet" | "stars" | "constellation" | "deep_sky" | "unknown",
  "identifiedObject": "specific name like 'Waxing Gibbous Moon' or 'Jupiter' or 'Orion constellation'",
  "isScreenshot": false,
  "isAiGenerated": false,
  "hasNightSkyCharacteristics": true,
  "sharpness": "high" | "medium" | "low",
  "reason": "Brief explanation of what you see and why you believe it's authentic or not",
  "liveCaptureConfirmed": true
}`;

  const targetParam = (formData.get('target') as string | null) ?? '';
  const isHighValueTarget = ['saturn', 'jupiter', 'deep sky', 'nebula', 'galaxy', 'cluster']
    .some(t => targetParam.toLowerCase().includes(t));

  const strictnessNote = isHighValueTarget
    ? `\nThis is a HIGH-VALUE observation target. Be MORE careful about authenticity. Require clear identifying features visible (rings for Saturn, cloud bands for Jupiter, etc.). If the image is too blurry to confirm the specific target, mark confidence as 'low' rather than 'medium'.`
    : `\nBe generous with phone photos. A blurry phone photo is valid if the celestial object is recognizable.`;

  const visionPrompt = (isDoubleCapture ? doubleImagePrompt : singleImagePrompt) + strictnessNote;

  // Vision call — Gemini free tier (gemini-2.5-flash). responseMimeType=json
  // means the model returns raw JSON we can parse directly.
  let analysis: VisionAnalysis;
  let verificationFailed = false;
  try {
    const text = await geminiVisionJSON({
      system: 'You are an astronomy image verification system. You analyze photos of the night sky to determine what celestial object is shown and whether the image is authentic. Be generous but honest — phone photos of the moon are valid even if blurry. Screenshots and AI-generated images are not valid.',
      prompt: visionPrompt,
      images,
      maxOutputTokens: 500,
      signal: AbortSignal.timeout(45000),
    });
    const parsed = parseVisionResponse(text);
    analysis = parsed.analysis;
    verificationFailed = parsed.isFallback;
  } catch (err) {
    console.error('[observe/verify] Gemini vision error:', err);
    // Don't dead-end the user on a service hiccup — return an unverified
    // outcome they can still mint as a keepsake (0 Stars, not certified).
    return NextResponse.json(buildRejection(
      'verification_unavailable',
      "We couldn't analyze this photo right now, so it can't be certified — no Stars. You can still keep it as an unverified NFT, or try again in a moment.",
    ));
  }

  // Vision response couldn't be parsed → treat as unverified rather than
  // mislabelling it (the fallback shape would otherwise read as a screenshot).
  if (verificationFailed) {
    return NextResponse.json(buildRejection(
      'verification_unavailable',
      "We couldn't read the analysis for this photo, so it can't be certified — no Stars. You can still keep it as an unverified NFT, or try again.",
    ));
  }

  // AI-generated images and screenshots can't earn Stars or an on-chain
  // attestation, but the user may still keep the photo as an unverified NFT.
  // Returning early gives clients a clear `rejectionReason` and persists a
  // rejection row for hash-dedup of synthetic images.
  if (analysis.isAiGenerated) {
    await writeRejectionRow('ai_generated', { identifiedObject: analysis.identifiedObject, visionReason: analysis.reason });
    return NextResponse.json(buildRejection(
      'ai_generated',
      'This looks AI-generated, so it earns no Stars — Stars are only awarded for real photos you took yourself. You can still keep it as an unverified NFT.',
      { identifiedObject: analysis.identifiedObject, isAiGenerated: true },
    ));
  }
  if (analysis.isScreenshot) {
    await writeRejectionRow('screenshot_detected', { identifiedObject: analysis.identifiedObject, visionReason: analysis.reason });
    return NextResponse.json(buildRejection(
      'screenshot_detected',
      'This looks like a screenshot, so it earns no Stars — Stars are only awarded for real photos of the sky. You can still keep it as an unverified NFT.',
      { identifiedObject: analysis.identifiedObject, isScreenshot: true },
    ));
  }

  // Fetch real-time cloud cover from Open-Meteo oracle
  let cloudCover: number | null = null;
  try {
    const skyUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=cloud_cover&timezone=auto`;
    const skyRes = await fetch(skyUrl, { signal: AbortSignal.timeout(5000) });
    if (skyRes.ok) {
      const skyData = await skyRes.json();
      cloudCover = skyData?.current?.cloud_cover ?? null;
    }
  } catch {
    // non-fatal
  }

  let weatherUnavailable = false;
  if (cloudCover === null) {
    weatherUnavailable = true;
  } else {
    cloudCoverForToken = cloudCover;
  }

  // Overcast gate: a sky with >70% cloud cover can't yield a certifiable
  // observation — reject (0 Stars, no attestation), but the photo can still be
  // kept as an unverified NFT. The real cloud cover is signed into the token so
  // /api/mint can independently enforce this and can't be fed a fake clear sky.
  const CLOUD_COVER_MAX = 70;
  if (cloudCover !== null && cloudCover > CLOUD_COVER_MAX) {
    await writeRejectionRow('too_cloudy', { cloudCover });
    return NextResponse.json(buildRejection(
      'too_cloudy',
      `The sky is too cloudy right now (${Math.round(cloudCover)}% cloud cover) to certify an observation, so it earns no Stars. You can still keep it as an unverified NFT, or try again on a clearer night.`,
      { identifiedObject: analysis.identifiedObject },
    ));
  }

  // Astronomy cross-check
  const astroCheck = await checkObjectVisibility({
    target: analysis.target,
    identifiedObject: analysis.identifiedObject,
    lat,
    lon,
    timestamp: new Date(capturedAt),
  });

  // Confidence scoring
  let confidence: VerificationConfidence = 'medium';

  if (analysis.isScreenshot || analysis.isAiGenerated) {
    confidence = 'rejected';
  } else if (
    analysis.hasNightSkyCharacteristics &&
    !analysis.isScreenshot &&
    astroCheck.objectVisible &&
    analysis.target !== 'unknown'
  ) {
    confidence = analysis.sharpness === 'low' ? 'medium' : 'high';
  } else if (!astroCheck.objectVisible) {
    confidence = 'low';
  }

  // Weather unavailable: reduce confidence one level
  if (weatherUnavailable && confidence !== 'rejected') {
    const DOWNGRADE: Record<VerificationConfidence, VerificationConfidence> = {
      high: 'medium', medium: 'low', low: 'low', rejected: 'rejected',
    };
    confidence = DOWNGRADE[confidence];
  }

  // Double-capture boost: live capture confirmation bumps confidence one level
  if (isDoubleCapture && analysis.liveCaptureConfirmed && confidence !== 'rejected') {
    const BOOST: Record<VerificationConfidence, VerificationConfidence> = {
      low: 'medium', medium: 'high', high: 'high', rejected: 'rejected',
    };
    confidence = BOOST[confidence];
  }

  // Stars reward
  const REWARD_TABLE: Record<VerificationConfidence, { base: number; rare_bonus: number }> = {
    high:     { base: 50, rare_bonus: 30 },
    medium:   { base: 25, rare_bonus: 15 },
    low:      { base: 10, rare_bonus: 5 },
    rejected: { base: 0,  rare_bonus: 0 },
  };
  const rareObjects = ['saturn', 'jupiter', 'mars', 'venus', 'mercury', 'deep_sky'];
  const isRare =
    rareObjects.some(r => analysis.identifiedObject.toLowerCase().includes(r)) ||
    analysis.target === 'deep_sky';
  const reward = REWARD_TABLE[confidence];
  const baseStarsAwarded = reward.base + (isRare ? reward.rare_bonus : 0);

  // Mirror the 2x event-window bonus from /api/observe/log so the UI estimate
  // matches what the mint will actually award.
  const capturedAtDate = capturedAt ? new Date(capturedAt) : new Date();
  const eventMatches = eventsForTarget(
    analysis.identifiedObject || analysis.target,
    isNaN(capturedAtDate.getTime()) ? new Date() : capturedAtDate,
  );
  const eventBonusApplied = baseStarsAwarded > 0 && eventMatches.length > 0;
  const starsAwarded = eventBonusApplied ? baseStarsAwarded * EVENT_BONUS_MULTIPLIER : baseStarsAwarded;

  // Generate verification token — signs identifiedObject + confidence + new
  // device/EXIF fields so the /api/observe/log route can confirm none of these
  // were tampered with on the way to persistence.
  const verificationToken = createObservationToken({
    target: analysis.identifiedObject,
    identifiedObject: analysis.identifiedObject,
    confidence,
    capturedAt,
    fileHash,
    lat,
    lon,
    deviceTier,
    deviceMake: deviceMake ?? '',
    deviceModel: deviceModel ?? '',
    isInternetSourced,
    wallet: walletParam,
    cloudCover: cloudCoverForToken,
  });
  if (!verificationToken) {
    return NextResponse.json({ error: 'Server misconfigured: OBSERVATION_TOKEN_SECRET not set' }, { status: 503 });
  }

  const result: PhotoVerificationResult = {
    accepted: confidence !== 'rejected',
    confidence,
    verificationToken,
    ...(verificationFailed ? { verificationFailed: true } : {}),
    ...(weatherUnavailable ? { weatherUnavailable: true } : {}),
    target: analysis.target,
    identifiedObject: analysis.identifiedObject,
    reason: weatherUnavailable
      ? analysis.reason + ' (weather data unavailable — confidence reduced)'
      : analysis.reason,
    astronomyCheck: astroCheck,
    imageAnalysis: {
      isScreenshot: analysis.isScreenshot,
      isAiGenerated: analysis.isAiGenerated,
      hasNightSkyCharacteristics: analysis.hasNightSkyCharacteristics,
      sharpness: analysis.sharpness,
    },
    starsEstimate: starsAwarded,
    ...(eventBonusApplied ? { eventBonus: { multiplier: EVENT_BONUS_MULTIPLIER, eventName: eventMatches[0]?.name ?? '' } } : {}),
    metadata: {
      fileHash,
      capturedAt: capturedAt || new Date().toISOString(),
      lat,
      lon,
      cloudCover: cloudCover ?? 0,
      ...(isDoubleCapture && analysis.liveCaptureConfirmed ? { doubleCaptureVerified: true } : {}),
      deviceTier,
      deviceMake,
      deviceModel,
      exifLat,
      exifLon,
      exifTakenAt: exifTakenAt ? exifTakenAt.toISOString() : null,
      isInternetSourced,
      uploadSource: uploadSourceParam,
    },
  };

  return NextResponse.json(result);
}
