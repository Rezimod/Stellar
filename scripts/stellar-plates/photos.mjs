/**
 * Card photographs: downloads each image in src/lib/sets/photos.json from Wikimedia
 * Commons, crops it to the card (630:880) around its focus point, and writes
 * public/cards/photo/<DES>.webp (900 px wide) and <DES>-s.webp (400 px, for tiles).
 *
 *   node scripts/stellar-plates/photos.mjs [DES...]
 *
 * Only public-domain, CC0 and CC BY images belong in the manifest — the licence is
 * checked again here against the Commons API and a mismatch stops the run.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const MANIFEST = 'src/lib/sets/photos.json';
const OUT = 'public/cards/photo';
const UA = { 'User-Agent': 'StellarCardsBot/1.0 (cosmonshop@gmail.com)' };
const ALLOWED = /^(public domain|pd|cc0|cc by \d(\.\d)?)$/i;
const RATIO = 630 / 880;

const photos = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const only = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });

async function info(file) {
  const q = new URL('https://commons.wikimedia.org/w/api.php');
  q.search = new URLSearchParams({ action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: '2400', titles: file }).toString();
  const d = await (await fetch(q, { headers: UA })).json();
  const page = Object.values(d.query.pages)[0];
  if (!page.imageinfo) throw new Error(`${file}: not on Commons`);
  const ii = page.imageinfo[0];
  return { url: ii.thumburl ?? ii.url, license: ii.extmetadata?.LicenseShortName?.value ?? '' };
}

/** Crop to the card's shape, keeping the focus point ("x% y%") as central as the edges allow; zoom > 1 cuts closer in. */
async function crop(buf, focus, zoom = 1) {
  let img = sharp(buf).rotate();
  let { width: w, height: h } = await img.metadata();
  // Zoom below 1 steps back from a subject wider than the card: the image is set on black space, which
  // only suits photographs already on black.
  if (zoom < 1) {
    const padY = Math.round(Math.max(w / RATIO / zoom - h, 0) / 2);
    const padX = Math.round(Math.max(h * RATIO / zoom - w, 0) / 2);
    img = sharp(await img.extend({ top: padY, bottom: padY, left: padX, right: padX, background: '#000' }).toBuffer());
    ({ width: w, height: h } = await img.metadata());
    zoom = 1;
  }
  const [fx, fy] = focus.split(' ').map((v) => parseFloat(v) / 100);
  let cw = w, ch = Math.round(w / RATIO);
  if (ch > h) { ch = h; cw = Math.round(h * RATIO); }
  cw = Math.round(cw / zoom); ch = Math.round(ch / zoom);
  const left = Math.round(Math.min(Math.max(fx * w - cw / 2, 0), w - cw));
  const top = Math.round(Math.min(Math.max(fy * h - ch / 2, 0), h - ch));
  return img.extract({ left, top, width: cw, height: ch });
}

for (const [des, p] of Object.entries(photos)) {
  if (only.length && !only.includes(des)) continue;
  const { url, license } = await info(p.file);
  if (!ALLOWED.test(license.trim())) throw new Error(`${des}: licence "${license}" is not PD/CC0/CC BY`);
  const buf = Buffer.from(await (await fetch(url, { headers: UA })).arrayBuffer());
  const cut = await crop(buf, p.focus ?? '50% 50%', p.zoom ?? 1);
  const base = await cut.toBuffer();
  await sharp(base).resize(900).webp({ quality: 82 }).toFile(path.join(OUT, `${des}.webp`));
  await sharp(base).resize(400).webp({ quality: 78 }).toFile(path.join(OUT, `${des}-s.webp`));
  console.log(des.padEnd(22), license);
}
