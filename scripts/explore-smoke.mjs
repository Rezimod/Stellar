// Explore regression smoke: node scripts/explore-smoke.mjs [--url http://localhost:3000] [--out dir]
// Headless Chromium on the real GPU. Walks the game shell end to end and the
// deep links, and fails on any page error, console error or WebGL warning.
//   1. /solar-system → Launch → title → Enter → solar system → Explore → flight near Earth → Esc pause → Exit → /solar-system
//   2. /play?moon loads the surface
//   3. /play?land=mars loads; /solar-system?moon redirects to /play
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const BASE = arg('url', 'http://localhost:3000');
const OUT = `${arg('out', `${tmpdir()}/explore-smoke`)}/`;
mkdirSync(OUT, { recursive: true });

async function waitFor(page, fn, param, timeoutS = 240) {
  for (let i = 0; i < timeoutS; i++) {
    if (await page.evaluate(fn, param).catch(() => false)) return;
    await page.waitForTimeout(1000);
  }
  throw new Error(`timed out waiting for ${fn}`);
}
const state = (page) => page.evaluate(() => document.querySelector('.game-shell')?.dataset.state ?? '');
const waitState = (page, s) => waitFor(page, (s) => document.querySelector('.game-shell')?.dataset.state === s, s);

const browser = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' || /WebGL|GL_INVALID|THREE\.WebGL/.test(m.text())) errors.push(`console: ${m.text()}`); });
const steps = [];
const step = (name) => { steps.push(name); console.log(`· ${name}`); };
const shot = (name) => page.screenshot({ path: `${OUT}${name}.png` });

try {
  // 1. The whole shell loop from the website.
  await page.goto(`${BASE}/solar-system`, { waitUntil: 'commit', timeout: 300_000 });
  await waitFor(page, () => !!document.querySelector('.solar-system__launch') && (!document.querySelector('.solar-system__loader') || !!document.querySelector('.solar-system__loader.is-done')));
  step('guide page: orrery drawn, Launch present');
  await shot('01-guide');
  await page.click('.solar-system__launch');
  await waitState(page, 'title');
  step('title screen');
  await shot('02-title');
  await page.click('.game-menu__item--primary');
  // With the assets cached the loading screen can be over between two polls.
  await waitFor(page, () => ['loading', 'playing'].includes(document.querySelector('.game-shell')?.dataset.state));
  await shot('03-loading');
  await waitState(page, 'playing');
  await waitFor(page, () => !!document.querySelector('.flight-hud__explore') && !!document.querySelector('canvas'));
  step('Enter → solar system (orrery drawn, Explore present)');
  await shot('04-system');
  await page.click('.flight-hud__explore');
  await waitFor(page, () => !!window.__stellarFlight);
  await page.waitForTimeout(3000);
  const where = await page.evaluate(() => {
    const f = window.__stellarFlight;
    const p = f.ship.group.position;
    return f.world.bodies.map((b) => ({ id: b.id, d: b.position.distanceTo(p) / b.radius })).sort((x, y) => x.d - y.d)[0]?.id;
  });
  if (where !== 'earth') throw new Error(`flight started near ${where}, not Earth`);
  step('Explore → flight near Earth');
  await shot('05-flight');
  await page.keyboard.press('Escape');
  await waitState(page, 'paused');
  const frozen = await page.evaluate(async () => {
    const f = window.__stellarFlight;
    const f0 = f.session.telemetry.frame;
    await new Promise((r) => setTimeout(r, 800));
    return { paused: f.session.paused, framesStill: f0 === f.session.telemetry.frame };
  });
  if (!frozen.paused || !frozen.framesStill) throw new Error(`paused, but the deck kept flying: ${JSON.stringify(frozen)}`);
  step('Esc → paused, deck frozen');
  await shot('06-paused');
  await page.keyboard.press('Escape');
  await waitState(page, 'playing');
  step('Esc again → resumed');
  await page.keyboard.press('Escape');
  await waitState(page, 'paused');
  await page.click('.game-menu__item--exit');
  await page.waitForURL(/\/solar-system$/, { timeout: 60_000, waitUntil: 'commit' });
  step('Exit → /solar-system');

  // 2. The Moon through its deep link.
  await page.goto(`${BASE}/play?moon=1`, { waitUntil: 'commit', timeout: 300_000 });
  await waitState(page, 'playing');
  await waitFor(page, () => window.__stellarMoon?.telemetry?.ready === true);
  step('?moon=1 → surface ready');
  await shot('07-moon');

  // 3. Mars, and the redirect from the old deep link.
  await page.goto(`${BASE}/play?land=mars`, { waitUntil: 'commit', timeout: 300_000 });
  await waitState(page, 'playing');
  await waitFor(page, () => window.__stellarWorld?.telemetry?.ready === true);
  step('?land=mars loads');
  await shot('08-mars');
  await page.goto(`${BASE}/solar-system?moon=1`, { waitUntil: 'commit', timeout: 300_000 });
  await page.waitForURL(/\/play\?moon=1$/, { timeout: 60_000, waitUntil: 'commit' });
  step('/solar-system?moon=1 → /play?moon=1');
} catch (e) {
  console.log(`FAIL: ${e.message ?? e}`);
  await shot('fail').catch(() => {});
  errors.push(`step failed: ${e.message ?? e}`);
}
await browser.close();
console.log(`\n${steps.length} steps passed; ${errors.length} errors`);
for (const e of errors) console.log(`  ${e}`);
console.log(`shots in ${OUT}`);
process.exit(errors.length ? 1 : 0);
