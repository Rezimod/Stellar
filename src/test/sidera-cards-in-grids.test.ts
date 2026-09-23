// @vitest-environment node
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import HolderCollection from '@/components/sidera/HolderCollection';
import ShopCard from '@/components/sidera/ShopCard';
import type { HolderEdition } from '@/lib/sidera/repo';

const edition = (designation: string, editionNumber: number): HolderEdition => ({
  editionId: `${designation}-${editionNumber}`,
  designation,
  name: designation,
  editionNumber,
  editionSize: 30,
  rarity: 'epic',
  observationStatus: 'eligible',
  latest: null,
  history: [],
});

it('puts the printed card on the floor, without the survey callouts', () => {
  const html = renderToStaticMarkup(createElement(ShopCard, { designation: 'SATURN', name: 'Saturn', rarity: 'epic', sub: '30 of 30 left', price: '$22', tag: 'Tonight' }));
  expect(html).toContain('sd-card');
  expect(html).toContain('sd-card__layer--object');
  expect(html).not.toContain('sd-card__layer--survey');
  expect(html).toContain('30 of 30 left');
  expect(html).toContain('Tonight');
  expect(html).toContain('href="/card/SATURN"');
});

it('shows each held edition as its card, number and all', () => {
  const html = renderToStaticMarkup(createElement(HolderCollection, { editions: [edition('SATURN', 12)] }));
  expect(html).toContain('sd-card');
  expect(html).toContain('SATURN · No. 012');
  expect(html).toContain('Not yet photographed');
});

it('falls back to the plate for an edition whose card left the set', () => {
  const html = renderToStaticMarkup(createElement(HolderCollection, { editions: [edition('TYCHO', 4)] }));
  expect(html).toContain('sd-plate');
  expect(html).toContain('No. 004');
});
