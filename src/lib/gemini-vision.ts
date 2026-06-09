// Free-tier vision via Google Gemini, called over REST so we add no npm deps.
// Used by /api/observe/verify to analyze observation photos in place of the
// (paid) Claude Sonnet vision call. Get a free key at
// https://aistudio.google.com/apikey and set GEMINI_API_KEY.

const GEMINI_MODEL = 'gemini-2.5-flash';

export interface GeminiImage {
  mimeType: string;
  data: string; // base64, no data: prefix
}

export function getGeminiApiKey(): string {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_VISION_API_KEY || '';
}

// Sends images + a prompt and returns the model's text. responseMimeType forces
// raw JSON output (no markdown fences), so the caller can JSON.parse directly.
export async function geminiVisionJSON(opts: {
  system: string;
  prompt: string;
  images: GeminiImage[];
  maxOutputTokens?: number;
  signal?: AbortSignal;
}): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not set');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const parts: Array<Record<string, unknown>> = opts.images.map((img) => ({
    inline_data: { mime_type: img.mimeType, data: img.data },
  }));
  parts.push({ text: opts.prompt });

  const body = JSON.stringify({
    system_instruction: { parts: [{ text: opts.system }] },
    contents: [{ role: 'user', parts }],
    generationConfig: {
      maxOutputTokens: opts.maxOutputTokens ?? 500,
      temperature: 0,
      responseMimeType: 'application/json',
    },
  });

  // Gemini free tier returns transient 429/503/500 under load ("high demand").
  // Retry a few times with backoff so a spike doesn't reject a legitimate photo.
  // The caller's AbortSignal bounds total time.
  const TRANSIENT = new Set([429, 500, 503]);
  const MAX_ATTEMPTS = 4;
  let lastErr = '';
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: opts.signal,
      body,
    });
    if (res.ok) {
      const json = await res.json();
      const outParts: Array<{ text?: string }> = json?.candidates?.[0]?.content?.parts ?? [];
      return outParts.map((p) => p.text ?? '').join('');
    }
    lastErr = `Gemini ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`;
    if (!TRANSIENT.has(res.status) || attempt === MAX_ATTEMPTS - 1) break;
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }
  throw new Error(lastErr || 'Gemini request failed');
}
