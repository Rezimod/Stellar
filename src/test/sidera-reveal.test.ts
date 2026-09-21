// @vitest-environment node
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import SideraReveal, { type RevealedCard } from '@/components/sidera/SideraReveal';

const card = (designation: string, rarity: string, drawIndex: number): RevealedCard => ({
  drawIndex,
  designation,
  name: designation,
  rarity,
  editionNumber: 3,
  editionSize: 100,
});

const render = (cards: RevealedCard[]) =>
  renderToStaticMarkup(
    createElement(SideraReveal, { draw: { sequence: 1, secret: 'abcdef0123456789', nonce: 'fedcba9876543210', cards } }),
  );

it('pitches the descent to the scarcest card in the capsule', () => {
  const html = render([card('TYCHO', 'rare', 0), card('SATURN', 'legendary', 1), card('PLATO', 'common', 2)]);
  expect(html).toContain('sd-reveal--legendary');
  expect(html).not.toContain('sd-reveal--common');
});

it('falls the shortest way when nothing scarce came out', () => {
  expect(render([card('PLATO', 'common', 0)])).toContain('sd-reveal--common');
});

it('prints the edition number it was allocated', () => {
  expect(render([card('TYCHO', 'rare', 0)])).toContain('No. 003');
});

it('draws the commonest card first so the last one out is the best', () => {
  const html = render([card('SATURN', 'legendary', 0), card('PLATO', 'common', 1), card('TYCHO', 'rare', 2)]);
  expect(html.indexOf('PLATO')).toBeLessThan(html.indexOf('TYCHO'));
  expect(html.indexOf('TYCHO')).toBeLessThan(html.indexOf('SATURN'));
  expect(html).toContain('sd-reveal__card--best');
});

it('prints the draw’s own provenance so it can be checked', () => {
  const html = render([card('TYCHO', 'rare', 0)]);
  expect(html).toContain('seed abcdef01');
  expect(html).toContain('client fedcba98');
  expect(html).toContain('/capsules/log');
});
