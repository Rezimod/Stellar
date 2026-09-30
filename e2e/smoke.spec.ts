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
  test('home page renders the landing + Stellar nav', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const response = await page.goto('/');
    expect(response?.ok()).toBeTruthy();

    const nav = page.getByRole('navigation', { name: 'Stellar' });
    await expect(nav.getByRole('link', { name: 'First Light', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Tonight', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Open the capsule');
    await expect(page.getByRole('link', { name: /Open a capsule/ }).first()).toHaveAttribute('href', '/set/001');

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

  test('marketplace page renders products', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const response = await page.goto('/marketplace');
    expect(response?.ok()).toBeTruthy();

    await page.waitForLoadState('domcontentloaded');
    expect(errors, `pageerrors on /marketplace: ${errors.join('\n')}`).toEqual([]);
  });
});
