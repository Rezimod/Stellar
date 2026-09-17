// Explore Mode bench: node scripts/explore-bench.mjs [--url http://localhost:3000] [--only a,c] [--label name] [--out dir] [--sample ms]
// Headless Chromium on the real GPU (ANGLE Metal), 1280x800, pinned pixel ratio.
// Needs a dev server (dev hooks and ?fixedpx exist only outside production).
//
// Counts are taken at the WebGL layer, so every scenario — including the orrery
// and flight, which have no perf() hook — is measured the same way, and a
// hidden canvas that keeps drawing under another mode shows up in the numbers.
// Draw calls and triangles are per frame, summed over every live context.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadavg, tmpdir } from 'node:os';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const BASE = arg('url', 'http://localhost:3000');
const ONLY = arg('only', '');
const LABEL = arg('label', new Date().toISOString().replace(/[:.]/g, '-'));
const SAMPLE_MS = Number(arg('sample', '6000'));
const OUT = `${arg('out', `${tmpdir()}/explore-bench`)}/${LABEL}/`;
mkdirSync(OUT, { recursive: true });

// Installed before any page script runs.
function instrument() {
  const s = { frameCalls: 0, frameTris: 0, buffers: 0, textures: 0, programs: 0, frames: [] };
  window.__bench = s;
  const tris = (mode, count) => (mode === 4 ? count / 3 : mode === 5 || mode === 6 ? Math.max(0, count - 2) : 0);
  for (const Ctx of [WebGL2RenderingContext, WebGLRenderingContext]) {
    const p = Ctx.prototype;
    const wrap = (name, fn) => {
      const orig = p[name];
      if (orig) p[name] = function (...a) { fn(a); return orig.apply(this, a); };
    };
    wrap('drawArrays', (a) => { s.frameCalls++; s.frameTris += tris(a[0], a[2]); });
    wrap('drawElements', (a) => { s.frameCalls++; s.frameTris += tris(a[0], a[1]); });
    wrap('drawArraysInstanced', (a) => { s.frameCalls++; s.frameTris += tris(a[0], a[2]) * a[3]; });
    wrap('drawElementsInstanced', (a) => { s.frameCalls++; s.frameTris += tris(a[0], a[1]) * a[4]; });
    wrap('createBuffer', () => s.buffers++);
    wrap('deleteBuffer', () => s.buffers--);
    wrap('createTexture', () => s.textures++);
    wrap('deleteTexture', () => s.textures--);
    wrap('createProgram', () => s.programs++);
    wrap('deleteProgram', () => s.programs--);
  }
  // One sample per animation frame: the interval, and what was drawn since the last one.
  let last = 0;
  const tick = (now) => {
    if (s.recording && last) s.frames.push([now - last, s.frameCalls, s.frameTris]);
    last = now;
    s.frameCalls = 0;
    s.frameTris = 0;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const median = (xs) => { const a = [...xs].sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : 0; };
const pct = (xs, p) => { const a = [...xs].sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : 0; };

async function measure(page, name, extra) {
  await page.evaluate(() => { window.__bench.frames = []; window.__bench.recording = true; });
  await page.waitForTimeout(SAMPLE_MS);
  const raw = await page.evaluate(() => {
    const s = window.__bench;
    s.recording = false;
    const heap = performance.memory ? performance.memory.usedJSHeapSize : 0;
    // The GPU actually in use: a SwiftShader fallback would make every number meaningless.
    const gl = document.createElement('canvas').getContext('webgl2');
    const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
    const gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown';
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return { frames: s.frames, buffers: s.buffers, textures: s.textures, programs: s.programs, heap, gpu };
  });
  // Frames that drew nothing are rAF ticks between renders, not frames.
  const drawn = raw.frames.filter((f) => f[1] > 0);
  const ms = raw.frames.map((f) => f[0]);
  const row = {
    scenario: name,
    frames: raw.frames.length,
    medianMs: +median(ms).toFixed(1),
    p95Ms: +pct(ms, 0.95).toFixed(1),
    maxMs: +Math.max(0, ...ms).toFixed(1),
    drawCalls: median(drawn.map((f) => f[1])),
    triangles: Math.round(median(drawn.map((f) => f[2]))),
    buffers: raw.buffers,
    textures: raw.textures,
    programs: raw.programs,
    heapMB: +(raw.heap / 1048576).toFixed(0),
    load1: +loadavg()[0].toFixed(1),
    gpu: raw.gpu,
    ...extra,
  };
  await page.screenshot({ path: `${OUT}${name}.png` });
  console.log(JSON.stringify(row));
  return row;
}

async function waitFor(page, fn, param, timeoutS = 300) {
  for (let i = 0; i < timeoutS; i++) {
    if (await page.evaluate(fn, param).catch(() => false)) return;
    await page.waitForTimeout(1000);
  }
  throw new Error(`timed out waiting for ${fn}`);
}

// Straight onto the surface: skip the flown descent, wait for the crew to step out.
async function land(page, url, h) {
  await page.goto(url, { waitUntil: 'commit', timeout: 300_000 });
  await waitFor(page, (h) => !!window[h]?.telemetry?.ready, h);
  await page.evaluate((h) => window[h].skipDescent(), h);
  await waitFor(page, (h) => window[h].telemetry.phase === 'surface', h, 60);
}
const hookPerf = (page, h) => page.evaluate((h) => {
  const p = window[h].perf();
  return { hookCalls: p.calls, hookTris: p.triangles, hookFrameMs: +p.frameMs.toFixed(1), pixelRatio: p.pixelRatio, buildMs: Math.round(p.buildMs) };
}, h);

const SCENARIOS = {
  async a(page) {
    await page.goto(`${BASE}/solar-system`, { waitUntil: 'commit', timeout: 300_000 });
    await waitFor(page, () => !!document.querySelector('.solar-system__loader.is-done') && !!document.querySelector('canvas'));
    await page.waitForTimeout(4000);
    return measure(page, 'a-orrery');
  },
  async b(page) {
    await page.goto(`${BASE}/solar-system`, { waitUntil: 'commit', timeout: 300_000 });
    await waitFor(page, () => !!document.querySelector('.flight-hud__explore'));
    await page.waitForTimeout(3000);
    await page.click('.flight-hud__explore');
    await waitFor(page, () => !!window.__stellarFlight);
    await page.waitForTimeout(5000);
    const where = await page.evaluate(() => {
      const f = window.__stellarFlight;
      const p = f.ship.group.position;
      const near = f.world.bodies
        .map((b) => ({ id: b.id, d: b.position.distanceTo(p) / b.radius }))
        .sort((x, y) => x.d - y.d)[0];
      return { nearest: near?.id, radii: near ? +near.d.toFixed(1) : null };
    });
    return measure(page, 'b-flight-earth', where);
  },
  async c(page) {
    await land(page, `${BASE}/solar-system?moon=1&fixedpx=1`, '__stellarMoon');
    await page.waitForTimeout(3000);
    return measure(page, 'c-moon-lander', await hookPerf(page, '__stellarMoon'));
  },
  async d(page) {
    await land(page, `${BASE}/solar-system?moon=1&fixedpx=1`, '__stellarMoon');
    // South of the pad, looking north across it at the habitats.
    await page.evaluate(() => { window.__stellarMoon.teleport(0, 12); window.__stellarMoon.face(0, -1); });
    await page.waitForTimeout(3000);
    return measure(page, 'd-moon-base', await hookPerf(page, '__stellarMoon'));
  },
  async e(page) {
    await land(page, `${BASE}/solar-system?moon=1&fixedpx=1`, '__stellarMoon');
    const input = (patch) => page.evaluate((patch) => Object.assign(window.__stellarMoon.input, patch), patch);
    const r = await page.evaluate(() => window.__stellarMoon.roverAt());
    await page.evaluate((r) => { window.__stellarMoon.teleport(r.x - 3.6, r.z + 1); window.__stellarMoon.face(1, 0); }, r);
    await page.waitForTimeout(500);
    await input({ interact: true }); await page.waitForTimeout(90); await input({ interact: false });
    await waitFor(page, () => !!window.__stellarMoon.telemetry.driving, undefined, 20);
    await page.waitForTimeout(2500);
    await input({ moveY: 1 });
    await page.waitForTimeout(2000);
    const row = await measure(page, 'e-moon-rover', await hookPerf(page, '__stellarMoon'));
    row.speed = await page.evaluate(() => +(window.__stellarMoon.telemetry.speed ?? 0).toFixed(1));
    await input({ moveY: 0 });
    return row;
  },
  async f(page) {
    await land(page, `${BASE}/solar-system?land=mars&fixedpx=1`, '__stellarWorld');
    // Habitats stand at z -52…-58; look at them from the south.
    await page.evaluate(() => { window.__stellarWorld.teleport(0, -30); window.__stellarWorld.face(0, -1); });
    await page.waitForTimeout(3000);
    return measure(page, 'f-mars-base', await hookPerf(page, '__stellarWorld'));
  },
};

const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-precise-memory-info'],
});
const rows = [];
const failures = [];
for (const [key, run] of Object.entries(SCENARIOS)) {
  if (ONLY && !ONLY.split(',').includes(key)) continue;
  // A fresh page per scenario: nothing carried over from the last one.
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' || /WebGL|GL_INVALID|THREE\.WebGL/.test(m.text())) errors.push(m.text()); });
  await page.addInitScript(instrument);
  try {
    const row = await run(page);
    row.consoleErrors = errors.length;
    rows.push(row);
  } catch (e) {
    failures.push({ scenario: key, error: String(e.message ?? e), consoleErrors: errors.slice(0, 5) });
    console.log(`FAIL ${key}: ${e.message ?? e}`);
    await page.screenshot({ path: `${OUT}${key}-fail.png` }).catch(() => {});
  }
  if (errors.length) writeFileSync(`${OUT}${key}-errors.txt`, errors.join('\n'));
  await context.close();
}
await browser.close();

writeFileSync(`${OUT}bench.json`, JSON.stringify({ label: LABEL, base: BASE, rows, failures }, null, 2));
console.log(`\n| Scenario | Draw calls | Tris | Median ms | p95 ms | Max ms | Buffers | Textures | Programs | Heap MB | Load (1m) | Errors |`);
console.log(`|---|---|---|---|---|---|---|---|---|---|---|---|`);
for (const r of rows) {
  console.log(`| ${r.scenario} | ${r.drawCalls} | ${r.triangles} | ${r.medianMs} | ${r.p95Ms} | ${r.maxMs} | ${r.buffers} | ${r.textures} | ${r.programs} | ${r.heapMB} | ${r.load1} | ${r.consoleErrors} |`);
}
if (rows.length) console.log(`\nGPU: ${rows[0].gpu}`);
console.log(`written ${OUT}bench.json`);
process.exit(failures.length ? 1 : 0);
