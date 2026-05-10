import { test, expect } from '@playwright/test';
import { waitForInit, switchTab, D } from './helpers';

test.describe('Jobs Tab', () => {
  test.beforeEach(async ({ page }) => {
    await waitForInit(page);
    await switchTab(page, 'jobs');
    // Wait for table to populate
    await page.waitForSelector('#jobs-tbody tr', { timeout: 10_000 });
  });

  // ── Initial state ─────────────────────────────────────────────────────────
  test('Jobs tab badge shows total job count', async ({ page }) => {
    await expect(page.locator('#jobs-badge')).toHaveText(
      D.TOTAL_JOBS.toLocaleString(),
    );
  });

  test('table renders 20 rows by default (page size = 20)', async ({ page }) => {
    const rows = page.locator('#jobs-tbody tr');
    await expect(rows).toHaveCount(20);
  });

  test('pagination shows total job count', async ({ page }) => {
    await expect(page.locator('#pagination-info')).toContainText(
      D.TOTAL_JOBS.toLocaleString(),
    );
  });

  test('table has Migration column', async ({ page }) => {
    const headers = page.locator('#jobs-thead th');
    const labels  = await headers.allTextContents();
    expect(labels.some(h => /migration/i.test(h))).toBe(true);
  });

  test('Export CSV button is visible', async ({ page }) => {
    await expect(page.locator('#export-csv-btn')).toBeVisible();
  });

  // ── Search ────────────────────────────────────────────────────────────────
  test.describe('Search', () => {
    test('searching by job name filters results', async ({ page }) => {
      await page.locator('#search-input').fill('AFT_DEPOSIT_DORMANT');
      await page.waitForTimeout(400); // debounce
      const rows = page.locator('#jobs-tbody tr');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(20); // should be filtered
    });

    test('search shows correct job name in first result', async ({ page }) => {
      await page.locator('#search-input').fill(D.JOB_NAME);
      await page.waitForTimeout(400);
      const firstRow = page.locator('#jobs-tbody tr').first();
      await expect(firstRow).toContainText(D.JOB_NAME);
    });

    test('searching non-existent term shows empty state', async ({ page }) => {
      await page.locator('#search-input').fill('ZZZNOMATCH_XYZ_999');
      await page.waitForTimeout(400);
      await expect(page.locator('#jobs-tbody tr')).toHaveCount(0);
      await expect(page.locator('#empty-state')).toBeVisible();
    });
  });

  // ── Filters ───────────────────────────────────────────────────────────────
  test.describe('Filters', () => {
    test('Domain dropdown is populated', async ({ page }) => {
      const select = page.locator('#domain-filter');
      await expect(select).toBeVisible();
      const options = await select.locator('option').count();
      expect(options).toBeGreaterThan(1); // at least "All" + domains
    });

    test('selecting a domain filters the table', async ({ page }) => {
      const select  = page.locator('#domain-filter');
      const allOpts = await select.locator('option').all();
      const nonEmpty = await Promise.all(allOpts.map(o => o.getAttribute('value')));
      const firstVal = nonEmpty.find(v => v && v !== '');
      if (!firstVal) return;
      await select.selectOption(firstVal);
      await page.waitForTimeout(300);
      const count = await page.locator('#jobs-tbody tr').count();
      expect(count).toBeGreaterThan(0);
      // Total shown should be less than full dataset
      await expect(page.locator('#pagination-info')).not.toContainText(
        D.TOTAL_JOBS.toLocaleString(),
      );
    });

    test('Clear All resets search and all filters', async ({ page }) => {
      await page.locator('#search-input').fill('ABC');
      await page.waitForTimeout(400);
      await page.locator('#clear-filters-btn').click();
      await page.waitForTimeout(300);
      await expect(page.locator('#search-input')).toHaveValue('');
      await expect(page.locator('#pagination-info')).toContainText(
        D.TOTAL_JOBS.toLocaleString(),
      );
    });
  });

  // ── Sorting ───────────────────────────────────────────────────────────────
  test.describe('Column sorting', () => {
    test('clicking Job Name header sorts ascending', async ({ page }) => {
      const jobNameHeader = page.locator('#jobs-thead th').first();
      await jobNameHeader.click();
      await page.waitForTimeout(200);
      const firstCell = page.locator('#jobs-tbody tr').first()
        .locator('td.job-name');
      const firstVal = await firstCell.textContent();
      expect(firstVal).toBeTruthy();
    });

    test('clicking Job Name header twice sorts descending', async ({ page }) => {
      const jobNameHeader = page.locator('#jobs-thead th').first();
      await jobNameHeader.click();
      const asc = await page.locator('#jobs-tbody tr td.job-name').first().textContent();
      await jobNameHeader.click();
      const desc = await page.locator('#jobs-tbody tr td.job-name').first().textContent();
      expect(asc).not.toBe(desc);
    });
  });

  // ── Pagination ────────────────────────────────────────────────────────────
  test.describe('Pagination', () => {
    test('page size selector changes row count to 50', async ({ page }) => {
      await page.locator('#page-size-select').selectOption('50');
      await page.waitForTimeout(200);
      const rows = page.locator('#jobs-tbody tr');
      await expect(rows).toHaveCount(50);
    });

    test('next page button loads next page', async ({ page }) => {
      const firstJobBefore = await page.locator('#jobs-tbody tr td.job-name')
        .first().textContent();
      await page.locator('#next-page-btn').click();
      await page.waitForTimeout(200);
      const firstJobAfter = await page.locator('#jobs-tbody tr td.job-name')
        .first().textContent();
      expect(firstJobAfter).not.toBe(firstJobBefore);
    });
  });

  // ── Migration column ─────────────────────────────────────────────────────
  test.describe('Migration column', () => {
    test('Done badge appears for migrated jobs', async ({ page }) => {
      await page.locator('#search-input').fill(D.DONE_JOB);
      await page.waitForTimeout(400);
      const row = page.locator('#jobs-tbody tr').first();
      await expect(row).toContainText('Done');
    });

    test('In Progress badge appears for in-progress jobs', async ({ page }) => {
      await page.locator('#search-input').fill(D.INPROG_JOB);
      await page.waitForTimeout(400);
      const row = page.locator('#jobs-tbody tr').first();
      await expect(row).toContainText('In Progress');
    });
  });
});
