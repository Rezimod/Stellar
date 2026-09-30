// Renders each card's face, frame and all, as it sits on a shelf at rest, to one WebP:
// public/cards/plate/<DESIGNATION>/card.webp. Shelves and the home fan show these instead of
// building the live card (layers, frame SVG, glitter filter, blend modes) a hundred times over.
// Draws CardFront itself, with the set's fonts from Google Fonts; no app server needed.
// Re-run after a plate or the frame changes.
//   npx tsx scripts/sidera-plates/thumbs.tsx [DESIGNATION ...]
import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SET_001_CARDS } from '@/lib/sets/set-001';
import { plateFor } from '@/lib/sidera/plate';

const PUBLIC = path.resolve('public');
const ORIGIN = 'http://cards.local';
const FONTS =
  'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Orbitron:wght@500;600;700&family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=EB+Garamond:ital,wght@0,400..800;1,400..800&display=block';
const only = process.argv.slice(2);
const names = only.length ? only : SET_001_CARDS.map((c) => c.seed.designation);

// The shelf's resting state (foil dark, glitter and glare low), on nothing, so the corners stay clear.
const style = `
  :root { --font-geist: 'Geist'; --font-mono: 'JetBrains Mono'; --font-orbitron: 'Orbitron'; --font-fraunces: 'Fraunces'; --font-garamond: 'EB Garamond'; }
  html, body { margin: 0; background: transparent; }
  .wrap { --px: 0.5; --py: 0.5; width: 360px; }
  ${fs.readFileSync('src/components/sidera/card/sidera-card.css', 'utf8')}
  .sdc-card { box-shadow: none !important; }
  .sdc-foil { opacity: 0 !important; }
  .sdc-glitter { opacity: 0.25 !important; }
  .sdc-glare { opacity: 0.5 !important; }
`;

async function main() {
  // tsx compiles the app's JSX with the classic runtime, which wants React in scope.
  Object.assign(globalThis, { React });
  const { default: CardFront } = await import('@/components/sidera/card/CardFront');
  let html = '';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 600, height: 800 }, deviceScaleFactor: 2 });
  page.setDefaultTimeout(120000);
  await page.route(`${ORIGIN}/**`, (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/') return route.fulfill({ contentType: 'text/html; charset=utf-8', body: html });
    const file = path.join(PUBLIC, decodeURIComponent(url.pathname));
    if (!file.startsWith(PUBLIC) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
    const type = file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.webp') ? 'image/webp' : 'application/octet-stream';
    return route.fulfill({ contentType: type, body: fs.readFileSync(file) });
  });

  for (const name of names) {
    const plate = plateFor(name);
    if (!plate) {
      console.error(`${name}: not in the set`);
      continue;
    }
    const face = renderToStaticMarkup(React.createElement(CardFront, { plate, u: 't' }));
    html = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}"><style>${style}</style></head><body><div class="wrap">${face}</div></body></html>`;
    await page.goto(`${ORIGIN}/`, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const card = page.locator('.sdc-card');
    await card.evaluate((el) => Promise.all([...el.querySelectorAll('img')].map((i) => i.decode().catch(() => {}))));
    const png = await card.screenshot({ omitBackground: true });
    await sharp(png).resize(520).webp({ quality: 80, alphaQuality: 90, effort: 6 }).toFile(path.join(PUBLIC, 'cards/plate', name, 'card.webp'));
    console.log(name);
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
