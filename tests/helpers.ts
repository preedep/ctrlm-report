import { Page, expect } from '@playwright/test';

export const REPORT = '/report.html';

// ── Dataset constants (match dataset/ files exactly) ──────────────────────────
export const D = {
  TOTAL_JOBS:       23_768,
  TOTAL_APPS:       498,
  TOTAL_DOMAINS:    15,
  TOTAL_IT_DIVS:    37,
  UNMATCHED_JOBS:   2_553,
  CRITICAL_JOBS:    0,
  PLAN_TOTAL:       7,
  PLAN_DONE:        3,
  PLAN_IN_PROGRESS: 4,
  get PLAN_NOT_STARTED() { return this.TOTAL_JOBS - this.PLAN_DONE - this.PLAN_IN_PROGRESS; },

  // Known app codes present in both jobs + inventory
  APP_CODE_SEARCH:  'AAL',
  APP_ID_SEARCH:    'AP2255',  // app id of first inventory item (3DSV2)
  APP_CODE_MANY_JOBS: 'OFSAA-FTP', // 2 623 jobs

  // Known migration plan entries
  DONE_JOB:    'RT_CAPI_ITMX_OUTBOUND_D0001',
  INPROG_JOB:  'RT_TLM_START_MKTDATE_D0005',

  // Known job for search
  JOB_NAME: 'AFT_DEPOSIT_DORMANT_NOTICE_01',
} as const;

/** Wait for the JS initialisation to complete (EA stat pill is populated last). */
export async function waitForInit(page: Page) {
  await page.goto(REPORT);
  await page.waitForSelector('#ea-stat-apps:not(:empty)', { timeout: 20_000 });
}

/** Click a tab and wait for its content panel to become active. */
export async function switchTab(page: Page, tab: 'ea' | 'dashboard' | 'jobs' | 'migration') {
  await page.locator(`.tab-btn[data-tab="${tab}"]`).click();
  await expect(page.locator(`#tab-${tab}`)).toHaveClass(/active/);
}

/** Verify a canvas element has non-zero rendered dimensions (chart is drawn). */
export async function expectChartRendered(page: Page, canvasId: string) {
  const canvas = page.locator(`#${canvasId}`);
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box?.width).toBeGreaterThan(0);
  expect(box?.height).toBeGreaterThan(0);
}
