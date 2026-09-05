// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ db: vi.fn(), rate: vi.fn(), queue: vi.fn() }));
vi.mock('@/lib/api-auth', () => ({ verifyPrivy: async () => 'owner' }));
vi.mock('@/lib/db', () => ({ getDb: mocks.db }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.rate, observatoryRequestRateLimit: {}, firstLightPosterRateLimit: {} }));
vi.mock('@/lib/observatory/requests', () => ({ placeRequest: mocks.queue, cancelRequest: vi.fn() }));
import { POST } from '@/app/api/first-light/route';
import { GET as poster } from '@/app/api/first-light/poster/route';

const valid = { recipient: 'Test', tier: 'digital', commissioned: false, placeId: 'tbilisi', targetId: 'saturn', moment: '2019-03-14T21:00:00.000Z' };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rate.mockResolvedValue({ success: true, reset: Date.now() + 60_000 });
  mocks.db.mockReturnValue(null);
});

it.each([null, [], { ...valid, tier: '__proto__' }, { ...valid, tier: 'constructor' }, { ...valid, moment: '2026-02-30T21:00:00.000Z' }])('rejects malformed orders before storage %j', async (body) => {
  const response = await POST(new NextRequest('http://localhost/api/first-light', { method: 'POST', body: JSON.stringify(body) }));
  expect(response.status).toBe(400);
  expect(mocks.db).not.toHaveBeenCalled();
  expect(mocks.queue).not.toHaveBeenCalled();
});

it('prices orders using the server catalogue', async () => {
  const values = vi.fn(() => ({ returning: async () => [{ id: 'new-order' }] }));
  mocks.db.mockReturnValue({ insert: () => ({ values }) });
  const response = await POST(new NextRequest('http://localhost/api/first-light', { method: 'POST', body: JSON.stringify({ ...valid, priceTetri: 1 }) }));
  expect(response.status).toBe(201);
  expect(values).toHaveBeenCalledWith(expect.objectContaining({ priceTetri: 6000 }));
});

it('does not silently print Tbilisi for an invalid place', async () => {
  const response = await poster(new NextRequest('http://localhost/api/first-light/poster?place=unknown&target=saturn&at=2019-03-14T21:00:00Z'));
  expect(response.status).toBe(400);
  expect(mocks.rate).not.toHaveBeenCalled();
});

it('limits expensive poster renders and supplies a retry time', async () => {
  mocks.rate.mockResolvedValue({ success: false, reset: Date.now() + 60_000 });
  const response = await poster(new NextRequest('http://localhost/api/first-light/poster?place=tbilisi&target=saturn&at=2019-03-14T21:00:00Z'));
  expect(response.status).toBe(429);
  expect(Number(response.headers.get('Retry-After'))).toBeGreaterThan(0);
});

it('does not bypass rendering limits when Redis fails', async () => {
  mocks.rate.mockRejectedValue(new Error('offline'));
  const response = await poster(new NextRequest('http://localhost/api/first-light/poster?place=tbilisi&target=saturn&at=2019-03-14T21:00:00Z'));
  expect(response.status).toBe(503);
});
