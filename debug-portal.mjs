import { chromium } from 'playwright';

const PORTAL_URL = 'https://sap.portal.localhost:8443';
const TARGET_URL = 'https://sap.portal.localhost:8443/accounts-generic';
const EMAIL = 'bastian.echterhoelter@sap.com';
const PASSWORD = 'aa';

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--ignore-certificate-errors']
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true
  });

  const page = await context.newPage();

  // Collect console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    if (text.includes('Context') || text.includes('Schema') || text.includes('Effect') || text.includes('Error') || text.includes('error') || text.includes('Navigation') || text.includes('ResourceTable')) {
      console.log(`[CONSOLE] ${text}`);
    }
  });

  page.on('pageerror', err => {
    console.log(`[PAGE ERROR] ${err.message}`);
  });

  try {
    console.log('Navigating to portal...');
    await page.goto(PORTAL_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Check if we need to login
    const loginForm = await page.$('input[type="email"], input[name="email"], input[type="text"]');
    if (loginForm) {
      console.log('Login form detected, logging in...');

      // Try to find email input
      const emailInput = await page.$('input[type="email"]') || await page.$('input[name="email"]') || await page.$('input[name="username"]');
      if (emailInput) {
        await emailInput.fill(EMAIL);
      }

      // Try to find password input
      const passwordInput = await page.$('input[type="password"]');
      if (passwordInput) {
        await passwordInput.fill(PASSWORD);
      }

      // Submit
      const submitButton = await page.$('button[type="submit"]') || await page.$('input[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
      }

      console.log('Login submitted, waiting...');
      await page.waitForTimeout(3000);
    }

    // Set localStorage for local development
    console.log('Setting localStorage for local development...');
    await page.evaluate(() => {
      localStorage.setItem('openmfp.settings.localDevelopmentSettings', JSON.stringify({
        isActive: true,
        configs: [{ url: 'https://localhost:4200/ui/generic-resource/assets/config.accounts.json' }],
        serviceProviderConfig: {}
      }));
    });

    // Navigate to target
    console.log(`Navigating to ${TARGET_URL}...`);
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    console.log('Waiting for app to load...');
    await page.waitForTimeout(8000);

    // Get current URL
    console.log('Current URL:', page.url());

    // Try to click on an account link to navigate to detail
    console.log('Looking for iframe with the app...');
    const frames = page.frames();
    console.log('Found', frames.length, 'frames');

    for (const frame of frames) {
      const url = frame.url();
      console.log('Frame URL:', url);
      if (url.includes('localhost:4200')) {
        // Add console listener for this frame
        frame.on('console', msg => {
          consoleLogs.push(`[IFRAME ${msg.type()}] ${msg.text()}`);
          console.log(`[IFRAME CONSOLE] ${msg.text()}`);
        });

        console.log('Found app iframe, looking for links...');
        const links = await frame.$$('a');
        console.log('Found', links.length, 'links in iframe');

        // Try to find and click on the first account name link
        const nameCell = await frame.$('a.fd-link');
        if (nameCell) {
          const text = await nameCell.textContent();
          console.log('Found clickable link with text:', text);

          // Clear console logs before clicking
          consoleLogs.length = 0;

          await nameCell.click();
          await page.waitForTimeout(5000);

          // Print logs collected during navigation
          console.log('--- Console Logs During Navigation ---');
          consoleLogs.forEach(log => console.log(log));
          console.log('--- End Navigation Logs ---');

          // Log the URL after navigation
          console.log('URL after navigation:', page.url());

          // Log iframe URL too
          for (const f of page.frames()) {
            if (f.url().includes('localhost:4200')) {
              console.log('Iframe URL after navigation:', f.url());
            }
          }

          // Click the YAML button to open the panel
          const yamlButton = await frame.$('button:has-text("YAML")');
          if (yamlButton) {
            console.log('Clicking YAML button...');
            await yamlButton.click();
            await page.waitForTimeout(2000);
          }

          // Click the back button to navigate back to list
          const backButton = await frame.$('button[glyph="navigation-left-arrow"]');
          if (backButton) {
            console.log('Clicking back button...');
            await backButton.click();
            await page.waitForTimeout(3000);
            console.log('URL after back navigation:', page.url());

            // Check if list has items
            const tableRows = await frame.$$('tr[fd-table-row]');
            console.log('Table rows after back navigation:', tableRows.length);
          }
        } else {
          // Try clicking on the first row's first cell
          const firstCell = await frame.$('fd-table-row fd-table-cell:first-child');
          if (firstCell) {
            console.log('Clicking first cell...');
            await firstCell.click();
            await page.waitForTimeout(5000);
          }
        }
        break;
      }
    }

    // Print all relevant console logs
    console.log('\n--- All Console Logs ---');
    consoleLogs.forEach(log => console.log(log));

    // Check for network requests to graphql
    console.log('\n--- Network requests ---');
    const requests = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map(r => r.name).filter(u => u.includes('graphql') || u.includes('localhost:4200'));
    });
    requests.forEach(r => console.log(r));

    // Take screenshot
    await page.screenshot({ path: '/Users/I347365/Desktop/portal-debug.png', fullPage: true });
    console.log('\nScreenshot saved to /Users/I347365/Desktop/portal-debug.png');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

run();
