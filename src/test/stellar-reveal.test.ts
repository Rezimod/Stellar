// @vitest-environment node
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import StellarReveal, { type RevealedCard } from '@/components/stellar/StellarReveal';

const card = (designation: string, rarity: string, drawIndex: number): RevealedCard => ({
  drawIndex,
  designation,
  name: designation,
  rarity,
  editionNumber: 3,
  editionSize: 100,
});

const render = (cards: RevealedCard[], extra: Record<string, unknown> = {}) =>
  renderToStaticMarkup(
    createElement(StellarReveal, { draw: { sequence: 1, secret: 'abcdef0123456789', nonce: 'fedcba9876543210', cards, ...extra } }),
  );

it('waits on the star for one press', () => {
  const html = render([card('EUROPA', 'common', 0)]);
  expect(html).toContain('class="sn-go"');
  expect(html).toContain('Ignite');
  expect(html).toContain('data-sn="sky"');
});

it('gives the scarcest card in the capsule', () => {
  const html = render([card('M31', 'rare', 0), card('SATURN', 'legendary', 1), card('EUROPA', 'common', 2)]);
  expect(html).toContain('data-rarity="legendary"');
  expect(html).not.toContain('data-rarity="common"');
});

it('keeps the other cards of an older two-card capsule beside it', () => {
  const html = render([card('M31', 'rare', 0), card('SATURN', 'epic', 1)]);
  expect(html).toContain('Also in this capsule');
  expect(html).toContain('/card/M31');
  expect(render([card('M31', 'rare', 0)])).not.toContain('Also in this capsule');
});

it('comes out face down, with the sealed back', () => {
  const html = render([card('SATURN', 'epic', 0)]);
  expect(html).toContain('sn-face--back');
  expect(html).toContain('FIRST LIGHT · SEALED');
});

it('shows a First Light card as the printed card, with its edition in plain text', () => {
  const html = render([card('SATURN', 'epic', 0)]);
  expect(html).toContain('sdc-card');
  expect(html).toContain('edition 003 of 030');
  expect(html).toContain('No. 003 / 100');
});

it('prints the draw’s own provenance so it can be checked', () => {
  const html = render([card('M31', 'rare', 0)]);
  expect(html).toContain('seed abcdef01');
  expect(html).toContain('client fedcba98');
  expect(html).toContain('/capsules/log');
});

it('says a preview is only a preview', () => {
  const html = render([card('M31', 'rare', 0)], { preview: 'Iron', secret: undefined, nonce: undefined, sequence: undefined });
  expect(html).toContain('Iron capsule · preview');
  expect(html).toContain('nothing bought, nothing recorded');
});

it('names the opening plainly, with no banned words and no exclamation marks', () => {
  const html = render([card('M31', 'rare', 0)], { preview: 'Iron', secret: undefined, nonce: undefined, sequence: undefined });
  const text = html.replace(/<[^>]+>/g, ' ');
  expect(text).not.toMatch(/\b(NFT|mint|drop|payload|manifest|registry|airdrop)\b/i);
  expect(text).not.toContain('!');
  expect(html).toContain('Open another');
});
