import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getRareEvents, getUpcomingEvents } from '@/lib/astro-events';

vi.mock('@/lib/kill-switch', () => ({ paused: () => null }));
vi.mock('@/lib/network-guard', () => ({ networkMisconfig: () => null }));
vi.mock('@/lib/api-auth', () => ({
  verifyPrivy: vi.fn().mockResolvedValue(null),
  assertOwnsWallet: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/lib/mint-nft', () => ({ mintCompressedNFT: vi.fn() }));

describe('value-route security', () => {
  afterEach(() => vi.clearAllMocks());

  it('rejects public demo mint requests before spending server funds', async () => {
    const { POST } = await import('@/app/api/mint/route');
    const req = new NextRequest('http://localhost/api/mint', {
      method: 'POST',
      body: JSON.stringify({ demo: true }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  }, 15_000);

  it('requires an authenticated session for real mints', async () => {
    const { POST } = await import('@/app/api/mint/route');
    const req = new NextRequest('http://localhost/api/mint', {
      method: 'POST',
      body: JSON.stringify({ userAddress: '11111111111111111111111111111111' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

describe('astronomy event filtering', () => {
  it('does not show rare events that already passed', () => {
    const events = getRareEvents(new Date('2026-08-24T00:00:00Z'));
    expect(events.map((event) => event.date)).toEqual(['2026-08-28']);
  });

  it('keeps an event visible for its whole calendar date', () => {
    const events = getUpcomingEvents(new Date('2026-08-28T23:00:00Z'), 0);
    expect(events.map((event) => event.date)).toContain('2026-08-28');
  });
});
