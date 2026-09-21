// Phase 12, the vertical slice end to end:
//   node scripts/explore-e2e.mjs [--url http://localhost:3000] [--out dir] [--only slice,checks]
//
// One page load carries the whole slice — title → orrery → Explore → flight →
// the Moon → the arrival → the surface → five missions, the rover among them
// → back to orbit → a reload that has to remember all of it. Then a second
// pass of the explicit checks: three entries and exits for memory, the rover
// on a slope, a mission reset, the other three worlds, the Backrooms, an
// alien encounter, a star route, and the camera at the places it is hardest
// to keep out of the scenery.
//
// Everything is recorded: page and console errors, WebGL warnings, failed
// requests, the longest frame, and the heap either side.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { loadavg, tmpdir } from 'node:os';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const BASE = arg('url', 'http://localhost:3000');
const ONLY = arg('only', 'slice,checks').split(',');
const OUT = `${arg('out', `${tmpdir()}/explore-e2e`)}/`;
mkdirSync(OUT, { recursive: true });

/** Privy's login frame is refused on any port but 3000, its iframe cannot read
 *  storage from here, and its CSP reporter is blocked. A request aborted on the
 *  way out of a scene is the scene leaving, not a failure. None of it is
 *  Explore's. */
const NOISE = /auth\.privy\.io|status of 403|Access is denied for this document|datadoghq|ERR_ABORTED|ERR_BLOCKED_BY_ORB/;
const problems = [];
const noted = [];
const failedRequests = [];
const say = (s) => console.log(`· ${s}`);
const complain = (s) => (NOISE.test(s) ? noted : problems).push(s);

function watch(page) {
  page.on('pageerror', (e) => complain(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' || /WebGL|GL_INVALID|THREE\.WebGL/.test(m.text())) complain(`console: ${m.text()}`); });
  page.on('requestfailed', (r) => {
    const line = `${r.url()} — ${r.failure()?.errorText}`;
    if (!NOISE.test(line)) failedRequests.push(line);
  });
  page.on('response', (r) => { if (r.status() >= 400 && !NOISE.test(r.url())) failedRequests.push(`${r.url()} — HTTP ${r.status()}`); });
  return page;
}

const WATCH_FRAMES = () => {
  window.__frames = { max: 0, n: 0 };
  let last = performance.now();
  const tick = (now) => {
    const dt = now - last;
    last = now;
    if (window.__frames.n++ > 2) window.__frames.max = Math.max(window.__frames.max, dt);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const heap = (page) => page.evaluate(() => Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1048576));
const worstFrame = (page) => page.evaluate(() => { const m = window.__frames?.max ?? 0; if (window.__frames) window.__frames.max = 0; return m; });

async function waitFor(page, fn, what, timeoutS = 180) {
  for (let i = 0; i < timeoutS * 4; i++) {
    if (await page.evaluate(fn).catch(() => false)) return true;
    await page.waitForTimeout(250);
  }
  problems.push(`timed out waiting for ${what}`);
  return false;
}

/** Run one mission's objectives through the things they name, in order. */
async function runMission(page, id, steps) {
  const started = await page.evaluate((m) => window.__stellarMoon.startMission(m), id);
  if (started !== id) { problems.push(`mission ${id} would not start (got ${started})`); return false; }
  for (const step of steps) {
    if (typeof step === 'function') await step();
    else await page.evaluate((s) => window.__stellarMoon.forceInteract(s, 4), step);
    await page.waitForTimeout(350);
  }
  // Finishing one mission takes the next one on, so the objective list has
  // already moved by the time this reads it: the record of what closed is the
  // done list.
  const ok = await waitFor(page, `(() => window.__stellarMoon.telemetry.missions.done.includes('${id}'))()`, `mission ${id} to close`, 20);
  say(`${id}: ${ok ? 'closed' : 'NOT CLOSED'}`);
  return ok;
}

/** Steer the rover to a point on the surface, reading its own track for its
 *  heading. Which way the wheel turns for a positive stick is not worth
 *  assuming, so the first correction that makes the error worse flips it. */
async function driveTo(page, x, z, seconds = 60) {
  const at = () => page.evaluate(() => window.__stellarMoon.roverAt());
  const drive = (steer) => page.evaluate((s) => { const i = window.__stellarMoon.input; i.moveY = 1; i.moveX = s; }, steer);
  let sign = 1;
  let last = await at();
  let lastErr = null;
  let closest = Infinity;
  await drive(0);
  const deadline = Date.now() + seconds * 1000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(500);
    const now = await at();
    const moved = Math.hypot(now.x - last.x, now.z - last.z);
    const range = Math.hypot(x - now.x, z - now.z);
    closest = Math.min(closest, range);
    if (range < 12) break;
    if (moved > 0.5) {
      const head = Math.atan2(now.x - last.x, now.z - last.z);
      const want = Math.atan2(x - now.x, z - now.z);
      const err = ((want - head + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      if (lastErr !== null && Math.abs(err) > Math.abs(lastErr) + 0.15) sign = -sign;
      lastErr = err;
      await drive(Math.max(-1, Math.min(1, err * sign * 1.8)));
      last = now;
    }
  }
  await page.evaluate(() => { const i = window.__stellarMoon.input; i.moveY = 0; i.moveX = 0; });
  const end = await at();
  return Math.min(closest, Math.hypot(x - end.x, z - end.z));
}

const browser = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] });
const RIDGE = { x: 34, z: -58 };
const CRATER = { x: -96, z: 78 };

try {
  // ══ The slice, in one sitting ══
  if (ONLY.includes('slice')) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    const page = watch(await context.newPage());
    // Once, on the first load — a reload later in the run has to find the
    // slice's own progress still there.
    await page.addInitScript(() => {
      if (sessionStorage.getItem('e2e-cleared')) return;
      sessionStorage.setItem('e2e-cleared', '1');
      for (const k of ['stellar_moon_missions_v1', 'stellar_moon_expedition_v2', 'stellar_explore_achievements_v1', 'stellar_explore_save']) localStorage.removeItem(k);
    });
    await page.addInitScript(WATCH_FRAMES);
    await page.goto(`${BASE}/play`, { waitUntil: 'commit', timeout: 300_000 });
    const heapStart = await heap(page);

    // 1. The title, and Enter.
    await waitFor(page, () => !!document.querySelector('.game-title__enter, .game-menu button'), 'the title screen');
    await page.click('.game-menu button');
    await waitFor(page, () => window.__stellarGame?.get().scene === 'orbit', 'the orrery');
    await waitFor(page, () => window.__stellarGame?.get().state === 'playing', 'the orrery to finish loading');
    say('title → Enter → the solar system');
    await page.screenshot({ path: `${OUT}1-orrery.png` });

    // 2. Explore: the ship, near Earth.
    await waitFor(page, () => !!document.querySelector('.flight-hud__explore'), 'the Explore key');
    await page.click('.flight-hud__explore');
    await waitFor(page, () => !!window.__stellarFlight && window.__stellarFlight.session.active, 'the ship');
    await page.waitForTimeout(2500);
    say('Explore → flying near Earth');
    await page.screenshot({ path: `${OUT}2-flight.png` });

    // 3. To the Moon, and down it.
    await page.evaluate(() => {
      const f = window.__stellarFlight;
      const moon = f.world.bodies.find((b) => b.id === 'moon');
      const out = moon.radius * 2.2;
      f.ship.spawn({ position: { x: moon.position.x + out, y: moon.position.y + out * 0.2, z: moon.position.z }, lookAt: moon.position, yaw: 0 });
    });
    await waitFor(page, () => window.__stellarFlight.session.telemetry.nearId === 'moon', 'the Moon to be the near world');
    await worstFrame(page);
    await page.evaluate(() => { window.__stellarFlight.session.input.landRequest = true; });
    const legs = [];
    const deadline = Date.now() + 45_000;
    while (Date.now() < deadline) {
      const phase = await page.evaluate(() => window.__stellarFlight?.session.telemetry.approachPhase ?? 'gone');
      if (phase === 'gone') break;
      if (phase && !legs.includes(phase)) legs.push(phase);
      await page.waitForTimeout(150);
    }
    const arrivalFrame = await worstFrame(page);
    if (!legs.includes('transit')) problems.push(`the arrival never flew (${legs.join(',') || 'nothing'})`);
    await waitFor(page, () => window.__stellarMoon?.telemetry?.ready === true, 'the surface');
    await page.evaluate(() => window.__stellarMoon.skipDescent());
    await waitFor(page, () => window.__stellarMoon.telemetry.phase === 'surface', 'touchdown');
    say(`arrival legs ${legs.join(' → ')} · longest frame flying it ${arrivalFrame.toFixed(0)} ms · on the surface`);
    await page.screenshot({ path: `${OUT}3-surface.png` });

    // 4–8. The five missions, in the order they unlock.
    await runMission(page, 'firstSteps', [
      'suitCheck',
      async () => { await page.evaluate((r) => window.__stellarMoon.teleport(r.x, r.z), RIDGE); },
      'earthShot',
      'airlock0',
    ]);
    await runMission(page, 'power', ['deadCable', 'coupling', 'fitCoupling', 'breaker']);
    await runMission(page, 'telescope', ['mountPower', 'mountAlign', 'scopeObserve']);
    await runMission(page, 'comms', ['dishInspect', 'feed', 'fitFeed', 'dishAlign']);
    // The rover is driven, not teleported: the drive objective wants the
    // crew at the wheel and the crater under them.
    const charged = await page.evaluate(() => window.__stellarMoon.startMission('expedition'));
    if (charged !== 'expedition') problems.push(`the expedition would not start (${charged})`);
    await page.evaluate(() => { window.__stellarMoon.forceInteract('roverCharge', 4); });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      const r = window.__stellarMoon.roverAt();
      window.__stellarMoon.teleport(r.x + 2, r.z);
      window.__stellarMoon.forceInteract('roverEnter', 2);
    });
    const driving = await waitFor(page, () => window.__stellarMoon.telemetry.driving === true, 'the crew at the wheel', 30);
    if (driving) {
      await page.evaluate(() => { window.__stellarMoon.input.gearRequest = 2; });
      const miss = await driveTo(page, CRATER.x, CRATER.z, 90);
      say(`drove to the crater, ${miss.toFixed(0)} m off`);
      await page.screenshot({ path: `${OUT}4-rover.png` });
      await page.evaluate(() => { window.__stellarMoon.forceInteract('craterScan', 8); });
      await page.waitForTimeout(600);
      await page.evaluate(() => { window.__stellarMoon.forceInteract('sample', 3); });
      await page.waitForTimeout(600);
      await page.evaluate(() => { window.__stellarMoon.forceInteract('storeSample', 4); });
      await page.waitForTimeout(800);
    }
    const missions = await page.evaluate(() => {
      const ms = window.__stellarMoon.telemetry.missions;
      return { done: ms.done, complete: ms.complete, records: window.__stellarMoon.telemetry.achievements.map((a) => a.id) };
    });
    say(`missions done: ${missions.done.join(', ')}${missions.complete ? ' · all five' : ''}`);
    say(`records: ${missions.records.join(', ')}`);
    for (const id of ['firstSteps', 'power', 'telescope', 'comms']) {
      if (!missions.done.includes(id)) problems.push(`mission ${id} did not close`);
    }

    // 9. Back to orbit, aboard the lander.
    await page.evaluate(() => window.__stellarMoon.forceInteract('boardLander'));
    await waitFor(page, () => !!window.__stellarFlight && window.__stellarFlight.session.active && !window.__stellarFlight.session.paused, 'the ship again', 120);
    await page.waitForTimeout(2000);
    const back = await page.evaluate(() => {
      const f = window.__stellarFlight;
      const p = f.ship.group.position;
      return f.world.bodies.map((b) => ({ id: b.id, d: b.position.distanceTo(p) / b.radius })).sort((x, y) => x.d - y.d)[0];
    });
    if (back.id !== 'moon') problems.push(`came back to ${back.id}, not the Moon`);
    say(`back in the ship over ${back.id}, ${back.d.toFixed(2)} radii out`);
    await page.screenshot({ path: `${OUT}5-back.png` });
    const heapEnd = await heap(page);

    // 10. A reload: everything earned is still there.
    await page.reload({ waitUntil: 'commit', timeout: 300_000 });
    await waitFor(page, () => !!window.__stellarGame, 'the shell again');
    const saved = await page.evaluate(() => ({
      checkpoint: JSON.parse(localStorage.getItem('stellar_explore_save') ?? 'null'),
      missions: JSON.parse(localStorage.getItem('stellar_moon_missions_v1') ?? 'null'),
      records: JSON.parse(localStorage.getItem('stellar_explore_achievements_v1') ?? 'null'),
    }));
    const kept = saved.missions?.done ?? [];
    for (const id of missions.done) if (!kept.includes(id)) problems.push(`mission ${id} was forgotten across a reload`);
    if (!saved.checkpoint?.scene) problems.push('no checkpoint was written');
    say(`after a reload: checkpoint ${saved.checkpoint?.scene}, missions ${kept.join(', ')}, ${(saved.records?.length ?? saved.records?.records?.length ?? 0) || Object.keys(saved.records ?? {}).length} record(s)`);
    say(`heap ${heapStart} MB → ${heapEnd} MB across the slice`);
    await context.close();
  }

  // ══ The explicit checks ══
  if (ONLY.includes('checks')) {
    // Three entries and exits: the GPU side has to come back each time.
    {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
      const page = watch(await context.newPage());
      await page.goto(`${BASE}/play?moon`, { waitUntil: 'commit', timeout: 300_000 });
      const heaps = [];
      for (let i = 0; i < 3; i++) {
        await waitFor(page, () => window.__stellarMoon?.telemetry?.ready === true, `Moon entry ${i + 1}`);
        await page.evaluate(() => window.__stellarMoon.skipDescent());
        await waitFor(page, () => window.__stellarMoon.telemetry.phase === 'surface', `surface ${i + 1}`);
        await page.waitForTimeout(1500);
        heaps.push(await heap(page));
        await page.evaluate(() => window.__stellarGame.travel('orbit'));
        await waitFor(page, () => window.__stellarGame.get().scene === 'orbit' && window.__stellarGame.get().state === 'playing', `orbit ${i + 1}`);
        await page.waitForTimeout(1200);
        if (i < 2) await page.evaluate(() => window.__stellarGame.travel('moon'));
      }
      const drift = heaps[2] - heaps[0];
      say(`Moon entry/exit ×3 · heap ${heaps.join(' → ')} MB (drift ${drift >= 0 ? '+' : ''}${drift})`);
      if (drift > 90) problems.push(`the heap grew ${drift} MB over three Moon visits`);
      await context.close();
    }

    // The rover on a slope, the camera in the tight places, and the Backrooms.
    {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
      const page = watch(await context.newPage());
      await page.goto(`${BASE}/play?moon`, { waitUntil: 'commit', timeout: 300_000 });
      await waitFor(page, () => window.__stellarMoon?.telemetry?.ready === true, 'the Moon');
      await page.evaluate(() => window.__stellarMoon.skipDescent());
      await waitFor(page, () => window.__stellarMoon.telemetry.phase === 'surface', 'the surface');

      // Every camera spot the base can offer: none of them may end up inside
      // the scenery or under the ground.
      const spots = await page.evaluate(async () => {
        const m = window.__stellarMoon;
        const out = [];
        for (const s of m.cameraSpots()) {
          m.teleport(s.x, s.z);
          await new Promise((r) => setTimeout(r, 900));
          const c = m.cameraAt();
          out.push({ id: s.id, blocked: c.blocked, clearance: +c.clearance.toFixed(2) });
        }
        return out;
      });
      for (const s of spots) {
        if (s.blocked || s.clearance < 0.15) problems.push(`camera at ${s.id}: blocked=${s.blocked} clearance=${s.clearance} m`);
      }
      say(`camera spots: ${spots.map((s) => `${s.id} ${s.clearance}m${s.blocked ? ' BLOCKED' : ''}`).join(' · ')}`);

      // The rover: board on the steepest ground the base knows about, drive,
      // and step off again.
      const slope = await page.evaluate(() => window.__stellarMoon.cameraSpots().find((s) => s.id === 'slope'));
      await page.evaluate(() => {
        const m = window.__stellarMoon;
        const r = m.roverAt();
        m.teleport(r.x + 2, r.z);
        m.forceInteract('roverEnter', 2);
      });
      await waitFor(page, () => window.__stellarMoon.telemetry.driving === true, 'the wheel', 30);
      await driveTo(page, slope.x, slope.z, 45);
      const onSlope = await page.evaluate(() => ({ driving: window.__stellarMoon.telemetry.driving, at: window.__stellarMoon.roverAt() }));
      await page.evaluate(() => { window.__stellarMoon.forceInteract('roverExit', 2); });
      await page.waitForTimeout(1800);
      const off = await page.evaluate(() => ({ driving: window.__stellarMoon.telemetry.driving, where: window.__stellarMoon.where() }));
      if (!onSlope.driving) problems.push('the rover would not drive to the slope');
      if (off.driving) problems.push('the crew could not get off the rover');
      say(`rover on the slope: drove ${onSlope.driving}, stepped off ${!off.driving} at ${off.where.y.toFixed(2)} m`);

      // The Backrooms, under the sinkhole.
      await page.evaluate(() => window.__stellarMoon.fallIntoBackrooms());
      const under = await waitFor(page, () => (window.__stellarMoon.telemetry.backrooms.phase ?? '') !== '', 'the Backrooms', 40);
      say(`Backrooms entry: ${under ? await page.evaluate(() => window.__stellarMoon.telemetry.backrooms.phase) : 'NOT REACHED'}`);
      await page.evaluate(() => window.__stellarMoon.escapeBackrooms());
      await page.waitForTimeout(1500);

      // A mission reset: cleared storage puts every objective back.
      await page.evaluate(() => { localStorage.removeItem('stellar_moon_missions_v1'); });
      await page.reload({ waitUntil: 'commit', timeout: 300_000 });
      await waitFor(page, () => window.__stellarMoon?.telemetry?.ready === true, 'the Moon after a reset');
      const reset = await page.evaluate(() => window.__stellarMoon.telemetry.missions.done);
      if (reset.length) problems.push(`a mission reset left ${reset.join(',')} behind`);
      say(`mission reset: ${reset.length} missions carried over`);
      await context.close();
    }

    // The other three worlds.
    for (const world of ['mars', 'proximaB', 'earth']) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
      const page = watch(await context.newPage());
      await page.goto(`${BASE}/play?land=${world}`, { waitUntil: 'commit', timeout: 300_000 });
      const ok = await waitFor(page, () => window.__stellarWorld?.telemetry?.ready === true, `${world} to land`, 240);
      if (ok) {
        await page.evaluate(() => window.__stellarWorld.skipDescent());
        await waitFor(page, () => window.__stellarWorld.telemetry.phase === 'surface', `${world}'s surface`, 60);
        await page.waitForTimeout(1500);
        const tel = await page.evaluate(() => {
          const t = window.__stellarWorld.telemetry;
          return { phase: t.phase, gravity: window.__stellarWorld.profile.gravity, aliens: !!t.aliens, heap: Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1048576) };
        });
        say(`${world}: ${tel.phase}, ${tel.gravity.toFixed(2)} m/s²${tel.aliens ? ', villagers about' : ''}, heap ${tel.heap} MB`);
        await page.screenshot({ path: `${OUT}world-${world}.png` });
      }
      await context.close();
    }

    // Flight: an alien encounter and a star route.
    {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
      const page = watch(await context.newPage());
      await page.goto(`${BASE}/play?orbit`, { waitUntil: 'commit', timeout: 300_000 });
      await waitFor(page, () => !!document.querySelector('.flight-hud__explore'), 'the Explore key');
      await page.click('.flight-hud__explore');
      await waitFor(page, () => !!window.__stellarFlight && window.__stellarFlight.session.active, 'the ship');
      await page.waitForTimeout(2000);
      // The slice is not an arcade shooter: no cannons, no standing order to
      // break a planet, no fire key on the deck (B09).
      const combat = await page.evaluate(() => ({
        combat: window.__stellarFlight.session.combat,
        fireKey: !!document.querySelector('.flight-hud__key--fire'),
        order: !!document.querySelector('.flight-hud__order:not([hidden])'),
      }));
      if (combat.combat || combat.fireKey) problems.push(`combat is not gated out of /play: ${JSON.stringify(combat)}`);
      say(`combat gating: session.combat=${combat.combat}, fire key ${combat.fireKey ? 'SHOWN' : 'gone'}`);

      const nudged = await page.evaluate(() => {
        const a = window.__stellarFlight.aliens;
        if (!a?.nudge) return 'no alien hook';
        a.nudge();
        return 'nudged';
      });
      await page.waitForTimeout(3000);
      const contact = await page.evaluate(() => {
        const t = window.__stellarFlight.session.telemetry;
        return { alert: t.alert ?? '', contacts: t.contacts?.length ?? 0, radio: !!document.querySelector('.flight-hud__comms:not([hidden])') };
      });
      say(`aliens: ${nudged}, alert "${contact.alert}", ${contact.contacts} contact(s)`);
      // A star route. The drive is mass-locked near a world, so the ship is
      // put out where nothing holds it, and the jump goes on its own key.
      const jumped = await page.evaluate(() => {
        const f = window.__stellarFlight;
        const sun = f.world.bodies.find((b) => b.id === 'sun') ?? f.world.bodies[0];
        f.ship.spawn({ position: { x: sun.position.x, y: sun.position.y + sun.radius * 900, z: sun.position.z }, lookAt: sun.position, yaw: 0 });
        return f.session.telemetry.systemName ?? '';
      });
      await page.waitForTimeout(2500);
      await page.keyboard.press('h');
      const legs = [];
      const until = Date.now() + 45_000;
      let after = { system: jumped, phase: '' };
      while (Date.now() < until) {
        after = await page.evaluate(() => {
          const t = window.__stellarFlight.session.telemetry;
          return { system: t.systemName ?? '', phase: t.jumpPhase ?? '', near: t.nearId ?? '' };
        });
        if (after.phase && !legs.includes(after.phase)) legs.push(after.phase);
        if (legs.length && after.phase === 'none' && after.system !== jumped) break;
        await page.waitForTimeout(500);
      }
      if (after.system === jumped) problems.push(`the star route never left ${jumped}`);
      say(`star route: ${jumped || 'sol'} → ${after.system || 'sol'} (${legs.filter((l) => l !== 'none').join(' → ') || 'no jump'}), nearest ${after.near}`);
      await page.screenshot({ path: `${OUT}flight-jump.png` });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

console.log(`\nload average ${loadavg().map((n) => n.toFixed(1)).join(' / ')}`);
if (failedRequests.length) {
  console.log(`\n${failedRequests.length} failed request(s):`);
  for (const r of [...new Set(failedRequests)].slice(0, 10)) console.log(`  ! ${r}`);
}
if (noted.length) console.log(`\nnoted (not Explore's): ${noted.length} line(s)`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log(`  ✗ ${p}`);
  process.exitCode = 1;
} else {
  console.log(`\nevery check passed · shots in ${OUT}`);
}
