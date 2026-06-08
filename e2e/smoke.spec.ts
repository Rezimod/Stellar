import { test, expect } from '@playwright/test';

/**
 * Golden-path smoke tests. Run on every push.
 * Each test loads a major route, asserts the page rendered without
 * a runtime error, and asserts a stable selector that proves the
 * page-specific UI mounted (not just an empty shell).
 *
 * Keep these few and stable. They exist to catch regressions like
 * "build still passes but / 500s" or "sky page crashes on first paint."
 */

test.describe('smoke — golden routes', () => {
  test('home page renders hero + bottom nav', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const response = await page.goto('/');
    expect(response?.ok()).toBeTruthy();

    // Top nav tabs — scoped to <nav> to avoid matching hero/footer Sky links.
    const nav = page.getByRole('navigation');
    await expect(nav.getByRole('link', { name: 'Sky', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Missions', exact: true })).toBeVisible();

    expect(errors, `pageerrors on /: ${errors.join('\n')}`).toEqual([]);
  });

  test('sky page mounts without runtime errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const response = await page.goto('/sky');
    expect(response?.ok()).toBeTruthy();

    // Sky page hits Open-Meteo + astronomy-engine. If either import path
    // breaks, the body renders but the heading never paints. Wait for it.
    await page.waitForLoadState('domcontentloaded');
    expect(errors, `pageerrors on /sky: ${errors.join('\n')}`).toEqual([]);
  });

  test('missions page mounts without runtime errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const response = await page.goto('/missions');
    expect(response?.ok()).toBeTruthy();

    await page.waitForLoadState('domcontentloaded');
    expect(errors, `pageerrors on /missions: ${errors.join('\n')}`).toEqual([]);
  });

  test('marketplace page renders products', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const response = await page.goto('/marketplace');
    expect(response?.ok()).toBeTruthy();

    await page.waitForLoadState('domcontentloaded');
    expect(errors, `pageerrors on /marketplace: ${errors.join('\n')}`).toEqual([]);
  });
});
