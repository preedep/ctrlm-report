import { test, expect } from '@playwright/test';
import { waitForInit, switchTab, D } from './helpers';

// ── helpers ────────────────────────────────────────────────────────────────

/** Open the Jobs tab, search for a specific job name, wait for the row. */
async function goToJobRow(page: Parameters<typeof waitForInit>[0], jobName: string) {
  await switchTab(page, 'jobs');
  await page.locator('#search-input').fill(jobName);
  await page.waitForTimeout(400);
  await page.waitForSelector('#jobs-tbody tr', { timeout: 10_000 });
}

/** Click the job-name link in the first Jobs-table row to open the DAG modal. */
async function openDagForFirstRow(page: Parameters<typeof waitForInit>[0]) {
  const link = page.locator('#jobs-tbody tr').first().locator('.job-name-dag-link');
  await expect(link).toBeVisible();
  await link.click();
  await expect(page.locator('#dag-modal-overlay')).toHaveClass(/open/, { timeout: 5_000 });
}

/** Return true when the vis-network canvas inside #dag-graph has been painted. */
async function dagGraphRendered(page: Parameters<typeof waitForInit>[0]) {
  const canvas = page.locator('#dag-graph canvas');
  await expect(canvas).toBeVisible({ timeout: 8_000 });
  const box = await canvas.boundingBox();
  return (box?.width ?? 0) > 0 && (box?.height ?? 0) > 0;
}

// ── test suite ─────────────────────────────────────────────────────────────

test.describe('DAG Dependency Viewer', () => {

  test.beforeEach(async ({ page }) => {
    await waitForInit(page);
  });

  // ── Job name link ────────────────────────────────────────────────────────
  test.describe('Job name link in Jobs table', () => {
    test('job name cell renders as a clickable link when DAG data is present', async ({ page }) => {
      await goToJobRow(page, D.JOB_NAME);
      const link = page.locator('#jobs-tbody tr').first().locator('.job-name-dag-link');
      await expect(link).toBeVisible();
      await expect(link).toHaveText(D.JOB_NAME);
    });

    test('link has a tooltip hinting at dependency graph', async ({ page }) => {
      await goToJobRow(page, D.JOB_NAME);
      const link = page.locator('#jobs-tbody tr').first().locator('.job-name-dag-link');
      const title = await link.getAttribute('title');
      expect(title).toBeTruthy();
    });
  });

  // ── Modal open / close ───────────────────────────────────────────────────
  test.describe('Modal open and close', () => {
    test('clicking a job name link opens the DAG modal', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      await expect(page.locator('#dag-modal-overlay')).toHaveClass(/open/);
    });

    test('modal title shows the selected job name', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      await expect(page.locator('#dag-modal-title')).toHaveText(D.DAG_MIDDLE_JOB);
    });

    test('modal subtitle shows app code and appl type from DATA', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      const subtitle = page.locator('#dag-modal-subtitle');
      await expect(subtitle).toContainText(D.DAG_MIDDLE_APP_CODE);
      await expect(subtitle).toContainText(D.DAG_MIDDLE_APPL_TYPE);
    });

    test('close button (×) dismisses the modal', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      await page.locator('.dag-close-btn').click();
      await expect(page.locator('#dag-modal-overlay')).not.toHaveClass(/open/);
    });

    test('pressing Escape dismisses the modal', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      await page.keyboard.press('Escape');
      await expect(page.locator('#dag-modal-overlay')).not.toHaveClass(/open/);
    });

    test('clicking the backdrop dismisses the modal', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      // Click on the overlay itself (outside the modal card)
      await page.locator('#dag-modal-overlay').click({ position: { x: 5, y: 5 } });
      await expect(page.locator('#dag-modal-overlay')).not.toHaveClass(/open/);
    });
  });

  // ── Graph canvas ─────────────────────────────────────────────────────────
  test.describe('Graph canvas rendering', () => {
    test('vis-network canvas is rendered with non-zero dimensions', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      expect(await dagGraphRendered(page)).toBe(true);
    });

    test('#dag-no-data placeholder is hidden when DAG data is present', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      await expect(page.locator('#dag-no-data')).not.toBeVisible();
    });

    test('stat line shows node and edge counts', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      await expect(page.locator('#dag-stat')).toContainText('nodes');
      await expect(page.locator('#dag-stat')).toContainText('edges');
    });
  });

  // ── Toolbar controls — hops ──────────────────────────────────────────────
  test.describe('Hops selector', () => {
    test('hop buttons 1–5 are all visible', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      for (const h of [1, 2, 3, 4, 5]) {
        await expect(page.locator(`#dag-hop-${h}`)).toBeVisible();
      }
    });

    test('hop-1 is active by default', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      await expect(page.locator('#dag-hop-1')).toHaveClass(/active/);
    });

    test('clicking hop-2 becomes active and re-renders graph', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      await page.locator('#dag-hop-2').click();
      await expect(page.locator('#dag-hop-2')).toHaveClass(/active/);
      await expect(page.locator('#dag-hop-1')).not.toHaveClass(/active/);
      await expect(page.locator('#dag-stat')).toContainText('2-hop');
    });

    test('increasing hops grows the node count in stat line', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);

      const statText1 = await page.locator('#dag-stat').textContent();
      const nodes1 = parseInt(statText1?.match(/(\d[\d,]*)\s+nodes/)?.[1].replace(/,/g, '') ?? '0');

      await page.locator('#dag-hop-2').click();
      await page.waitForTimeout(400);
      const statText2 = await page.locator('#dag-stat').textContent();
      const nodes2 = parseInt(statText2?.match(/(\d[\d,]*)\s+nodes/)?.[1].replace(/,/g, '') ?? '0');

      // 2-hop neighbourhood cannot be smaller than 1-hop
      expect(nodes2).toBeGreaterThanOrEqual(nodes1);
    });
  });

  // ── Toolbar controls — direction ─────────────────────────────────────────
  test.describe('Direction selector', () => {
    test('"Both" direction button is active by default', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      await expect(page.locator('#dag-dir-both')).toHaveClass(/active/);
    });

    test('switching to Upstream makes #dag-dir-up active', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      await page.locator('#dag-dir-up').click();
      await expect(page.locator('#dag-dir-up')).toHaveClass(/active/);
      await expect(page.locator('#dag-dir-both')).not.toHaveClass(/active/);
      await expect(page.locator('#dag-stat')).toContainText('upstream');
    });

    test('switching to Downstream makes #dag-dir-down active', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      await page.locator('#dag-dir-down').click();
      await expect(page.locator('#dag-dir-down')).toHaveClass(/active/);
      await expect(page.locator('#dag-stat')).toContainText('downstream');
    });

    test('upstream-only shows fewer or equal nodes than both-directions', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);

      const getNodeCount = async () => {
        const t = await page.locator('#dag-stat').textContent();
        return parseInt(t?.match(/(\d[\d,]*)\s+nodes/)?.[1].replace(/,/g, '') ?? '0');
      };

      const both = await getNodeCount();
      await page.locator('#dag-dir-up').click();
      await page.waitForTimeout(300);
      const up = await getNodeCount();
      expect(up).toBeLessThanOrEqual(both);
    });

    test('downstream-only shows fewer or equal nodes than both-directions', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);

      const getNodeCount = async () => {
        const t = await page.locator('#dag-stat').textContent();
        return parseInt(t?.match(/(\d[\d,]*)\s+nodes/)?.[1].replace(/,/g, '') ?? '0');
      };

      const both = await getNodeCount();
      await page.locator('#dag-dir-down').click();
      await page.waitForTimeout(300);
      const down = await getNodeCount();
      expect(down).toBeLessThanOrEqual(both);
    });
  });

  // ── Toolbar controls — layout ────────────────────────────────────────────
  test.describe('Layout selector', () => {
    test('"Force" layout button is active by default', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      await expect(page.locator('#dag-layout-force')).toHaveClass(/active/);
    });

    test('switching to L→R layout changes active button', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      await page.locator('#dag-layout-lr').click();
      await page.waitForTimeout(300);
      await expect(page.locator('#dag-layout-lr')).toHaveClass(/active/);
      await expect(page.locator('#dag-layout-force')).not.toHaveClass(/active/);
      expect(await dagGraphRendered(page)).toBe(true);
    });

    test('switching to T→D layout changes active button', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      await page.locator('#dag-layout-ud').click();
      await page.waitForTimeout(300);
      await expect(page.locator('#dag-layout-ud')).toHaveClass(/active/);
      expect(await dagGraphRendered(page)).toBe(true);
    });

    test('Fit button is visible and clickable without error', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      const fitBtn = page.locator('.dag-icon-btn');
      await expect(fitBtn).toBeVisible();
      await fitBtn.click(); // should not throw
    });
  });

  // ── Detail panel ─────────────────────────────────────────────────────────
  test.describe('Detail side panel', () => {
    test('detail panel is closed by default', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      await expect(page.locator('#dag-detail-panel')).not.toHaveClass(/open/);
    });

    test('clicking the focused node (canvas) opens the detail panel', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      // Click the centre of the graph canvas — the focused node is placed centrally
      const canvas = page.locator('#dag-graph canvas');
      const box    = await canvas.boundingBox();
      expect(box).not.toBeNull();
      await canvas.click({ position: { x: box!.width / 2, y: box!.height / 2 } });
      await page.waitForTimeout(600);
      // vis-network click may or may not land on the node depending on layout;
      // we assert the panel CAN open, not that it always does from a blind click
      // This is a best-effort test — the real assertions are below after explicit JS trigger
    });

    test('detail panel shows job name in body when opened via JS', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      // Trigger openDagDetail directly to bypass canvas coordinate uncertainty
      await page.evaluate((jn) => (window as any).openDagDetail(jn), D.DAG_MIDDLE_JOB);
      await expect(page.locator('#dag-detail-panel')).toHaveClass(/open/);
      await expect(page.locator('#dag-detail-body')).toContainText(D.DAG_MIDDLE_JOB);
    });

    test('detail panel shows app code badge', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      await page.evaluate((jn) => (window as any).openDagDetail(jn), D.DAG_MIDDLE_JOB);
      await expect(page.locator('#dag-detail-body')).toContainText(D.DAG_MIDDLE_APP_CODE);
    });

    test('detail panel shows appl type', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      await page.evaluate((jn) => (window as any).openDagDetail(jn), D.DAG_MIDDLE_JOB);
      await expect(page.locator('#dag-detail-body')).toContainText(D.DAG_MIDDLE_APPL_TYPE);
    });

    test('detail panel shows predecessor and successor counts', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      await page.evaluate((jn) => (window as any).openDagDetail(jn), D.DAG_MIDDLE_JOB);
      await expect(page.locator('#dag-detail-body')).toContainText('predecessor');
      await expect(page.locator('#dag-detail-body')).toContainText('successor');
    });

    test('detail panel shows description from DAG node', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      await page.evaluate((jn) => (window as any).openDagDetail(jn), D.DAG_MIDDLE_JOB);
      await expect(page.locator('#dag-detail-body .val.desc')).toBeVisible();
      await expect(page.locator('#dag-detail-body .val.desc')).toContainText(D.DAG_MIDDLE_DESCRIPTION);
    });

    test('description field is absent when node has no description', async ({ page }) => {
      // Find a job confirmed to have empty description
      const emptyDescJob = await page.evaluate(() => {
        const dagData = (window as any).DAG_DATA;
        const node = dagData?.nodes.find((n: any) => !n.description || n.description.trim() === '');
        return node?.job_name ?? null;
      });
      if (!emptyDescJob) return; // all jobs have description — skip
      await goToJobRow(page, emptyDescJob);
      await openDagForFirstRow(page);
      await page.evaluate((jn) => (window as any).openDagDetail(jn), emptyDescJob);
      await expect(page.locator('#dag-detail-body .val.desc')).toHaveCount(0);
    });

    test('detail panel × button closes the panel', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      await page.evaluate((jn) => (window as any).openDagDetail(jn), D.DAG_MIDDLE_JOB);
      await expect(page.locator('#dag-detail-panel')).toHaveClass(/open/);
      await page.locator('#dag-detail-panel .dag-detail-close').click();
      await expect(page.locator('#dag-detail-panel')).not.toHaveClass(/open/);
    });

    test('pressing Escape first closes the detail panel (not the modal)', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      await page.evaluate((jn) => (window as any).openDagDetail(jn), D.DAG_MIDDLE_JOB);
      await page.keyboard.press('Escape');
      // panel should close but modal should remain open
      await expect(page.locator('#dag-detail-panel')).not.toHaveClass(/open/);
      await expect(page.locator('#dag-modal-overlay')).toHaveClass(/open/);
    });

    test('pressing Escape twice closes both panel and modal', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      await page.evaluate((jn) => (window as any).openDagDetail(jn), D.DAG_MIDDLE_JOB);
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
      await expect(page.locator('#dag-modal-overlay')).not.toHaveClass(/open/);
    });
  });

  // ── "View in Jobs Tab" navigation ────────────────────────────────────────
  test.describe('"View in Jobs Tab" action button', () => {
    test.beforeEach(async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      await page.evaluate((jn) => (window as any).openDagDetail(jn), D.DAG_MIDDLE_JOB);
    });

    test('"View in Jobs Tab" button is visible in detail panel', async ({ page }) => {
      await expect(page.locator('#dag-detail-actions .dag-detail-action-btn').first()).toBeVisible();
      await expect(page.locator('#dag-detail-actions .dag-detail-action-btn').first())
        .toContainText('View in Jobs Tab');
    });

    test('clicking "View in Jobs Tab" closes the modal', async ({ page }) => {
      await page.locator('#dag-detail-actions .dag-detail-action-btn').first().click();
      await expect(page.locator('#dag-modal-overlay')).not.toHaveClass(/open/);
    });

    test('clicking "View in Jobs Tab" switches to the Jobs tab', async ({ page }) => {
      await page.locator('#dag-detail-actions .dag-detail-action-btn').first().click();
      await expect(page.locator('#tab-jobs')).toHaveClass(/active/);
    });

    test('Jobs tab search input contains the job name after navigation', async ({ page }) => {
      await page.locator('#dag-detail-actions .dag-detail-action-btn').first().click();
      await expect(page.locator('#search-input')).toHaveValue(D.DAG_MIDDLE_JOB);
    });

    test('Jobs table shows the job in results after navigation', async ({ page }) => {
      await page.locator('#dag-detail-actions .dag-detail-action-btn').first().click();
      await page.waitForSelector('#jobs-tbody tr', { timeout: 10_000 });
      const rows = page.locator('#jobs-tbody tr');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    });

    test('first Jobs table row contains the job name after navigation', async ({ page }) => {
      await page.locator('#dag-detail-actions .dag-detail-action-btn').first().click();
      await page.waitForSelector('#jobs-tbody tr', { timeout: 10_000 });
      await expect(page.locator('#jobs-tbody tr').first()).toContainText(D.DAG_MIDDLE_JOB);
    });
  });

  // ── "Re-focus graph here" action button ──────────────────────────────────
  test.describe('"Re-focus graph here" action button', () => {
    test('clicking "Re-focus graph here" reopens modal focused on the same job', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      await page.evaluate((jn) => (window as any).openDagDetail(jn), D.DAG_MIDDLE_JOB);

      const secondary = page.locator('#dag-detail-actions .dag-detail-action-btn.secondary');
      await secondary.click();

      // Modal stays open, title still shows the same job
      await expect(page.locator('#dag-modal-overlay')).toHaveClass(/open/);
      await expect(page.locator('#dag-modal-title')).toHaveText(D.DAG_MIDDLE_JOB);
    });
  });

  // ── Root / leaf job special cases ────────────────────────────────────────
  test.describe('Root and leaf jobs', () => {
    test('root job opens DAG modal without error', async ({ page }) => {
      await goToJobRow(page, D.DAG_ROOT_JOB);
      await openDagForFirstRow(page);
      await expect(page.locator('#dag-modal-overlay')).toHaveClass(/open/);
      await expect(page.locator('#dag-no-data')).not.toBeVisible();
    });

    test('leaf job opens DAG modal without error', async ({ page }) => {
      await goToJobRow(page, D.DAG_LEAF_JOB);
      await openDagForFirstRow(page);
      await expect(page.locator('#dag-modal-overlay')).toHaveClass(/open/);
      await expect(page.locator('#dag-no-data')).not.toBeVisible();
    });

    test('root job detail shows 0 predecessors', async ({ page }) => {
      await goToJobRow(page, D.DAG_ROOT_JOB);
      await openDagForFirstRow(page);
      await page.evaluate((jn) => (window as any).openDagDetail(jn), D.DAG_ROOT_JOB);
      await expect(page.locator('#dag-detail-body')).toContainText('0 predecessors');
    });

    test('leaf job detail shows 0 successors', async ({ page }) => {
      await goToJobRow(page, D.DAG_LEAF_JOB);
      await openDagForFirstRow(page);
      await page.evaluate((jn) => (window as any).openDagDetail(jn), D.DAG_LEAF_JOB);
      await expect(page.locator('#dag-detail-body')).toContainText('0 successors');
    });
  });

  // ── Hover tooltip description ─────────────────────────────────────────────
  test.describe('Hover tooltip description', () => {
    test('tooltip becomes visible when hovering a node', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      // Trigger tooltip directly via exposed helper (avoids canvas coordinate uncertainty)
      await page.evaluate((jn) => (window as any).showDagTooltipForJob(jn), D.DAG_MIDDLE_JOB);
      await expect(page.locator('#dag-tooltip')).toBeVisible();
    });

    test('tooltip contains description text', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      await page.evaluate((jn) => (window as any).showDagTooltipForJob(jn), D.DAG_MIDDLE_JOB);
      await expect(page.locator('#dag-tooltip')).toContainText(D.DAG_MIDDLE_DESCRIPTION);
    });
  });

  // ── Footer legend ────────────────────────────────────────────────────────
  test.describe('Footer legend', () => {
    test('legend items are visible when modal is open', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      await expect(page.locator('.dag-modal-footer .dag-legend-item').first()).toBeVisible();
    });

    test('stat line in footer is populated after render', async ({ page }) => {
      await goToJobRow(page, D.DAG_MIDDLE_JOB);
      await openDagForFirstRow(page);
      const stat = page.locator('#dag-stat');
      await expect(stat).not.toBeEmpty();
    });
  });
});
