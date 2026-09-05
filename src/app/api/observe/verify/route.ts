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
import { observationLog, observationPhoto } from '@/lib/schema';
import { eventsForTarget } from '@/lib/astro-events';
import { EVENT_BONUS_MULTIPLIER, CLOUD_COVER_CERTIFY_MAX } from '@/lib/constants';
import { isDaytimeTarget, capConfidence, overcastGateApplies } from '@/lib/observation-kind';
import { createObservationToken } from '@/lib/observation-token';
import { verifyPrivy, assertOwnsWallet } from '@/lib/api-auth';
import { paused } from '@/lib/kill-switch';
import { classifyCaptureTime, normalizeUploadSource } from '@/lib/capture-time';

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
  // How much of the visible sky the model reads as cloud-covered, 0-100. Cross-
  // checked against Open-Meteo below: a photo that agrees with the weather at
  // the observer's coordinates right now is hard to fake with a stock image.
  estimatedCloudCover?: number;
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
  // Every verification runs a vision call and can write rows keyed by wallet,
  // so it needs a signed-in account. The mission flow always has one.
  const privyId = await verifyPrivy(req);
  if (!privyId) {
    return NextResponse.json({ error: 'Sign in to verify a photo' }, { status: 401 });
  }
  const rateLimitKey = createHash('sha256').update(privyId).digest('hex').slice(0, 16);
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
  const captureTime = classifyCaptureTime(capturedAt);
  // 'camera' doubles the Stars, so it is only honoured for a capture fresh
  // enough to have been taken in-app. A stale one is an upload.
  const uploadSourceParam = normalizeUploadSource(
    ((formData.get('uploadSource') as string | null) ?? 'upload').slice(0, 32),
    captureTime,
  );
  // Downscaled JPEG of the same photo — kept so the mint can carry the real
  // image, whatever the verdict. Optional: an older client just sends nothing.
  const thumbParam = (formData.get('thumb') as string | null) ?? '';

  // The wallet names whose rows this verification may write — rejections, the
  // stored photo, the cross-wallet dedup exclusion — so it has to be this
  // session's own. Otherwise one account could plant rows under another's.
  if (walletParam && !(await assertOwnsWallet(privyId, walletParam))) {
    return NextResponse.json({ error: 'Wallet does not match session' }, { status: 403 });
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

  // Persist the observer's own image up front, so a rejected photo (which still
  // mints as a keepsake) keeps its picture just like a certified one does.
  async function storePhoto(database: NonNullable<ReturnType<typeof getDb>>) {
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(thumbParam);
    if (!match) return;
    const [, mimeType, base64] = match;
    if (Math.floor((base64.length * 3) / 4) > 2_000_000) return;
    try {
      await database
        .insert(observationPhoto)
        .values({ fileHash, wallet: walletParam || null, mimeType, imageBase64: base64 })
        .onConflictDoNothing();
    } catch (err) {
      console.warn('[verify] photo store failed (non-fatal):', err);
    }
  }

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
  if (db && thumbParam) await storePhoto(db);

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
      uploadSource: uploadSourceParam,
      cloudCover: cloudCoverForToken,
      subject: 'unknown',
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

  // 0. The claimed capture time must be plausible: not in the future, not
  // older than a gallery upload may be. Everything downstream — the visibility
  // cross-check, the event bonus — is computed at this instant.
  if (!captureTime.ok) {
    await writeRejectionRow('timestamp_invalid', { capturedAt, reason: captureTime.reason });
    return NextResponse.json(buildRejection(
      'timestamp_invalid',
      'The capture time on this photo is not plausible, so it cannot be certified — no Stars. You can still keep it as an unverified NFT.',
    ));
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

  // 4. Reverse image lookup (optional — gated on GOOGLE_VISION_API_KEY). A match
  // is strong evidence but not proof by itself: the Moon and other common
  // targets are the most-photographed objects on Earth, and Google's near-
  // duplicate matcher can false-positive on a low-detail, high-similarity shot
  // like an overexposed lunar disc. It downgrades confidence instead of an
  // outright reject — see the scoring block after the vision call for how it
  // combines with the AI-generation flag.
  const reverse = await checkReverseImage(buffer);
  isInternetSourced = reverse.matchCount > 0;
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

SUBJECT — pick exactly one:
NIGHT: "moon" (the Moon at night), "planet" (Venus/Mars/Jupiter/Saturn/Mercury,
often just a bright dot), "stars" (star field, star trails), "constellation"
(recognisable pattern), "deep_sky" (nebula, galaxy, star cluster).
DAY: "sun" (the Sun itself, incl. sunspots or an eclipsed Sun), "daytime_moon"
(the pale Moon in a blue daylight sky), "atmospheric" (a real optical
phenomenon: 22-degree halo, sundog/parhelion, rainbow, crepuscular or
anticrepuscular rays, iridescent or nacreous cloud, glory, light pillar,
noctilucent cloud), "day_sky" (an honest photo of the sky right now — clouds,
sunset or sunrise colour, blue sky, storm front, contrails).
"unknown" only if the photo is not of the sky at all.

Daytime subjects are FIRST-CLASS observations, not failures. A phone photo of a
sundog or of today's cloudscape is a valid, welcome observation. Do NOT mark a
daytime sky photo as unknown just because no celestial object is in it — use
"day_sky". Do NOT set hasNightSkyCharacteristics for a daytime photo; that flag
describes night photos only, and leaving it false is correct in daylight.

Determine:
1. Which subject above is shown, and name it specifically.
2. estimatedCloudCover: looking only at the sky in the photo, roughly what
percentage is covered by cloud? 0 = completely clear, 100 = solid overcast. If
no sky is visible, use -1.
3. Is this image authentic? Check for:
   - Screenshot indicators (status bar, UI elements, sharp rectangular edges, notification bar)
   - AI generation artifacts (too-perfect details, unnatural star patterns, impossible physics)
   - Night sky characteristics (noise grain, atmospheric distortion, realistic star sizes)
   - Image sharpness (phone photos are naturally less sharp — that's OK and expected)

Be GENEROUS with phone photos. A blurry phone photo of the moon is VALID.
A phone photo of Jupiter as a bright dot is VALID.
A phone photo showing star trails or constellations is VALID.
A plain daytime photo of clouds or a sunset is VALID as "day_sky".
Only reject obvious fakes: screenshots of planetarium apps, downloaded wallpapers, AI art.

Return ONLY valid JSON, no markdown, no preamble:
{
  "target": "moon" | "planet" | "stars" | "constellation" | "deep_sky" | "sun" | "daytime_moon" | "atmospheric" | "day_sky" | "unknown",
  "identifiedObject": "specific name like 'Waxing Gibbous Moon', 'Jupiter', 'Orion constellation', '22-degree solar halo' or 'Cumulus over Tbilisi'",
  "estimatedCloudCover": 0,
  "isScreenshot": false,
  "isAiGenerated": false,
  "hasNightSkyCharacteristics": true,
  "sharpness": "high" | "medium" | "low",
  "reason": "Brief explanation of what you see and why you believe it's authentic or not"
}`;

  const doubleImagePrompt = `Analyze these TWO images taken 3 seconds apart. The user claims they were taken at coordinates ${lat}, ${lon} at ${capturedAt}.

SUBJECT — pick exactly one:
NIGHT: "moon" (the Moon at night), "planet" (Venus/Mars/Jupiter/Saturn/Mercury,
often just a bright dot), "stars" (star field, star trails), "constellation"
(recognisable pattern), "deep_sky" (nebula, galaxy, star cluster).
DAY: "sun" (the Sun itself, incl. sunspots or an eclipsed Sun), "daytime_moon"
(the pale Moon in a blue daylight sky), "atmospheric" (a real optical
phenomenon: 22-degree halo, sundog/parhelion, rainbow, crepuscular or
anticrepuscular rays, iridescent or nacreous cloud, glory, light pillar,
noctilucent cloud), "day_sky" (an honest photo of the sky right now — clouds,
sunset or sunrise colour, blue sky, storm front, contrails).
"unknown" only if the photo is not of the sky at all.

Daytime subjects are FIRST-CLASS observations, not failures. A phone photo of a
sundog or of today's cloudscape is a valid, welcome observation. Do NOT mark a
daytime sky photo as unknown just because no celestial object is in it — use
"day_sky". Do NOT set hasNightSkyCharacteristics for a daytime photo; that flag
describes night photos only, and leaving it false is correct in daylight.

Determine:
1. Which subject above is shown, and name it specifically.
2. estimatedCloudCover: looking only at the sky in the photo, roughly what
percentage is covered by cloud? 0 = completely clear, 100 = solid overcast. If
no sky is visible, use -1.
3. Is this image authentic? Check for:
   - Screenshot indicators (status bar, UI elements, sharp rectangular edges, notification bar)
   - AI generation artifacts (too-perfect details, unnatural star patterns, impossible physics)
   - Night sky characteristics (noise grain, atmospheric distortion, realistic star sizes)
   - Image sharpness (phone photos are naturally less sharp — that's OK and expected)
4. LIVE CAPTURE CHECK: Compare the two photos. If they show the same object with natural slight variation (hand movement, slight blur difference, atmospheric shimmer) that confirms they were taken live 3 seconds apart, set liveCaptureConfirmed: true. Identical photos or completely different photos → false.

Be GENEROUS with phone photos. A blurry phone photo of the moon is VALID.
Only reject obvious fakes: screenshots of planetarium apps, downloaded wallpapers, AI art.

Return ONLY valid JSON, no markdown, no preamble:
{
  "target": "moon" | "planet" | "stars" | "constellation" | "deep_sky" | "sun" | "daytime_moon" | "atmospheric" | "day_sky" | "unknown",
  "identifiedObject": "specific name like 'Waxing Gibbous Moon', 'Jupiter', 'Orion constellation', '22-degree solar halo' or 'Cumulus over Tbilisi'",
  "estimatedCloudCover": 0,
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

  // If we know the mission target, tell Gemini exactly what to look for so it
  // doesn't mark a real bright-dot photo of Venus as "unknown".
  const targetHint = targetParam
    ? `\nThe user is on the "${targetParam}" mission. Planets (Venus, Jupiter, Mars, Saturn, Mercury) naturally appear as a single bright point or small dot through a phone camera — that IS a valid planet photo. A bright white dot on a dark sky background is the expected result for any planet observed with a smartphone. Set target:"planet" and identifiedObject to the planet name if the context matches.`
    : '';

  const strictnessNote = isHighValueTarget
    ? `\nThis is a HIGH-VALUE observation target. Be careful about screenshots and AI art, but remember that real telescope or phone photos of Saturn may still show limited detail. Rings visible = high confidence; bright dot without rings = medium. Never reject a real phone photo just because it's low resolution.`
    : `\nBe generous with phone photos. A blurry or low-detail phone photo is valid if the photo itself is real (not a screenshot or AI art).`;

  const visionPrompt = (isDoubleCapture ? doubleImagePrompt : singleImagePrompt) + targetHint + strictnessNote;

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

  // Screenshots can't earn Stars or an on-chain attestation, but the user may
  // still keep the photo as an unverified NFT. Returning early gives clients a
  // clear `rejectionReason` and persists a rejection row for hash-dedup.
  //
  // AI-generation suspicion is scored below rather than rejected outright here:
  // an overexposed real Moon photo (clean bright disc on black) structurally
  // resembles the same "too-perfect" signature the model is told to flag, so a
  // lone isAiGenerated flag is a strong-but-fallible signal, not proof.
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

  // Overcast gate: a sky this closed can't yield a certifiable observation —
  // reject (0 Stars, no attestation), but the photo can still be kept as an
  // unverified NFT. The real cloud cover is signed into the token so /api/mint
  // can independently enforce this and can't be fed a fake clear sky.
  if (
    cloudCover !== null &&
    cloudCover > CLOUD_COVER_CERTIFY_MAX &&
    overcastGateApplies(analysis.target)
  ) {
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

  // Cloud-cover cross-check: does the sky in the photo match the sky Open-Meteo
  // reports over those coordinates right now? Agreement is positive evidence
  // that this is a live photo of this place — a downloaded or old image only
  // matches by luck. Disagreement is not proof of fraud (a narrow crop of a
  // gap in the cloud reads as clear), so it costs a level rather than rejecting.
  const claimedCloud = typeof analysis.estimatedCloudCover === 'number' && analysis.estimatedCloudCover >= 0
    ? analysis.estimatedCloudCover
    : null;
  const cloudDelta = claimedCloud !== null && cloudCover !== null
    ? Math.abs(claimedCloud - cloudCover)
    : null;
  const cloudMatches = cloudDelta !== null && cloudDelta <= 35;

  const isDay = isDaytimeTarget(analysis.target);

  // Confidence scoring — primary gate is astronomy (was the target actually
  // visible from this location at this time?), not photo visual quality.
  //
  // Rationale: planets appear as single bright dots through phone cameras.
  // hasNightSkyCharacteristics (grain, star fields) is absent for a clean white
  // dot on a black background — that is the expected appearance of Venus, not
  // evidence of a fake. We cannot require Gemini to visually distinguish a real
  // bright-dot planet from a blank screen; we CAN verify that the planet was
  // above the horizon, the sky was clear, and the photo is authentic.
  let confidence: VerificationConfidence = 'medium';

  if (isDay) {
    // Daytime subjects: verified by Sun altitude and cloud cross-check.
    confidence = astroCheck.objectVisible
      ? (cloudMatches ? 'high' : 'medium')
      : 'low';
  } else {
    const photoIsAuthentic = !analysis.isScreenshot && !analysis.isAiGenerated;

    if (!astroCheck.objectVisible) {
      // Target wasn't above the horizon at this location/time — low confidence
      // regardless of what the photo shows.
      confidence = 'low';
    } else if (photoIsAuthentic && analysis.target !== 'unknown') {
      // Astronomy check passes + photo is authentic + Gemini identified a sky
      // object (even just "planet" for a bright dot). This is the main path for
      // phone photos of Venus, Jupiter, the Moon, etc.
      // hasNightSkyCharacteristics is NOT required — a single-point planet has
      // no star-field grain, and that is normal and expected.
      confidence = cloudMatches ? 'high' : 'medium';
    } else if (photoIsAuthentic && analysis.hasNightSkyCharacteristics) {
      // Gemini couldn't identify the object but the photo has real night-sky
      // characteristics (grain, dark sky). Give partial credit.
      confidence = 'medium';
    } else if (photoIsAuthentic) {
      // Authentic photo but object unidentifiable and no night-sky markers.
      // Could be a very faint target or camera pointed near-but-not-at target.
      confidence = 'low';
    }
    // If photoIsAuthentic is false but !isAiGenerated (only one flag): handled
    // by the fake-image downgrade block below.
  }

  const DOWNGRADE_ONE: Record<VerificationConfidence, VerificationConfidence> = {
    high: 'medium', medium: 'low', low: 'low', rejected: 'rejected',
  };

  // Authenticity heuristics are fallible, not proof — a real overexposed phone
  // photo of the Moon (clean bright disc, black background) can trip either
  // check on its own: it structurally resembles an "AI-generated" image, and
  // it's exactly the kind of low-detail, high-similarity shot Google's near-
  // duplicate matcher false-positives on for the most-photographed object in
  // the sky. One flag downgrades a tier instead of zeroing the observation.
  // Both flags together — far more likely for an actual lifted or generated
  // image than a real capture — reject outright.
  let fakeImageRejected = false;
  if (analysis.isAiGenerated && isInternetSourced) {
    confidence = 'rejected';
    fakeImageRejected = true;
  } else {
    if (analysis.isAiGenerated) confidence = DOWNGRADE_ONE[confidence];
    if (isInternetSourced) confidence = DOWNGRADE_ONE[confidence];
  }

  if (fakeImageRejected) {
    await writeRejectionRow('stock_image_detected', {
      identifiedObject: analysis.identifiedObject,
      visionReason: analysis.reason,
      matchCount: reverse.matchCount,
      sampleUrls: reverse.sampleUrls,
    });
  }

  // Weather unavailable: reduce confidence one level
  if (weatherUnavailable && confidence !== 'rejected') {
    confidence = DOWNGRADE_ONE[confidence];
  }

  // Double-capture boost: live capture confirmation bumps confidence one level
  if (isDoubleCapture && analysis.liveCaptureConfirmed && confidence !== 'rejected') {
    const BOOST: Record<VerificationConfidence, VerificationConfidence> = {
      low: 'medium', medium: 'high', high: 'high', rejected: 'rejected',
    };
    confidence = BOOST[confidence];
  }

  // A daytime subject is genuinely verified but far easier to capture than a
  // telescope target at 1am, so it tops out below a night observation.
  confidence = capConfidence(confidence, analysis.target);

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
  // Gallery uploads earn half the Stars of a live in-app capture — same
  // authenticity checks (not on the internet, real night-sky photo), but a
  // capture taken inside the app is worth more. Applied to the base here and
  // authoritatively in /api/observe/log; the 'camera' vs 'upload' label is
  // signed into the verification token so it can't be flipped afterwards.
  const isUpload = uploadSourceParam === 'upload';
  const sourceMultiplier = isUpload ? 0.5 : 1;
  const baseStarsAwarded = Math.round((reward.base + (isRare ? reward.rare_bonus : 0)) * sourceMultiplier);

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
    uploadSource: uploadSourceParam,
    cloudCover: cloudCoverForToken,
    subject: analysis.target,
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
    ...(fakeImageRejected ? { rejectionReason: 'stock_image_detected' } : {}),
    target: analysis.target,
    identifiedObject: analysis.identifiedObject,
    reason: weatherUnavailable
      ? analysis.reason + ' (weather data unavailable — confidence reduced)'
      : analysis.reason,
    astronomyCheck: { ...astroCheck, ...(cloudDelta !== null ? { skyMatch: cloudMatches } : {}) },
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
