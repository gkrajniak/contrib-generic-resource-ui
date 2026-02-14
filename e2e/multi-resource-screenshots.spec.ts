import { test, Page } from 'playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Multi-Resource Visual Testing Suite
 *
 * Takes screenshots for each resource type configured in src/assets/configs/.
 * Run with: task screenshots:multi
 *
 * Screenshots are saved to: test-results/screenshots/{resource-type}/
 */

const CONFIGS_DIR = 'src/assets/configs';
const SCREENSHOT_DIR = 'test-results/screenshots';
const STANDALONE_BASE = 'https://localhost:4200/ui/generic-resource';

interface ResourceConfig {
  resourceDefinition: {
    kind: string;
    plural: string;
    scope: 'Namespaced' | 'Cluster';
  };
  namespaceId?: string;
  resourceId?: string;
  ui?: {
    title?: string;
  };
}

// Helper to wait for app to be ready
async function waitForAppReady(page: Page, waitForContent = true) {
  await page.waitForLoadState('domcontentloaded');

  if (waitForContent) {
    await page
      .waitForSelector('fd-table tbody tr, app-resource-detail-view, .empty-state', {
        timeout: 30000,
      })
      .catch(() => {});
  }

  await page.waitForTimeout(2000);
}

// Get all config files from the configs directory
function getConfigFiles(): string[] {
  const configsPath = path.join(process.cwd(), CONFIGS_DIR);
  if (!fs.existsSync(configsPath)) {
    return [];
  }
  return fs
    .readdirSync(configsPath)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(configsPath, f));
}

// Load and parse a config file
function loadConfig(configPath: string): ResourceConfig | null {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    console.error(`Failed to load config ${configPath}:`, e);
    return null;
  }
}

// Copy config to active config.json
function activateConfig(configPath: string) {
  const targetPath = path.join(process.cwd(), 'src/assets/config.json');
  const tokenPath = path.join(process.cwd(), '.secret/token');

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  // Load token from .secret/token if it exists
  if (fs.existsSync(tokenPath)) {
    const token = fs.readFileSync(tokenPath, 'utf-8').trim();
    if (token) {
      config.token = token;
    }
  }

  fs.writeFileSync(targetPath, JSON.stringify(config, null, 2));
}

test.describe('Multi-Resource Screenshots', () => {
  test.setTimeout(120000); // Allow time for multiple resources

  const configFiles = getConfigFiles();

  if (configFiles.length === 0) {
    test.skip('no configs', () => {
      console.log('No config files found in src/assets/configs/');
    });
  }

  for (const configPath of configFiles) {
    const configName = path.basename(configPath, '.json');
    const config = loadConfig(configPath);

    if (!config) {
      continue;
    }

    const resourceKind = config.resourceDefinition?.kind || configName;
    const resourceDir = `${SCREENSHOT_DIR}/${configName}`;

    test(`capture ${resourceKind} views`, async ({ page }) => {
      // Activate this config
      activateConfig(configPath);
      console.log(`\n=== Testing ${resourceKind} (${configName}) ===`);

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
      console.log(`  Captured: ${configName}/01-list-view.png`);

      // Try to navigate to detail view
      const firstLink = page.locator('fd-table tbody tr .fd-link, table tbody tr a').first();
      const hasLink = await firstLink.isVisible({ timeout: 5000 }).catch(() => false);

      if (!hasLink) {
        const firstRow = page.locator('fd-table tbody tr, table tbody tr').first();
        const hasRows = await firstRow.isVisible({ timeout: 5000 }).catch(() => false);

        if (!hasRows) {
          console.log(`  No rows found for ${resourceKind} - skipping detail view`);
          return;
        }

        await firstRow.click();
      } else {
        await firstLink.click();
      }

      // Wait for detail view
      await page.waitForSelector('app-resource-detail-view', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);

      // Screenshot 2: Full detail view
      await page.screenshot({
        path: `${resourceDir}/02-detail-view-full.png`,
        fullPage: true,
      });
      console.log(`  Captured: ${configName}/02-detail-view-full.png`);

      // Screenshot 3: Detail content area
      const mainContent = page.locator('app-resource-detail-view').first();
      if (await mainContent.isVisible()) {
        await mainContent.screenshot({
          path: `${resourceDir}/03-detail-content.png`,
        });
        console.log(`  Captured: ${configName}/03-detail-content.png`);
      }

      // Screenshot 4: Spec section (if present)
      const specPanel = page.locator('app-spec-section fd-layout-panel').first();
      if (await specPanel.isVisible({ timeout: 3000 }).catch(() => false)) {
        await specPanel.screenshot({
          path: `${resourceDir}/04-spec-section.png`,
        });
        console.log(`  Captured: ${configName}/04-spec-section.png`);
      }

      // Screenshot 5: Nested objects (if present)
      const nestedObjects = page.locator('.nested-objects').first();
      if (await nestedObjects.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nestedObjects.screenshot({
          path: `${resourceDir}/05-nested-objects.png`,
        });
        console.log(`  Captured: ${configName}/05-nested-objects.png`);
      }

      // Screenshot 6+: Individual nested cards
      const cards = page.locator('app-nested-object-card');
      const cardCount = await cards.count();

      for (let i = 0; i < Math.min(cardCount, 10); i++) {
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
            path: `${resourceDir}/06-card-${String(i + 1).padStart(2, '0')}-${safeName}.png`,
          });
          console.log(`  Captured: ${configName}/06-card-${String(i + 1).padStart(2, '0')}-${safeName}.png`);
        }
      }

      console.log(`  Completed ${resourceKind}`);
    });
  }
});
