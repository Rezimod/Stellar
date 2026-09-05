// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), owns: vi.fn(), limit: vi.fn(), vision: vi.fn() }));
vi.mock('@/lib/api-auth', () => ({ verifyPrivy: mocks.auth, assertOwnsWallet: mocks.owns }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.limit, verifyRateLimit: {}, verifyDailyLimit: {} }));
vi.mock('@/lib/db', () => ({ getDb: () => null }));
vi.mock('@/lib/gemini-vision', () => ({ geminiVisionJSON: mocks.vision }));
vi.mock('@/lib/reverse-image', () => ({
  checkReverseImage: async () => ({ matchCount: 0, sampleUrls: [], skipped: true }),
}));
vi.mock('@/lib/exif', () => ({ extractExif: async () => null }));
vi.mock('@/lib/kill-switch', () => ({ paused: () => null }));
import { POST } from '@/app/api/observe/verify/route';

// A JPEG header on 12 KB of padding: passes the magic-byte and size checks.
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(12_000, 1)]);

function request(fields: Record<string, string> = {}) {
  const fd = new FormData();
  fd.append('file', new File([JPEG], 'sky.jpg', { type: 'image/jpeg' }));
  fd.append('lat', '41.71');
  fd.append('lon', '44.83');
  fd.append('wallet', 'wallet');
  fd.append('capturedAt', new Date().toISOString());
  fd.append('uploadSource', 'camera');
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return POST(new NextRequest('http://localhost/api/observe/verify', { method: 'POST', body: fd }));
}

const moonAnalysis = JSON.stringify({
  target: 'moon',
  identifiedObject: 'Waxing Gibbous Moon',
  estimatedCloudCover: 10,
  isScreenshot: false,
  isAiGenerated: false,
  hasNightSkyCharacteristics: true,
  sharpness: 'medium',
  reason: 'A real phone photo of the Moon.',
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('OBSERVATION_TOKEN_SECRET', 'test-secret-for-tokens');
  // Open-Meteo is unreachable in tests; the route degrades to "weather unavailable".
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));
  mocks.auth.mockResolvedValue('owner');
  mocks.owns.mockResolvedValue(true);
  mocks.limit.mockResolvedValue({ success: true, remaining: 4 });
  mocks.vision.mockResolvedValue(moonAnalysis);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it('refuses anonymous verification before rate limiting or vision', async () => {
  mocks.auth.mockResolvedValue(null);
  expect((await request()).status).toBe(401);
  expect(mocks.limit).not.toHaveBeenCalled();
  expect(mocks.vision).not.toHaveBeenCalled();
});

it('refuses a wallet the session does not own', async () => {
  mocks.owns.mockResolvedValue(false);
  expect((await request()).status).toBe(403);
  expect(mocks.vision).not.toHaveBeenCalled();
});

it.each([
  ['garbage', 'not-a-date'],
  ['an hour in the future', new Date(Date.now() + 3_600_000).toISOString()],
  ['two days old', new Date(Date.now() - 48 * 3_600_000).toISOString()],
])('rejects an implausible capture time (%s) without spending a vision call', async (_label, capturedAt) => {
  const res = await request({ capturedAt });
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ accepted: false, rejectionReason: 'timestamp_invalid' });
  expect(mocks.vision).not.toHaveBeenCalled();
});

it('signs a stale camera claim as an upload', async () => {
  const res = await request({ capturedAt: new Date(Date.now() - 2 * 3_600_000).toISOString() });
  const body = await res.json();
  expect(body.metadata.uploadSource).toBe('upload');
});

it('keeps a fresh camera capture as camera', async () => {
  const body = await (await request()).json();
  expect(body.metadata.uploadSource).toBe('camera');
  expect(mocks.vision).toHaveBeenCalledOnce();
});
