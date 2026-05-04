import sharp from 'sharp';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let _redis: Redis | null = null;
function getRedis(): Redis {
  if (!_redis) _redis = Redis.fromEnv();
  return _redis;
}

let _limiter: Ratelimit | null = null;
function getLimiter(): Ratelimit {
  if (!_limiter) {
    _limiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(5, '60 s'),
      prefix: 'rl:vision',
    });
  }
  return _limiter;
}

export interface ReverseImageResult {
  matchCount: number;
  sampleUrls: string[];
  skipped?: boolean;
  rateLimited?: boolean;
}

export async function checkReverseImage(buffer: Buffer): Promise<ReverseImageResult> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) return { matchCount: 0, sampleUrls: [], skipped: true };

  // Global cap to protect Vision quota (free tier: 1k/month).
  try {
    const { success } = await getLimiter().limit('global');
    if (!success) return { matchCount: 0, sampleUrls: [], rateLimited: true };
  } catch {
    // If Upstash is unavailable, fail open and skip the lookup.
    return { matchCount: 0, sampleUrls: [], skipped: true };
  }

  let thumbBase64: string;
  try {
    const thumb = await sharp(buffer)
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();
    thumbBase64 = thumb.toString('base64');
  } catch (err) {
    console.error('[reverse-image] thumbnail failed:', err);
    return { matchCount: 0, sampleUrls: [], skipped: true };
  }

  const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
  const body = {
    requests: [
      {
        image: { content: thumbBase64 },
        features: [{ type: 'WEB_DETECTION', maxResults: 5 }],
      },
    ],
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    console.error('[reverse-image] Vision fetch failed:', err);
    return { matchCount: 0, sampleUrls: [], skipped: true };
  }

  if (!res.ok) {
    console.error('[reverse-image] Vision non-OK:', res.status);
    return { matchCount: 0, sampleUrls: [], skipped: true };
  }

  let data: {
    responses?: Array<{
      webDetection?: {
        pagesWithMatchingImages?: Array<{ url?: string }>;
      };
    }>;
  };
  try {
    data = await res.json();
  } catch {
    return { matchCount: 0, sampleUrls: [], skipped: true };
  }

  const pages = data.responses?.[0]?.webDetection?.pagesWithMatchingImages ?? [];
  const sampleUrls = pages
    .map((p) => p.url)
    .filter((u): u is string => typeof u === 'string')
    .slice(0, 3);

  return { matchCount: pages.length, sampleUrls };
}
