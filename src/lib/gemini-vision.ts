// Free-tier vision via Google Gemini, called over REST so we add no npm deps.
// Used by /api/observe/verify to analyze observation photos in place of the
// (paid) Claude Sonnet vision call. Get a free key at
// https://aistudio.google.com/apikey and set GEMINI_API_KEY.

const GEMINI_MODEL = 'gemini-2.0-flash';

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

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: opts.signal,
    body: JSON.stringify({
      system_instruction: { parts: [{ text: opts.system }] },
      contents: [{ role: 'user', parts }],
      generationConfig: {
        maxOutputTokens: opts.maxOutputTokens ?? 500,
        temperature: 0,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = await res.json();
  const parts2: Array<{ text?: string }> = json?.candidates?.[0]?.content?.parts ?? [];
  return parts2.map((p) => p.text ?? '').join('');
}
