// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const mocks = vi.hoisted(() => ({ db: vi.fn(), readSetSupply: vi.fn(), holderView: vi.fn(), cardAvailability: vi.fn() }));
vi.mock('@/lib/db', () => ({ getDb: mocks.db }));
vi.mock('@/lib/sidera/capsule', () => ({ readSetSupply: mocks.readSetSupply }));
vi.mock('@/lib/sidera/repo', () => ({ holderView: mocks.holderView }));
vi.mock('@/lib/sidera/orders', () => ({ cardAvailability: mocks.cardAvailability }));
// Client components: a Privy session sits behind both, and neither is what
// these pages are being tested for.
vi.mock('@/components/sidera/SideraShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => createElement('div', null, children),
}));
vi.mock('@/components/sidera/SideraBuyCard', () => ({
  default: ({ available, released }: { available: boolean; released: boolean }) =>
    createElement('p', null, !released ? 'Set not released' : available ? 'Buy this card' : 'Not for sale'),
}));

import Set001Page from '@/app/set/001/page';
import CardPage from '@/app/card/[designation]/page';
import { SET_001_CARDS } from '@/lib/sets/set-001';

const renderSet = async (wallet?: string) =>
  renderToStaticMarkup(await Set001Page({ searchParams: Promise.resolve(wallet ? { wallet } : {}) }));

const renderCard = async (designation: string) =>
  renderToStaticMarkup(await CardPage({ params: Promise.resolve({ designation }) }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.db.mockReturnValue({});
  mocks.readSetSupply.mockResolvedValue(null);
  mocks.cardAvailability.mockResolvedValue(null);
});

it('draws a plate for every card in the set', async () => {
  const html = await renderSet();
  for (const c of SET_001_CARDS) expect(html).toContain(c.seed.designation);
  expect(html).toContain('/card/JUPITER');
});

it('prints how many editions of a card are allocated', async () => {
  mocks.readSetSupply.mockResolvedValue({
    set: 'SET001',
    owedDraws: 0,
    cards: [{ designation: 'JUPITER', rarity: 'rare', editionSize: 100, allocated: 7, remaining: 93 }],
  });
  const html = await renderSet();
  expect(html).toContain('93 of 100 left');
});

it('draws a card the holder does not own as an outline, and their own with its number', async () => {
  mocks.holderView.mockResolvedValue([
    { editionId: 'e1', designation: 'JUPITER', name: 'Jupiter', editionNumber: 4, editionSize: 100, rarity: 'rare', observationStatus: 'eligible', latest: null, history: [] },
  ]);
  const html = await renderSet('holder-1');
  expect(mocks.holderView).toHaveBeenCalledWith({}, 'holder-1');
  expect(html).toContain('No. 004');
  expect(html).toContain('sd-tile--dim');
  expect(html).toContain('Not held');
});

it('shows a card’s record, its observation verdict and its rarity', async () => {
  const html = await renderCard('JUPITER');
  expect(html).toContain('Jupiter');
  expect(html).toContain('JUPITER');
  expect(html).toContain('Catalogue');
  expect(html).toContain('Rare');
});

it('refuses a designation that is not in the set', async () => {
  await expect(renderCard('NOT-A-CARD')).rejects.toThrow();
});

it('offers a card for sale only when an edition can be spared', async () => {
  mocks.cardAvailability.mockResolvedValue({ cardId: 'c1', name: 'Jupiter', rarity: 'rare', editionSize: 100, allocated: 7, released: true, available: true });
  expect(await renderCard('JUPITER')).toContain('Buy this card');
  mocks.cardAvailability.mockResolvedValue({ cardId: 'c1', name: 'Jupiter', rarity: 'rare', editionSize: 100, allocated: 100, released: true, available: false });
  expect(await renderCard('JUPITER')).toContain('Not for sale');
});

it('sells nothing from a set that is still a draft', async () => {
  mocks.cardAvailability.mockResolvedValue({ cardId: 'c1', name: 'Jupiter', rarity: 'rare', editionSize: 100, allocated: 0, released: false, available: false });
  expect(await renderCard('JUPITER')).toContain('Set not released');
});
