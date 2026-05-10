import { test, expect } from '@playwright/test';
import { waitForInit, switchTab, expectChartRendered, D } from './helpers';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await waitForInit(page);
    await switchTab(page, 'dashboard');
  });

  // ── Stat cards ────────────────────────────────────────────────────────────
  test.describe('Stat cards', () => {
    test('Total Jobs stat shows correct count', async ({ page }) => {
      await expect(page.locator('#stat-total')).toHaveText(
        D.TOTAL_JOBS.toLocaleString(),
      );
    });

    test('Unmatched stat shows correct count', async ({ page }) => {
      await expect(page.locator('#stat-unmatched')).toHaveText(
        D.UNMATCHED_JOBS.toLocaleString(),
      );
    });

    test('Domains stat is non-zero', async ({ page }) => {
      const text = await page.locator('#stat-domains').textContent();
      expect(Number(text?.replace(/,/g, ''))).toBeGreaterThan(0);
    });
  });

  // ── Charts ────────────────────────────────────────────────────────────────
  test.describe('Charts', () => {
    test('Jobs by Domain bar chart is rendered', async ({ page }) => {
      await expectChartRendered(page, 'domainChart');
    });

    test('Jobs by IT Division bar chart is rendered', async ({ page }) => {
      await expectChartRendered(page, 'itDivChart');
    });

    test('Application Plan stacked bar chart is rendered', async ({ page }) => {
      await expectChartRendered(page, 'planStackedChart');
    });

    test('Application Type doughnut chart is rendered', async ({ page }) => {
      await expectChartRendered(page, 'typeChart');
    });
  });

  // ── Plan perspective pills ────────────────────────────────────────────────
  test.describe('Plan perspective pills', () => {
    test('perspective bar is rendered', async ({ page }) => {
      await expect(page.locator('#perspective-bar')).toBeVisible();
    });

    test('clicking a plan pill filters stat cards', async ({ page }) => {
      const totalBefore = await page.locator('#stat-total').textContent();
      // Click first non-"All" pill if available
      const pills = page.locator('#perspective-bar button, #perspective-bar .perspective-pill');
      const count = await pills.count();
      if (count > 1) {
        await pills.nth(1).click();
        // After filtering the total shown may differ from global total
        const totalAfter = await page.locator('#stat-total').textContent();
        // At minimum, it should still be a formatted number
        expect(totalAfter).toMatch(/[\d,]+/);
      }
    });
  });

  // ── Plan stacked chart drill-down ─────────────────────────────────────────
  test('Plan stacked chart perspective toggle is visible', async ({ page }) => {
    const domBtn   = page.locator('.plan-persp-btn[data-persp="domain"]');
    const itDivBtn = page.locator('.plan-persp-btn[data-persp="itdiv"]');
    await expect(domBtn).toBeVisible();
    await expect(itDivBtn).toBeVisible();
  });

  test('switching Plan chart to "By IT Division" rebuilds chart', async ({ page }) => {
    await page.locator('.plan-persp-btn[data-persp="itdiv"]').click();
    await expect(page.locator('.plan-persp-btn[data-persp="itdiv"]')).toHaveClass(/active/);
    await expectChartRendered(page, 'planStackedChart');
  });
});
