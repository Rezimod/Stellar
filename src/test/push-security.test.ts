// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { isAllowedPushEndpoint } from '@/lib/push/validation';

const mocks = vi.hoisted(() => ({ insert: vi.fn(), send: vi.fn(), rate: vi.fn() }));
vi.mock('@/lib/db', () => ({ getDb: () => ({ insert: mocks.insert }) }));
vi.mock('@/lib/rate-limit', () => ({ pushSubscribeRateLimit: {}, checkRateLimit: mocks.rate }));
vi.mock('web-push', () => ({ default: { sendNotification: mocks.send, setVapidDetails: vi.fn() } }));
import { POST } from '@/app/api/push/subscribe/route';
import { sendPush } from '@/lib/push/send';

const keys = { p256dh: Buffer.alloc(65, 4).toString('base64url'), auth: Buffer.alloc(16, 1).toString('base64url') };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rate.mockResolvedValue({ success: true });
  mocks.insert.mockReturnValue({ values: () => ({ onConflictDoUpdate: async () => undefined }) });
});

describe('push destination restrictions', () => {
  it.each([
    'https://127.0.0.1/private', 'https://[::1]/', 'https://169.254.169.254/',
    'https://internal.example/', 'https://fcm.googleapis.com.evil.test/send',
    'https://fcm.googleapis.com@evil.test/', 'https://fcm.googleapis.com:8443/send',
    'https://evilpush.apple.com/', 'http://fcm.googleapis.com/send', 'https://fcm.googleapis.com/send#secret',
  ])('rejects %s', (endpoint) => expect(isAllowedPushEndpoint(endpoint)).toBe(false));

  it.each(['https://fcm.googleapis.com/fcm/send/token', 'https://updates.push.services.mozilla.com/wpush/v2/token', 'https://web.push.apple.com/token', 'https://wns2-bl2p.notify.windows.com/w/?token'])('allows provider %s', (endpoint) => {
    expect(isAllowedPushEndpoint(endpoint)).toBe(true);
  });

  it.each([null, [], { endpoint: 'https://127.0.0.1/', keys }, { endpoint: 'https://fcm.googleapis.com/token', keys: { ...keys, auth: {} } }])('rejects invalid subscriptions before writing %j', async (body) => {
    const response = await POST(new NextRequest('http://localhost/api/push/subscribe', { method: 'POST', body: JSON.stringify(body) }));
    expect(response.status).toBe(400);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('stores a valid browser subscription', async () => {
    const response = await POST(new NextRequest('http://localhost/api/push/subscribe', { method: 'POST', body: JSON.stringify({ endpoint: 'https://fcm.googleapis.com/token', keys }) }));
    expect(response.status).toBe(200);
    expect(mocks.insert).toHaveBeenCalledOnce();
  });

  it('blocks previously stored unsafe endpoints at send time', async () => {
    expect(await sendPush({ endpoint: 'https://127.0.0.1/private', ...keys }, { title: 'Test', body: 'Test' })).toBe('error');
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
