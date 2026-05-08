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

    // Bottom nav is rendered into every page on mobile-or-desktop.
    // Its presence is the cheapest "layout didn't crash" signal we have.
    await expect(page.getByRole('link', { name: /sky/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /missions/i })).toBeVisible();

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
