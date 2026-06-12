import { test, expect } from '@playwright/test';

/**
 * Broad route smoke test — every major page should return 200 and mount without
 * a client-side runtime error. Uses the config baseURL (local server by default;
 * set PLAYWRIGHT_BASE_URL=https://stellarrclub.vercel.app to run against prod).
 */

const ROUTES = [
  '/',
  '/sky',
  '/missions',
  '/feed',
  '/learn',
  '/marketplace',
  '/hub',
  '/profile',
  '/nfts',
  '/chat',
  '/field',
  '/solar-system',
  '/network',
  '/darksky',
  '/leaderboard',
  '/contact',
  '/terms',
  '/privacy',
  '/settings',
  '/observe/demo',
  '/observe/not-a-mission',
  '/marketplace/checkout',
];

for (const route of ROUTES) {
  test(`route ${route} loads without runtime errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.status(), `HTTP status for ${route}`).toBeLessThan(500);

    await page.waitForTimeout(500);
    expect(errors, `pageerrors on ${route}:\n${errors.join('\n')}`).toEqual([]);
  });
}

test('footer includes legal links', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const footer = page.locator('footer');
  await expect(footer.getByRole('link', { name: /terms/i })).toBeVisible();
  await expect(footer.getByRole('link', { name: /privacy/i })).toBeVisible();
  await expect(footer.getByRole('link', { name: /contact/i })).toBeVisible();
});

test('search modal mission results deep-link to observe flow', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /search/i }).click();
  await page.getByPlaceholder(/search missions/i).fill('jupiter');
  await page.getByRole('button', { name: /jupiter/i }).first().click();
  await expect(page).toHaveURL(/\/observe\/(jupiter|quick-jupiter)/);
});
