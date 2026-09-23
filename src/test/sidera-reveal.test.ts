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
  const html = render([card('M31', 'rare', 0), card('SATURN', 'legendary', 1), card('MOON', 'common', 2)]);
  expect(html).toContain('sd-reveal--legendary');
  expect(html).not.toContain('sd-reveal--common');
});

it('falls the shortest way when nothing scarce came out', () => {
  expect(render([card('MOON', 'common', 0)])).toContain('sd-reveal--common');
});

it('prints the edition number it was allocated', () => {
  expect(render([card('M31', 'rare', 0)])).toContain('>003</text>');
});

it('draws the commonest card first so the last one out is the best', () => {
  const html = render([card('SATURN', 'legendary', 0), card('MOON', 'common', 1), card('M31', 'rare', 2)]);
  const at = (d: string) => html.indexOf(`/card/${d}"`);
  expect(at('MOON')).toBeLessThan(at('M31'));
  expect(at('M31')).toBeLessThan(at('SATURN'));
  expect(html).toContain('sd-reveal__card--best');
});

it('prints the draw’s own provenance so it can be checked', () => {
  const html = render([card('M31', 'rare', 0)]);
  expect(html).toContain('seed abcdef01');
  expect(html).toContain('client fedcba98');
  expect(html).toContain('/capsules/log');
});

it('shows a Set 001 card as the printed card, with its edition in plain text', () => {
  const html = render([card('SATURN', 'epic', 0)]);
  expect(html).toContain('sd-card');
  expect(html).toContain('SATURN · No. 003');
  expect(html).toContain('edition 3 of 30');
});
