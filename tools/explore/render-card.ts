/**
 * Headless card renderer. Bundles render/card-scene.ts, loads it in headless
 * Chromium on SwiftShader (CPU WebGL, so the output does not depend on the
 * machine's GPU), renders one object and writes public/cards/<DESIGNATION>.webp.
 *
 *   npx tsx tools/explore/render-card.ts <object> [options]
 *
 *   --camera az,el,dist     degrees, degrees, object radii
 *   --fov deg               vertical field of view
 *   --offset y              object's vertical position, fraction of frame height
 *   --sun az,el             sun direction relative to the camera, degrees
 *   --light intensity,ambient,exposure
 *   --spin deg              which face of the object is shown
 *   --particles             Saturn: add Explore's ring sparkle
 *   --designation NAME      output file name (defaults from the object)
 *   --out path              explicit output path
 *
 * Every input is fixed — seed, shader time, spin — so the same arguments give
 * the same frame. Nothing reads the clock.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import type { CardObjectId, CardSceneConfig } from './render/card-scene';

const ROOT = resolve(__dirname, '../..');
const ORIGIN = 'http://card.render';

type Preset = Pick<CardSceneConfig, 'camera' | 'lighting' | 'spin'> & { designation: string };

const BASE_CAMERA = { azimuth: 0, elevation: 0, distance: 11, fov: 20, offsetY: 0 };
const BASE_LIGHT = { azimuth: 50, elevation: 10, intensity: 3.2, ambient: 0.015, exposure: 1.0 };

const PRESETS: Partial<Record<CardObjectId, Preset>> = {
  // From the side the pole leans toward: rings open about 27°, lit face up.
  saturn: {
    designation: 'SATURN',
    camera: { ...BASE_CAMERA, azimuth: 270, distance: 24 },
    lighting: { ...BASE_LIGHT, azimuth: 60 },
    spin: 0,
  },
  // Valles Marineris across the disc, the south polar cap on the limb.
  mars: {
    designation: 'MARS',
    camera: { ...BASE_CAMERA, elevation: -15 },
    lighting: { ...BASE_LIGHT },
    spin: 250,
  },
  // The Great Red Spot turned toward the viewer, a thin crescent of night.
  jupiter: {
    designation: 'JUPITER',
    camera: { ...BASE_CAMERA },
    lighting: { ...BASE_LIGHT, azimuth: 35 },
    spin: 0,
  },
  // A gibbous cloud deck: Venus shows no surface, so the phase is the picture.
  venus: {
    designation: 'VENUS',
    camera: { ...BASE_CAMERA },
    lighting: { ...BASE_LIGHT, azimuth: 70 },
    spin: 0,
  },
  europa: {
    designation: 'EUROPA',
    camera: { ...BASE_CAMERA },
    lighting: { ...BASE_LIGHT },
    spin: 0,
  },
};

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function nums(v: string, n: number, flag: string): number[] {
  const out = v.split(',').map(Number);
  if (out.length !== n || out.some((x) => !Number.isFinite(x))) {
    throw new Error(`${flag} expects ${n} comma-separated numbers, got "${v}"`);
  }
  return out;
}

function parseArgs(argv: string[]) {
  const [object, ...rest] = argv;
  const preset = object ? PRESETS[object as CardObjectId] : undefined;
  if (!preset) {
    throw new Error(`usage: render-card <${Object.keys(PRESETS).join('|')}> [options]`);
  }
  const cfg: CardSceneConfig = {
    object: object as CardObjectId,
    width: 1400,
    height: 1960,
    supersample: 2,
    seed: 1,
    time: 0,
    camera: { ...preset.camera },
    lighting: { ...preset.lighting },
    spin: preset.spin,
    ringParticles: false,
    quality: 0.92,
  };
  let designation = preset.designation;
  let out: string | null = null;
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i];
    const val = () => {
      const v = rest[++i];
      if (v === undefined) throw new Error(`${flag} needs a value`);
      return v;
    };
    switch (flag) {
      case '--camera': {
        const [az, el, d] = nums(val(), 3, flag);
        Object.assign(cfg.camera, { azimuth: az, elevation: el, distance: d });
        break;
      }
      case '--fov': cfg.camera.fov = nums(val(), 1, flag)[0]; break;
      case '--offset': cfg.camera.offsetY = nums(val(), 1, flag)[0]; break;
      case '--sun': {
        const [az, el] = nums(val(), 2, flag);
        Object.assign(cfg.lighting, { azimuth: az, elevation: el });
        break;
      }
      case '--light': {
        const [intensity, ambient, exposure] = nums(val(), 3, flag);
        Object.assign(cfg.lighting, { intensity, ambient, exposure });
        break;
      }
      case '--spin': cfg.spin = nums(val(), 1, flag)[0]; break;
      case '--particles': cfg.ringParticles = true; break;
      case '--designation': designation = val(); break;
      case '--out': out = resolve(val()); break;
      default: throw new Error(`unknown option ${flag}`);
    }
  }
  return { cfg, out: out ?? join(ROOT, 'public/cards', `${designation}.webp`) };
}

async function bundle(): Promise<string> {
  const result = await build({
    entryPoints: [join(__dirname, 'render/card-scene.ts')],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    tsconfig: join(__dirname, 'tsconfig.json'),
    logLevel: 'warning',
  });
  return result.outputFiles[0].text;
}

async function main() {
  const { cfg, out } = parseArgs(process.argv.slice(2));
  const js = await bundle();
  const html = `<!doctype html><html><body style="margin:0;background:#000"><script>window.__CARD__=${JSON.stringify(cfg)}</script><script src="/card-scene.js"></script></body></html>`;

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      // SwiftShader reports every readback as a "GPU stall"; that is expected.
      if ((m.type() === 'error' || m.type() === 'warning') && !m.text().includes('GL Driver Message')) errors.push(m.text());
    });
    await page.route(`${ORIGIN}/**`, (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/') return route.fulfill({ contentType: 'text/html', body: html });
      if (path === '/card-scene.js') return route.fulfill({ contentType: 'text/javascript', body: js });
      if (path.startsWith('/solar-system/')) {
        return route.fulfill({
          contentType: MIME[extname(path)] ?? 'application/octet-stream',
          body: readFileSync(join(ROOT, 'public', path)),
        });
      }
      return route.fulfill({ status: 404, body: '' });
    });
    await page.goto(`${ORIGIN}/`);
    await page.waitForFunction(() => typeof window.__renderCard === 'function');
    const gl = await page.evaluate(() => {
      const ctx = document.createElement('canvas').getContext('webgl2');
      if (!ctx) return null;
      const ext = ctx.getExtension('WEBGL_debug_renderer_info');
      return ext ? String(ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'unknown';
    });
    if (!gl) throw new Error('headless Chromium has no WebGL2 context');
    console.log(`WebGL: ${gl}`);
    const t0 = performance.now();
    const dataUrl = await page.evaluate(() => window.__renderCard!());
    const ms = Math.round(performance.now() - t0);
    if (!dataUrl.startsWith('data:image/webp')) {
      throw new Error(`browser did not return WebP (${dataUrl.slice(0, 30)}) ${errors.join('\n')}`);
    }
    const bytes = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, bytes);
    for (const e of errors) console.warn(`[page] ${e}`);
    console.log(`${cfg.object} -> ${out} (${cfg.width}x${cfg.height}, ${(bytes.length / 1024).toFixed(0)} KB, ${ms} ms)`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
