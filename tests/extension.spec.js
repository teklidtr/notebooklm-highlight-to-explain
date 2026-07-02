import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pathToExtension = path.join(__dirname, '../');

let context;
let extensionId;

test.beforeAll(async () => {
  context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
    ],
  });

  // Get extension ID from service worker or extension page
  let [background] = context.serviceWorkers();
  if (!background) {
    background = await context.waitForEvent('serviceworker');
  }
  extensionId = background.url().split('/')[2];
});

test.afterAll(async () => {
  if (context) {
    await context.close();
  }
});

test('content script popup rendering and action injection', async () => {
  const page = await context.newPage();

  // Route notebooklm.google.com and relative resources to local files
  const mockPath = path.join(__dirname, 'fixtures/notebooklm-mock.html');
  const contentJsPath = path.join(__dirname, '../src/content.js');
  const contentCssPath = path.join(__dirname, '../src/content.css');

  await page.route('https://notebooklm.google.com/**', async (route) => {
    const url = route.request().url();
    if (url === 'https://notebooklm.google.com/' || url === 'https://notebooklm.google.com') {
      await route.fulfill({ path: mockPath });
    } else if (url.includes('src/content.js')) {
      await route.fulfill({ path: contentJsPath });
    } else if (url.includes('src/content.css')) {
      await route.fulfill({ path: contentCssPath });
    } else {
      await route.continue();
    }
  });

  page.on('console', msg => console.log('PAGE CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('https://notebooklm.google.com/');

  // Click the mock page's control to select source text
  await page.click('button#select-source');



  // Trigger content script popup rendering via mock message listener
  await page.evaluate(() => {
    if (window.chromeOnMessageListener) {
      window.chromeOnMessageListener({ type: 'NLMHH_OPEN_POPUP' }, {}, () => {});
    }
  });

  // Verify the popup appears
  const popup = page.locator('#nlmhh-root');
  await expect(popup).toBeVisible();

  // Click "Explain" action
  await popup.locator('button[data-action="explain"]').click();

  // Verify prompt is injected into chat-box
  const chatBox = page.locator('#chat-box');
  await expect(chatBox).toContainText('Explain this highlighted passage in clear, simple terms');
  await expect(chatBox).toContainText('Source: Unit 06 Plant Structure and Function');
  await expect(chatBox).toContainText('Plant structure is organized around roots, stems, and leaves');

  await page.close();
});

test('options page template customization and storage syncing', async () => {
  const optionsPage = await context.newPage();
  await optionsPage.goto(`chrome-extension://${extensionId}/support.html`);

  // Verify options page loads correctly
  const header = optionsPage.locator('h1');
  await expect(header).toHaveText('NotebookLM Highlight to Explain Support');

  // Check the textarea for Explain template
  const explainArea = optionsPage.locator('#custom-explain');
  await expect(explainArea).toBeVisible();

  // Verify default value is present
  const val = await explainArea.inputValue();
  expect(val).toContain('Explain this highlighted passage in clear, simple terms');
  expect(val).toContain('Source: {source}');
  expect(val).toContain('"""\n{selection}\n"""');

  // Edit the template
  const newTemplate = 'Custom Explain Instruction:\n{selection}';
  await explainArea.fill(newTemplate);

  // Verify the save status indicator displays auto-saved message
  const saveStatus = optionsPage.locator('#save-status');
  await expect(saveStatus).toHaveClass(/visible/);

  // Reload options page to verify it persisted to storage
  await optionsPage.reload();
  await expect(explainArea).toHaveValue(newTemplate);

  // Click "Reset to Default" button
  await optionsPage.locator('button[data-target="custom-explain"]').click();

  // Verify value reverted
  const resetVal = await explainArea.inputValue();
  expect(resetVal).toContain('Explain this highlighted passage in clear, simple terms');
  expect(resetVal).toContain('Source: {source}');

  await optionsPage.close();
});
