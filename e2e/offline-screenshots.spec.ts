import { test, Page, Route } from 'playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Offline Visual Testing Suite
 *
 * Takes screenshots using mocked GraphQL responses - no real gateway needed.
 * Run with: task screenshots:offline
 *
 * Fixtures are loaded from: e2e/fixtures/{resource}.fixture.json
 * Screenshots are saved to: test-results/screenshots/offline/{resource}/
 */

const FIXTURES_DIR = 'e2e/fixtures';
const SCREENSHOT_DIR = 'test-results/screenshots/offline';
const STANDALONE_BASE = 'https://localhost:4200/ui/generic-resource';

interface Fixture {
  introspection?: Record<string, object>;
  listResponse: object;
  detailResponse: object;
  yamlResponse?: object;
}

interface ResourceConfig {
  resourceDefinition: {
    kind: string;
    plural: string;
    group: string;
    version: string;
    scope: 'Namespaced' | 'Cluster';
  };
}

// Load fixture file
function loadFixture(resourceName: string): Fixture | null {
  const fixturePath = path.join(process.cwd(), FIXTURES_DIR, `${resourceName}.fixture.json`);
  if (!fs.existsSync(fixturePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  } catch (e) {
    console.error(`Failed to load fixture ${fixturePath}:`, e);
    return null;
  }
}

// Load config file
function loadConfig(resourceName: string): ResourceConfig | null {
  const configPath = path.join(process.cwd(), 'src/assets/configs', `${resourceName}.json`);
  if (!fs.existsSync(configPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (e) {
    console.error(`Failed to load config ${configPath}:`, e);
    return null;
  }
}

// Copy config to active config.json (for app bootstrap)
function activateConfig(resourceName: string) {
  const configPath = path.join(process.cwd(), 'src/assets/configs', `${resourceName}.json`);
  const targetPath = path.join(process.cwd(), 'src/assets/config.json');

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  // Add a dummy token for offline mode
  config.token = 'offline-mock-token';

  fs.writeFileSync(targetPath, JSON.stringify(config, null, 2));
}

// Get available fixtures
function getAvailableFixtures(): string[] {
  const fixturesPath = path.join(process.cwd(), FIXTURES_DIR);
  if (!fs.existsSync(fixturesPath)) {
    return [];
  }
  return fs
    .readdirSync(fixturesPath)
    .filter((f) => f.endsWith('.fixture.json'))
    .map((f) => f.replace('.fixture.json', ''));
}

// Setup GraphQL mocking for a page
async function setupGraphQLMock(page: Page, fixture: Fixture, config: ResourceConfig) {
  // Intercept all GraphQL requests
  await page.route('**/graphql', async (route: Route) => {
    const request = route.request();
    const postData = request.postDataJSON();
    const query = postData?.query || '';
    const variables = postData?.variables || {};

    const shortQuery = query.substring(0, 100).replace(/\n/g, ' ').replace(/\s+/g, ' ');
    console.log('  [Mock] GraphQL:', shortQuery);

    // Handle introspection queries (IntrospectType)
    if (query.includes('__type(name:') || query.includes('__type (name:')) {
      const typeName = variables.typeName;
      console.log(`  [Mock] Introspection for type: ${typeName}`);

      // Check if we have introspection data for this type
      if (fixture.introspection && fixture.introspection[typeName]) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(fixture.introspection[typeName]),
        });
        return;
      }

      // Return empty type for unknown types
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            __type: null,
          },
        }),
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

    // Handle subscriptions (return empty, they won't work in mock)
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
      console.log('  [Mock] Returning list response');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixture.listResponse),
      });
      return;
    }

    // Handle YAML queries
    if (query.includes('GetResourceYaml') || query.includes('Yaml(name:')) {
      console.log('  [Mock] Returning YAML response');
      if (fixture.yamlResponse) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(fixture.yamlResponse),
        });
      } else {
        // Generate a mock YAML response from detail response if not provided
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              v1: {
                [`${config.resourceDefinition.kind}Yaml`]: 'apiVersion: v1\nkind: Mock\nmetadata:\n  name: mock-resource\n',
              },
            },
          }),
        });
      }
      return;
    }

    // Handle detail queries (name: in args)
    if (query.includes('GetResource') || (query.includes('(name:') && !query.includes('items'))) {
      console.log('  [Mock] Returning detail response');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixture.detailResponse),
      });
      return;
    }

    // Default - return list response
    console.log('  [Mock] Default: returning list response');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixture.listResponse),
    });
  });
}

// Helper to wait for app ready
async function waitForAppReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page
    .waitForSelector('fd-table tbody tr, app-resource-detail-view, .empty-state, .loading', {
      timeout: 15000,
    })
    .catch(() => {});
  await page.waitForTimeout(1500);
}

test.describe('Offline Screenshots', () => {
  test.setTimeout(90000);
  // Run tests serially because we modify shared config.json
  test.describe.configure({ mode: 'serial' });

  const availableFixtures = getAvailableFixtures();

  if (availableFixtures.length === 0) {
    test.skip('no fixtures', () => {
      console.log('No fixture files found in e2e/fixtures/');
    });
  }

  for (const resourceName of availableFixtures) {
    const fixture = loadFixture(resourceName);
    const config = loadConfig(resourceName);

    if (!fixture || !config) {
      console.log(`Skipping ${resourceName}: missing fixture or config`);
      continue;
    }

    const resourceDir = `${SCREENSHOT_DIR}/${resourceName}`;

    test(`capture ${resourceName} views (offline)`, async ({ page }) => {
      console.log(`\n=== Testing ${resourceName} (OFFLINE) ===`);

      // Activate config
      activateConfig(resourceName);

      // Setup GraphQL mocking BEFORE navigation
      await setupGraphQLMock(page, fixture, config);

      // Create output directory
      fs.mkdirSync(resourceDir, { recursive: true });

      // Navigate to list view
      await page.goto(`${STANDALONE_BASE}/#/`);
      await waitForAppReady(page);

      // Screenshot 1: List view
      await page.screenshot({
        path: `${resourceDir}/01-list-view.png`,
        fullPage: true,
      });
      console.log(`  Captured: ${resourceName}/01-list-view.png`);

      // Try to navigate to detail view
      const firstLink = page.locator('fd-table tbody tr .fd-link, table tbody tr a').first();
      const hasLink = await firstLink.isVisible({ timeout: 5000 }).catch(() => false);

      if (!hasLink) {
        const firstRow = page.locator('fd-table tbody tr, table tbody tr').first();
        const hasRows = await firstRow.isVisible({ timeout: 5000 }).catch(() => false);

        if (!hasRows) {
          console.log(`  No rows found for ${resourceName} - skipping detail view`);
          return;
        }

        await firstRow.click();
      } else {
        await firstLink.click();
      }

      // Wait for detail view
      await page.waitForSelector('app-resource-detail-view', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1500);

      // Screenshot 2: Full detail view
      await page.screenshot({
        path: `${resourceDir}/02-detail-view-full.png`,
        fullPage: true,
      });
      console.log(`  Captured: ${resourceName}/02-detail-view-full.png`);

      // Screenshot 3: Detail content area
      const mainContent = page.locator('app-resource-detail-view').first();
      if (await mainContent.isVisible()) {
        await mainContent.screenshot({
          path: `${resourceDir}/03-detail-content.png`,
        });
        console.log(`  Captured: ${resourceName}/03-detail-content.png`);
      }

      // Screenshot 4: YAML view
      const yamlButton = page.locator('button[label="YAML"], button:has-text("YAML")').first();
      if (await yamlButton.isVisible()) {
        await yamlButton.click();
        // Wait for the panel to slide in
        await page.waitForSelector('.yaml-panel.open', { timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(500);

        await page.screenshot({
          path: `${resourceDir}/04-yaml-view.png`,
          fullPage: true,
        });
        console.log(`  Captured: ${resourceName}/04-yaml-view.png`);

        // Close YAML panel for further screenshots
        await yamlButton.click();
        await page.waitForTimeout(300);
      }

      // Screenshot 5: Nested cards (if present)
      const cards = page.locator('app-nested-object-card');
      const cardCount = await cards.count();

      for (let i = 0; i < Math.min(cardCount, 6); i++) {
        const card = cards.nth(i);
        if (await card.isVisible()) {
          const title = await card
            .locator('.card-header h3, .header-title, fd-card-header h3, [fd-card-header-title]')
            .textContent()
            .catch(() => `card-${i + 1}`);
          const safeName = (title ?? `card-${i + 1}`)
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .substring(0, 30);

          await card.screenshot({
            path: `${resourceDir}/05-card-${String(i + 1).padStart(2, '0')}-${safeName}.png`,
          });
          console.log(`  Captured: ${resourceName}/05-card-${String(i + 1).padStart(2, '0')}-${safeName}.png`);
        }
      }

      console.log(`  Completed ${resourceName} (offline)`);
    });
  }
});
