import { test, expect } from '@playwright/test';
import { waitForInit, switchTab, D } from './helpers';

// Known app codes with confirmed cross-app edges in the dataset
const APP_WITH_DEPS  = 'OFSAA-FTP';  // 2623 jobs, confirmed cross-app edges
const APP_NO_DEPS    = 'AAL';         // app code that may have no cross-app edges — used for empty-state test
const APP_B2K        = 'B2K';         // B2K app code (DAG_MIDDLE_APP_CODE)

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Switch to the Job Dependencies tab. */
async function goToDepsTab(page: Parameters<typeof switchTab>[0]) {
  await page.locator('.tab-btn[data-tab="deps"]').click();
  await expect(page.locator('#tab-deps')).toHaveClass(/active/);
}

/** Select an app code via the dropdown. */
async function selectApp(page: Parameters<typeof switchTab>[0], appCode: string) {
  // Use JS helper to avoid timing issues with dropdown onblur
  await page.evaluate((ac) => (window as any).selectDepApp(ac), appCode);
  // Wait for graph to render (network stabilizes)
  await page.waitForTimeout(800);
}

test.describe('Job Dependencies Tab', () => {
  test.beforeEach(async ({ page }) => {
    await waitForInit(page);
  });

  // ── Tab visibility ────────────────────────────────────────────────────────
  test.describe('Tab visibility and initial state', () => {
    test('Job Dependencies tab button is visible', async ({ page }) => {
      await expect(page.locator('.tab-btn[data-tab="deps"]')).toBeVisible();
    });

    test('clicking the tab activates the deps panel', async ({ page }) => {
      await goToDepsTab(page);
      await expect(page.locator('#tab-deps')).toHaveClass(/active/);
    });

    test('empty state is shown before any selection', async ({ page }) => {
      await goToDepsTab(page);
      await expect(page.locator('#dep-empty')).toBeVisible();
    });

    test('graph wrap is hidden before any selection', async ({ page }) => {
      await goToDepsTab(page);
      await expect(page.locator('#dep-graph-wrap')).toBeHidden();
    });

    test('controls toolbar is hidden before any selection', async ({ page }) => {
      await goToDepsTab(page);
      await expect(page.locator('#dep-controls')).toBeHidden();
    });
  });

  // ── Smart dropdown ────────────────────────────────────────────────────────
  test.describe('Smart dropdown', () => {
    test('search input is visible', async ({ page }) => {
      await goToDepsTab(page);
      await expect(page.locator('#dep-search-input')).toBeVisible();
    });

    test('typing opens the dropdown', async ({ page }) => {
      await goToDepsTab(page);
      await page.locator('#dep-search-input').fill('OFSAA');
      await expect(page.locator('#dep-dropdown')).toHaveClass(/open/);
    });

    test('dropdown contains matching app codes', async ({ page }) => {
      await goToDepsTab(page);
      await page.locator('#dep-search-input').fill('OFSAA');
      await expect(page.locator('#dep-dropdown .dep-dd-item').first()).toContainText('OFSAA');
    });

    test('dropdown items show job count', async ({ page }) => {
      await goToDepsTab(page);
      await page.locator('#dep-search-input').fill('OFSAA-FTP');
      const item = page.locator('#dep-dropdown .dep-dd-item').first();
      await expect(item.locator('.dep-dd-count')).toContainText('jobs');
    });

    test('depAppList is populated from DAG data', async ({ page }) => {
      await goToDepsTab(page);
      const count = await page.evaluate(() => (window as any).depAppList.length);
      expect(count).toBeGreaterThan(0);
    });

    test('clearing selection hides graph and shows empty state', async ({ page }) => {
      await goToDepsTab(page);
      await selectApp(page, APP_WITH_DEPS);
      await page.locator('#dep-clear-btn').click();
      await expect(page.locator('#dep-empty')).toBeVisible();
      await expect(page.locator('#dep-graph-wrap')).toBeHidden();
    });
  });

  // ── Graph rendering ───────────────────────────────────────────────────────
  test.describe('Graph rendering', () => {
    test.beforeEach(async ({ page }) => {
      await goToDepsTab(page);
      await selectApp(page, APP_WITH_DEPS);
    });

    test('graph wrap becomes visible after selection', async ({ page }) => {
      await expect(page.locator('#dep-graph-wrap')).toBeVisible();
    });

    test('vis-network canvas is rendered inside #dep-graph', async ({ page }) => {
      const canvas = page.locator('#dep-graph canvas');
      await expect(canvas).toBeVisible();
      const box = await canvas.boundingBox();
      expect(box?.width).toBeGreaterThan(0);
      expect(box?.height).toBeGreaterThan(0);
    });

    test('controls toolbar becomes visible after selection', async ({ page }) => {
      await expect(page.locator('#dep-controls')).toBeVisible();
    });

    test('footer becomes visible after selection', async ({ page }) => {
      await expect(page.locator('#dep-footer')).toBeVisible();
    });

    test('stat line is populated with app and link counts', async ({ page }) => {
      const stat = page.locator('#dep-stat');
      await expect(stat).not.toBeEmpty();
      await expect(stat).toContainText('apps');
    });

    test('subtitle reflects the selected app', async ({ page }) => {
      await expect(page.locator('#dep-subtitle')).toContainText(APP_WITH_DEPS);
    });

    test('depNetwork is set on window after graph build', async ({ page }) => {
      const hasNetwork = await page.evaluate(() => !!(window as any).depNetwork);
      expect(hasNetwork).toBe(true);
    });
  });

  // ── Hops selector ─────────────────────────────────────────────────────────
  test.describe('Hops selector', () => {
    test.beforeEach(async ({ page }) => {
      await goToDepsTab(page);
      await selectApp(page, APP_WITH_DEPS);
    });

    test('hop buttons 1–3 are all visible', async ({ page }) => {
      for (const n of [1, 2, 3]) {
        await expect(page.locator(`#dep-hop-${n}`)).toBeVisible();
      }
    });

    test('hop-1 is active by default', async ({ page }) => {
      await expect(page.locator('#dep-hop-1')).toHaveClass(/active/);
    });

    test('clicking hop-2 becomes active', async ({ page }) => {
      await page.locator('#dep-hop-2').click();
      await page.waitForTimeout(500);
      await expect(page.locator('#dep-hop-2')).toHaveClass(/active/);
      await expect(page.locator('#dep-hop-1')).not.toHaveClass(/active/);
    });

    test('increasing hops grows or maintains app count in stat', async ({ page }) => {
      const stat1 = await page.locator('#dep-stat').textContent();
      const match1 = stat1?.match(/(\d[\d,]*)\s+apps/);
      const count1 = match1 ? parseInt(match1[1].replace(/,/g, '')) : 0;

      await page.locator('#dep-hop-2').click();
      await page.waitForTimeout(600);

      const stat2 = await page.locator('#dep-stat').textContent();
      const match2 = stat2?.match(/(\d[\d,]*)\s+apps/);
      const count2 = match2 ? parseInt(match2[1].replace(/,/g, '')) : 0;

      expect(count2).toBeGreaterThanOrEqual(count1);
    });
  });

  // ── Direction selector ────────────────────────────────────────────────────
  test.describe('Direction selector', () => {
    test.beforeEach(async ({ page }) => {
      await goToDepsTab(page);
      await selectApp(page, APP_WITH_DEPS);
    });

    test('"Both" direction button is active by default', async ({ page }) => {
      await expect(page.locator('#dep-dir-both')).toHaveClass(/active/);
    });

    test('switching to Upstream makes #dep-dir-up active', async ({ page }) => {
      await page.locator('#dep-dir-up').click();
      await page.waitForTimeout(400);
      await expect(page.locator('#dep-dir-up')).toHaveClass(/active/);
      await expect(page.locator('#dep-dir-both')).not.toHaveClass(/active/);
    });

    test('switching to Downstream makes #dep-dir-down active', async ({ page }) => {
      await page.locator('#dep-dir-down').click();
      await page.waitForTimeout(400);
      await expect(page.locator('#dep-dir-down')).toHaveClass(/active/);
    });

    test('upstream-only shows fewer or equal apps than both-directions', async ({ page }) => {
      const stat = await page.locator('#dep-stat').textContent();
      const bothCount = parseInt((stat?.match(/(\d[\d,]*)\s+apps/) || [])[1]?.replace(/,/g, '') || '0');

      await page.locator('#dep-dir-up').click();
      await page.waitForTimeout(600);
      const upStat = await page.locator('#dep-stat').textContent();
      const upCount = parseInt((upStat?.match(/(\d[\d,]*)\s+apps/) || [])[1]?.replace(/,/g, '') || '0');

      expect(upCount).toBeLessThanOrEqual(bothCount);
    });
  });

  // ── Detail side panel ─────────────────────────────────────────────────────
  test.describe('Detail side panel', () => {
    test.beforeEach(async ({ page }) => {
      await goToDepsTab(page);
      await selectApp(page, APP_WITH_DEPS);
    });

    test('detail panel is closed by default', async ({ page }) => {
      await expect(page.locator('#dep-detail-panel')).not.toHaveClass(/open/);
    });

    test('openDepDetail() opens the panel with app code title', async ({ page }) => {
      await page.evaluate((ac) => (window as any).openDepDetail(ac), APP_WITH_DEPS);
      await expect(page.locator('#dep-detail-panel')).toHaveClass(/open/);
      await expect(page.locator('#dep-detail-title')).toHaveText(APP_WITH_DEPS);
    });

    test('detail panel shows CTM job count', async ({ page }) => {
      await page.evaluate((ac) => (window as any).openDepDetail(ac), APP_WITH_DEPS);
      await expect(page.locator('#dep-detail-body')).toContainText('Jobs');
    });

    test('detail panel shows migration plan', async ({ page }) => {
      await page.evaluate((ac) => (window as any).openDepDetail(ac), APP_WITH_DEPS);
      await expect(page.locator('#dep-detail-body')).toContainText('Migration Plan');
    });

    test('detail panel shows upstream or downstream app list', async ({ page }) => {
      await page.evaluate((ac) => (window as any).openDepDetail(ac), APP_WITH_DEPS);
      const body = await page.locator('#dep-detail-body').textContent();
      const hasUpstream   = body?.includes('Depends on') || false;
      const hasDownstream = body?.includes('Used by') || false;
      expect(hasUpstream || hasDownstream).toBe(true);
    });

    test('close detail via × button', async ({ page }) => {
      await page.evaluate((ac) => (window as any).openDepDetail(ac), APP_WITH_DEPS);
      await expect(page.locator('#dep-detail-panel')).toHaveClass(/open/);
      await page.locator('#dep-detail-panel .dag-detail-close').click();
      await expect(page.locator('#dep-detail-panel')).not.toHaveClass(/open/);
    });

    test('"View Jobs in Jobs Tab" button is present in detail panel', async ({ page }) => {
      await page.evaluate((ac) => (window as any).openDepDetail(ac), APP_WITH_DEPS);
      await expect(page.locator('#dep-detail-actions button').first()).toContainText('View Jobs');
    });

    test('"Re-focus graph here" button is present in detail panel', async ({ page }) => {
      await page.evaluate((ac) => (window as any).openDepDetail(ac), APP_WITH_DEPS);
      await expect(page.locator('#dep-detail-actions button').last()).toContainText('Re-focus');
    });
  });

  // ── Navigation ────────────────────────────────────────────────────────────
  test.describe('Navigation to Jobs tab', () => {
    test('clicking "View Jobs in Jobs Tab" switches to Jobs tab', async ({ page }) => {
      await goToDepsTab(page);
      await selectApp(page, APP_WITH_DEPS);
      await page.evaluate((ac) => (window as any).openDepDetail(ac), APP_WITH_DEPS);
      await page.locator('#dep-detail-actions button').first().click();
      await expect(page.locator('#tab-jobs')).toHaveClass(/active/);
    });

    test('Jobs tab is pre-filtered by the selected app code', async ({ page }) => {
      await goToDepsTab(page);
      await selectApp(page, APP_WITH_DEPS);
      await page.evaluate((ac) => (window as any).openDepDetail(ac), APP_WITH_DEPS);
      await page.locator('#dep-detail-actions button').first().click();
      // appcode-filter hidden input should be set to the app code
      await expect(page.locator('#appcode-filter')).toHaveValue(APP_WITH_DEPS);
    });

    test('Jobs table has rows after navigating from dep tab', async ({ page }) => {
      await goToDepsTab(page);
      await selectApp(page, APP_WITH_DEPS);
      await page.evaluate((ac) => (window as any).navigateDepToJobs(ac), APP_WITH_DEPS);
      await expect(page.locator('#jobs-tbody tr')).not.toHaveCount(0);
    });
  });

  // ── Re-focus ──────────────────────────────────────────────────────────────
  test.describe('Re-focus graph', () => {
    test('re-focus updates the search input and rebuilds graph', async ({ page }) => {
      await goToDepsTab(page);
      await selectApp(page, APP_WITH_DEPS);
      await page.evaluate((ac) => (window as any).openDepDetail(ac), APP_WITH_DEPS);
      // Click the "Re-focus graph here" button (second button in actions)
      await page.locator('#dep-detail-actions button').last().click();
      await page.waitForTimeout(600);
      // Graph should still be visible
      await expect(page.locator('#dep-graph-wrap')).toBeVisible();
      // Input should still show the app code
      await expect(page.locator('#dep-search-input')).toHaveValue(APP_WITH_DEPS);
    });
  });

  // ── Index correctness ─────────────────────────────────────────────────────
  test.describe('Index correctness', () => {
    test('depAppOutEdges has entries (cross-app edges exist)', async ({ page }) => {
      await goToDepsTab(page);
      const hasEdges = await page.evaluate(() => Object.keys((window as any).depAppOutEdges).length > 0);
      expect(hasEdges).toBe(true);
    });

    test('depAppJobMap has entries for known app code', async ({ page }) => {
      await goToDepsTab(page);
      const count = await page.evaluate(
        (ac) => ((window as any).depAppJobMap[ac] || []).length,
        APP_WITH_DEPS
      );
      expect(count).toBeGreaterThan(0);
    });

    test('selected app node is present in graph nodes', async ({ page }) => {
      await goToDepsTab(page);
      await selectApp(page, APP_WITH_DEPS);
      const hasNode = await page.evaluate(
        (ac) => {
          const net = (window as any).depNetwork;
          if (!net) return false;
          return net.body.nodes[ac] !== undefined;
        },
        APP_WITH_DEPS
      );
      expect(hasNode).toBe(true);
    });
  });

  // ── Footer ────────────────────────────────────────────────────────────────
  test.describe('Footer', () => {
    test('legend items visible after selection', async ({ page }) => {
      await goToDepsTab(page);
      await selectApp(page, APP_WITH_DEPS);
      await expect(page.locator('#dep-footer .dag-legend-item').first()).toBeVisible();
    });

    test('stat line in footer populated after selection', async ({ page }) => {
      await goToDepsTab(page);
      await selectApp(page, APP_WITH_DEPS);
      await expect(page.locator('#dep-stat')).not.toBeEmpty();
    });
  });
});
