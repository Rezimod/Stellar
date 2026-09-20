// Phase 10 checks: node scripts/explore-hud.mjs [--url http://localhost:3000] [--out dir]
// Headless Chromium on the real GPU. Three things the HUD has to be able to say:
//   1. the glass keeps out of the centre third at 1280×800 and 390×844,
//   2. nothing is heard before a gesture, and nothing at all with the sound off,
//   3. a finished mission writes a record that survives a reload and renders,
//      with no call to any reward endpoint anywhere in the run.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const BASE = arg('url', 'http://localhost:3000');
const OUT = `${arg('out', `${tmpdir()}/explore-hud`)}/`;
mkdirSync(OUT, { recursive: true });

/** Count the audio contexts, and hold on to whatever is wired to the speakers. */
const WATCH_AUDIO = () => {
  window.__audio = { contexts: 0 };
  const Ctor = window.AudioContext;
  const masters = [];
  window.__audio.masters = () => masters.map((g) => g.gain.value);
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...rest) {
    if (dest instanceof AudioDestinationNode && this instanceof GainNode) masters.push(this);
    return connect.call(this, dest, ...rest);
  };
  window.AudioContext = class extends Ctor {
    constructor(...args) {
      super(...args);
      window.__audio.contexts += 1;
    }
  };
};

const REWARD_ROUTES = /\/api\/(award-stars|mint|observe|stars-balance|star\/claim)/;
/** Privy's login frame is refused on any port but 3000, and its iframe cannot
 *  read storage from here. Neither is anything to do with the Moon. */
const NOISE = /auth\.privy\.io|Failed to load resource: the server responded with a status of 403|Access is denied for this document/;

async function waitFor(page, fn, timeoutS = 240) {
  for (let i = 0; i < timeoutS; i++) {
    if (await page.evaluate(fn).catch(() => false)) return;
    await page.waitForTimeout(1000);
  }
  throw new Error(`timed out waiting for ${fn}`);
}

const browser = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const problems = [];
const noted = [];
const complain = (line) => (NOISE.test(line) ? noted : problems).push(line);
const say = (line) => console.log(`· ${line}`);
const calls = [];

/** Open the Moon with the crew already on the surface. */
async function moon(context, { sound }) {
  const page = await context.newPage();
  page.on('pageerror', (e) => complain(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' || /WebGL|GL_INVALID|THREE\.WebGL/.test(m.text())) complain(`console: ${m.text()}`); });
  page.on('request', (r) => { calls.push(r.url()); if (REWARD_ROUTES.test(r.url())) problems.push(`reward endpoint called: ${r.url()}`); });
  await page.addInitScript(WATCH_AUDIO);
  await page.addInitScript((on) => { if (!on) localStorage.setItem('stellar_sound', 'off'); }, sound);
  await page.goto(`${BASE}/play?moon`, { waitUntil: 'commit', timeout: 300_000 });
  await waitFor(page, () => !!window.__stellarMoon);
  await page.evaluate(() => window.__stellarMoon.skipDescent());
  await waitFor(page, () => window.__stellarMoon?.telemetry.phase === 'surface' && window.__stellarMoon.telemetry.ready);
  return page;
}

try {
  // ── 1. The glass, at a desk and on a phone. ──
  const desk = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const page = await moon(desk, { sound: true });

  const centreThird = () => page.evaluate(() => {
    const allowed = ['moon-hud__prompt', 'moon-hud__foot', 'moon-hud__work', 'moon-hud__action', 'moon-hud__visor',
      'moon-hud__black', 'moon-hud__crack', 'moon-hud__banner', 'moon-hud__impact'];
    const w = window.innerWidth; const h = window.innerHeight;
    const box = { x0: w / 3, x1: (w * 2) / 3, y0: h / 3, y1: (h * 2) / 3 };
    const hits = [];
    for (const el of document.querySelectorAll('.moon-hud *')) {
      if (el.hidden || !el.className || typeof el.className !== 'string') continue;
      if (allowed.some((c) => el.closest(`.${c}`))) continue;
      if (getComputedStyle(el).display === 'none' || getComputedStyle(el).visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (r.right > box.x0 && r.left < box.x1 && r.bottom > box.y0 && r.top < box.y1) hits.push(`${el.className} ${JSON.stringify(r.toJSON())}`);
    }
    return hits;
  });

  let hits = await centreThird();
  if (hits.length) problems.push(`1280×800 centre third: ${hits.join(' | ')}`);
  say(`1280×800 centre third clear: ${hits.length === 0}`);
  await page.screenshot({ path: `${OUT}hud-1280.png` });

  // ── 2. Audio: nothing before the gesture, nothing at all with the sound off. ──
  const before = await page.evaluate(() => window.__audio.contexts);
  if (before !== 0) problems.push(`audio context built before any gesture (${before})`);
  say(`audio contexts before a gesture: ${before}`);
  await page.mouse.click(640, 400);
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => ({ n: window.__audio.contexts, gains: window.__audio.masters() }));
  if (after.n === 0) problems.push('no audio context after the first gesture');
  if (!after.gains.some((g) => g > 0)) problems.push(`sound is on but every master gain is silent: ${JSON.stringify(after.gains)}`);
  say(`after a gesture: ${after.n} context(s), master gains ${JSON.stringify(after.gains)}`);

  // ── 3. A mission, its record, and the reload. ──
  await page.evaluate(() => {
    const m = window.__stellarMoon;
    m.startMission('power');
    for (const id of ['deadCable', 'coupling', 'fitCoupling', 'breaker']) m.forceInteract(id, 3);
  });
  await page.waitForTimeout(600);
  const state = await page.evaluate(() => ({
    done: window.__stellarMoon.telemetry.missions.done,
    records: window.__stellarMoon.telemetry.achievements,
    stored: localStorage.getItem('stellar_explore_achievements_v1'),
    carrying: window.__stellarMoon.telemetry.props.carrying,
  }));
  if (!state.done.includes('power')) problems.push(`the power mission did not close: ${JSON.stringify(state.done)}`);
  if (!state.records.some((a) => a.id === 'explore.power_restored')) problems.push(`no record written: ${JSON.stringify(state.records)}`);
  if (!(state.stored ?? '').includes('explore.power_restored')) problems.push('the record was not stored');
  say(`records after the mission: ${JSON.stringify(state.records)}`);

  // And the telescope, whose record carries what it was pointed at.
  await page.evaluate(() => {
    const m = window.__stellarMoon;
    m.startMission('telescope');
    for (const id of ['mountPower', 'mountAlign', 'scopeObserve']) m.forceInteract(id, 3);
  });
  await page.waitForTimeout(600);
  const scope = await page.evaluate(() => window.__stellarMoon.telemetry.achievements.find((a) => a.id === 'explore.telescope_calibrated'));
  if (!scope?.detail) problems.push(`the telescope's record carries no object: ${JSON.stringify(scope)}`);
  say(`telescope record: ${JSON.stringify(scope)}`);

  // The hands: pick the feed horn up and see it on the glass.
  await page.evaluate(() => window.__stellarMoon.forceInteract('feed', 1));
  await page.waitForTimeout(400);
  const hands = await page.evaluate(() => {
    const el = document.querySelector('.moon-hud__carry');
    return { carrying: window.__stellarMoon.telemetry.props.carrying, shown: !!el && !el.hidden, text: el?.textContent ?? '' };
  });
  if (!hands.shown || !hands.text.trim()) problems.push(`the hands panel did not show what is carried: ${JSON.stringify(hands)}`);
  say(`hands: ${JSON.stringify(hands)}`);
  await page.screenshot({ path: `${OUT}hud-1280-carrying.png` });

  // Reload: the record is still there, and the log shows it.
  await page.reload({ waitUntil: 'commit', timeout: 300_000 });
  await waitFor(page, () => !!window.__stellarMoon);
  await page.evaluate(() => window.__stellarMoon.skipDescent());
  await waitFor(page, () => window.__stellarMoon?.telemetry.phase === 'surface' && window.__stellarMoon.telemetry.ready);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(500);
  const log = await page.evaluate(() => {
    const el = document.querySelector('.moon-log__records');
    return { open: !!document.querySelector('.moon-hud__log'), text: el?.textContent ?? '', link: el?.querySelector('a')?.getAttribute('href') ?? '' };
  });
  if (!log.text.trim()) problems.push(`the log shows no records after a reload: ${JSON.stringify(log)}`);
  if (log.link !== '/sky') problems.push(`the telescope's record does not send the crew to their own sky: ${JSON.stringify(log)}`);
  say(`log after a reload: ${JSON.stringify(log)}`);
  await page.screenshot({ path: `${OUT}hud-1280-log.png` });

  // ── 4. The phone. ──
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const small = await moon(phone, { sound: true });
  const smallHits = await small.evaluate(() => {
    const allowed = ['moon-hud__prompt', 'moon-hud__foot', 'moon-hud__work', 'moon-hud__action', 'moon-hud__visor',
      'moon-hud__black', 'moon-hud__crack', 'moon-hud__banner', 'moon-hud__impact'];
    const w = window.innerWidth; const h = window.innerHeight;
    const box = { x0: w / 3, x1: (w * 2) / 3, y0: h / 3, y1: (h * 2) / 3 };
    const hits = [];
    for (const el of document.querySelectorAll('.moon-hud *')) {
      if (el.hidden || !el.className || typeof el.className !== 'string') continue;
      if (allowed.some((c) => el.closest(`.${c}`))) continue;
      if (getComputedStyle(el).display === 'none' || getComputedStyle(el).visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (r.right > box.x0 && r.left < box.x1 && r.bottom > box.y0 && r.top < box.y1) hits.push(`${el.className}`);
    }
    return hits;
  });
  if (smallHits.length) problems.push(`390×844 centre third: ${smallHits.join(' | ')}`);
  say(`390×844 centre third clear: ${smallHits.length === 0}`);
  await small.screenshot({ path: `${OUT}hud-390.png` });

  // ── 5. The sound switch, off. ──
  const quiet = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const silent = await moon(quiet, { sound: false });
  await silent.mouse.click(640, 400);
  await silent.waitForTimeout(600);
  const off = await silent.evaluate(() => ({ n: window.__audio.contexts, gains: window.__audio.masters() }));
  if (off.gains.some((g) => g > 0)) problems.push(`sound is off but a master gain is open: ${JSON.stringify(off.gains)}`);
  say(`sound off: ${off.n} context(s), master gains ${JSON.stringify(off.gains)}`);

  const rewardCalls = calls.filter((u) => REWARD_ROUTES.test(u));
  say(`network: ${calls.length} requests, ${rewardCalls.length} to reward endpoints`);
} finally {
  await browser.close();
}

if (noted.length) {
  console.log(`\n${noted.length} noted (Privy on a port that is not 3000):`);
  for (const n of new Set(noted)) console.log(`  · ${n.slice(0, 120)}`);
}
if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
console.log(`\nAll checks passed. Shots in ${OUT}`);
