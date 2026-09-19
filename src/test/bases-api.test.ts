// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { PieceRow } from '@/lib/base-pieces';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), list: vi.fn(), insert: vi.fn(), del: vi.fn(), limit: vi.fn() }));
vi.mock('@/lib/api-auth', () => ({ verifyPrivy: mocks.auth }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.limit, basePlaceRateLimit: {} }));
vi.mock('@/lib/base-pieces', () => ({ listPieces: mocks.list, insertPiece: mocks.insert, deletePiece: mocks.del }));
import { GET, POST } from '@/app/api/bases/route';
import { DELETE } from '@/app/api/bases/[id]/route';

const ID = '3f2b8c1e-6a4d-4e0f-9b7a-1c2d3e4f5a6b';
const row = (over: Partial<PieceRow> = {}): PieceRow => ({
  id: ID, world: 'moon', scope: 'colony', ownerPrivyId: 'did:privy:other', module: 'habitat', x: 91, z: 8, yaw: 0, createdAt: new Date(0), ...over,
});
const get = (world = 'moon') => GET(new NextRequest(`http://localhost/api/bases?world=${world}`));
const post = (body: unknown) => POST(new NextRequest('http://localhost/api/bases', { method: 'POST', body: JSON.stringify(body) }));
const del = (id: string) => DELETE(new NextRequest(`http://localhost/api/bases/${id}`, { method: 'DELETE' }), { params: Promise.resolve({ id }) });
// On the colony's grid, clear of the piece in `row()`.
const good = { world: 'moon', scope: 'colony', module: 'battery', x: 97, z: 9, yaw: 0 };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue('did:privy:me');
  mocks.limit.mockResolvedValue({ success: true, remaining: 10, reset: 0 });
  mocks.list.mockResolvedValue([row()]);
  mocks.insert.mockImplementation(async (p: Omit<PieceRow, 'id' | 'createdAt'>) => ({ ...p, id: ID, createdAt: new Date(0) }));
  mocks.del.mockResolvedValue('deleted');
});

describe('GET /api/bases', () => {
  it('shows the colony to anyone, without saying whose pieces are whose', async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await get();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(mocks.list).toHaveBeenCalledWith('moon', null);
    expect(body.signedIn).toBe(false);
    expect(body.pieces).toEqual([{ id: ID, scope: 'colony', module: 'habitat', x: 91, z: 8, yaw: 0, mine: false }]);
    expect(JSON.stringify(body)).not.toContain('did:privy');
  });

  it('marks the caller’s own pieces', async () => {
    mocks.list.mockResolvedValue([row({ ownerPrivyId: 'did:privy:me', scope: 'private', x: -21, z: 110 })]);
    const body = await (await get()).json();
    expect(mocks.list).toHaveBeenCalledWith('moon', 'did:privy:me');
    expect(body.pieces[0].mine).toBe(true);
  });

  it('refuses an unknown world and says when the store is down', async () => {
    expect((await get('venus')).status).toBe(400);
    mocks.list.mockResolvedValue(null);
    expect((await get()).status).toBe(503);
  });
});

describe('POST /api/bases', () => {
  it('places a valid piece for a signed-in player', async () => {
    const res = await post(good);
    expect(res.status).toBe(201);
    expect(mocks.insert).toHaveBeenCalledWith({ world: 'moon', scope: 'colony', ownerPrivyId: 'did:privy:me', module: 'battery', x: 97, z: 9, yaw: 0 });
    expect((await res.json()).piece.mine).toBe(true);
  });

  it('needs a session, and rate limits by account', async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await post(good)).status).toBe(401);
    mocks.auth.mockResolvedValue('did:privy:me');
    mocks.limit.mockResolvedValue({ success: false, remaining: 0, reset: 0 });
    expect((await post(good)).status).toBe(429);
    expect(mocks.limit).toHaveBeenCalledWith({}, 'base:did:privy:me');
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('rejects malformed bodies', async () => {
    for (const bad of [null, 'x', { ...good, world: 'venus' }, { ...good, scope: 'public' }, { ...good, x: '96' }, { ...good, module: 7 }]) {
      expect((await post(bad)).status).toBe(400);
    }
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('rejects an unknown module, a spot off the grid, outside the site or off a quarter turn', async () => {
    for (const bad of [
      { ...good, module: 'laser' },
      { ...good, x: 97.5 },
      { ...good, x: 1, z: -5 },
      { ...good, scope: 'private' },
      { ...good, yaw: 0.3 },
      { ...good, x: Number.MAX_VALUE },
    ]) {
      const res = await post(bad);
      expect(res.status).toBe(400);
    }
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('refuses a piece on top of someone else’s in the colony', async () => {
    const res = await post({ ...good, x: 93 });
    expect(res.status).toBe(409);
    expect((await res.json()).problem).toBe('overlap');
  });

  it('ignores other players’ private pieces when checking overlap', async () => {
    mocks.list.mockResolvedValue([row({ scope: 'private', x: -21, z: 110, ownerPrivyId: 'did:privy:other' })]);
    expect((await post({ ...good, scope: 'private', module: 'habitat', x: -21, z: 110 })).status).toBe(201);
  });

  it('caps pieces per player, and the colony as a whole', async () => {
    const mine = Array.from({ length: 40 }, (_, i) => row({ ownerPrivyId: 'did:privy:me', x: 71 + (i % 8) * 6, z: -12 + Math.floor(i / 8) * 4 }));
    mocks.list.mockResolvedValue(mine);
    const res = await post(good);
    expect(res.status).toBe(409);
    expect((await res.json()).problem).toBe('cap');
    mocks.list.mockResolvedValue(Array.from({ length: 2000 }, (_, i) => row({ id: String(i), x: 1000 + i })));
    expect((await post(good)).status).toBe(409);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('says when the store is down', async () => {
    mocks.list.mockResolvedValue(null);
    expect((await post(good)).status).toBe(503);
    mocks.list.mockResolvedValue([]);
    mocks.insert.mockResolvedValue(null);
    expect((await post(good)).status).toBe(503);
  });
});

describe('DELETE /api/bases/:id', () => {
  it('removes the caller’s own piece', async () => {
    const res = await del(ID);
    expect(res.status).toBe(200);
    expect(mocks.del).toHaveBeenCalledWith(ID, 'did:privy:me');
  });

  it('refuses without a session, for someone else’s piece, or a bad id', async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await del(ID)).status).toBe(401);
    mocks.auth.mockResolvedValue('did:privy:me');
    mocks.del.mockResolvedValue('not_owner');
    expect((await del(ID)).status).toBe(403);
    mocks.del.mockResolvedValue('not_found');
    expect((await del(ID)).status).toBe(404);
    expect((await del('../etc')).status).toBe(404);
    mocks.del.mockResolvedValue('unavailable');
    expect((await del(ID)).status).toBe(503);
  });
});
