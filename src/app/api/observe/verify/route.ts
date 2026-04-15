import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createHash, createHmac } from 'crypto';
import { verifyRateLimit, checkRateLimit } from '@/lib/rate-limit';
import { CLAUDE_MODEL } from '@/lib/ai-config';
import type { PhotoVerificationResult, ObservationTarget, VerificationConfidence } from '@/lib/types';
import { checkObjectVisibility } from '@/lib/astronomy-check';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ClaudeAnalysis {
  target: ObservationTarget;
  identifiedObject: string;
  isScreenshot: boolean;
  isAiGenerated: boolean;
  hasNightSkyCharacteristics: boolean;
  sharpness: 'high' | 'medium' | 'low';
  reason: string;
  liveCaptureConfirmed?: boolean;
}

const FALLBACK_ANALYSIS: ClaudeAnalysis = {
  target: 'unknown',
  identifiedObject: 'Unidentified sky object',
  isScreenshot: true,
  isAiGenerated: false,
  hasNightSkyCharacteristics: false,
  sharpness: 'low',
  reason: 'Verification service unavailable — observation rejected for safety',
};

function parseClaudeResponse(text: string): { analysis: ClaudeAnalysis; isFallback: boolean } {
  // Try direct JSON parse
  try {
    return { analysis: JSON.parse(text) as ClaudeAnalysis, isFallback: false };
  } catch {
    // Try extracting from markdown code fences
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        return { analysis: JSON.parse(match[1]) as ClaudeAnalysis, isFallback: false };
      } catch {
        // fall through
      }
    }
    return { analysis: FALLBACK_ANALYSIS, isFallback: true };
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
  const { success, remaining } = await checkRateLimit(verifyRateLimit, ip);
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before trying again.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': String(remaining) } }
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

  // Base64 for Claude
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

  // Build user message content
  type ImageBlock = { type: 'image'; source: { type: 'base64'; media_type: typeof mediaType; data: string } };
  type TextBlock = { type: 'text'; text: string };
  const userContent: (ImageBlock | TextBlock)[] = [
    { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
  ];
  if (isDoubleCapture && file2Base64) {
    userContent.push({ type: 'image', source: { type: 'base64', media_type: file2MediaType, data: file2Base64 } });
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

  userContent.push({ type: 'text', text: isDoubleCapture ? doubleImagePrompt : singleImagePrompt });

  // Claude Vision call
  let analysis: ClaudeAnalysis;
  let verificationFailed = false;
  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      system: 'You are an astronomy image verification system. You analyze photos of the night sky to determine what celestial object is shown and whether the image is authentic. Be generous but honest — phone photos of the moon are valid even if blurry. Screenshots and AI-generated images are not valid.',
      messages: [
        {
          role: 'user',
          content: userContent as Anthropic.MessageParam['content'],
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const parsed = parseClaudeResponse(text);
    analysis = parsed.analysis;
    verificationFailed = parsed.isFallback;
  } catch (err) {
    console.error('[observe/verify] Claude error:', err);
    return NextResponse.json({ error: 'Verification service unavailable' }, { status: 500 });
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
  const starsAwarded = reward.base + (isRare ? reward.rare_bonus : 0);

  // Generate verification token — signs identifiedObject + confidence so log route
  // can verify confidence was set server-side (prevents clients claiming arbitrary stars)
  const tokenData = `${analysis.identifiedObject}:${confidence}:${capturedAt}`;
  const verificationToken = createHmac('sha256', process.env.ANTHROPIC_API_KEY ?? '')
    .update(tokenData)
    .digest('hex');

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
    metadata: {
      fileHash,
      capturedAt: capturedAt || new Date().toISOString(),
      lat,
      lon,
      cloudCover: cloudCover ?? 0,
      ...(isDoubleCapture && analysis.liveCaptureConfirmed ? { doubleCaptureVerified: true } : {}),
    },
  };

  return NextResponse.json(result);
}
