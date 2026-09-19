// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const mocks = vi.hoisted(() => ({ db: vi.fn(), readFullLog: vi.fn(), capsulesOnSale: vi.fn(), verifyCapsule: vi.fn() }));
vi.mock('@/lib/db', () => ({ getDb: mocks.db }));
vi.mock('@/lib/sidera/capsule', () => ({
  readFullLog: mocks.readFullLog,
  capsulesOnSale: mocks.capsulesOnSale,
  readSetSupply: vi.fn(),
}));
vi.mock('@/lib/sidera/randomness', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/sidera/randomness')>()),
  verifyCapsule: mocks.verifyCapsule,
}));
vi.mock('@/components/sidera/SideraShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => createElement('div', null, children),
}));
vi.mock('@/components/sidera/SideraVerify', () => ({ default: () => createElement('p', null, 'Verify again') }));
vi.mock('@/components/sidera/SideraBuyCapsule', () => ({ default: () => createElement('p', null, 'Buy capsule') }));

import CapsuleRecordPage from '@/app/capsule/[id]/page';
import LogPage from '@/app/capsules/log/page';
import CapsulesPage from '@/app/capsules/page';

const ID = '11111111-2222-4333-8444-555555555555';
const listed = { seq: 1, capsuleId: ID, capsuleSequence: 4, event: 'listed', commitment: 'a'.repeat(64), buyerWallet: null, buyerNonce: null, purchaseHash: null, outcome: null, at: '2026-09-19T21:00:00.000Z' };
const purchased = { ...listed, seq: 2, event: 'purchased', commitment: null, buyerNonce: 'b'.repeat(64), purchaseHash: 'c'.repeat(64), outcome: null, at: '2026-09-19T21:05:00.000Z' };
const opened = {
  ...listed,
  seq: 3,
  event: 'opened',
  commitment: null,
  at: '2026-09-19T21:06:00.000Z',
  outcome: {
    secret: 'd'.repeat(64),
    draws: 3,
    oddsBps: { common: 7900, rare: 1650, epic: 400, legendary: 50 },
    supply: [],
    pulls: [{ drawIndex: 0, designation: 'TYCHO', rarity: 'rare', editionNumber: 12 }],
  },
};

const render = async (id: string) => renderToStaticMarkup(await CapsuleRecordPage({ params: Promise.resolve({ id }) }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.db.mockReturnValue({});
  mocks.verifyCapsule.mockReturnValue({ ok: true, problems: [] });
});

it('refuses an id that is not a capsule id', async () => {
  await expect(render('not-an-id')).rejects.toThrow();
  expect(mocks.readFullLog).not.toHaveBeenCalled();
});

it('keeps a sealed capsule sealed on its public record', async () => {
  mocks.readFullLog.mockResolvedValue([listed]);
  const html = await render(ID);
  expect(html).toContain('Sealed until it is opened');
  expect(html).not.toContain('Checks out');
});

it('shows the draws and the verdict once a capsule is opened', async () => {
  mocks.readFullLog.mockResolvedValue([listed, purchased, opened]);
  const html = await render(ID);
  expect(mocks.verifyCapsule).toHaveBeenCalledWith(
    expect.objectContaining({ commitment: 'a'.repeat(64), nonce: 'b'.repeat(64), capsuleId: ID, secret: 'd'.repeat(64) }),
  );
  expect(html).toContain('Checks out');
  expect(html).toContain('TYCHO');
  expect(html).toContain('012');
});

it('reports a capsule that does not check out, with the reason', async () => {
  mocks.verifyCapsule.mockReturnValue({ ok: false, problems: ['the secret does not match the commitment'] });
  mocks.readFullLog.mockResolvedValue([listed, purchased, opened]);
  const html = await render(ID);
  expect(html).toContain('Does not check out');
  expect(html).toContain('the secret does not match the commitment');
});

it('lists the log newest first, with its audit', async () => {
  mocks.readFullLog.mockResolvedValue([listed, purchased, opened]);
  const html = renderToStaticMarkup(await LogPage());
  const rows = html.slice(html.indexOf('<tbody'));
  expect(rows.indexOf('Opened')).toBeLessThan(rows.indexOf('Listed'));
  expect(html).toContain('Verified');
  expect(html).toContain(`/capsule/${ID}`);
});

it('says so plainly when no capsule is on sale', async () => {
  mocks.capsulesOnSale.mockResolvedValue([]);
  const html = renderToStaticMarkup(await CapsulesPage());
  expect(html).toContain('No capsule is on sale right now');
});
