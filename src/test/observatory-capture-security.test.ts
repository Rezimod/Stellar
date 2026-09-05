// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), reservation: vi.fn(), record: vi.fn(), limit: vi.fn() }));
vi.mock('@/lib/api-auth', () => ({ verifyPrivy: mocks.auth }));
vi.mock('@/lib/observatory/reservations', () => ({ reservationById: mocks.reservation }));
vi.mock('@/lib/observatory/captures', () => ({ recordCapture: mocks.record, capturesForSession: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.limit, observatoryCaptureRateLimit: {} }));
import { POST } from '@/app/api/observatory/capture/route';

const valid = { sessionId: 'session', targetId: 'saturn', targetName: 'Forged target', exposureSec: 0.01, subs: 10 };
const request = (body: unknown) => POST(new NextRequest('http://localhost/api/observatory/capture', { method: 'POST', body: JSON.stringify(body) }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue('owner');
  mocks.limit.mockResolvedValue({ success: true });
  mocks.reservation.mockResolvedValue({ id: 'session', privyId: 'owner', nodeId: 'tbilisi-01', startsAt: new Date(Date.now() - 60_000).toISOString(), endsAt: new Date(Date.now() + 600_000).toISOString() });
  mocks.record.mockResolvedValue({ recorded: true, capture: {}, admitted: false, reason: 'simulated' });
});

it.each([null, [], { ...valid, targetId: 'made-up' }, { ...valid, subs: 1.5 }, { ...valid, exposureSec: -1 }])('rejects malformed captures %j', async (body) => {
  expect((await request(body)).status).toBe(400);
  expect(mocks.record).not.toHaveBeenCalled();
});

it('rejects another account’s session', async () => {
  mocks.reservation.mockResolvedValue({ privyId: 'someone-else' });
  expect((await request(valid)).status).toBe(404);
  expect(mocks.record).not.toHaveBeenCalled();
});

it('records browser captures as simulations with the canonical target name', async () => {
  expect((await request({ ...valid, provenance: 'instrument' })).status).toBe(201);
  expect(mocks.record).toHaveBeenCalledWith(expect.objectContaining({ targetName: 'Saturn', provenance: 'simulated', privyId: 'owner' }));
});

it('caps capture writes before database access', async () => {
  mocks.limit.mockResolvedValue({ success: false });
  expect((await request(valid)).status).toBe(429);
  expect(mocks.reservation).not.toHaveBeenCalled();
});
