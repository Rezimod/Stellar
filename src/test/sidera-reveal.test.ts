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

const render = (cards: RevealedCard[]) => renderToStaticMarkup(createElement(SideraReveal, { cards }));

it('pitches the descent to the scarcest card in the capsule', () => {
  const html = render([card('TYCHO', 'rare', 0), card('SATURN', 'legendary', 1), card('PLATO', 'common', 2)]);
  expect(html).toContain('sd-reveal--legendary');
  expect(html).not.toContain('sd-reveal--common');
});

it('falls the shortest way when nothing scarce came out', () => {
  expect(render([card('PLATO', 'common', 0)])).toContain('sd-reveal--common');
});

it('takes each card’s observation status from the set, not from the draw', () => {
  // Europa is epic and cannot be resolved from Node 01; the reveal must not
  // imply otherwise just because the opening did not say.
  const html = render([card('EUROPA', 'epic', 0)]);
  expect(html).toContain('Not observable');
});

it('prints the edition number it was allocated', () => {
  expect(render([card('TYCHO', 'rare', 0)])).toContain('003 / 100');
});
