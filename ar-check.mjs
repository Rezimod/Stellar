import { chromium } from '@playwright/test';

const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const ctx = await browser.newContext({
  permissions: ['geolocation', 'camera'],
  geolocation: { latitude: 41.7151, longitude: 44.8271 },
  viewport: { width: 414, height: 896 },
});
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto('http://localhost:3737/sky', { waitUntil: 'domcontentloaded' });

// Wait for the finder data + the AR-open ("View all") button.
const viewAll = page.locator('button.skx__viewall').first();
await viewAll.waitFor({ state: 'visible', timeout: 45000 });
console.log('View all (AR open) button visible:', true);

// Pump synthetic deviceorientation events so heading/altitude become non-null
// and ARFinder computes placements → planet3DRef.current.update() fires.
const pump = async () => {
  await page.evaluate(() => {
    for (let i = 0; i < 5; i++) {
      const e = new Event('deviceorientation');
      Object.assign(e, { alpha: 120, beta: 70, gamma: 2, absolute: true });
      window.dispatchEvent(e);
    }
  });
};

await viewAll.click();
await page.waitForTimeout(500);
await pump();
await page.waitForTimeout(1500);
await pump();
await page.waitForTimeout(1500);

const arDialog = await page.locator('[role="dialog"][aria-modal="true"]').count();
const canvasInfo = await page.evaluate(() => {
  const cs = Array.from(document.querySelectorAll('canvas'));
  return cs.map((c) => {
    let gl = null;
    try { gl = c.getContext('webgl2') || c.getContext('webgl'); } catch {}
    return {
      w: c.width, h: c.height,
      dbw: gl ? gl.drawingBufferWidth : 0,
      dbh: gl ? gl.drawingBufferHeight : 0,
      hasGL: !!gl,
    };
  });
});

console.log('AR dialog present:', arDialog);
console.log('canvas info:', JSON.stringify(canvasInfo));
const nullRefErr = errors.filter((e) => /null|undefined.*update|Cannot read/i.test(e));
console.log('null-ref / update errors:', nullRefErr.length ? nullRefErr : 'none');
console.log('all console errors:', errors.length ? errors.slice(0, 8) : 'none');

await browser.close();
