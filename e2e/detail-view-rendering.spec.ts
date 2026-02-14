import { test, expect, Page, Route } from 'playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Detail View Rendering Test Suite
 *
 * Tests the detail view rendering with complex nested objects.
 * Uses the Component CRD fixture which has many nested fields.
 *
 * Run with: task test:e2e:detail
 */

const FIXTURES_DIR = 'e2e/fixtures';
const SCREENSHOT_DIR = 'test-results/screenshots/detail-view';
const STANDALONE_BASE = 'https://localhost:4200/ui/generic-resource';

interface Fixture {
  introspection?: Record<string, object>;
  listResponse: object;
  detailResponse: object;
  yamlResponse?: object;
}

// Load fixture file
function loadFixture(resourceName: string): Fixture | null {
  const fixturePath = path.join(process.cwd(), FIXTURES_DIR, `${resourceName}.fixture.json`);
  if (!fs.existsSync(fixturePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
}

// Copy config to active config.json
function activateConfig(resourceName: string) {
  const configPath = path.join(process.cwd(), 'src/assets/configs', `${resourceName}.json`);
  const targetPath = path.join(process.cwd(), 'src/assets/config.json');

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  config.token = 'offline-mock-token';

  fs.writeFileSync(targetPath, JSON.stringify(config, null, 2));
}

// Setup GraphQL mocking
async function setupGraphQLMock(page: Page, fixture: Fixture) {
  await page.route('**/graphql', async (route: Route) => {
    const request = route.request();
    const postData = request.postDataJSON();
    const query = postData?.query || '';
    const variables = postData?.variables || {};

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

    // Handle list queries
    if (query.includes('ListResources') || query.includes('items {')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixture.listResponse),
      });
      return;
    }

    // Handle YAML queries
    if (query.includes('GetResourceYaml') || query.includes('Yaml(name:') || query.includes('Yaml (name:')) {
      if (fixture.yamlResponse) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(fixture.yamlResponse),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: null }),
        });
      }
      return;
    }

    // Handle detail queries
    if (query.includes('GetResource') || (query.includes('(name:') && !query.includes('items'))) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixture.detailResponse),
      });
      return;
    }

    // Default
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixture.listResponse),
    });
  });
}

// Wait for app ready
async function waitForAppReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page
    .waitForSelector('fd-table tbody tr, app-resource-detail-view, .empty-state', {
      timeout: 15000,
    })
    .catch(() => {});
  await page.waitForTimeout(1500);
}

test.describe('Detail View Rendering', () => {
  test.setTimeout(60000);
  // Run tests serially because we modify shared config.json
  test.describe.configure({ mode: 'serial' });

  const fixture = loadFixture('components');

  test.beforeAll(() => {
    if (fixture) {
      activateConfig('components');
    }
  });

  test.skip(!fixture, 'components.fixture.json not found');

  test('renders list view with multiple components', async ({ page }) => {
    if (!fixture) return;

    await setupGraphQLMock(page, fixture);
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    await page.goto(`${STANDALONE_BASE}/#/`);
    await waitForAppReady(page);

    // Check component names are displayed in the table - use first() to avoid strict mode errors
    await expect(page.getByText('sample-docs-component').first()).toBeVisible();
    await expect(page.getByText('metadata-registry-service').first()).toBeVisible();
    await expect(page.getByText('example-microservice').first()).toBeVisible();

    // Verify table has rows (using more generic selector)
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(3);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-list-view.png`,
      fullPage: true,
    });
  });

  test('renders detail view with nested objects', async ({ page }) => {
    if (!fixture) return;

    await setupGraphQLMock(page, fixture);
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    // Navigate directly to detail view
    await page.goto(`${STANDALONE_BASE}/#/metadata-registry-service`);
    await page.waitForTimeout(3000);

    // Verify header shows resource name (the h1 title)
    await expect(page.getByRole('heading', { name: 'metadata-registry-service' })).toBeVisible();

    // Verify spec section exists (look for Spec heading)
    await expect(page.getByText('Spec')).toBeVisible();

    // Verify automation card exists
    await expect(page.getByText('Automation')).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-detail-view.png`,
      fullPage: true,
    });
  });

  test('displays nested spec fields correctly', async ({ page }) => {
    if (!fixture) return;

    await setupGraphQLMock(page, fixture);
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    await page.goto(`${STANDALONE_BASE}/#/metadata-registry-service`);
    await page.waitForTimeout(3000);

    // Check for spec field labels (uppercase in UI)
    await expect(page.getByText('DISPLAY NAME')).toBeVisible();
    await expect(page.getByText('BOUNDED CONTEXT')).toBeVisible();
    await expect(page.getByText('LONG DESCRIPTION')).toBeVisible();

    // Check for nested object cards (automation, extensions)
    await expect(page.getByText('Automation')).toBeVisible();
    await expect(page.getByText('Extensions')).toBeVisible();

    // Screenshot the full page to capture spec
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-spec-section.png`,
      fullPage: true,
    });
  });

  test('displays status conditions correctly', async ({ page }) => {
    if (!fixture) return;

    await setupGraphQLMock(page, fixture);
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    await page.goto(`${STANDALONE_BASE}/#/metadata-registry-service`);
    await page.waitForTimeout(3000);

    // Scroll down to see status section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // The status shows "Ready" in the header area - use first() to avoid strict mode error
    await expect(page.getByText('The resource is ready').first()).toBeVisible();

    // Screenshot the full page
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-status-section.png`,
      fullPage: true,
    });
  });

  test('opens YAML panel with formatted content', async ({ page }) => {
    if (!fixture) return;

    await setupGraphQLMock(page, fixture);
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    await page.goto(`${STANDALONE_BASE}/#/metadata-registry-service`);
    await page.waitForTimeout(3000);

    // Click YAML button - look for button with YAML text
    const yamlButton = page.locator('button:has-text("YAML")').first();
    await expect(yamlButton).toBeVisible();
    await yamlButton.click();

    // Wait for panel to open
    await page.waitForSelector('.yaml-panel.open', { timeout: 5000 });
    await page.waitForTimeout(1000);

    // Check that YAML panel is visible
    await expect(page.locator('.yaml-panel.open')).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-yaml-panel.png`,
      fullPage: true,
    });
  });

  test('displays extended metadata when expanded', async ({ page }) => {
    if (!fixture) return;

    await setupGraphQLMock(page, fixture);
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    await page.goto(`${STANDALONE_BASE}/#/metadata-registry-service`);
    await page.waitForTimeout(3000);

    // Click "More..." link to expand metadata
    const moreLink = page.getByText('More...').first();
    const isMoreVisible = await moreLink.isVisible().catch(() => false);

    if (isMoreVisible) {
      await moreLink.click();
      await page.waitForTimeout(500);

      // Verify extended metadata is shown
      await expect(page.locator('.extended-metadata')).toBeVisible();

      // Check for UID field
      await expect(page.getByText('UID')).toBeVisible();

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/06-extended-metadata.png`,
        fullPage: true,
      });
    } else {
      // Take screenshot even if More link not present
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/06-header-metadata.png`,
        fullPage: true,
      });
    }
  });

  test('captures individual nested cards', async ({ page }) => {
    if (!fixture) return;

    await setupGraphQLMock(page, fixture);
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    await page.goto(`${STANDALONE_BASE}/#/metadata-registry-service`);
    await page.waitForTimeout(3000);

    // Capture nested object cards (fd-card elements)
    const cards = page.locator('fd-card');
    const cardCount = await cards.count();

    for (let i = 0; i < Math.min(cardCount, 6); i++) {
      const card = cards.nth(i);
      if (await card.isVisible()) {
        const title = await card
          .locator('h3, [fd-card-title]')
          .first()
          .textContent()
          .catch(() => `card-${i + 1}`);

        const safeName = (title ?? `card-${i + 1}`)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .substring(0, 30);

        await card.screenshot({
          path: `${SCREENSHOT_DIR}/07-card-${String(i + 1).padStart(2, '0')}-${safeName}.png`,
        });
      }
    }
  });
});
