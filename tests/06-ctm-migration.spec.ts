import { test, expect } from '@playwright/test';
import { waitForInit, switchTab, expectChartRendered, D } from './helpers';

test.describe('CTM Migration Tab', () => {
  test.beforeEach(async ({ page }) => {
    await waitForInit(page);
    await switchTab(page, 'migration');
    await page.waitForSelector('#mig-tbody tr', { timeout: 10_000 });
  });

  // ── Tab badge ─────────────────────────────────────────────────────────────
  test('migration badge shows plan item count', async ({ page }) => {
    await expect(page.locator('#migration-badge')).toHaveText(String(D.PLAN_TOTAL));
  });

  // ── Stat cards ────────────────────────────────────────────────────────────
  test.describe('Stat cards', () => {
    test('Total CTM Jobs card = 23,768', async ({ page }) => {
      // First stat card shows total CTM jobs (DATA.length)
      await expect(page.locator('#mig-stat-total')).toHaveText(
        D.TOTAL_JOBS.toLocaleString(),
      );
    });

    test('Done card = 3', async ({ page }) => {
      await expect(page.locator('#mig-stat-done')).toHaveText(String(D.PLAN_DONE));
    });

    test('In Progress card = 4', async ({ page }) => {
      await expect(page.locator('#mig-stat-inprog')).toHaveText(String(D.PLAN_IN_PROGRESS));
    });

    test('Not Started = total − done − in-progress', async ({ page }) => {
      await expect(page.locator('#mig-stat-notstarted')).toHaveText(
        D.PLAN_NOT_STARTED.toLocaleString(),
      );
    });
  });

  // ── Doughnut chart ────────────────────────────────────────────────────────
  test('migration doughnut chart is rendered', async ({ page }) => {
    await expectChartRendered(page, 'mig-donut');
  });

  // ── Migration table ───────────────────────────────────────────────────────
  test.describe('Migration table', () => {
    test('shows all 7 plan items', async ({ page }) => {
      await expect(page.locator('#mig-tbody tr')).toHaveCount(D.PLAN_TOTAL);
    });

    test('Done badge visible for completed job', async ({ page }) => {
      const row = page.locator('#mig-tbody tr').filter({
        hasText: D.DONE_JOB,
      });
      await expect(row).toContainText('Done');
    });

    test('In Progress badge visible for in-progress job', async ({ page }) => {
      const row = page.locator('#mig-tbody tr').filter({
        hasText: D.INPROG_JOB,
      });
      await expect(row).toContainText('In Progress');
    });

    test('DAG name is shown for Done jobs', async ({ page }) => {
      const row = page.locator('#mig-tbody tr').filter({
        hasText: D.DONE_JOB,
      });
      await expect(row).toContainText('scb-AP1965-CAPI-ITMX_OUTBOUND_D0001-prod');
    });
  });

  // ── Search ────────────────────────────────────────────────────────────────
  test.describe('Search', () => {
    test('searching by job name filters table', async ({ page }) => {
      await page.locator('#mig-search').fill(D.DONE_JOB);
      await page.waitForTimeout(400);
      await expect(page.locator('#mig-tbody tr')).toHaveCount(1);
    });

    test('searching by SR number filters table', async ({ page }) => {
      await page.locator('#mig-search').fill('SR-55064');
      await page.waitForTimeout(400);
      const count = await page.locator('#mig-tbody tr').count();
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(D.PLAN_TOTAL);
    });

    test('non-matching search shows empty state', async ({ page }) => {
      await page.locator('#mig-search').fill('ZZZNOMATCH');
      await page.waitForTimeout(400);
      await expect(page.locator('#mig-tbody tr')).toHaveCount(0);
    });
  });

  // ── Status filter ─────────────────────────────────────────────────────────
  test.describe('Status filter', () => {
    test('filtering by "Done" shows only done rows', async ({ page }) => {
      await page.locator('#mig-status-filter').selectOption('Done');
      await page.waitForTimeout(200);
      await expect(page.locator('#mig-tbody tr')).toHaveCount(D.PLAN_DONE);
    });

    test('filtering by "In Progress" shows only in-progress rows', async ({ page }) => {
      await page.locator('#mig-status-filter').selectOption('In Progress');
      await page.waitForTimeout(200);
      await expect(page.locator('#mig-tbody tr')).toHaveCount(D.PLAN_IN_PROGRESS);
    });
  });

  // ── Cell navigation ───────────────────────────────────────────────────────
  test.describe('Cell navigation', () => {
    test('clicking Job Name cell navigates to Jobs tab filtered by that job', async ({ page }) => {
      const row = page.locator('#mig-tbody tr').filter({ hasText: D.DONE_JOB });
      const jobCell = row.locator('td.job-name');
      await jobCell.click();
      await expect(page.locator('#tab-jobs')).toHaveClass(/active/);
      await expect(page.locator('#search-input')).toHaveValue(D.DONE_JOB);
    });
  });

  // ── Export CSV ────────────────────────────────────────────────────────────
  test('Export CSV button is visible', async ({ page }) => {
    await expect(page.locator('#mig-export-btn')).toBeVisible();
  });
});
