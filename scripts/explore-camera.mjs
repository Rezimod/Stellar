// Explore camera clearance: node scripts/explore-camera.mjs [--url http://localhost:3000] [--out dir]
// Headless Chromium on the real GPU against a dev server. On the Moon, at the
// five places the chase camera is hardest to keep clear (a door ramp, inside a
// dome, against a hull, beside the rover, the steepest ground in reach), it
// swings the camera round eight bearings at three pitches and two distances
// and samples where it ends up. A sample inside the base's walls, or within
// 0.3 m of the ground under it, is a clip. Exits non-zero on any clip.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { loadavg, tmpdir } from 'node:os';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const BASE = arg('url', 'http://localhost:3000');
const OUT = `${arg('out', `${tmpdir()}/explore-camera`)}/`;
const CLEARANCE = 0.3;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' || /WebGL|GL_INVALID|THREE\.WebGL/.test(m.text())) errors.push(`console: ${m.text()}`); });

async function waitFor(fn, timeoutS = 300) {
  for (let i = 0; i < timeoutS; i++) {
    if (await page.evaluate(fn).catch(() => false)) return;
    await page.waitForTimeout(1000);
  }
  throw new Error(`timed out waiting for ${fn}`);
}

await page.goto(`${BASE}/play?moon=1&fixedpx=1`, { waitUntil: 'commit', timeout: 300_000 });
await waitFor(() => window.__stellarMoon?.telemetry?.ready === true);
await page.evaluate(() => window.__stellarMoon.skipDescent());
await waitFor(() => window.__stellarMoon.telemetry.phase === 'surface');
const spots = await page.evaluate(() => window.__stellarMoon.cameraSpots());
console.log(`load ${loadavg().map((l) => l.toFixed(1)).join(' ')}`);

let clips = 0;
const rows = [];
for (const spot of spots) {
  let worst = Infinity; let blocked = 0; let samples = 0;
  for (const dist of ['near', 'far']) {
    // Pitch, rad: along the ground, the default, and looking down from high over the crew.
    for (const pitch of [-0.12, 0.3, 1.1]) {
      for (let k = 0; k < 8; k++) {
        const r = await page.evaluate(async ({ spot, dist, pitch, k, first }) => {
          const m = window.__stellarMoon;
          m.teleport(spot.x, spot.z);
          const a = (k / 8) * Math.PI * 2;
          m.face(Math.sin(a), Math.cos(a));
          // Down to the pitch stop, then up to this one (0.004 rad a pixel); the zoom to a stop.
          m.input.orbitDY -= 1000; await new Promise((r) => setTimeout(r, 60));
          m.input.orbitDY += (pitch + 0.12) / 0.004;
          // Once per distance: a second push out past the far stop would be the wide view.
          if (first) m.input.zoom += dist === 'far' ? 6 : -6;
          const out = { worst: Infinity, blocked: 0, samples: 0 };
          for (let i = 0; i < 14; i++) {
            await new Promise((r) => setTimeout(r, 70));
            const c = m.cameraAt();
            if (c.view !== 'chase') continue;
            out.samples += 1;
            out.worst = Math.min(out.worst, c.clearance);
            if (c.blocked) out.blocked += 1;
          }
          return out;
        }, { spot, dist, pitch, k, first: pitch === -0.12 && k === 0 });
        worst = Math.min(worst, r.worst); blocked += r.blocked; samples += r.samples;
      }
    }
  }
  const clip = blocked > 0 || worst < CLEARANCE || samples === 0;
  if (clip) clips += 1;
  rows.push({ spot: spot.id, samples, blocked, worst: worst.toFixed(2), clip });
  await page.evaluate((s) => { const m = window.__stellarMoon; m.teleport(s.x, s.z); m.face(1, 0); }, spot);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}${spot.id}.png` });
}
await browser.close();
console.table(rows);
for (const e of errors) console.log(`  ${e}`);
console.log(`${clips} clipping spot(s), ${errors.length} console errors; shots in ${OUT}`);
process.exit(clips || errors.length ? 1 : 0);
