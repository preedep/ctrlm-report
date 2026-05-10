import { test, expect } from '@playwright/test';
import { waitForInit, switchTab } from './helpers';

test.describe('Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await waitForInit(page);
  });

  test('tab bar is sticky — remains visible after scrolling', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 3000));
    await page.waitForTimeout(300);
    const nav = page.locator('nav.tabs');
    await expect(nav).toBeVisible();
    // Confirm it sits below the header (sticky top:64px)
    const box = await nav.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(60);
    expect(box!.y).toBeLessThan(120);
  });

  test('can switch to Dashboard tab', async ({ page }) => {
    await switchTab(page, 'dashboard');
    await expect(page.locator('#tab-dashboard')).toHaveClass(/active/);
    await expect(page.locator('#tab-ea')).not.toHaveClass(/active/);
    await expect(page.locator('#stat-total')).toBeVisible();
  });

  test('can switch to Jobs tab', async ({ page }) => {
    await switchTab(page, 'jobs');
    await expect(page.locator('#tab-jobs')).toHaveClass(/active/);
    await expect(page.locator('#search-input')).toBeVisible();
  });

  test('can switch to CTM Migration tab', async ({ page }) => {
    await switchTab(page, 'migration');
    await expect(page.locator('#tab-migration')).toHaveClass(/active/);
  });

  test('can navigate back to EA Landscape tab', async ({ page }) => {
    await switchTab(page, 'dashboard');
    await switchTab(page, 'ea');
    await expect(page.locator('#tab-ea')).toHaveClass(/active/);
  });

  test('only one tab content is visible at a time', async ({ page }) => {
    await switchTab(page, 'dashboard');
    await expect(page.locator('#tab-ea')).not.toHaveClass(/active/);
    await expect(page.locator('#tab-jobs')).not.toHaveClass(/active/);
    await expect(page.locator('#tab-migration')).not.toHaveClass(/active/);
  });
});
