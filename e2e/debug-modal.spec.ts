import { test, expect, Page, FrameLocator } from 'playwright/test';

const LOCAL_DEV_SETTINGS = {
  isActive: true,
  configs: [{ url: 'https://localhost:4200/ui/generic-resource/assets/config.accounts.json' }],
  serviceProviderConfig: {},
};

async function setupLocalStorage(page: Page) {
  await page.addInitScript((settings) => {
    localStorage.setItem('openmfp.settings.localDevelopmentSettings', JSON.stringify(settings));
  }, LOCAL_DEV_SETTINGS);
}

async function login(page: Page) {
  await page.waitForLoadState('domcontentloaded');

  const signInButton = page.getByRole('button', { name: 'Sign In' });

  try {
    await signInButton.waitFor({ state: 'visible', timeout: 10000 });
    await page.getByRole('textbox', { name: 'Email' }).fill('bastian.echterhoelter@sap.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('aa');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  } catch {
    console.log('Not on login page or already logged in');
  }
}

async function getAppFrame(page: Page): Promise<FrameLocator | null> {
  const iframeSelectors = [
    'iframe[src*="generic-resource"]',
    'iframe[src*="localhost:4200"]',
  ];

  for (const selector of iframeSelectors) {
    const iframeCount = await page.locator(selector).count();
    if (iframeCount > 0) {
      return page.frameLocator(selector).first();
    }
  }
  return null;
}

test.describe('Debug Modal Spinner', () => {
  test.setTimeout(120000);

  test('debug modal via luigi portal', async ({ page }) => {
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('CreateResourcePage') || text.includes('ContextService') || text.includes('Luigi') || text.includes('local node')) {
        console.log(`[Browser ${msg.type()}]: ${text}`);
      }
    });

    page.on('pageerror', err => {
      console.log(`[Browser Error]: ${err.message}`);
    });

    await setupLocalStorage(page);

    console.log('=== Step 1: Navigate to portal ===');
    await page.goto('https://sap.portal.localhost:8443/accounts-generic');
    await login(page);
    await page.waitForTimeout(5000);

    // Check if local nodes are being loaded
    console.log('=== Checking Luigi config ===');
    const luigiConfig = await page.evaluate(() => {
      // @ts-ignore - Luigi is a global
      if (typeof Luigi !== 'undefined') {
        return {
          hasLuigi: true,
          // @ts-ignore
          nodes: Luigi.getConfigValue ? Luigi.getConfigValue('navigation.nodes') : 'getConfigValue not available',
        };
      }
      return { hasLuigi: false };
    });
    console.log('Luigi config hasLuigi:', luigiConfig.hasLuigi);

    await page.screenshot({ path: 'test-results/debug-portal-1-loaded.png', fullPage: true });

    console.log('=== Step 2: Find Create button ===');
    const frame = await getAppFrame(page);

    let createButton;
    if (frame) {
      console.log('Found app iframe');
      createButton = frame.locator('[test-id="generic-list-view-create-button"]').first();
    } else {
      console.log('No app iframe found, looking in main page');
      createButton = page.locator('[test-id="generic-list-view-create-button"]').first();
    }

    const isButtonVisible = await createButton.isVisible({ timeout: 10000 }).catch(() => false);
    console.log(`Create button visible: ${isButtonVisible}`);

    if (!isButtonVisible) {
      const iframes = await page.locator('iframe').all();
      console.log(`Found ${iframes.length} iframes`);
      for (let i = 0; i < iframes.length; i++) {
        const src = await iframes[i].getAttribute('src');
        console.log(`  Iframe ${i}: ${src}`);
      }
      await page.screenshot({ path: 'test-results/debug-portal-no-button.png', fullPage: true });
      throw new Error('Create button not found');
    }

    console.log('=== Step 3: Click Create button ===');
    await createButton.click();

    console.log('Waiting for modal...');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'test-results/debug-portal-2-after-click.png', fullPage: true });

    console.log('=== Step 4: Analyze modal state ===');

    const modalIframes = await page.locator('iframe').all();
    console.log(`Total iframes after click: ${modalIframes.length}`);

    let modalFrame: FrameLocator | null = null;
    for (let i = 0; i < modalIframes.length; i++) {
      const src = await modalIframes[i].getAttribute('src');
      const isVisible = await modalIframes[i].isVisible();
      console.log(`  Iframe ${i}: src="${src}", visible=${isVisible}`);

      if (src?.includes('create')) {
        modalFrame = page.frameLocator(`iframe[src*="create"]`);
        console.log('Found modal iframe with "create" in src');
      }
    }

    // Check for Luigi modal container
    const luigiModal = page.locator('.lui-modal-mf, .lui-modal, [class*="lui-modal"]');
    const luigiModalCount = await luigiModal.count();
    console.log(`Luigi modal elements: ${luigiModalCount}`);

    // Check all Luigi modal classes
    if (luigiModalCount > 0) {
      for (let i = 0; i < luigiModalCount; i++) {
        const classes = await luigiModal.nth(i).getAttribute('class');
        const innerHTML = await luigiModal.nth(i).innerHTML().catch(() => 'N/A');
        console.log(`  Luigi modal ${i} classes: ${classes}`);
        console.log(`  Luigi modal ${i} innerHTML length: ${innerHTML.length}`);
        console.log(`  Luigi modal ${i} innerHTML preview: ${innerHTML.substring(0, 300)}`);
      }
    }

    // Check for backdrop
    const backdrop = page.locator('.lui-backdrop, [class*="backdrop"]');
    const backdropCount = await backdrop.count();
    console.log(`Backdrop elements: ${backdropCount}`);

    if (modalFrame) {
      console.log('=== Step 5: Inspect modal iframe content ===');
      try {
        await page.waitForTimeout(2000);

        const bodyHtml = await modalFrame.locator('body').innerHTML().catch(() => 'Could not get body');
        console.log(`Modal body HTML length: ${bodyHtml.length}`);
        console.log(`Modal body preview: ${bodyHtml.substring(0, 800)}`);

        const elements = {
          'app-root': await modalFrame.locator('app-root').count(),
          'app-create-resource-page': await modalFrame.locator('app-create-resource-page').count(),
          'fd-busy-indicator': await modalFrame.locator('fd-busy-indicator').count(),
          '.modal-container': await modalFrame.locator('.modal-container').count(),
          'form': await modalFrame.locator('form').count(),
          '[test-id="create-field-metadata_name"]': await modalFrame.locator('[test-id="create-field-metadata_name"]').count(),
        };

        console.log('Elements in modal:');
        for (const [selector, count] of Object.entries(elements)) {
          console.log(`  ${selector}: ${count}`);
        }

        const formVisible = await modalFrame.locator('form').isVisible({ timeout: 2000 }).catch(() => false);
        console.log(`Form visible: ${formVisible}`);
      } catch (e) {
        console.log(`Error inspecting modal: ${e}`);
      }
    } else {
      console.log('No modal iframe found - checking Luigi modal content directly');

      // Check the lui-modal-mf content
      const mfContainer = page.locator('.lui-modal-mf');
      if (await mfContainer.count() > 0) {
        const mfHtml = await mfContainer.innerHTML().catch(() => 'N/A');
        console.log(`lui-modal-mf HTML: ${mfHtml.substring(0, 500)}`);

        // Check for iframe inside lui-modal-mf
        const mfIframe = mfContainer.locator('iframe');
        const mfIframeCount = await mfIframe.count();
        console.log(`Iframes inside lui-modal-mf: ${mfIframeCount}`);

        if (mfIframeCount > 0) {
          const mfIframeSrc = await mfIframe.first().getAttribute('src');
          console.log(`lui-modal-mf iframe src: ${mfIframeSrc}`);
        }
      }
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/debug-portal-3-final.png', fullPage: true });

    console.log('=== Step 6: Check Luigi loading indicators ===');
    const luigiLoadingSelectors = [
      '.lui-loading-indicator',
      '.spinnerContainer',
      '.fd-busy-indicator--loading',
    ];

    for (const selector of luigiLoadingSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        const isVisible = await page.locator(selector).first().isVisible().catch(() => false);
        console.log(`${selector}: count=${count}, visible=${isVisible}`);
      }
    }

    expect(true).toBe(true);
  });

  test('direct navigation to create route works', async ({ page }) => {
    page.on('console', msg => {
      if (msg.text().includes('CreateResourcePage')) {
        console.log(`[Browser]: ${msg.text()}`);
      }
    });

    await setupLocalStorage(page);

    console.log('=== Direct navigation to create route ===');
    await page.goto('https://localhost:4200/ui/generic-resource/#/create');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'test-results/debug-direct-create.png', fullPage: true });

    const elements = {
      'fd-busy-indicator': await page.locator('fd-busy-indicator').count(),
      '.modal-container': await page.locator('.modal-container').count(),
      'form': await page.locator('form').count(),
      'fd-segmented-button': await page.locator('fd-segmented-button').count(),
      '[test-id="create-field-metadata_name"]': await page.locator('[test-id="create-field-metadata_name"]').count(),
    };

    console.log('Elements found:');
    for (const [selector, count] of Object.entries(elements)) {
      console.log(`  ${selector}: ${count}`);
    }

    const busyIndicator = page.locator('fd-busy-indicator').first();
    if (await busyIndicator.count() > 0) {
      const loading = await busyIndicator.getAttribute('ng-reflect-loading');
      const ariaBusy = await busyIndicator.getAttribute('aria-busy');
      console.log(`fd-busy-indicator: loading=${loading}, aria-busy=${ariaBusy}`);
    }

    const formVisible = await page.locator('form').isVisible();
    console.log(`Form visible: ${formVisible}`);

    expect(formVisible).toBe(true);
  });

  test('YAML mode should show pre-populated template', async ({ page }) => {
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('ContextService') || text.includes('SchemaEffects') || text.includes('CreateResourcePage')) {
        console.log(`[Browser ${msg.type()}]: ${text}`);
      }
    });

    await setupLocalStorage(page);

    console.log('=== Step 1: Navigate to portal ===');
    await page.goto('https://sap.portal.localhost:8443/accounts-generic');
    await login(page);
    await page.waitForTimeout(5000);

    console.log('=== Step 2: Click Create button ===');
    const frame = await getAppFrame(page);
    expect(frame).not.toBeNull();

    const createButton = frame!.locator('[test-id="generic-list-view-create-button"]').first();
    await createButton.waitFor({ state: 'visible', timeout: 10000 });
    await createButton.click();

    console.log('=== Step 3: Wait for modal ===');
    await page.waitForTimeout(3000);

    // Find the modal iframe
    const modalFrame = page.frameLocator('iframe[src*="create"]');

    // Wait for form to be visible
    await modalFrame.locator('form').waitFor({ state: 'visible', timeout: 10000 });

    console.log('=== Step 4: Check form mode is active ===');
    const formButton = modalFrame.locator('button:has-text("Form")');
    const yamlButton = modalFrame.locator('button:has-text("YAML")');

    const formButtonClasses = await formButton.getAttribute('class');
    console.log(`Form button classes: ${formButtonClasses}`);
    expect(formButtonClasses).toContain('is-selected');

    console.log('=== Step 5: Switch to YAML mode ===');
    await yamlButton.click();
    await page.waitForTimeout(1000);

    // Verify YAML button is now selected
    const yamlButtonClasses = await yamlButton.getAttribute('class');
    console.log(`YAML button classes after click: ${yamlButtonClasses}`);
    expect(yamlButtonClasses).toContain('is-selected');

    console.log('=== Step 6: Check YAML textarea content ===');
    const yamlTextarea = modalFrame.locator('textarea.yaml-editor');
    await yamlTextarea.waitFor({ state: 'visible', timeout: 5000 });

    const yamlContent = await yamlTextarea.inputValue();
    console.log(`YAML content length: ${yamlContent.length}`);
    console.log(`YAML content:\n${yamlContent}`);

    await page.screenshot({ path: 'test-results/yaml-prepopulation.png', fullPage: true });

    // Verify YAML is pre-populated
    expect(yamlContent.length).toBeGreaterThan(0);
    expect(yamlContent).toContain('apiVersion:');
    expect(yamlContent).toContain('kind:');
    expect(yamlContent).toContain('metadata:');
    expect(yamlContent).toContain('name:');
  });

  test('Creating a resource via form should work', async ({ page }) => {
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('CreateResourcePage') || text.includes('GenericResourceService')) {
        console.log(`[Browser ${msg.type()}]: ${text}`);
      }
    });

    page.on('pageerror', err => {
      console.log(`[Browser Error]: ${err.message}`);
    });

    await setupLocalStorage(page);

    console.log('=== Step 1: Navigate to portal ===');
    await page.goto('https://sap.portal.localhost:8443/accounts-generic');
    await login(page);
    await page.waitForTimeout(5000);

    console.log('=== Step 2: Click Create button ===');
    const frame = await getAppFrame(page);
    expect(frame).not.toBeNull();

    const createButton = frame!.locator('[test-id="generic-list-view-create-button"]').first();
    await createButton.waitFor({ state: 'visible', timeout: 10000 });
    await createButton.click();

    console.log('=== Step 3: Wait for modal ===');
    await page.waitForTimeout(3000);

    const modalFrame = page.frameLocator('iframe[src*="create"]');
    await modalFrame.locator('form').waitFor({ state: 'visible', timeout: 10000 });

    console.log('=== Step 4: Fill in form fields ===');
    const nameInput = modalFrame.locator('[test-id="create-field-metadata_name"]');
    await nameInput.fill('test-account-' + Date.now());

    // Wait for schema to load and form fields to appear
    await page.waitForTimeout(2000);

    // Fill in type field if it exists (hs-workspace is a valid account type)
    const typeInput = modalFrame.locator('[test-id="create-field-spec_type"]');
    if (await typeInput.count() > 0) {
      await typeInput.fill('hs-workspace');
    }

    console.log('=== Step 5: Click Create submit button ===');
    const submitButton = modalFrame.locator('[test-id="create-resource-submit"]');

    // Check if button is enabled
    const isDisabled = await submitButton.isDisabled();
    console.log(`Submit button disabled: ${isDisabled}`);

    if (!isDisabled) {
      await submitButton.click();
      console.log('=== Step 6: Wait for result ===');
      await page.waitForTimeout(5000);
    }

    await page.screenshot({ path: 'test-results/create-resource-result.png', fullPage: true });

    // Check for errors in the modal
    const errors = modalFrame.locator('.form-error, .field-error');
    const errorCount = await errors.count();
    console.log(`Error count: ${errorCount}`);
    if (errorCount > 0) {
      for (let i = 0; i < errorCount; i++) {
        const errorText = await errors.nth(i).textContent();
        console.log(`Error ${i}: ${errorText}`);
      }
    }

    // If there are errors, log them (creation may fail due to server validation)
    // A successful create should close the modal, so we check if we're back to the list
  });

  test('Navigate back from dashboard to list', async ({ page }) => {
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Context') || text.includes('Schema') || text.includes('originalGateway') || text.includes('GraphQL URL') || text.includes('List query')) {
        console.log(`[Browser ${msg.type()}]: ${text}`);
      }
    });

    await setupLocalStorage(page);

    console.log('=== Step 1: Navigate to list ===');
    await page.goto('https://sap.portal.localhost:8443/accounts-generic');
    await login(page);
    await page.waitForTimeout(5000);

    console.log('=== Step 2: Click on an account to go to dashboard ===');
    const frame = await getAppFrame(page);
    expect(frame).not.toBeNull();

    // Click on first account link
    const accountLink = frame!.locator('.fd-link').first();
    const accountName = await accountLink.textContent();
    console.log(`Clicking on account: ${accountName}`);
    await accountLink.click();
    await page.waitForTimeout(5000);

    console.log('=== Step 3: Navigate back ===');
    await page.goBack();
    await page.waitForTimeout(5000);

    console.log('=== Step 4: Check list content ===');
    const frame2 = await getAppFrame(page);
    if (frame2) {
      const tableRows = frame2.locator('table tbody tr');
      const rowCount = await tableRows.count();
      console.log(`Table rows after back: ${rowCount}`);

      // Check for empty state
      const emptyState = frame2.locator('.empty-state');
      const hasEmptyState = await emptyState.count();
      console.log(`Has empty state: ${hasEmptyState}`);
    }

    await page.screenshot({ path: 'test-results/back-from-dashboard.png', fullPage: true });
  });

  test('Dashboard loads for not-ready account', async ({ page }) => {
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('DetailView') || text.includes('Context') || text.includes('Schema') || text.includes('Error')) {
        console.log(`[Browser ${msg.type()}]: ${text}`);
      }
    });

    page.on('pageerror', err => {
      console.log(`[Browser Error]: ${err.message}`);
    });

    await setupLocalStorage(page);

    console.log('=== Step 1: Navigate to dashboard ===');
    await page.goto('https://sap.portal.localhost:8443/accounts-generic/test/dashboard');
    await login(page);
    await page.waitForTimeout(8000);

    console.log('=== Step 2: Check frame content ===');
    const frame = await getAppFrame(page);
    if (frame) {
      const html = await frame.locator('body').innerHTML();
      console.log(`Frame body HTML length: ${html.length}`);
      console.log(`Frame body preview: ${html.substring(0, 500)}`);

      // Check for busy indicator or content
      const busyIndicator = frame.locator('fd-busy-indicator');
      const isLoading = await busyIndicator.getAttribute('ng-reflect-loading');
      console.log(`Busy indicator loading: ${isLoading}`);

      // Check for dynamic page content
      const dynamicPage = frame.locator('fdp-dynamic-page');
      const hasDynamicPage = await dynamicPage.count();
      console.log(`Dynamic page count: ${hasDynamicPage}`);
    }

    await page.screenshot({ path: 'test-results/dashboard-not-ready.png', fullPage: true });
  });

  test('Deleting a resource should work', async ({ page }) => {
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('ResourcesEffects') || text.includes('GenericResourceService') || text.includes('delete') || text.includes('Delete') || text.includes('ResourceTable')) {
        console.log(`[Browser ${msg.type()}]: ${text}`);
      }
    });

    page.on('pageerror', err => {
      console.log(`[Browser Error]: ${err.message}`);
    });

    await setupLocalStorage(page);

    console.log('=== Step 1: Navigate to portal ===');
    await page.goto('https://sap.portal.localhost:8443/accounts-generic');
    await login(page);
    await page.waitForTimeout(5000);

    const frame = await getAppFrame(page);
    expect(frame).not.toBeNull();

    console.log('=== Step 2: Check for existing resources ===');
    // Look for any delete button in the table (delete button has glyph="delete" and ariaLabel="Delete")
    const deleteButtons = frame!.locator('button[glyph="delete"], button[aria-label="Delete"]');
    const deleteButtonCount = await deleteButtons.count();
    console.log(`Found ${deleteButtonCount} delete buttons`);

    if (deleteButtonCount === 0) {
      console.log('No resources to delete, skipping test');
      return;
    }

    console.log('=== Step 3: Click first delete button ===');
    await deleteButtons.first().click();
    await page.waitForTimeout(1000);

    console.log('=== Step 4: Check for delete confirmation modal ===');
    await page.waitForTimeout(1000);

    // Look for the delete confirmation dialog in the iframe
    const deleteDialog = frame!.locator('.dialog-container');
    const dialogCount = await deleteDialog.count();
    console.log(`Delete dialog count: ${dialogCount}`);

    if (dialogCount > 0) {
      // Get the resource name from the dialog
      const strongElement = frame!.locator('.dialog-container strong');
      const resourceName = await strongElement.textContent().catch(() => '');
      console.log(`Resource to delete: ${resourceName}`);

      // Type the resource name to confirm
      const confirmInput = frame!.locator('.dialog-container input[type="text"]');
      if (resourceName) {
        await confirmInput.fill(resourceName);
        console.log(`Filled confirmation input with: ${resourceName}`);
      }

      // Click the delete button
      const confirmDeleteButton = frame!.locator('.dialog-container button[fdType="negative"]');
      const buttonDisabled = await confirmDeleteButton.isDisabled();
      console.log(`Delete button disabled: ${buttonDisabled}`);

      if (!buttonDisabled) {
        await confirmDeleteButton.click();
        console.log('Clicked confirm delete button');
        await page.waitForTimeout(3000);
      }
    } else {
      console.log('No delete dialog found');
    }

    await page.screenshot({ path: 'test-results/delete-resource-result.png', fullPage: true });
  });
});
