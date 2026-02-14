import { test, expect, Page, Route } from 'playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Namespace Switching E2E Test Suite
 *
 * Tests the namespace selector combobox for namespaced resources.
 * Verifies switching between specific namespaces and "All Namespaces" mode.
 *
 * Run with: npx playwright test e2e/namespace-switching.spec.ts
 */

const SCREENSHOT_DIR = 'test-results/screenshots/namespace-switching';
const STANDALONE_BASE = 'https://localhost:4200/ui/generic-resource';

interface ServiceAccountFixture {
  introspection: Record<string, object>;
  namespaces: string[];
  listResponses: Record<string, object>;
  listResponse: object;
  detailResponse: object;
  yamlResponse: object;
  namespacesListResponse: object;
}

function loadFixture(): ServiceAccountFixture {
  const fixturePath = path.join(process.cwd(), 'e2e/fixtures/serviceaccounts.fixture.json');
  return JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
}

function activateServiceAccountConfig() {
  const configPath = path.join(process.cwd(), 'src/assets/configs/serviceaccounts.json');
  const targetPath = path.join(process.cwd(), 'src/assets/config.json');

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  config.token = 'offline-mock-token';
  // Start with no namespace to test the selector
  delete config.namespaceId;

  fs.writeFileSync(targetPath, JSON.stringify(config, null, 2));
}

async function setupGraphQLMock(page: Page, fixture: ServiceAccountFixture, currentNamespace: string | null) {
  await page.route('**/graphql', async (route: Route) => {
    const request = route.request();
    const postData = request.postDataJSON();
    const query = postData?.query || '';
    const variables = postData?.variables || {};

    const shortQuery = query.substring(0, 100).replace(/\n/g, ' ').replace(/\s+/g, ' ');
    console.log('  [Mock] GraphQL:', shortQuery, 'namespace:', variables.namespace);

    // Handle introspection queries
    if (query.includes('__type(name:') || query.includes('__type (name:')) {
      const typeName = variables.typeName;
      if (fixture.introspection && fixture.introspection[typeName]) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(fixture.introspection[typeName]),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { __type: null } }),
      });
      return;
    }

    // Handle schema introspection
    if (query.includes('__schema')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            __schema: {
              types: [],
              queryType: { name: 'Query' },
              mutationType: { name: 'Mutation' },
              subscriptionType: { name: 'Subscription' },
            },
          },
        }),
      });
      return;
    }

    // Handle subscriptions
    if (query.includes('subscription') || query.includes('WatchResources')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: null }),
      });
      return;
    }

    // Handle namespace list queries
    if (query.includes('Namespaces') && query.includes('items')) {
      console.log('  [Mock] Returning namespaces list');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixture.namespacesListResponse),
      });
      return;
    }

    // Handle ServiceAccount list queries based on namespace
    if (query.includes('ServiceAccounts') && query.includes('items')) {
      const ns = variables.namespace;
      let response;

      if (!ns || ns === '') {
        // All namespaces
        response = fixture.listResponses['all'];
        console.log('  [Mock] Returning ALL namespaces list');
      } else if (fixture.listResponses[ns]) {
        response = fixture.listResponses[ns];
        console.log(`  [Mock] Returning ${ns} namespace list`);
      } else {
        response = fixture.listResponse;
        console.log('  [Mock] Returning default list');
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
      return;
    }

    // Handle detail queries
    if (query.includes('GetResource') || (query.includes('ServiceAccount') && query.includes('(name:'))) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixture.detailResponse),
      });
      return;
    }

    // Handle YAML queries
    if (query.includes('Yaml')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixture.yamlResponse),
      });
      return;
    }

    // Default fallback
    console.log('  [Mock] Default: returning list response');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixture.listResponse),
    });
  });
}

async function waitForAppReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page
    .waitForSelector('fd-table tbody tr, app-resource-detail-view, .empty-state, .loading', {
      timeout: 15000,
    })
    .catch(() => {});
  await page.waitForTimeout(1500);
}

test.describe('Namespace Switching', () => {
  test.setTimeout(60000);
  test.describe.configure({ mode: 'serial' });

  const fixture = loadFixture();

  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    activateServiceAccountConfig();
  });

  test('should display namespace selector for namespaced resources', async ({ page }) => {
    await setupGraphQLMock(page, fixture, null);
    await page.goto(`${STANDALONE_BASE}/#/`);
    await waitForAppReady(page);

    // Check that the namespace selector is present
    const namespaceSelector = page.locator('[test-id="namespace-selector"], .namespace-selector, fd-combobox[placeholder*="namespace" i]');
    await expect(namespaceSelector).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-initial-view-with-selector.png`,
      fullPage: true,
    });
  });

  test('should show "All Namespaces" option in dropdown', async ({ page }) => {
    await setupGraphQLMock(page, fixture, null);
    await page.goto(`${STANDALONE_BASE}/#/`);
    await waitForAppReady(page);

    // Open the namespace selector dropdown
    const namespaceSelector = page.locator('[test-id="namespace-selector"], .namespace-selector, fd-combobox').first();
    await namespaceSelector.click();
    await page.waitForTimeout(500);

    // Check for "All Namespaces" option
    const allNamespacesOption = page.locator('fd-option:has-text("All Namespaces"), li:has-text("All Namespaces"), .fd-list__item:has-text("All Namespaces")');
    await expect(allNamespacesOption).toBeVisible({ timeout: 5000 });

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-dropdown-with-all-namespaces.png`,
      fullPage: true,
    });
  });

  test('should list namespaces from the cluster', async ({ page }) => {
    await setupGraphQLMock(page, fixture, null);
    await page.goto(`${STANDALONE_BASE}/#/`);
    await waitForAppReady(page);

    // Open the namespace selector dropdown
    const namespaceSelector = page.locator('[test-id="namespace-selector"], .namespace-selector, fd-combobox').first();
    await namespaceSelector.click();
    await page.waitForTimeout(500);

    // Verify expected namespaces are in the dropdown
    for (const ns of ['default', 'kube-system', 'production', 'staging']) {
      const nsOption = page.locator(`fd-option:has-text("${ns}"), li:has-text("${ns}"), .fd-list__item:has-text("${ns}")`);
      await expect(nsOption).toBeVisible({ timeout: 3000 });
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-dropdown-with-namespaces.png`,
      fullPage: true,
    });
  });

  test('should switch to specific namespace and show filtered resources', async ({ page }) => {
    await setupGraphQLMock(page, fixture, 'production');
    await page.goto(`${STANDALONE_BASE}/#/`);
    await waitForAppReady(page);

    // Open the namespace selector and select "production"
    const namespaceSelector = page.locator('[test-id="namespace-selector"], .namespace-selector, fd-combobox').first();
    await namespaceSelector.click();
    await page.waitForTimeout(500);

    const productionOption = page.locator('fd-option:has-text("production"), li:has-text("production")').first();
    await productionOption.click();
    await page.waitForTimeout(1000);

    // Verify the table shows production service accounts
    const tableRows = page.locator('fd-table tbody tr');
    await expect(tableRows).toHaveCount(3); // default, api-server-sa, worker-sa

    // Verify namespace column shows "production"
    const namespaceCell = page.locator('fd-table tbody tr:first-child td:has-text("production")');
    await expect(namespaceCell).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-production-namespace-filtered.png`,
      fullPage: true,
    });
  });

  test('should show all resources when "All Namespaces" is selected', async ({ page }) => {
    await setupGraphQLMock(page, fixture, null);
    await page.goto(`${STANDALONE_BASE}/#/`);
    await waitForAppReady(page);

    // Open the namespace selector and select "All Namespaces"
    const namespaceSelector = page.locator('[test-id="namespace-selector"], .namespace-selector, fd-combobox').first();
    await namespaceSelector.click();
    await page.waitForTimeout(500);

    const allNamespacesOption = page.locator('fd-option:has-text("All Namespaces"), li:has-text("All Namespaces")').first();
    await allNamespacesOption.click();
    await page.waitForTimeout(1000);

    // Verify the table shows all service accounts (10 total from fixture)
    const tableRows = page.locator('fd-table tbody tr');
    await expect(tableRows).toHaveCount(10);

    // Verify resources from different namespaces are present
    await expect(page.locator('fd-table tbody tr td:has-text("default")')).toBeVisible();
    await expect(page.locator('fd-table tbody tr td:has-text("kube-system")')).toBeVisible();
    await expect(page.locator('fd-table tbody tr td:has-text("production")')).toBeVisible();
    await expect(page.locator('fd-table tbody tr td:has-text("staging")')).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-all-namespaces-view.png`,
      fullPage: true,
    });
  });

  test('should switch between different namespaces', async ({ page }) => {
    await setupGraphQLMock(page, fixture, 'staging');
    await page.goto(`${STANDALONE_BASE}/#/`);
    await waitForAppReady(page);

    // Select "staging" namespace
    const namespaceSelector = page.locator('[test-id="namespace-selector"], .namespace-selector, fd-combobox').first();
    await namespaceSelector.click();
    await page.waitForTimeout(500);

    const stagingOption = page.locator('fd-option:has-text("staging"), li:has-text("staging")').first();
    await stagingOption.click();
    await page.waitForTimeout(1000);

    // Verify staging resources
    const tableRows = page.locator('fd-table tbody tr');
    await expect(tableRows).toHaveCount(2); // default, test-runner-sa

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-staging-namespace.png`,
      fullPage: true,
    });

    // Now switch to "kube-system"
    await namespaceSelector.click();
    await page.waitForTimeout(500);

    const kubeSystemOption = page.locator('fd-option:has-text("kube-system"), li:has-text("kube-system")').first();
    await kubeSystemOption.click();
    await page.waitForTimeout(1000);

    // Verify kube-system resources
    await expect(tableRows).toHaveCount(3); // default, coredns, kube-proxy

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07-kube-system-namespace.png`,
      fullPage: true,
    });
  });

  test('namespace selector should be positioned in the top right', async ({ page }) => {
    await setupGraphQLMock(page, fixture, null);
    await page.goto(`${STANDALONE_BASE}/#/`);
    await waitForAppReady(page);

    // Check selector is in the header/toolbar area
    const selector = page.locator('[test-id="namespace-selector"], .namespace-selector, fd-combobox').first();
    const selectorBox = await selector.boundingBox();

    // Selector should be in the top portion (header) and right side
    const viewportSize = page.viewportSize();
    if (selectorBox && viewportSize) {
      // Top 200px
      expect(selectorBox.y).toBeLessThan(200);
      // Right half of the screen
      expect(selectorBox.x).toBeGreaterThan(viewportSize.width / 3);
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/08-selector-position.png`,
      fullPage: true,
    });
  });

  test('should persist namespace selection on navigation', async ({ page }) => {
    await setupGraphQLMock(page, fixture, 'production');
    await page.goto(`${STANDALONE_BASE}/#/`);
    await waitForAppReady(page);

    // Select production namespace
    const namespaceSelector = page.locator('[test-id="namespace-selector"], .namespace-selector, fd-combobox').first();
    await namespaceSelector.click();
    await page.waitForTimeout(500);

    const productionOption = page.locator('fd-option:has-text("production"), li:has-text("production")').first();
    await productionOption.click();
    await page.waitForTimeout(1000);

    // Navigate to a detail view
    const firstLink = page.locator('fd-table tbody tr .fd-link, fd-table tbody tr a').first();
    const hasLink = await firstLink.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasLink) {
      await firstLink.click();
      await page.waitForSelector('app-resource-detail-view', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1000);

      // Go back to list view
      await page.goBack();
      await waitForAppReady(page);

      // Verify namespace is still "production"
      const selectorInput = page.locator('[test-id="namespace-selector"] input, .namespace-selector input, fd-combobox input').first();
      const value = await selectorInput.inputValue();
      expect(value).toContain('production');
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09-namespace-persistence.png`,
      fullPage: true,
    });
  });
});
