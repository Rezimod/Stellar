import { test, expect } from '@playwright/test';

const ROUTES = [
  ['home', '/'],
  ['set-001', '/set/001'],
  ['card-saturn', '/card/SATURN'],
  ['card-europa', '/card/EUROPA'],
  ['capsules', '/capsules'],
] as const;

const SIZES = [
  ['mobile', 390, 844],
  ['desktop', 1440, 900],
] as const;

for (const [name, path] of ROUTES) {
  for (const [label, width, height] of SIZES) {
    test(`${name} ${label}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(`http://localhost:3000${path}`, { waitUntil: 'networkidle', timeout: 120_000 });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `qa/${name}-${label}.png`, fullPage: true });

      // nothing may run off the side of a phone
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${name} ${label} overflows by ${overflow}px`).toBeLessThanOrEqual(1);
    });
  }
}
