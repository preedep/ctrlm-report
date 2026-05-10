import { test, expect } from '@playwright/test';
import { waitForInit, switchTab, D } from './helpers';

test.describe('EA Landscape', () => {
  test.beforeEach(async ({ page }) => {
    await waitForInit(page);
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  test.describe('Stats pills', () => {
    test('shows correct app count', async ({ page }) => {
      await expect(page.locator('#ea-stat-apps')).toHaveText(String(D.TOTAL_APPS));
    });

    test('shows correct domain count', async ({ page }) => {
      await expect(page.locator('#ea-stat-domains')).toHaveText(String(D.TOTAL_DOMAINS));
    });

    test('shows correct IT division count', async ({ page }) => {
      await expect(page.locator('#ea-stat-divs')).toHaveText(String(D.TOTAL_IT_DIVS));
    });
  });

  // ── Perspective toggle ────────────────────────────────────────────────────
  test.describe('Perspective toggle', () => {
    test('"By Domain" is active by default', async ({ page }) => {
      await expect(page.locator('.eal-persp-btn[data-persp="domain"]')).toHaveClass(/active/);
    });

    test('switching to "By IT Division" rebuilds landscape', async ({ page }) => {
      await page.locator('.eal-persp-btn[data-persp="itdiv"]').click();
      await expect(page.locator('.eal-persp-btn[data-persp="itdiv"]')).toHaveClass(/active/);
      await expect(page.locator('#ea-matrix-wrap .eal-app').first()).toBeVisible();
    });

    test('switching to "By Layer" rebuilds landscape', async ({ page }) => {
      await page.locator('.eal-persp-btn[data-persp="layer"]').click();
      await expect(page.locator('.eal-persp-btn[data-persp="layer"]')).toHaveClass(/active/);
      await expect(page.locator('#ea-matrix-wrap .eal-app').first()).toBeVisible();
    });

    test('switching perspective resets to "By Domain" correctly', async ({ page }) => {
      await page.locator('.eal-persp-btn[data-persp="itdiv"]').click();
      await page.locator('.eal-persp-btn[data-persp="domain"]').click();
      await expect(page.locator('.eal-persp-btn[data-persp="domain"]')).toHaveClass(/active/);
    });
  });

  // ── App cards ──────────────────────────────────────────────────────────────
  test.describe('App cards', () => {
    test('landscape renders app cards', async ({ page }) => {
      const cards = page.locator('#ea-matrix-wrap .eal-app');
      await expect(cards.first()).toBeVisible();
      expect(await cards.count()).toBeGreaterThan(0);
    });

    test('total rendered cards equals app inventory size', async ({ page }) => {
      // Wait for all cards to be built
      await page.waitForFunction(
        (expected) => document.querySelectorAll('#ea-matrix-wrap .eal-app').length === expected,
        D.TOTAL_APPS,
        { timeout: 10_000 },
      );
      expect(await page.locator('#ea-matrix-wrap .eal-app').count()).toBe(D.TOTAL_APPS);
    });

    test('app card click navigates to Jobs tab filtered by app code', async ({ page }) => {
      const card = page.locator(`#ea-matrix-wrap .eal-app[data-ac="${D.APP_CODE_MANY_JOBS}"]`);
      await expect(card).toBeVisible();
      await card.click();
      await expect(page.locator('#tab-jobs')).toHaveClass(/active/);
      // Hidden input mirrors the appCodeFilter JS variable
      await expect(page.locator('#appcode-filter')).toHaveValue(D.APP_CODE_MANY_JOBS);
    });
  });

  // ── Tooltip ────────────────────────────────────────────────────────────────
  test.describe('App card tooltip', () => {
    test('tooltip appears on hover and shows app code', async ({ page }) => {
      const card = page.locator('#ea-matrix-wrap .eal-app').first();
      await card.hover();
      const tip = page.locator('#eal-tip');
      await expect(tip).toHaveClass(/eal-tip-vis/);
      await expect(tip.locator('.eal-tip-code')).toBeVisible();
    });

    test('tooltip shows app ID section', async ({ page }) => {
      const card = page.locator('#ea-matrix-wrap .eal-app[data-ai]:not([data-ai=""])').first();
      await card.hover();
      const tip = page.locator('#eal-tip');
      await expect(tip.locator('.eal-tip-id')).toBeVisible();
      const id = await tip.locator('.eal-tip-id').textContent();
      expect(id).toBeTruthy();
    });

    test('tooltip hides after moving mouse away', async ({ page }) => {
      const card = page.locator('#ea-matrix-wrap .eal-app').first();
      await card.hover();
      await expect(page.locator('#eal-tip')).toHaveClass(/eal-tip-vis/);
      await page.mouse.move(0, 0);
      await expect(page.locator('#eal-tip')).not.toHaveClass(/eal-tip-vis/, { timeout: 600 });
    });

    test('tooltip shows "Application Plan" section', async ({ page }) => {
      const card = page.locator('#ea-matrix-wrap .eal-app').first();
      await card.hover();
      const sections = page.locator('#eal-tip .eal-tip-lbl');
      const labels = await sections.allTextContents();
      expect(labels.some(l => /application plan/i.test(l))).toBe(true);
    });

    test('tooltip shows CTM jobs count for apps that have jobs', async ({ page }) => {
      const card = page.locator(`#ea-matrix-wrap .eal-app[data-ac="${D.APP_CODE_MANY_JOBS}"]`);
      await card.hover();
      const tip = page.locator('#eal-tip');
      // CTM Jobs section should appear
      const labels = await tip.locator('.eal-tip-lbl').allTextContents();
      expect(labels.some(l => /ctm jobs/i.test(l))).toBe(true);
    });
  });

  // ── Smart Search ──────────────────────────────────────────────────────────
  test.describe('Smart search', () => {
    test('search input is visible in page header', async ({ page }) => {
      await expect(page.locator('#eal-search-input')).toBeVisible();
    });

    test('typing opens the dropdown', async ({ page }) => {
      await page.locator('#eal-search-input').fill(D.APP_CODE_SEARCH);
      await expect(page.locator('#eal-search-dropdown')).toHaveClass(/eal-dd-open/);
    });

    test('dropdown shows result count', async ({ page }) => {
      await page.locator('#eal-search-input').fill(D.APP_CODE_SEARCH);
      await expect(page.locator('#eal-dd-hdr')).toContainText(/result/i);
    });

    test('dropdown shows matching items', async ({ page }) => {
      await page.locator('#eal-search-input').fill(D.APP_CODE_SEARCH);
      await expect(page.locator('.eal-dd-item').first()).toBeVisible();
    });

    test('search by app ID (numeric) returns results', async ({ page }) => {
      // Search for partial app ID "AP22"
      await page.locator('#eal-search-input').fill('AP22');
      await expect(page.locator('#eal-search-dropdown')).toHaveClass(/eal-dd-open/);
      expect(await page.locator('.eal-dd-item[data-ac]').count()).toBeGreaterThan(0);
    });

    test('clear button (×) clears search and closes dropdown', async ({ page }) => {
      await page.locator('#eal-search-input').fill(D.APP_CODE_SEARCH);
      await expect(page.locator('#eal-search-clear')).toBeVisible();
      await page.locator('#eal-search-clear').click();
      await expect(page.locator('#eal-search-input')).toHaveValue('');
      await expect(page.locator('#eal-search-dropdown')).not.toHaveClass(/eal-dd-open/);
    });

    test('Escape key clears search and closes dropdown', async ({ page }) => {
      await page.locator('#eal-search-input').fill(D.APP_CODE_SEARCH);
      await page.locator('#eal-search-input').press('Escape');
      await expect(page.locator('#eal-search-dropdown')).not.toHaveClass(/eal-dd-open/);
      await expect(page.locator('#eal-search-input')).toHaveValue('');
    });

    test('clicking outside closes dropdown without clearing input', async ({ page }) => {
      await page.locator('#eal-search-input').fill(D.APP_CODE_SEARCH);
      await page.locator('h2').first().click();
      await expect(page.locator('#eal-search-dropdown')).not.toHaveClass(/eal-dd-open/);
    });

    test('no-match query shows "No results" message', async ({ page }) => {
      await page.locator('#eal-search-input').fill('ZZZZNOTEXIST999');
      await expect(page.locator('#eal-dd-hdr')).toHaveText('No results');
    });
  });

  // ── Search keyboard navigation ────────────────────────────────────────────
  test.describe('Search keyboard navigation', () => {
    test.beforeEach(async ({ page }) => {
      await page.locator('#eal-search-input').fill(D.APP_CODE_SEARCH);
      await expect(page.locator('.eal-dd-item[data-ac]').first()).toBeVisible();
    });

    test('ArrowDown highlights first item', async ({ page }) => {
      await page.locator('#eal-search-input').press('ArrowDown');
      await expect(page.locator('.eal-dd-item[data-ac]').first()).toHaveClass(/eal-dd-active/);
    });

    test('ArrowDown twice highlights second item', async ({ page }) => {
      await page.locator('#eal-search-input').press('ArrowDown');
      await page.locator('#eal-search-input').press('ArrowDown');
      const items = page.locator('.eal-dd-item[data-ac]');
      await expect(items.nth(1)).toHaveClass(/eal-dd-active/);
      await expect(items.nth(0)).not.toHaveClass(/eal-dd-active/);
    });

    test('ArrowUp from start wraps to last item', async ({ page }) => {
      const items = page.locator('.eal-dd-item[data-ac]');
      const count = await items.count();
      await page.locator('#eal-search-input').press('ArrowUp');
      await expect(items.nth(count - 1)).toHaveClass(/eal-dd-active/);
    });

    test('ArrowDown from last item wraps to first', async ({ page }) => {
      const items = page.locator('.eal-dd-item[data-ac]');
      const count = await items.count();
      // Navigate past the last item (count+1 presses) so it wraps to first
      for (let i = 0; i <= count; i++) {
        await page.locator('#eal-search-input').press('ArrowDown');
      }
      await expect(items.first()).toHaveClass(/eal-dd-active/);
    });

    test('Enter on highlighted item scrolls to card and selects it', async ({ page }) => {
      await page.locator('#eal-search-input').press('ArrowDown');
      const activeItem = page.locator('.eal-dd-item.eal-dd-active');
      const selectedAc = await activeItem.getAttribute('data-ac');
      await page.locator('#eal-search-input').press('Enter');

      // Dropdown should close
      await expect(page.locator('#eal-search-dropdown')).not.toHaveClass(/eal-dd-open/);

      // Card gets persistent selection class
      const card = page.locator(`#ea-matrix-wrap .eal-app[data-ac="${selectedAc}"]`);
      await expect(card).toHaveClass(/eal-app-selected/, { timeout: 3_000 });
    });

    test('selected card stays highlighted after animation', async ({ page }) => {
      await page.locator('#eal-search-input').press('ArrowDown');
      await page.locator('#eal-search-input').press('Enter');
      const card = page.locator('#ea-matrix-wrap .eal-app.eal-app-selected');
      // Wait for pulse to finish (1.45s) and check selection persists
      await page.waitForTimeout(2_000);
      await expect(card).toHaveClass(/eal-app-selected/);
    });

    test('starting a new search clears previous selection', async ({ page }) => {
      await page.locator('#eal-search-input').press('ArrowDown');
      await page.locator('#eal-search-input').press('Enter');
      await page.locator('#ea-matrix-wrap .eal-app.eal-app-selected')
        .waitFor({ timeout: 3_000 });

      // Type new search
      await page.locator('#eal-search-input').fill('AAL');
      await expect(page.locator('#ea-matrix-wrap .eal-app.eal-app-selected')).toHaveCount(0);
    });
  });

  // ── CTM Jobs highlight ────────────────────────────────────────────────────
  test.describe('CTM Jobs highlight toggle', () => {
    test('CTM Jobs button is visible', async ({ page }) => {
      await expect(page.locator('#eal-job-highlight-btn')).toBeVisible();
    });

    test('clicking toggles highlight mode', async ({ page }) => {
      await page.locator('#eal-job-highlight-btn').click();
      await expect(page.locator('#eal-job-highlight-btn')).toHaveClass(/active/);
      await expect(page.locator('#ea-matrix-wrap')).toHaveClass(/eal-highlight-mode/);
    });

    test('clicking again turns off highlight mode', async ({ page }) => {
      await page.locator('#eal-job-highlight-btn').click();
      await page.locator('#eal-job-highlight-btn').click();
      await expect(page.locator('#ea-matrix-wrap')).not.toHaveClass(/eal-highlight-mode/);
    });
  });

  // ── Side-nav ──────────────────────────────────────────────────────────────
  test('side-nav renders domain links', async ({ page }) => {
    const navItems = page.locator('#eal-nav .eal-nav-item');
    expect(await navItems.count()).toBe(D.TOTAL_DOMAINS);
  });

  test('clicking side-nav item scrolls to that domain block', async ({ page }) => {
    const firstNavItem = page.locator('#eal-nav .eal-nav-item').first();
    await firstNavItem.click();
    // After click the first domain block should be in or near viewport
    const block = page.locator('[data-eal-dom]').first();
    await expect(block).toBeInViewport({ ratio: 0.3 });
  });
});
