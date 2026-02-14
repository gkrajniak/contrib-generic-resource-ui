import { test, Page } from 'playwright/test';

/**
 * Visual Layout Testing Suite
 *
 * Takes screenshots of list view, then navigates to detail view.
 * Run with: task screenshots
 *
 * Screenshots are saved to: test-results/screenshots/
 */

const SCREENSHOT_DIR = 'test-results/screenshots';
const STANDALONE_BASE = 'https://localhost:4200/ui/generic-resource';

// Helper to wait for app to be ready (don't use networkidle - HMR keeps connections open)
async function waitForAppReady(page: Page, waitForContent = true) {
  await page.waitForLoadState('domcontentloaded');

  if (waitForContent) {
    // Wait for Angular app to bootstrap and render table or content
    await page
      .waitForSelector('fd-table tbody tr, app-resource-detail-view, .empty-state', {
        timeout: 30000,
      })
      .catch(() => {});
  }

  // Give time for data to render
  await page.waitForTimeout(2000);
}

test.describe('Standalone App Screenshots', () => {
  test.setTimeout(60000);

  test('capture list and detail views', async ({ page }) => {
    // Navigate to list view (root path shows the list)
    await page.goto(`${STANDALONE_BASE}/#/`);
    await waitForAppReady(page);

    // Screenshot 1: List view
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-list-view.png`,
      fullPage: true,
    });
    console.log('Captured: 01-list-view.png');

    // Find clickable link in the first row (usually the name column has a link)
    const firstLink = page.locator('fd-table tbody tr .fd-link, table tbody tr a').first();
    const hasLink = await firstLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasLink) {
      // Fallback: try clicking the first row directly
      const firstRow = page.locator('fd-table tbody tr, table tbody tr').first();
      const hasRows = await firstRow.isVisible({ timeout: 5000 }).catch(() => false);

      if (!hasRows) {
        console.log('No rows found in list view - skipping detail screenshots');
        return;
      }

      console.log('No link found, clicking row directly');
      await firstRow.click();
    } else {
      console.log('Clicking first link in table');
      await firstLink.click();
    }

    // Wait for detail view to load
    await page.waitForSelector('app-resource-detail-view', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Screenshot 2: Full detail view
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-detail-view-full.png`,
      fullPage: true,
    });
    console.log('Captured: 02-detail-view-full.png');

    // Screenshot 3: Just the detail content area
    const mainContent = page.locator('app-resource-detail-view').first();
    if (await mainContent.isVisible()) {
      await mainContent.screenshot({
        path: `${SCREENSHOT_DIR}/03-detail-content.png`,
      });
      console.log('Captured: 03-detail-content.png');
    }

    // Screenshot 4: Spec section
    const specPanel = page.locator('app-spec-section fd-layout-panel').first();
    if (await specPanel.isVisible({ timeout: 3000 }).catch(() => false)) {
      await specPanel.screenshot({
        path: `${SCREENSHOT_DIR}/04-spec-section.png`,
      });
      console.log('Captured: 04-spec-section.png');
    }

    // Screenshot 5: Nested objects area
    const nestedObjects = page.locator('.nested-objects').first();
    if (await nestedObjects.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nestedObjects.screenshot({
        path: `${SCREENSHOT_DIR}/05-nested-objects.png`,
      });
      console.log('Captured: 05-nested-objects.png');
    }

    // Screenshot 6+: Individual nested cards
    const cards = page.locator('app-nested-object-card');
    const cardCount = await cards.count();

    for (let i = 0; i < cardCount; i++) {
      const card = cards.nth(i);
      if (await card.isVisible()) {
        const title = await card
          .locator('fd-card-header h3, [fd-card-header-title]')
          .textContent()
          .catch(() => `card-${i + 1}`);
        const safeName = (title ?? `card-${i + 1}`)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .substring(0, 30);

        await card.screenshot({
          path: `${SCREENSHOT_DIR}/06-card-${String(i + 1).padStart(2, '0')}-${safeName}.png`,
        });
        console.log(`Captured: 06-card-${String(i + 1).padStart(2, '0')}-${safeName}.png`);
      }
    }

    const totalScreenshots =
      2 +
      (await mainContent.isVisible().catch(() => false) ? 1 : 0) +
      (await specPanel.isVisible({ timeout: 100 }).catch(() => false) ? 1 : 0) +
      (await nestedObjects.isVisible({ timeout: 100 }).catch(() => false) ? 1 : 0) +
      cardCount;

    console.log(`\nTotal: Captured ${totalScreenshots} screenshots`);
  });
});
