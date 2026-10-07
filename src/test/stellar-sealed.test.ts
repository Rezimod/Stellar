// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const mocks = vi.hoisted(() => ({ db: vi.fn(), readSetSupply: vi.fn(), holderView: vi.fn(), cardAvailability: vi.fn(), nightRow: vi.fn() }));
vi.mock('@/lib/db', () => ({ getDb: mocks.db }));
vi.mock('@/lib/stellar/repo', () => ({ holderView: mocks.holderView }));
vi.mock('@/lib/stellar/orders', () => ({ cardAvailability: mocks.cardAvailability }));
vi.mock('@/lib/stellar/night', () => ({ nightRow: mocks.nightRow }));
vi.mock('@/components/stellar/StellarShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => createElement('div', null, children),
}));
vi.mock('@/components/stellar/StellarBuyCard', () => ({ default: () => createElement('p', null, 'Buy this card') }));
vi.mock('@/components/stellar/CapsuleCounter', () => ({
  default: ({ cards }: { cards: Array<{ designation: string }> }) => createElement('p', null, `pool:${cards.map((c) => c.designation).join(',')}`),
}));

import Set001Page from '@/app/genesis/page';
import CardPage from '@/app/card/[designation]/page';
import { SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';
import { readSupply } from '@/lib/stellar/capsule';

const ORIONIDS = SET_001_CARD_BY_DESIGNATION.get('ORIONIDS')!;
const afterEnd = new Date(Date.parse(ORIONIDS.record.eventEndUtc!) + 60_000);

const tileOf = (html: string, designation: string) => {
  const at = html.indexOf(`href="/card/${designation}"`);
  return html.slice(at, html.indexOf('</a>', at));
};

beforeEach(() => {
  vi.useFakeTimers({ now: afterEnd, toFake: ['Date'] });
  mocks.db.mockReturnValue(null);
  mocks.cardAvailability.mockResolvedValue({ cardId: 'c1', name: 'The Orionids', rarity: 'common', editionSize: 300, allocated: 0, released: true, sealed: true, available: false });
});
afterEach(() => vi.useRealTimers());

describe('once the Orionids have passed', () => {
  it('the tile says Sealed instead of a price, and the Geminids still sell', async () => {
    const html = renderToStaticMarkup(await Set001Page());
    const sealed = tileOf(html, 'ORIONIDS');
    expect(sealed).toContain('Sealed');
    expect(sealed).not.toContain('$3');
    const open = tileOf(html, 'GEMINIDS');
    expect(open).toContain('$8');
    expect(open).not.toContain('Sealed');
  });

  it('the card page has no buy action', async () => {
    const html = renderToStaticMarkup(await CardPage({ params: Promise.resolve({ designation: 'ORIONIDS' }) }));
    expect(html).not.toContain('Buy this card');
    expect(html).toContain('Sealed');
    const open = renderToStaticMarkup(await CardPage({ params: Promise.resolve({ designation: 'GEMINIDS' }) }));
    expect(open).toContain('Buy this card');
  });

  it('the capsule preview pool leaves it out', async () => {
    const html = renderToStaticMarkup(await Set001Page());
    const pool = html.match(/pool:([A-Z0-9,-]+)/)![1].split(',');
    expect(pool).toHaveLength(104);
    expect(pool).not.toContain('ORIONIDS');
    expect(pool).toContain('GEMINIDS');
  });

  it('the real capsule supply has nothing of it left to draw', async () => {
    const db = {
      execute: vi.fn().mockResolvedValue({
        rows: [
          { id: 'a', designation: 'GEMINIDS', rarity: 'rare', edition_size: 100, allocated: 0 },
          { id: 'b', designation: 'ORIONIDS', rarity: 'common', edition_size: 300, allocated: 12 },
        ],
      }),
    };
    const supply = await readSupply(db as never, 'set-1');
    expect(supply.map((s) => [s.designation, s.remaining])).toEqual([['GEMINIDS', 100], ['ORIONIDS', 0]]);
  });
});
