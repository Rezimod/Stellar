// Ship model capture: node scripts/ships-capture.mjs [--url http://localhost:3000] [--out dir] [--ships kestrel,xfoil,cruiser]
// Headless Chromium on the real GPU. For each ship: launch flight from the
// hangar, wait for the model, then shoot the chase view and two orbits
// round the hull (front three-quarter, rear three-quarter). The fighter is
// shot with its wings open. Fails on any page error or WebGL warning.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const BASE = arg('url', 'http://localhost:3000');
const OUT = `${arg('out', `${tmpdir()}/ships-capture`)}/`;
const SHIPS = arg('ships', 'kestrel,xfoil,cruiser').split(',');
const ORDER = ['kestrel', 'xfoil', 'cruiser', 'endurance'];
mkdirSync(OUT, { recursive: true });

async function waitFor(page, fn, param, timeoutS = 240) {
  for (let i = 0; i < timeoutS; i++) {
    if (await page.evaluate(fn, param).catch(() => false)) return;
    await page.waitForTimeout(1000);
  }
  throw new Error(`timed out waiting for ${fn}`);
}
const waitState = (page, s) => waitFor(page, (s) => document.querySelector('.game-shell')?.dataset.state === s, s);

const browser = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
// Auth embeds are not the ships' business (and refuse a non-standard dev port).
const offTopic = (t) => /privy|Failed to load resource/i.test(t);
page.on('console', (m) => { if ((m.type() === 'error' || /WebGL|GL_INVALID|THREE\.WebGL/.test(m.text())) && !offTopic(m.text())) errors.push(`console: ${m.text()}`); });

const views = [
  ['chase', { orbiting: false, orbitYaw: 0, orbitPitch: 0, camZoom: 1 }],
  ['front34', { orbiting: true, orbitYaw: 2.35, orbitPitch: 0.32, camZoom: 0.62 }],
  ['rear34', { orbiting: true, orbitYaw: 0.75, orbitPitch: 0.42, camZoom: 0.6 }],
];

try {
  for (const kind of SHIPS) {
    await page.goto(`${BASE}/play`, { waitUntil: 'commit', timeout: 300_000 });
    await waitState(page, 'title');
    await page.click('.game-menu__item--primary');
    await waitState(page, 'playing');
    await waitFor(page, () => !!document.querySelector('.flight-hud__explore') && !!document.querySelector('canvas'));
    for (let i = 0; i < ORDER.indexOf(kind); i++) await page.click('.flight-hud__ship');
    await page.click('.flight-hud__explore');
    await waitFor(page, () => !!window.__stellarFlight);
    // The hull arrives when its file does: the LOD holds it.
    await waitFor(page, () => !!window.__stellarFlight.ship.group.getObjectByProperty('type', 'LOD'), undefined, 60);
    const info = await page.evaluate(() => {
      const g = window.__stellarFlight.ship.group;
      let meshes = 0;
      g.traverse((o) => { if (o.isMesh && o.visible) meshes += 1; });
      return { kind: window.__stellarFlight.session.shipKind, meshes };
    });
    console.log(`· ${kind}: flying ${info.kind}, ${info.meshes} meshes`);
    // First flight opens the controls card; it would sit over the ship.
    await page.click('.flight-hud__help-head button').catch(() => {});
    if (kind === 'xfoil') await page.evaluate(() => { window.__stellarFlight.session.input.foilsToggle = true; });
    await page.waitForTimeout(2500);
    for (const [name, cam] of views) {
      await page.evaluate((cam) => Object.assign(window.__stellarFlight.session.input, cam), cam);
      await page.waitForTimeout(1800);
      await page.screenshot({ path: `${OUT}${kind}-${name}.png` });
    }
  }
} catch (e) {
  console.log(`FAIL: ${e.message ?? e}`);
  await page.screenshot({ path: `${OUT}fail.png` }).catch(() => {});
  errors.push(`step failed: ${e.message ?? e}`);
}
await browser.close();
console.log(`\n${errors.length} errors`);
for (const e of errors) console.log(`  ${e}`);
console.log(`shots in ${OUT}`);
process.exit(errors.length ? 1 : 0);
