// The arrival, end to end: node scripts/explore-arrival.mjs [--url http://localhost:3000] [--out dir]
// Headless Chromium on the real GPU against a dev server. Flies the ship to
// the Moon, asks for the ground, and watches the whole handoff: the three
// legs of the arrival, the surface coming up under it, the climb back to
// orbit and the flight picking up again. Shoots every leg, records the
// longest frame across the handoff and the heap either side of the round
// trip, and fails on any page error, console error or WebGL warning.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { loadavg, tmpdir } from 'node:os';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const BASE = arg('url', 'http://localhost:3000');
const OUT = `${arg('out', `${tmpdir()}/explore-arrival`)}/`;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' || /WebGL|GL_INVALID|THREE\.WebGL/.test(m.text())) errors.push(`console: ${m.text()}`); });
const step = (s) => console.log(`· ${s}`);
const shot = (name) => page.screenshot({ path: `${OUT}${name}.png` });

async function waitFor(fn, param, timeoutS = 240) {
  for (let i = 0; i < timeoutS * 4; i++) {
    if (await page.evaluate(fn, param).catch(() => false)) return;
    await page.waitForTimeout(250);
  }
  throw new Error(`timed out waiting for ${fn}`);
}

/** Put the ship a couple of Moon radii out, where the land key comes up. */
const toTheMoon = () => page.evaluate(() => {
  const f = window.__stellarFlight;
  const moon = f.world.bodies.find((b) => b.id === 'moon');
  const out = moon.radius * 2.2;
  f.ship.spawn({
    position: { x: moon.position.x + out, y: moon.position.y + out * 0.2, z: moon.position.z },
    lookAt: moon.position,
    yaw: 0,
  });
});
const watchFrames = () => page.evaluate(() => {
  window.__frames = { max: 0, n: 0 };
  let last = performance.now();
  const tick = (now) => {
    const dt = now - last;
    last = now;
    if (window.__frames.n++ > 2) window.__frames.max = Math.max(window.__frames.max, dt);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
const heap = () => page.evaluate(() => performance.memory?.usedJSHeapSize ?? 0);
const worstFrame = () => page.evaluate(() => { const m = window.__frames.max; window.__frames.max = 0; return m; });

const run = async (label, skip) => {
  step(`── ${label} ──`);
  await page.goto(`${BASE}/play?orbit&fixedpx=1`, { waitUntil: 'commit', timeout: 300_000 });
  await waitFor(() => !!document.querySelector('.flight-hud__explore'));
  await page.click('.flight-hud__explore');
  await waitFor(() => !!window.__stellarFlight);
  await page.waitForTimeout(2500);
  const heapBefore = await heap();
  await toTheMoon();
  await waitFor(() => {
    const t = window.__stellarFlight.session.telemetry;
    return t.nearId === 'moon' && t.nearAltKm < 2400;
  });
  step('the Moon is the near world; the land key is live');
  await watchFrames();
  await page.evaluate(() => { window.__stellarFlight.session.input.landRequest = true; });

  const seen = [];
  const deadline = Date.now() + 40_000;
  while (Date.now() < deadline) {
    const phase = await page.evaluate(() => window.__stellarFlight?.session.telemetry.approachPhase ?? 'gone');
    if (phase === 'gone') break;
    if (phase && !seen.includes(phase)) {
      seen.push(phase);
      step(`leg: ${phase}`);
      await shot(`${label}-${seen.length}-${phase}`);
      if (skip && phase === 'approach') {
        await page.keyboard.press('Space');
        step('skipped');
      }
    }
    await page.waitForTimeout(120);
  }
  if (!seen.includes('transit')) throw new Error(`${label}: the arrival never ran (${seen.join(',') || 'nothing'})`);
  // Two numbers, not one: the arrival is live and has to hold a frame rate;
  // the surface build behind the loading screen is one blocking task and
  // always has been.
  const frames = await worstFrame();
  await waitFor(() => window.__stellarMoon?.telemetry?.ready === true);
  await waitFor(() => document.querySelector('.game-shell')?.dataset.state === 'playing');
  const build = await worstFrame();
  step(`surface up · longest frame flying the arrival ${frames.toFixed(0)} ms · building the surface ${build.toFixed(0)} ms`);
  await shot(`${label}-4-surface`);

  // ── And back: down, aboard, up, and the flight picks up again. ──
  await page.evaluate(() => window.__stellarMoon.skipDescent());
  await waitFor(() => window.__stellarMoon.telemetry.phase === 'surface');
  await page.waitForTimeout(1200);
  const boarded = await page.evaluate(() => window.__stellarMoon.forceInteract('boardLander'));
  if (!boarded) throw new Error(`${label}: could not board the lander`);
  step('aboard, climbing out');
  await waitFor(() => !!window.__stellarFlight, null, 120);
  await waitFor(() => window.__stellarFlight.session.active === true && !window.__stellarFlight.session.paused, null, 120);
  await page.waitForTimeout(2500);
  const where = await page.evaluate(() => {
    const f = window.__stellarFlight;
    const p = f.ship.group.position;
    return f.world.bodies.map((b) => ({ id: b.id, d: b.position.distanceTo(p) / b.radius })).sort((x, y) => x.d - y.d)[0];
  });
  step(`back in the ship, nearest world ${where.id} at ${where.d.toFixed(2)} radii`);
  if (where.id !== 'moon') throw new Error(`${label}: came back to ${where.id}, not the Moon`);
  await shot(`${label}-5-back`);
  const heapAfter = await heap();
  step(`heap ${(heapBefore / 1e6).toFixed(0)} MB → ${(heapAfter / 1e6).toFixed(0)} MB`);
  return { frames, build, heapBefore, heapAfter, legs: seen };
};

try {
  console.log(`load ${loadavg().map((l) => l.toFixed(1)).join(' ')}`);
  const first = await run('first-run', false);
  const again = await run('skipped', true);
  console.log(`\nlegs first run: ${first.legs.join(' → ')}`);
  console.log(`legs skipped:   ${again.legs.join(' → ')}`);
  console.log(`longest frame flying the arrival: ${first.frames.toFixed(0)} ms / ${again.frames.toFixed(0)} ms`);
  console.log(`longest frame building the surface: ${first.build.toFixed(0)} ms / ${again.build.toFixed(0)} ms`);
  console.log(`heap round trip: ${(first.heapAfter / 1e6).toFixed(0)} MB → ${(again.heapAfter / 1e6).toFixed(0)} MB`);
  if (errors.length) {
    console.error(`\n${errors.length} console / page errors:`);
    for (const e of errors.slice(0, 12)) console.error(`  ${e}`);
    process.exitCode = 1;
  } else {
    console.log('\nno page errors, no console errors, no WebGL warnings');
  }
  console.log(`shots in ${OUT}`);
} catch (e) {
  console.error(`FAILED: ${e.message}`);
  await shot('failure');
  process.exitCode = 1;
} finally {
  await browser.close();
}
