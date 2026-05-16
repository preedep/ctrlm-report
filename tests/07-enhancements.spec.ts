import { test, expect } from '@playwright/test';
import { waitForInit, switchTab, D } from './helpers';

// Known unmatched Control-M application (no matching app portfolio entry)
const UNMATCHED_APP = 'APP_PAYMENTHUB';

test.describe('Enhancements', () => {
  // ── Unmatched app click-through ──────────────────────────────────────────
  test.describe('Unmatched app grid — click to Jobs tab', () => {
    test.beforeEach(async ({ page }) => {
      await waitForInit(page);
      await switchTab(page, 'dashboard');
      // Wait for unmatched grid to be populated by JS
      await page.waitForSelector('#unmatched-grid .unmatched-item', { timeout: 10_000 });
    });

    test('unmatched grid renders clickable items', async ({ page }) => {
      const items = page.locator('#unmatched-grid .unmatched-item');
      const count = await items.count();
      expect(count).toBeGreaterThan(0);
      // Each item should have a data-ap attribute
      const first = items.first();
      const ap = await first.getAttribute('data-ap');
      expect(ap).toBeTruthy();
    });

    test('clicking an unmatched app navigates to Jobs tab', async ({ page }) => {
      const item = page.locator(`#unmatched-grid .unmatched-item[data-ap="${UNMATCHED_APP}"]`);
      await expect(item).toBeVisible();
      await item.click();
      await expect(page.locator('#tab-jobs')).toHaveClass(/active/);
    });

    test('Jobs tab search input is pre-filled with app name after click', async ({ page }) => {
      const item = page.locator(`#unmatched-grid .unmatched-item[data-ap="${UNMATCHED_APP}"]`);
      await item.click();
      await expect(page.locator('#search-input')).toHaveValue(UNMATCHED_APP);
    });

    test('Jobs table shows matching rows after unmatched app click', async ({ page }) => {
      const item = page.locator(`#unmatched-grid .unmatched-item[data-ap="${UNMATCHED_APP}"]`);
      await item.click();
      await page.waitForSelector('#jobs-tbody tr', { timeout: 10_000 });
      const rows = page.locator('#jobs-tbody tr');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    });

    test('Jobs table rows all contain the unmatched app name', async ({ page }) => {
      const item = page.locator(`#unmatched-grid .unmatched-item[data-ap="${UNMATCHED_APP}"]`);
      await item.click();
      await page.waitForSelector('#jobs-tbody tr', { timeout: 10_000 });
      const firstRow = page.locator('#jobs-tbody tr').first();
      await expect(firstRow).toContainText(UNMATCHED_APP);
    });

    test('pagination total matches known job count for unmatched app', async ({ page }) => {
      const item = page.locator(`#unmatched-grid .unmatched-item[data-ap="${UNMATCHED_APP}"]`);
      await item.click();
      await page.waitForSelector('#jobs-tbody tr', { timeout: 10_000 });
      // APP_PAYMENTHUB has 733 jobs — total should be shown in pagination
      await expect(page.locator('#pagination-info')).toContainText('733');
    });
  });

  // ── Airflow icon in badges ───────────────────────────────────────────────
  test.describe('Airflow icon in migration badges', () => {
    test('Done badge in Jobs tab migration column contains Airflow SVG', async ({ page }) => {
      await waitForInit(page);
      await switchTab(page, 'jobs');
      await page.locator('#search-input').fill(D.DONE_JOB);
      await page.waitForTimeout(400);
      const row = page.locator('#jobs-tbody tr').first();
      const svg = row.locator('.badge svg');
      await expect(svg).toBeVisible();
    });

    test('In Progress badge in Jobs tab migration column contains Airflow SVG', async ({ page }) => {
      await waitForInit(page);
      await switchTab(page, 'jobs');
      await page.locator('#search-input').fill(D.INPROG_JOB);
      await page.waitForTimeout(400);
      const row = page.locator('#jobs-tbody tr').first();
      const svg = row.locator('.badge svg');
      await expect(svg).toBeVisible();
    });

    test('Done badge in CTM Migration tab contains Airflow SVG', async ({ page }) => {
      await waitForInit(page);
      await switchTab(page, 'migration');
      await page.waitForSelector('#mig-tbody tr', { timeout: 10_000 });
      const row = page.locator('#mig-tbody tr').filter({ hasText: D.DONE_JOB });
      const svg = row.locator('svg').first();
      await expect(svg).toBeVisible();
    });

    test('In Progress badge in CTM Migration tab contains Airflow SVG', async ({ page }) => {
      await waitForInit(page);
      await switchTab(page, 'migration');
      await page.waitForSelector('#mig-tbody tr', { timeout: 10_000 });
      const row = page.locator('#mig-tbody tr').filter({ hasText: D.INPROG_JOB });
      const svg = row.locator('svg').first();
      await expect(svg).toBeVisible();
    });
  });
});
