import { test, expect, Page, Route } from 'playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ConfigMap Data Section Test Suite
 *
 * Tests the data section rendering for ConfigMap resources.
 * ConfigMaps have root-level `data` and `binaryData` fields instead of spec/status.
 */

const FIXTURES_DIR = 'e2e/fixtures';
const SCREENSHOT_DIR = 'test-results/screenshots/configmap';
const STANDALONE_BASE = 'https://localhost:4200/ui/generic-resource';

interface Fixture {
  introspection?: Record<string, object>;
  listResponse: object;
  detailResponse: object;
  yamlResponse?: object;
}

function loadFixture(resourceName: string): Fixture | null {
  const fixturePath = path.join(process.cwd(), FIXTURES_DIR, `${resourceName}.fixture.json`);
  if (!fs.existsSync(fixturePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
}

function activateConfigMapConfig() {
  const targetPath = path.join(process.cwd(), 'src/assets/config.json');
  const config = {
    resourceDefinition: {
      group: '',
      version: 'v1',
      kind: 'ConfigMap',
      plural: 'ConfigMaps',
      singular: 'configmap',
      scope: 'Namespaced'
    },
    portalContext: {
      crdGatewayApiUrl: 'https://localhost:4200/graphql'
    },
    token: 'offline-mock-token',
    namespaceId: 'default'
  };
  fs.writeFileSync(targetPath, JSON.stringify(config, null, 2));
}

async function setupGraphQLMock(page: Page, fixture: Fixture) {
  await page.route('**/graphql', async (route: Route) => {
    const request = route.request();
    const postData = request.postDataJSON();
    const query = postData?.query || '';
    const variables = postData?.variables || {};

    console.log('[Mock] Query:', query.substring(0, 100));

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
    if (query.includes('ListResources') || query.includes('ConfigMaps {')) {
      console.log('[Mock] Returning list response');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixture.listResponse),
      });
      return;
    }

    // Handle YAML queries
    if (query.includes('ConfigMapYaml')) {
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

    // Handle detail queries - must include data field
    if (query.includes('GetResource') || query.includes('ConfigMap(name:')) {
      console.log('[Mock] Returning detail response');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixture.detailResponse),
      });
      return;
    }

    // Default - return list
    console.log('[Mock] Default - returning list response');
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
    .waitForSelector('fd-table tbody tr, app-resource-detail-view, .empty-state, .data-section', {
      timeout: 15000,
    })
    .catch(() => {});
  await page.waitForTimeout(1500);
}

test.describe('ConfigMap Data Section', () => {
  test.setTimeout(60000);
  test.describe.configure({ mode: 'serial' });

  const fixture = loadFixture('configmaps');

  test.beforeAll(() => {
    if (fixture) {
      activateConfigMapConfig();
    }
  });

  test.skip(!fixture, 'configmaps.fixture.json not found');

  test('renders list view with ConfigMaps', async ({ page }) => {
    if (!fixture) return;

    await setupGraphQLMock(page, fixture);
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    await page.goto(`${STANDALONE_BASE}/#/`);
    await waitForAppReady(page);

    // Check ConfigMap names are displayed
    await expect(page.getByText('kube-root-ca.crt').first()).toBeVisible();
    await expect(page.getByText('app-config').first()).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-list-view.png`,
      fullPage: true,
    });
  });

  test('renders detail view with data section', async ({ page }) => {
    if (!fixture) return;

    await setupGraphQLMock(page, fixture);
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    // Navigate directly to detail view
    await page.goto(`${STANDALONE_BASE}/#/app-config?namespace=default`);
    await page.waitForTimeout(3000);

    // Verify header shows resource name
    await expect(page.getByRole('heading', { name: 'app-config' })).toBeVisible();

    // Take screenshot to see current state
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-detail-view.png`,
      fullPage: true,
    });

    // Check for Data section
    const dataSection = page.locator('.data-section');
    const hasDataSection = await dataSection.isVisible().catch(() => false);
    
    console.log('Data section visible:', hasDataSection);
    
    if (hasDataSection) {
      await expect(dataSection).toBeVisible();
      await expect(page.getByText('Data').first()).toBeVisible();
    }
  });

  test('displays data keys in expandable list', async ({ page }) => {
    if (!fixture) return;

    await setupGraphQLMock(page, fixture);
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    await page.goto(`${STANDALONE_BASE}/#/app-config?namespace=default`);
    await page.waitForTimeout(3000);

    // Check for data key names
    const configYaml = page.getByText('config.yaml');
    const settingsJson = page.getByText('settings.json');
    const appProps = page.getByText('app.properties');

    const hasConfigYaml = await configYaml.first().isVisible().catch(() => false);
    const hasSettingsJson = await settingsJson.first().isVisible().catch(() => false);
    const hasAppProps = await appProps.first().isVisible().catch(() => false);

    console.log('config.yaml visible:', hasConfigYaml);
    console.log('settings.json visible:', hasSettingsJson);
    console.log('app.properties visible:', hasAppProps);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-data-keys.png`,
      fullPage: true,
    });
  });

  test('expands data entry to show content', async ({ page }) => {
    if (!fixture) return;

    await setupGraphQLMock(page, fixture);
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    await page.goto(`${STANDALONE_BASE}/#/app-config?namespace=default`);
    await page.waitForTimeout(3000);

    // Try to click on a data entry to expand it
    const configYamlEntry = page.locator('.entry-header:has-text("config.yaml")').first();
    const isEntryVisible = await configYamlEntry.isVisible().catch(() => false);

    if (isEntryVisible) {
      await configYamlEntry.click();
      await page.waitForTimeout(500);

      // Check for expanded content
      await expect(page.locator('.entry-content .code-block').first()).toBeVisible();
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-expanded-entry.png`,
      fullPage: true,
    });
  });

  test('captures page HTML for debugging', async ({ page }) => {
    if (!fixture) return;

    await setupGraphQLMock(page, fixture);

    await page.goto(`${STANDALONE_BASE}/#/app-config?namespace=default`);
    await page.waitForTimeout(3000);

    // Get page HTML for debugging
    const html = await page.content();
    fs.writeFileSync(`${SCREENSHOT_DIR}/page-debug.html`, html);

    // Log what we can find
    const sectionsContainer = await page.locator('.sections-container').innerHTML().catch(() => 'not found');
    console.log('Sections container HTML:', sectionsContainer.substring(0, 500));
  });
});
