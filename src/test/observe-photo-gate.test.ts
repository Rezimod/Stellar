// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ db: vi.fn(), rows: vi.fn() }));
vi.mock('@/lib/db', () => ({ getDb: mocks.db }));
import { GET } from '@/app/api/observe/photo/[hash]/route';

const hash = '0x' + 'a'.repeat(40);
const get = (h = hash) =>
  GET(new NextRequest(`http://localhost/api/observe/photo/${h}`), { params: Promise.resolve({ hash: h }) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.db.mockReturnValue({
    select: () => ({ from: () => ({ where: () => ({ limit: mocks.rows }) }) }),
  });
});

it('rejects a malformed hash', async () => {
  expect((await get('not-a-hash')).status).toBe(400);
});

it('does not serve a stored photo no observation stands behind', async () => {
  mocks.rows.mockResolvedValueOnce([]);
  const res = await get();
  expect(res.status).toBe(404);
  // No year-long cache on a refusal; the photo may become public later.
  expect(res.headers.get('cache-control')).toBeNull();
  // The photo row itself was never read.
  expect(mocks.rows).toHaveBeenCalledOnce();
});

it('serves the photo once an observation references it', async () => {
  mocks.rows
    .mockResolvedValueOnce([{ id: 'obs' }])
    .mockResolvedValueOnce([{ mimeType: 'image/jpeg', imageBase64: Buffer.from('jpeg-bytes').toString('base64') }]);
  const res = await get();
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toBe('image/jpeg');
  expect(Buffer.from(await res.arrayBuffer()).toString()).toBe('jpeg-bytes');
});
