import { test, expect } from '@playwright/test';
import { waitForInit, D } from './helpers';

test.describe('Page Load', () => {
  test.beforeEach(async ({ page }) => {
    await waitForInit(page);
  });

  test('report loads without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    // Re-load and wait to capture any boot-time errors
    await page.reload();
    await page.waitForSelector('#ea-stat-apps:not(:empty)', { timeout: 20_000 });
    expect(errors).toHaveLength(0);
  });

  test('page title is "Control-M Report"', async ({ page }) => {
    await expect(page.locator('header h1')).toHaveText('Control-M Report');
  });

  test('header shows total job count', async ({ page }) => {
    await expect(page.locator('#header-total')).toHaveText(
      `${D.TOTAL_JOBS.toLocaleString()} jobs`,
    );
  });

  test('generated date is visible', async ({ page }) => {
    const genDate = page.locator('#gen-date');
    await expect(genDate).toBeVisible();
    await expect(genDate).not.toHaveText('Loading…');
  });

  test('EA Landscape is the default active tab', async ({ page }) => {
    await expect(page.locator('.tab-btn[data-tab="ea"]')).toHaveClass(/active/);
    await expect(page.locator('#tab-ea')).toHaveClass(/active/);
  });
});
