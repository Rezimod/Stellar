// Phase 11 checks: node scripts/explore-mobile.mjs [--url http://localhost:3000] [--out dir]
// Headless Chromium on the real GPU, with touch emulation. Five things:
//   1. a phone, held either way, plays Mission 1's first objectives with the
//      touch deck alone — stick, action key, hold — and nothing else,
//   2. every control a thumb has to hit is at least 44 px, on both,
//   3. the left of the glass belongs to the stick: only the right turns the view,
//   4. a throttled CPU makes the governor take a preset level off and say so,
//   5. a lost GPU context rebuilds the scene and leaves the crew where they were.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const BASE = arg('url', 'http://localhost:3000');
const OUT = `${arg('out', `${tmpdir()}/explore-mobile`)}/`;
mkdirSync(OUT, { recursive: true });

/** Privy's login frame is refused on any port but 3000; nothing to do with the
 *  Moon. The lost context is this run's own doing (check 5). */
const NOISE = /auth\.privy\.io|status of 403|Access is denied for this document|Context Lost/;
const problems = [];
const noted = [];
const complain = (line) => (NOISE.test(line) ? noted : problems).push(line);
const say = (line) => console.log(`· ${line}`);

async function waitFor(page, fn, what, timeoutS = 240) {
  for (let i = 0; i < timeoutS; i++) {
    if (await page.evaluate(fn).catch(() => false)) return true;
    await page.waitForTimeout(1000);
  }
  problems.push(`timed out waiting for ${what}`);
  return false;
}

/** Open the Moon with the crew already on the surface, mission progress cleared. */
async function moon(context, { fresh = true } = {}) {
  const page = await context.newPage();
  page.on('pageerror', (e) => complain(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' || /WebGL|GL_INVALID|THREE\.WebGL/.test(m.text())) complain(`console: ${m.text()}`); });
  if (fresh) await page.addInitScript(() => {
    for (const k of ['stellar_moon_missions_v1', 'stellar_moon_expedition_v2', 'stellar_explore_achievements_v1']) localStorage.removeItem(k);
  });
  await page.goto(`${BASE}/play?moon`, { waitUntil: 'commit', timeout: 300_000 });
  await waitFor(page, () => !!window.__stellarMoon, 'the Moon to build');
  await page.evaluate(() => window.__stellarMoon.skipDescent());
  await waitFor(page, () => window.__stellarMoon?.telemetry.phase === 'surface' && window.__stellarMoon.telemetry.ready, 'the surface');
  return page;
}

/** The centre of an element, in page coordinates. */
async function centre(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el || el.hidden) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
  }, selector);
}

/** Push the movement stick until `until` is true, or for `seconds` at most. */
async function pushStick(page, seconds, until = null, dir = { x: 0, y: -1 }) {
  const at = await centre(page, '.moon-hud__move .game-stick');
  if (!at) { problems.push('no movement stick on a touch screen'); return; }
  const reach = at.w * 0.34;
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.move(at.x + dir.x * reach, at.y + dir.y * reach, { steps: 4 });
  for (let i = 0; i < seconds * 4; i++) {
    await page.waitForTimeout(250);
    if (until && await page.evaluate(until).catch(() => false)) break;
  }
  await page.mouse.up();
  await page.waitForTimeout(250);
}

/** Press the big action key, optionally holding it. */
async function pressAction(page, seconds = 0) {
  const at = await centre(page, '.moon-hud__action');
  if (!at) return false;
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  if (seconds) await page.waitForTimeout(seconds * 1000);
  await page.mouse.up();
  await page.waitForTimeout(250);
  return true;
}

/** Every control a thumb has to hit, and whether it is big enough. */
const TAP_TARGETS = () => {
  const small = [];
  for (const el of document.querySelectorAll('.moon-hud button, .game-shell > button, .game-menu button')) {
    if (el.hidden || getComputedStyle(el).display === 'none' || getComputedStyle(el).visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (r.width < 44 || r.height < 44) small.push(`${el.className || el.tagName} ${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  return small;
};

const browser = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
try {
  // ── 1 + 2 + 3. A phone, held both ways. ──
  for (const [name, viewport] of [['portrait', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const page = await moon(context);

    const deck = await page.evaluate(() => ({
      touch: document.querySelector('.moon-surface')?.dataset.touch,
      stick: !!document.querySelector('.moon-hud__move .game-stick'),
      jump: !document.querySelector('.moon-hud__jump')?.hidden,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    }));
    if (deck.touch !== 'true' || !deck.stick) problems.push(`${name}: no touch deck (${JSON.stringify(deck)})`);
    if (deck.overflow) problems.push(`${name}: the page scrolls sideways`);
    say(`${name}: deck ${JSON.stringify(deck)}`);

    const heading = () => page.evaluate(() => window.__stellarMoon.telemetry.heading);
    const dragCanvas = async (fromX, by) => {
      const y = viewport.height * 0.35;
      await page.mouse.move(fromX, y);
      await page.mouse.down();
      await page.mouse.move(fromX + by, y, { steps: 6 });
      await page.mouse.up();
      await page.waitForTimeout(250);
    };

    const small = await page.evaluate(TAP_TARGETS);
    if (small.length) problems.push(`${name}: tap targets under 44 px — ${small.join(' | ')}`);
    say(`${name}: tap targets under 44 px: ${small.length}`);

    // Mission 1, from the top.
    await page.evaluate(() => window.__stellarMoon.startMission('firstSteps'));
    await page.waitForTimeout(300);
    // The suit check, at the lander, with the action key. Never press what
    // the lander offers: that key flies the crew home.
    await waitFor(page, () => window.__stellarMoon.telemetry.prompt.id === 'suitCheck', `${name}: the suit check at the lander`, 20);
    if (await page.evaluate(() => window.__stellarMoon.telemetry.prompt.id === 'suitCheck')) await pressAction(page);
    // The ridge: teleported to within a dozen metres, then walked in on the stick.
    await page.evaluate(() => { window.__stellarMoon.teleport(34, -46); window.__stellarMoon.face(0, -1); });
    await page.waitForTimeout(400);
    const walkedBefore = await page.evaluate(() => window.__stellarMoon.telemetry.distanceM);
    await pushStick(page, 9, () => window.__stellarMoon.telemetry.prompt.id === 'earthShot');
    const walked = await page.evaluate(() => window.__stellarMoon.telemetry.distanceM);
    if (walked - walkedBefore < 5) problems.push(`${name}: the stick did not walk the crew (${(walked - walkedBefore).toFixed(1)} m)`);
    say(`${name}: walked ${(walked - walkedBefore).toFixed(1)} m on the stick`);
    // The photograph. The shot has to be pointed at Earth, so the view is
    // turned with a drag on the right of the glass until the key stops
    // refusing — the stick and the camera, both on the thumbs.
    const framed = async () => page.evaluate(() => {
      const p = window.__stellarMoon.telemetry.prompt;
      return p.id === 'earthShot' && !p.blocked;
    });
    for (let i = 0; i < 14 && !(await framed()); i++) await dragCanvas(viewport.width * 0.75, 70);
    if (!(await framed())) problems.push(`${name}: could not frame the Earth shot by turning the view`);
    await pressAction(page, 4);
    await page.waitForTimeout(600);
    const mission = await page.evaluate(() => {
      const ms = window.__stellarMoon.telemetry.missions;
      return { active: ms.active, done: ms.done, objectives: ms.objectives?.map((o) => ({ id: o.id, done: o.done })) ?? [] };
    });
    const doneIds = mission.objectives.filter((o) => o.done).map((o) => o.id);
    for (const id of ['suit', 'ridge', 'earthrise']) {
      if (!doneIds.includes(id)) problems.push(`${name}: objective ${id} not completed on touch (${JSON.stringify(mission)})`);
    }
    say(`${name}: mission ${mission.active} objectives done ${JSON.stringify(doneIds)}`);
    await page.screenshot({ path: `${OUT}mobile-${name}.png` });

    // The left of the glass is the stick's; the right turns the view.
    const h0 = await heading();
    await dragCanvas(viewport.width * 0.08, 90);
    const h1 = await heading();
    await dragCanvas(viewport.width * 0.75, 90);
    const h2 = await heading();
    if (Math.abs(h1 - h0) > 0.5) problems.push(`${name}: a drag on the stick's side turned the view by ${(h1 - h0).toFixed(1)}°`);
    if (Math.abs(h2 - h1) < 2) problems.push(`${name}: a drag on the right did not turn the view (${(h2 - h1).toFixed(1)}°)`);
    say(`${name}: heading after a left drag ${(h1 - h0).toFixed(2)}°, after a right drag ${(h2 - h1).toFixed(2)}°`);
    await context.close();
  }

  // ── 4. A machine that cannot keep up: the governor takes a level off. ──
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    const page = await moon(context);
    // Headless on this Mac already detects `performance`, and there is nothing
    // below it: the device is told to pretend it can afford the top preset, so
    // the step the governor would take on a better machine can be watched.
    await page.evaluate(() => window.__stellarQuality.pretend('high'));
    const from = await page.evaluate(() => window.__stellarQuality.level());
    const session = await context.newCDPSession(page);
    await session.send('Emulation.setCPUThrottlingRate', { rate: 20 });
    const before = await page.evaluate(() => window.__stellarMoon.perf());
    const seen = await waitFor(page, () => {
      const el = document.querySelector('.game-shell__notice');
      return !!el && !!el.textContent?.trim();
    }, 'the governor to step the preset down', 120);
    const state = await page.evaluate(() => ({
      notice: document.querySelector('.game-shell__notice')?.textContent ?? '',
      level: window.__stellarQuality.level(),
      governed: window.__stellarQuality.governed(),
    }));
    const after = await page.evaluate(() => window.__stellarMoon.perf());
    if (seen) await page.screenshot({ path: `${OUT}governor.png` });
    if (state.level === from) problems.push(`the preset did not come down from ${from}`);
    if (!state.governed) problems.push('the governor took a level off without recording it');
    say(`throttled ×20: frame ${before.frameMs.toFixed(1)} → ${after.frameMs.toFixed(1)} ms, ${from} → ${state.level}, notice ${JSON.stringify(state.notice)}`);
    // And it never goes back up on its own, however good the frame gets.
    await session.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await page.waitForTimeout(20_000);
    const settled = await page.evaluate(() => window.__stellarQuality.level());
    if (settled !== state.level) problems.push(`the governor put the preset back up by itself: ${state.level} → ${settled}`);
    say(`after the throttle came off: ${settled}`);
    await context.close();
  }

  // ── 5. The GPU takes the context away. ──
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    const page = await moon(context, { fresh: false });
    await page.evaluate(() => { window.__stellarMoon.teleport(34, -44); });
    await page.waitForTimeout(500);
    const missionsBefore = await page.evaluate(() => window.__stellarMoon.telemetry.missions.done);
    await page.evaluate(() => {
      const canvas = document.querySelector('.moon-surface__canvas canvas');
      const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      gl.getExtension('WEBGL_lose_context').loseContext();
    });
    await page.waitForTimeout(500);
    const lost = await page.evaluate(() => !!document.querySelector('.moon-surface__loader.is-forced'));
    await waitFor(page, () => window.__stellarMoon?.telemetry.phase === 'surface' && window.__stellarMoon.telemetry.ready, 'the scene to come back', 180);
    const back = await page.evaluate(() => ({
      phase: window.__stellarMoon.telemetry.phase,
      done: window.__stellarMoon.telemetry.missions.done,
      frames: window.__stellarMoon.perf().fps > 0,
    }));
    if (!lost) problems.push('the lost context did not put the loading screen up');
    if (back.phase !== 'surface') problems.push(`after a lost context the crew are not on the surface: ${JSON.stringify(back)}`);
    if (JSON.stringify(back.done) !== JSON.stringify(missionsBefore)) problems.push(`mission progress changed across a lost context: ${JSON.stringify(missionsBefore)} → ${JSON.stringify(back.done)}`);
    say(`lost context: loader ${lost}, back on the ${back.phase}, missions ${JSON.stringify(back.done)}, drawing ${back.frames}`);
    await page.screenshot({ path: `${OUT}context-restored.png` });
    await context.close();
  }
} finally {
  await browser.close();
}

if (noted.length) console.log(`\nnoted (not this phase): ${noted.length} line(s)`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log(`  ✗ ${p}`);
  process.exitCode = 1;
} else {
  console.log(`\nall checks passed · shots in ${OUT}`);
}
