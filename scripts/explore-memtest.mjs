// Environment lifecycle: node scripts/explore-memtest.mjs [--url http://localhost:3000] [--scene moon|mars|proximaB|earth] [--cycles 3]
// Enters a surface, leaves it for the orrery, and repeats; after every exit
// it records the JS heap and the live WebGL buffers, textures and programs.
// The first entry pays for the module-level caches (canvases, sprites), so
// the trend is judged from the second exit on. Needs a dev server.
import { chromium } from 'playwright';
import { loadavg } from 'node:os';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const BASE = arg('url', 'http://localhost:3000');
const SCENE = arg('scene', 'moon');
const CYCLES = Number(arg('cycles', '3'));
const hook = SCENE === 'moon' ? '__stellarMoon' : '__stellarWorld';
const link = SCENE === 'moon' ? 'moon=1' : `land=${SCENE}`;

function instrument() {
  // Resources are counted per context, and a context that is lost takes its
  // outstanding ones with it: the browser frees them, so they are not a leak.
  const live = new Map();
  const s = { buffers: 0, textures: 0, programs: 0, contexts: 0, live };
  window.__mem = s;
  const tally = (ctx) => { let t = live.get(ctx); if (!t) { t = { buffers: 0, textures: 0, programs: 0 }; live.set(ctx, t); } return t; };
  const total = () => {
    s.buffers = 0; s.textures = 0; s.programs = 0;
    for (const t of live.values()) { s.buffers += t.buffers; s.textures += t.textures; s.programs += t.programs; }
    s.contexts = live.size;
  };
  for (const Ctx of [WebGL2RenderingContext, WebGLRenderingContext]) {
    const p = Ctx.prototype;
    const wrap = (name, key, d) => { const orig = p[name]; if (orig) p[name] = function (...a) { tally(this)[key] += d; return orig.apply(this, a); }; };
    wrap('createBuffer', 'buffers', 1); wrap('deleteBuffer', 'buffers', -1);
    wrap('createTexture', 'textures', 1); wrap('deleteTexture', 'textures', -1);
    wrap('createProgram', 'programs', 1); wrap('deleteProgram', 'programs', -1);
  }
  const get = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (kind, ...rest) {
    const ctx = get.call(this, kind, ...rest);
    if (ctx && /webgl/.test(kind) && !this.__counted) {
      this.__counted = true;
      tally(ctx);
      ctx.canvas.addEventListener('webglcontextlost', () => live.delete(ctx));
    }
    return ctx;
  };
  s.snapshot = total;
}

async function waitFor(page, fn, param, timeoutS = 300) {
  for (let i = 0; i < timeoutS; i++) {
    if (await page.evaluate(fn, param).catch(() => false)) return;
    await page.waitForTimeout(1000);
  }
  throw new Error(`timed out waiting for ${fn}`);
}
const sample = (page, label) => page.evaluate((label) => {
  const m = window.__mem;
  m.snapshot();
  return { label, heapMB: +((performance.memory?.usedJSHeapSize ?? 0) / 1048576).toFixed(1), buffers: m.buffers, textures: m.textures, programs: m.programs, contexts: m.contexts };
}, label);

const browser = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' || /WebGL|GL_INVALID|THREE\.WebGL/.test(m.text())) errors.push(m.text()); });
await page.addInitScript(instrument);

await page.goto(`${BASE}/play?${link}&fixedpx=1`, { waitUntil: 'commit', timeout: 300_000 });
const rows = [];
for (let c = 1; c <= CYCLES; c++) {
  await waitFor(page, (h) => !!window[h]?.telemetry?.ready, hook);
  await page.evaluate((h) => window[h].skipDescent(), hook);
  await waitFor(page, (h) => window[h].telemetry.phase === 'surface', hook, 60);
  await page.waitForTimeout(2500);
  rows.push(await sample(page, `enter ${c}`));
  // Leave for orbit through the shell, exactly as the pause menu's travel does.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__stellarGame?.travel('orbit'));
  await waitFor(page, (h) => !window[h], hook, 60);
  await waitFor(page, () => !document.querySelector('.game-shell__loader'), undefined, 120);
  await page.waitForTimeout(3000);
  await page.evaluate(() => { if (window.gc) window.gc(); });
  await page.waitForTimeout(1000);
  rows.push(await sample(page, `exit ${c}`));
  if (c < CYCLES) {
    await page.evaluate((scene) => window.__stellarGame?.travel(scene), SCENE);
  }
}
await browser.close();

console.log(`\n| Step | Heap MB | Buffers | Textures | Programs | Contexts |`);
console.log(`|---|---|---|---|---|---|`);
for (const r of rows) console.log(`| ${r.label} | ${r.heapMB} | ${r.buffers} | ${r.textures} | ${r.programs} | ${r.contexts} |`);
const exits = rows.filter((r) => r.label.startsWith('exit'));
if (exits.length >= 2) {
  const a = exits[1]; const b = exits[exits.length - 1];
  console.log(`\nexit 2 → exit ${exits.length}: heap ${a.heapMB} → ${b.heapMB} MB, buffers ${a.buffers} → ${b.buffers}, textures ${a.textures} → ${b.textures}, programs ${a.programs} → ${b.programs}, contexts ${a.contexts} → ${b.contexts}`);
}
console.log(`load (1m) ${loadavg()[0].toFixed(1)}, console errors ${errors.length}`);
if (errors.length) console.log(errors.slice(0, 5).join('\n'));
process.exit(errors.length ? 1 : 0);
