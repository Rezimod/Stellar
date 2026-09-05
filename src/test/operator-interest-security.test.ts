// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), inserted: vi.fn(), update: vi.fn(), values: vi.fn(), set: vi.fn() }));
vi.mock('@/lib/api-auth', () => ({ verifyPrivy: mocks.auth }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: async () => ({ success: true }), operatorInterestRateLimit: {} }));
vi.mock('@/lib/db', () => ({
  getDb: () => ({
    insert: () => ({
      values: (row: unknown) => {
        mocks.values(row);
        return { onConflictDoNothing: () => ({ returning: mocks.inserted }) };
      },
    }),
    update: () => ({
      set: (patch: unknown) => {
        mocks.set(patch);
        return { where: mocks.update };
      },
    }),
  }),
}));
import { POST } from '@/app/api/observatory/operator/interest/route';

const body = { email: 'Owner@Example.ge', city: 'Tbilisi', telescope: 'NexStar 6SE', note: 'roof' };
const post = (b: unknown = body) =>
  POST(new NextRequest('http://localhost/api/observatory/operator/interest', { method: 'POST', body: JSON.stringify(b) }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue(null);
  mocks.inserted.mockResolvedValue([{ id: 'new' }]);
  mocks.update.mockResolvedValue(undefined);
});

it('registers a new telescope, lower-casing the email', async () => {
  expect((await post()).status).toBe(201);
  expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({ email: 'owner@example.ge', privyId: null }));
  expect(mocks.set).not.toHaveBeenCalled();
});

it('does not let a stranger overwrite an address already on the list', async () => {
  mocks.inserted.mockResolvedValue([]);
  const res = await post({ ...body, telescope: 'Replaced by someone else' });
  expect(res.status).toBe(201);
  expect(mocks.set).not.toHaveBeenCalled();
});

it('lets the account that registered an address update its gear', async () => {
  mocks.auth.mockResolvedValue('owner');
  mocks.inserted.mockResolvedValue([]);
  expect((await post({ ...body, mount: 'AVX' })).status).toBe(201);
  expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ mount: 'AVX', telescope: 'NexStar 6SE' }));
  expect(mocks.update).toHaveBeenCalledOnce();
});

it('rejects a registration without the required fields', async () => {
  expect((await post({ email: 'x' })).status).toBe(400);
  expect(mocks.values).not.toHaveBeenCalled();
});
